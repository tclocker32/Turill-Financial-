const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const pct=n=>`${(Number.isFinite(n)?n:0).toFixed(1)}%`;
const num=id=>Math.max(0,parseFloat($(id).value)||0);

function calc(e){
 if(e)e.preventDefault();
 const ticker=$("ticker").value.trim().toUpperCase()||"your company";
 const value=num("stockValue"), basis=Math.min(num("costBasis"),value), other=num("otherAssets");
 const desired=Math.min(num("diversifyAmount"),value), years=Math.max(1,parseInt($("years").value||"3"));
 const rate=(num("fedRate")+num("niitRate")+num("stateRate"))/100;
 const gain=Math.max(value-basis,0), concentration=(value+other)>0?value/(value+other)*100:0, gainRatio=value>0?gain/value:0;
 const desiredTax=desired*gainRatio*rate, fullTax=gain*rate;
 $("concentration").textContent=pct(concentration); $("embeddedGain").textContent=money(gain); $("fullSaleTax").textContent=money(fullTax); $("netFullSale").textContent=money(Math.max(value-fullTax,0));
 $("down20").textContent="-"+money(value*.20); $("down35").textContent="-"+money(value*.35); $("down50").textContent="-"+money(value*.50);
 $("sellAmt").textContent=money(desired); $("sellTax").textContent=money(desiredTax)+" est. now"; $("stageAmt").textContent=`${money(desired)} over ${years} yr${years>1?"s":""}`; $("stageTax").textContent=`~${money(desiredTax/years)}/yr at same rates`; $("exchangeAmt").textContent=money(desired);
 const f=[];
 f.push(`<div class="metric"><p class="font-bold text-gold">${concentration>=50?"High":concentration>=25?"Meaningful":"Current"} concentration flag</p><p class="mt-2 text-sm leading-6 text-slate-400">${pct(concentration)} of the investable assets entered are tied to ${ticker}. ${concentration>=25?"Diversification tradeoffs deserve explicit modeling.":""}</p></div>`);
 if($("insider").value==="yes")f.push(`<div class="metric"><p class="font-bold text-gold">Trading-plan review</p><p class="mt-2 text-sm leading-6 text-slate-400">Company policy, blackout windows and possible Rule 10b5-1 planning should be reviewed before modeling a sale schedule.</p></div>`);
 if($("charitable").value==="yes")f.push(`<div class="metric"><p class="font-bold text-gold">Charitable planning flag</p><p class="mt-2 text-sm leading-6 text-slate-400">Appreciated-share gifting may deserve evaluation before shares are sold. Deduction limits and substantiation rules are fact-specific.</p></div>`);
 if(gainRatio>=.6)f.push(`<div class="metric"><p class="font-bold text-gold">Large embedded-gain flag</p><p class="mt-2 text-sm leading-6 text-slate-400">${pct(gainRatio*100)} of current position value is unrealized gain based on the inputs. Tax sequencing becomes especially important.</p></div>`);
 f.push(`<div class="metric"><p class="font-bold text-gold">Advanced structure review</p><p class="mt-2 text-sm leading-6 text-slate-400">Exchange-fund, in-kind, hedging, charitable, estate and other tax-aware techniques may be relevant, but this calculator does not assume qualification.</p></div>`);
 $("advancedFlags").innerHTML=`<p class="eyebrow">Planning Flags</p><h2 class="mt-2 font-display text-2xl font-bold">What deserves a closer look</h2><div class="mt-6 grid gap-4">${f.join("")}</div>`;
 const q=new URLSearchParams({ticker,value:Math.round(value),basis:Math.round(basis),other:Math.round(other),diversify:Math.round(desired),concentration:concentration.toFixed(1),insider:$("insider").value,charitable:$("charitable").value});
 $("reviewCta").href="/stock-review?"+q.toString();
}
document.addEventListener("DOMContentLoaded",()=>{ $("analyzerForm").addEventListener("submit",calc); ["stockValue","costBasis","otherAssets","diversifyAmount","years","fedRate","niitRate","stateRate","insider","charitable","ticker"].forEach(id=>$(id).addEventListener("change",calc)); calc(); });
