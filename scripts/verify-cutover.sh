#!/bin/sh
# Post-cutover verification for turillfinancial.com
#
# Run immediately after the A and CNAME records are changed. Checks that the
# website moved AND that nothing about email moved with it.
#
# Usage: sh verify-cutover.sh

DOMAIN=turillfinancial.com
RENDER_IP=216.24.57.1
OLD_IP=67.223.118.123
NS=dns1.namecheaphosting.com

pass=0; fail=0; warn=0
ok()   { echo "  PASS  $1"; pass=$((pass+1)); }
bad()  { echo "  FAIL  $1"; fail=$((fail+1)); }
note() { echo "  WARN  $1"; warn=$((warn+1)); }

echo "================================================================"
echo " turillfinancial.com cutover check   $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "================================================================"

echo
echo "--- 1. DNS: the two records that should have changed ---"
apex=$(dig +short A $DOMAIN @$NS | head -1)
echo "  apex A (authoritative) = ${apex:-<empty>}"
[ "$apex" = "$RENDER_IP" ] && ok "apex points at Render" || {
  [ "$apex" = "$OLD_IP" ] && note "apex is still the OLD host - change not made yet" \
                          || bad "apex is neither Render nor the old host"; }

wwwc=$(dig +short CNAME www.$DOMAIN @$NS | head -1)
echo "  www CNAME (authoritative) = ${wwwc:-<empty>}"
case "$wwwc" in
  *onrender.com.) ok "www points at Render" ;;
  "$DOMAIN".)     note "www still CNAMEs to the apex (works, but not what Render documents)" ;;
  *)              bad "www CNAME unexpected" ;;
esac

echo
echo "--- 2. DNS: what must NOT have changed (email) ---"
mx=$(dig +short MX $DOMAIN @$NS | sort | tr '\n' ' ')
echo "  MX = $mx"
case "$mx" in
  *jellyfish.systems*) ok "MX still on the Namecheap mail servers" ;;
  *)                   bad "MX HAS CHANGED - email is at risk, roll back" ;;
esac

for h in mail webmail cpanel autodiscover autoconfig; do
  v=$(dig +short A $h.$DOMAIN @$NS | head -1)
  if [ "$v" = "$OLD_IP" ]; then ok "$h still on the old host ($v)"
  else bad "$h moved or vanished (got '${v:-<empty>}') - mail clients may break"; fi
done

ns=$(dig +short NS $DOMAIN @1.1.1.1 | sort | tr '\n' ' ')
echo "  NS = $ns"
case "$ns" in
  *namecheaphosting*) ok "nameservers unchanged" ;;
  *)                  bad "NAMESERVERS CHANGED - this is the one thing that breaks email" ;;
esac

echo
echo "--- 3. The website itself ---"
for url in "https://$DOMAIN/" "https://www.$DOMAIN/"; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 90 "$url")
  [ "$code" = "200" ] && ok "$url -> 200" || bad "$url -> $code"
done

# http should redirect to https
loc=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "http://$DOMAIN/")
echo "  http://$DOMAIN/ -> $loc"

echo
echo "--- 4. Is it actually OUR site (not the old host)? ---"
body=$(curl -sL --max-time 90 "https://$DOMAIN/")
printf '%s' "$body" | grep -q "Turill Financial" && ok "page says Turill Financial" || bad "unexpected page content"
printf '%s' "$body" | grep -q "CRD #6922637"     && ok "compliance disclosure present" || bad "disclosure missing"
printf '%s' "$body" | grep -q "PREVIEW COPY" \
  && bad "THE PREVIEW BANNER IS ON THE LIVE DOMAIN - wrong service is serving it" \
  || ok "no preview banner on the live domain"
printf '%s' "$body" | grep -q "pending firm compliance approval" \
  && bad "old pending-approval notice is back" || ok "no stale pending-approval notice"

echo
echo "--- 5. Every page answers ---"
for p in "" about contact concentrated-stock retirement-planning stock-analyzer stock-review thank-you; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 60 "https://$DOMAIN/$p")
  [ "$code" = "200" ] && ok "/$p -> 200" || bad "/$p -> $code"
done
code404=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 60 "https://$DOMAIN/no-such-page")
[ "$code404" = "404" ] && ok "unknown URL returns a real 404" || bad "unknown URL returned $code404"

echo
echo "--- 6. HTTPS certificate ---"
certinfo=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null \
           | openssl x509 -noout -subject -issuer -dates 2>/dev/null)
if [ -n "$certinfo" ]; then
  echo "$certinfo" | sed 's/^/    /'
  echo "$certinfo" | grep -qi "$DOMAIN" && ok "certificate covers the domain" || note "check the certificate subject above"
else
  bad "could not read a certificate - HTTPS may not be issued yet"
fi

echo
echo "--- 7. Canonical URL now matches reality ---"
printf '%s' "$body" | grep -o 'rel="canonical" href="[^"]*"' | head -1 | sed 's/^/    /'

echo
echo "================================================================"
echo " PASS=$pass  FAIL=$fail  WARN=$warn"
[ "$fail" -eq 0 ] && echo " All good." || echo " Something failed - see FAIL lines above."
echo "================================================================"
