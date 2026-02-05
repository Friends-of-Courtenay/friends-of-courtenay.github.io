// GTranslate widget loader + language-link handler.
//
// Equivalent to dropping this in every page:
//   <div class="gtranslate_wrapper"></div>
//   <script>window.gtranslateSettings = {…}</script>
//   <script src="https://cdn.gtranslate.net/widgets/latest/float.js" defer></script>
//
// Also wires up any <a data-gt-lang="es"> links to trigger translation.
//
// Handles Zensical's navigation.instant (SPA-style page swaps) by:
//   a) Recreating the float widget after each page swap so the UI stays
//      functional even when no translation is selected.
//   b) Forcing full-page navigation when a translation IS active, because
//      Google Translate can't translate content swapped in via XHR.

(function () {
  // ---- 1. Settings (must exist before float.js executes) ----
  window.gtranslateSettings = {
    default_language: "en",
    native_language_names: true,
    wrapper_selector: ".gtranslate_wrapper",
    switcher_horizontal_position: "right",
  };

  // ---- 2. Widget lifecycle ----
  var FLOAT_JS_URL = "https://cdn.gtranslate.net/widgets/latest/float.js";

  function destroyWidget() {
    // Remove the wrapper we created and anything float.js added inside it.
    // Be careful NOT to remove Google Translate's own infrastructure
    // (#goog-gt-tt, .goog-te-*, the translation iframe) — only our UI.
    var els = document.querySelectorAll(
      ".gtranslate_wrapper, #gt_float_wrapper"
    );
    for (var i = 0; i < els.length; i++) {
      if (els[i].parentNode) els[i].parentNode.removeChild(els[i]);
    }
    // Remove the old float.js <script> so re-adding it triggers execution.
    var scripts = document.querySelectorAll(
      'script[src^="' + FLOAT_JS_URL + '"]'
    );
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].parentNode) scripts[i].parentNode.removeChild(scripts[i]);
    }
  }

  function createWidget() {
    var wrapper = document.createElement("div");
    wrapper.className = "gtranslate_wrapper";
    document.body.appendChild(wrapper);

    var s = document.createElement("script");
    s.src = FLOAT_JS_URL;
    s.defer = true;
    document.body.appendChild(s);
  }

  function initWidget() {
    destroyWidget();
    createWidget();
  }

  // document$ fires on initial load AND after every instant-navigation swap,
  // so it covers both cases. Fall back to DOMContentLoaded when instant
  // navigation is disabled.
  if (typeof window.document$ !== "undefined") {
    window.document$.subscribe(initWidget);
  } else if (document.body) {
    initWidget();
  } else {
    document.addEventListener("DOMContentLoaded", initWidget);
  }

  // ---- 3. Language-link click handler ----
  // Any <a data-gt-lang="es"> etc. outside the widget will trigger translation.
  document.addEventListener(
    "click",
    function (evt) {
      var a = evt.target && evt.target.closest
        ? evt.target.closest("a[data-gt-lang]")
        : null;
      if (!a) return;

      // Ignore clicks inside the GTranslate widget — float.js handles those.
      if (a.closest(".gtranslate_wrapper, #gt_float_wrapper")) return;

      evt.preventDefault();
      evt.stopPropagation();

      var lang = a.getAttribute("data-gt-lang");
      if (!lang) return;

      // float.js lazy-loads the Google Translate library on first hover
      // over the widget.  We must kick that off BEFORE calling doGTranslate,
      // because doGTranslate is defined by float.js immediately (before the
      // translate library is loaded) and will silently spin-wait for the
      // library — which never arrives unless we trigger the load here.
      var wrapper = document.querySelector(".gtranslate_wrapper");
      if (wrapper) {
        try { wrapper.dispatchEvent(new PointerEvent("pointerenter")); } catch (e) {}
      }

      if (typeof window.doGTranslate === "function") {
        window.doGTranslate("en|" + lang);
      } else {
        // float.js hasn't executed yet — poll until doGTranslate appears.
        var attempts = 0;
        var retry = setInterval(function () {
          attempts++;
          if (typeof window.doGTranslate === "function") {
            clearInterval(retry);
            window.doGTranslate("en|" + lang);
          } else if (attempts > 100) {
            clearInterval(retry);
          }
        }, 100);
      }
    },
    true
  );

  // ---- 4. Bypass instant navigation while translation is active ----
  // Google Translate can't re-process DOM nodes swapped in by Zensical's
  // instant navigation (navigation.instant). When a translation is active
  // we intercept internal link clicks and force a full page load instead,
  // which lets Google Translate process the page from scratch.
  function isTranslationActive() {
    // googtrans cookie looks like /en/es  or  /auto/fr
    var match = document.cookie.match(/googtrans=\/[^/]+\/([^;/]+)/);
    return match && match[1] && match[1] !== "en";
  }

  document.addEventListener(
    "click",
    function (evt) {
      if (!isTranslationActive()) return;

      var a = evt.target && evt.target.closest
        ? evt.target.closest("a[href]")
        : null;
      if (!a) return;

      var href = a.getAttribute("href");
      if (!href) return;

      // Ignore anchors, external links, and special protocols
      if (href.charAt(0) === "#") return;
      if (/^[a-z][a-z0-9+\-.]*:/i.test(href) && !href.startsWith(location.origin)) return;

      // Force a full navigation so Google Translate re-processes the page
      evt.preventDefault();
      evt.stopImmediatePropagation();
      window.location.href = a.href;
    },
    true // capture phase — runs before Zensical's instant-nav handler
  );
})();
