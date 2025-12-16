// Initialize Cloudflare Turnstile widgets on all pages,
// including when using Zensical / MkDocs Material instant navigation.
(function () {
  function renderTurnstileWidgets() {
    // Turnstile API not yet available
    if (typeof window.turnstile === "undefined") {
      return;
    }

    var widgets = document.querySelectorAll(".cf-turnstile");
    if (!widgets || !widgets.length) {
      return;
    }

    for (var i = 0; i < widgets.length; i++) {
      var el = widgets[i];

      // Avoid double-rendering the same element
      if (el.getAttribute("data-turnstile-rendered") === "true") {
        continue;
      }

      var sitekey = el.getAttribute("data-sitekey");
      if (!sitekey) {
        continue;
      }

      var options = { sitekey: sitekey };
      var theme = el.getAttribute("data-theme");
      if (theme) {
        options.theme = theme;
      }

      try {
        var widgetId = window.turnstile.render(el, options);
        el.setAttribute("data-turnstile-rendered", "true");
        if (widgetId) {
          el.setAttribute("data-turnstile-widget-id", widgetId);
        }
      } catch (e) {
        // Fail gracefully if something goes wrong
        console.error("Error rendering Turnstile widget:", e);
      }
    }
  }

  // Called by Cloudflare's Turnstile API when it finishes loading.
  // See: zensical.toml extra_javascript configuration.
  window.onloadTurnstileCallback = function () {
    renderTurnstileWidgets();
  };

  function initPageTurnstiles() {
    renderTurnstileWidgets();
  }

  // Handle both instant navigation (document$) and normal page loads.
  if (typeof window.document$ !== "undefined") {
    window.document$.subscribe(function () {
      initPageTurnstiles();
    });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      initPageTurnstiles();
    });
  }
})();
