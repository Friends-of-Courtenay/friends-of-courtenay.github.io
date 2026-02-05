// Food Aid signup (static Zensical site) -> Easy!Appointments booking endpoints
// - Fetch available hours: GET /booking/get_available_hours
// - Submit booking: POST /booking/register (JSON)
//
// No secrets are stored here. Turnstile is verified server-side by Easy!Appointments.

(function () {
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("food-aid-status--error", kind === "error");
    el.classList.toggle("food-aid-status--success", kind === "success");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function isoDate(date) {
    // YYYY-MM-DD (local, not UTC)
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function parseName(name) {
    var trimmed = (name || "").toString().trim().replace(/\s+/g, " ");
    if (!trimmed) return { first_name: "", last_name: "" };

    // Best-effort split: last token as last_name, rest as first_name.
    var parts = trimmed.split(" ");
    if (parts.length === 1) return { first_name: trimmed, last_name: "" };

    return {
      first_name: parts.slice(0, -1).join(" "),
      last_name: parts[parts.length - 1],
    };
  }

  function getTurnstileWidgetId(form) {
    var el = $(".cf-turnstile", form);
    if (!el) return null;
    return el.getAttribute("data-turnstile-widget-id");
  }

  function getTurnstileToken(form) {
    if (typeof window.turnstile === "undefined") return "";
    var widgetId = getTurnstileWidgetId(form);
    if (!widgetId) return "";
    try {
      return window.turnstile.getResponse(widgetId) || "";
    } catch (e) {
      return "";
    }
  }

  function resetTurnstile(form) {
    if (typeof window.turnstile === "undefined") return;
    var widgetId = getTurnstileWidgetId(form);
    if (!widgetId) return;
    try {
      window.turnstile.reset(widgetId);
    } catch (e) {
      // ignore
    }
  }

  async function fetchJson(url, options) {
    var res = await fetch(url, options || {});
    var text = await res.text();
    var data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = null;
    }
    return { ok: res.ok, status: res.status, data: data, raw: text };
  }

  async function loadAvailableTimes(opts) {
    var apiBase = opts.apiBase.replace(/\/+$/, "");
    var url =
      apiBase +
      "/booking/get_available_hours" +
      "?provider_id=" +
      encodeURIComponent(opts.providerId) +
      "&service_id=" +
      encodeURIComponent(opts.serviceId) +
      "&selected_date=" +
      encodeURIComponent(opts.date);

    return await fetchJson(url, { method: "GET", credentials: "omit" });
  }

  function setTimePlaceholder(timeSelect, text) {
    timeSelect.innerHTML = "";
    var opt = document.createElement("option");
    opt.value = "";
    opt.textContent = text;
    timeSelect.appendChild(opt);
    timeSelect.disabled = true;
  }

  function setTimeOptions(timeSelect, hours) {
    if (!hours || !hours.length) {
      setTimePlaceholder(timeSelect, "No times available");
      return;
    }

    timeSelect.innerHTML = "";

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a time";
    timeSelect.appendChild(placeholder);

    for (var i = 0; i < hours.length; i++) {
      var h = hours[i];
      var o = document.createElement("option");
      o.value = h;
      o.textContent = h;
      timeSelect.appendChild(o);
    }

    timeSelect.disabled = false;
  }

  async function init() {
    var form = $("#food-aid-form");
    if (!form) return;

    // Prevent duplicate event handlers with instant navigation.
    if (form.getAttribute("data-food-aid-initialized") === "true") return;
    form.setAttribute("data-food-aid-initialized", "true");

    var apiBase = form.getAttribute("data-api-base") || "https://signup.friendsofcourtenay.org";
    var serviceId = parseInt(form.getAttribute("data-service-id") || "1", 10);
    var providerId = parseInt(form.getAttribute("data-provider-id") || "2", 10);
    var successUrl = form.getAttribute("data-success-url") || "/food-aid/subscribe-success/";
    var errorUrl = form.getAttribute("data-error-url") || "/food-aid/subscribe-error/";

    var nameInput = $("#food-aid-name", form);
    var emailInput = $("#food-aid-email", form);
    var dateInput = $("#food-aid-date", form);
    var timeSelect = $("#food-aid-time", form);
    var statusEl = $("#food-aid-status", form);
    var submitBtn = $('button[type="submit"]', form);

    if (!nameInput || !emailInput || !dateInput || !timeSelect) return;

    // Keep UI aligned with the 7-day booking limit (server also enforces this).
    var today = new Date();
    var max = addDays(today, 7);
    dateInput.min = isoDate(today);
    dateInput.max = isoDate(max);

    // Default to today to reduce friction.
    if (!dateInput.value) {
      dateInput.value = isoDate(today);
    }

    async function refreshTimes() {
      var date = dateInput.value;
      if (!date) {
        setTimePlaceholder(timeSelect, "Select a date first");
        setStatus(statusEl, "Select a date to see available times.");
        return;
      }

      setStatus(statusEl, "Loading available times…");
      setTimePlaceholder(timeSelect, "Loading…");

      var result = await loadAvailableTimes({
        apiBase: apiBase,
        serviceId: serviceId,
        providerId: providerId,
        date: date,
      });

      if (!result.ok || !Array.isArray(result.data)) {
        setStatus(statusEl, "Could not load times. Please try again.", "error");
        return;
      }

      setTimeOptions(timeSelect, result.data);
      if (result.data.length) {
        setStatus(statusEl, "");
      } else {
        setStatus(statusEl, "No times available for that date.", "error");
      }
    }

    dateInput.addEventListener("change", function () {
      refreshTimes();
    });

    // Initial load.
    refreshTimes();

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setStatus(statusEl, "");

      var name = (nameInput.value || "").trim();
      var email = (emailInput.value || "").trim();
      var date = (dateInput.value || "").trim();
      var time = (timeSelect.value || "").trim();

      if (!name || !email || !date || !time) {
        setStatus(statusEl, "Please fill out name, email, date, and time.", "error");
        return;
      }

      var turnstileToken = getTurnstileToken(form);
      if (!turnstileToken) {
        setStatus(statusEl, "Please complete the CAPTCHA.", "error");
        return;
      }

      // Disable submit to prevent double-booking clicks.
      if (submitBtn) submitBtn.disabled = true;

      setStatus(statusEl, "Submitting…");

      var startDatetime = date + " " + time + ":00";
      var nameParts = parseName(name);

      var payload = {
        post_data: {
          appointment: {
            start_datetime: startDatetime,
            id_services: serviceId,
            id_users_provider: providerId,
          },
          customer: {
            first_name: nameParts.first_name,
            last_name: nameParts.last_name,
            email: email,
          },
          manage_mode: false,
        },
        turnstile_token: turnstileToken,
      };

      var apiBaseTrimmed = apiBase.replace(/\/+$/, "");
      var registerUrl = apiBaseTrimmed + "/booking/register";

      var result = null;
      try {
        result = await fetchJson(registerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "omit",
        });
      } catch (err) {
        result = { ok: false, status: 0, data: null };
      }

      // Turnstile failures come back as { captcha_verification: false } with 200.
      if (result && result.ok && result.data && result.data.captcha_verification === false) {
        setStatus(statusEl, "CAPTCHA failed. Please try again.", "error");
        resetTurnstile(form);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Success is { appointment_id, appointment_hash }.
      if (result && result.ok && result.data && result.data.appointment_id) {
        setStatus(statusEl, "Success! Redirecting…", "success");
        window.location.href = successUrl;
        return;
      }

      // If the server returned a structured error, keep the message generic (don't leak details).
      setStatus(statusEl, "Could not submit. Please try again.", "error");
      resetTurnstile(form);
      if (submitBtn) submitBtn.disabled = false;

      // Optional fallback page (kept for sharing / bookmarking).
      // Uncomment if you prefer always navigating to a static error page:
      // window.location.href = errorUrl;
    });
  }

  // Support instant navigation if present; otherwise normal load.
  if (typeof window.document$ !== "undefined") {
    window.document$.subscribe(function () {
      init();
    });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  }
})();

