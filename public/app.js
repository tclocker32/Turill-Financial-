// Shared site behaviour: mobile menu + footer year.
(function () {
  var toggle = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("hidden") === false;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    // Close the menu after tapping any link inside it.
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  // Surface the server-side validation failure (redirect to /contact?error=1).
  if (new URLSearchParams(window.location.search).get("error")) {
    var banner = document.querySelector("[data-form-error]");
    if (banner) {
      banner.classList.remove("hidden");
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  var year = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = year;
  });
})();
