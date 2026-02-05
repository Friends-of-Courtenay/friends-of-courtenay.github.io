// Food Aid signup (static Zensical site) -> Easy!Appointments booking endpoints
// - Fetch available dates: GET /booking/get_unavailable_dates (and invert)
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

  function formatTime12h(time24) {
    // Expect HH:MM (or H:MM). Keep this small & dependency-free.
    var t = (time24 || "").toString().trim();
    var m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
    if (!m) return t;

    var hour = parseInt(m[1], 10);
    var minute = m[2];
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return t;

    var suffix = hour >= 12 ? "PM" : "AM";
    var hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;

    return hour12 + ":" + minute + " " + suffix;
  }

  function isoDate(date) {
    // YYYY-MM-DD (local, not UTC)
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function ymKey(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1);
  }

  function parseIsoDateString(iso) {
    var parts = (iso || "").split("-");
    if (parts.length !== 3) return null;

    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);

    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    return new Date(y, m - 1, d);
  }

  function shortDayLabel(date) {
    return WEEKDAYS[date.getDay()] + ", " + MONTHS[date.getMonth()] + " " + date.getDate();
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

  async function loadUnavailableDates(opts) {
    var apiBase = opts.apiBase.replace(/\/+$/, "");
    var url =
      apiBase +
      "/booking/get_unavailable_dates" +
      "?provider_id=" +
      encodeURIComponent(opts.providerId) +
      "&service_id=" +
      encodeURIComponent(opts.serviceId) +
      "&selected_date=" +
      encodeURIComponent(opts.date);

    return await fetchJson(url, { method: "GET", credentials: "omit" });
  }

  function setDatePlaceholder(dateSelect, text) {
    dateSelect.innerHTML = "";
    var opt = document.createElement("option");
    opt.value = "";
    opt.textContent = text;
    dateSelect.appendChild(opt);
    dateSelect.disabled = true;
  }

  function setDateOptions(dateSelect, dates) {
    if (!dates || !dates.length) {
      setDatePlaceholder(dateSelect, "No dates available");
      return;
    }

    dateSelect.innerHTML = "";

    for (var i = 0; i < dates.length; i++) {
      var iso = dates[i];
      var d = parseIsoDateString(iso);
      var o = document.createElement("option");
      o.value = iso;
      o.textContent = d ? shortDayLabel(d) : iso;
      dateSelect.appendChild(o);
    }

    dateSelect.disabled = false;
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
      o.textContent = formatTime12h(h);
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

    var nameInput = $("#food-aid-name", form);
    var emailInput = $("#food-aid-email", form);
    var dateSelect = $("#food-aid-date", form);
    var timeSelect = $("#food-aid-time", form);
    var statusEl = $("#food-aid-status", form);
    var submitBtn = $('button[type="submit"]', form);

    if (!nameInput || !emailInput || !dateSelect || !timeSelect) return;

    function isReadyToSubmit() {
      var name = (nameInput.value || "").trim();
      var email = (emailInput.value || "").trim();
      var date = (dateSelect.value || "").trim();
      var time = (timeSelect.value || "").trim();

      if (!name || !email || !date || !time) return false;

      // Respect native email validity when available.
      if (typeof emailInput.checkValidity === "function" && !emailInput.checkValidity()) return false;

      // Only require Turnstile when the widget is present on this form.
      var turnstileEl = $(".cf-turnstile", form);
      if (turnstileEl && !getTurnstileToken(form)) return false;

      return true;
    }

    function updateSubmitButtonUI() {
      if (!submitBtn) return;
      var ready = isReadyToSubmit();
      submitBtn.classList.toggle("md-button--primary", ready);
      submitBtn.classList.toggle("md-button--secondary", !ready);
    }

    // Keep UI aligned with the 7-day booking limit (server also enforces this).
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var max = addDays(today, 7);

    async function refreshTimes() {
      var date = dateSelect.value;
      if (!date) {
        setTimePlaceholder(timeSelect, "Select a date first");
        setStatus(statusEl, "Select a date to see available times.");
        updateSubmitButtonUI();
        return;
      }

      setStatus(statusEl, "Loading available times…");
      setTimePlaceholder(timeSelect, "Loading…");
      updateSubmitButtonUI();

      var result = await loadAvailableTimes({
        apiBase: apiBase,
        serviceId: serviceId,
        providerId: providerId,
        date: date,
      });

      if (!result.ok || !Array.isArray(result.data)) {
        setStatus(statusEl, "Could not load times. Please try again.", "error");
        updateSubmitButtonUI();
        return;
      }

      setTimeOptions(timeSelect, result.data);
      if (result.data.length) {
        setStatus(statusEl, "");
      } else {
        setStatus(statusEl, "No times available for that date.", "error");
      }
      updateSubmitButtonUI();
    }

    async function refreshDates() {
      setStatus(statusEl, "Loading available dates…");
      setDatePlaceholder(dateSelect, "Loading…");
      setTimePlaceholder(timeSelect, "Select a date first");
      updateSubmitButtonUI();

      // Candidate window (today -> next 7 days).
      var candidateDates = [];
      var d = new Date(today.getTime());
      while (d.getTime() <= max.getTime()) {
        candidateDates.push(isoDate(d));
        d = addDays(d, 1);
      }

      var startMonth = ymKey(today);
      var endMonth = ymKey(max);
      var monthKeys = startMonth === endMonth ? [startMonth] : [startMonth, endMonth];

      var unavailable = Object.create(null);
      var monthUnavailable = Object.create(null);
      var ok = true;

      for (var mi = 0; mi < monthKeys.length; mi++) {
        var monthKey = monthKeys[mi];
        var res = await loadUnavailableDates({
          apiBase: apiBase,
          serviceId: serviceId,
          providerId: providerId,
          date: monthKey + "-01",
        });

        if (!res.ok || !res.data) {
          ok = false;
          break;
        }

        if (res.data && res.data.is_month_unavailable) {
          monthUnavailable[monthKey] = true;
          continue;
        }

        if (!Array.isArray(res.data)) {
          ok = false;
          break;
        }

        for (var ui = 0; ui < res.data.length; ui++) {
          unavailable[res.data[ui]] = true;
        }
      }

      var availableDates = [];
      if (ok) {
        for (var ci = 0; ci < candidateDates.length; ci++) {
          var iso = candidateDates[ci];
          var mk = iso.slice(0, 7);
          if (monthUnavailable[mk]) continue;
          if (unavailable[iso]) continue;
          availableDates.push(iso);
        }
      } else {
        // Fallback: still allow booking (times will determine availability).
        availableDates = candidateDates;
      }

      if (!availableDates.length) {
        setDatePlaceholder(dateSelect, "No dates available");
        setTimePlaceholder(timeSelect, "No times available");
        setStatus(statusEl, "No pickup dates available in the next 7 days.", "error");
        updateSubmitButtonUI();
        return;
      }

      setDateOptions(dateSelect, availableDates);

      // Default to the first available date to reduce friction.
      dateSelect.value = availableDates[0];
      setStatus(statusEl, "");
      refreshTimes();
    }

    dateSelect.addEventListener("change", function () {
      refreshTimes();
      updateSubmitButtonUI();
    });

    nameInput.addEventListener("input", updateSubmitButtonUI);
    emailInput.addEventListener("input", updateSubmitButtonUI);
    timeSelect.addEventListener("change", updateSubmitButtonUI);

    // If Turnstile is used on this form, update button style when it completes/expires.
    var turnstileElForUi = $(".cf-turnstile", form);
    if (turnstileElForUi) {
      turnstileElForUi.addEventListener("turnstile:success", updateSubmitButtonUI);
      turnstileElForUi.addEventListener("turnstile:expired", updateSubmitButtonUI);
      turnstileElForUi.addEventListener("turnstile:error", updateSubmitButtonUI);
    }

    // Initial load.
    refreshDates();
    updateSubmitButtonUI();

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setStatus(statusEl, "");

      var name = (nameInput.value || "").trim();
      var email = (emailInput.value || "").trim();
      var date = (dateSelect.value || "").trim();
      var time = (timeSelect.value || "").trim();

      if (!name || !email || !date || !time) {
        setStatus(statusEl, "Please fill out name, email, date, and time.", "error");
        return;
      }

      // Normalize then validate email before submitting.
      emailInput.value = email;
      if (typeof emailInput.checkValidity === "function" && !emailInput.checkValidity()) {
        setStatus(statusEl, "Please enter a valid email address.", "error");
        updateSubmitButtonUI();
        return;
      }

      // Turnstile when testing: only require it when the widget is present on the form.
      var turnstileEl = $(".cf-turnstile", form);
      var turnstileToken = getTurnstileToken(form);
      if (turnstileEl && !turnstileToken) {
        setStatus(statusEl, "Please complete the CAPTCHA.", "error");
        updateSubmitButtonUI();
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
            // Easy!Appointments expects end_datetime to be present in some validation paths.
            // The server will calculate the real end time from the service duration later.
            end_datetime: startDatetime,
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
        setStatus(statusEl, "CAPTCHA failed. Redirecting…", "error");
        window.location.href =
          apiBaseTrimmed + "/booking?service=" + encodeURIComponent(serviceId) + "&provider=" + encodeURIComponent(providerId);
        return;
      }

      // Success is { appointment_id, appointment_hash }.
      if (result && result.ok && result.data && result.data.appointment_id) {
        var hash = result.data.appointment_hash || "";
        setStatus(statusEl, "Success! Redirecting…", "success");
        window.location.href = apiBaseTrimmed + "/booking_confirmation/of/" + encodeURIComponent(hash);
        return;
      }

      // Failure: hand off to Easy!Appointments booking page.
      setStatus(statusEl, "Could not submit. Redirecting…", "error");
      window.location.href =
        apiBaseTrimmed + "/booking?service=" + encodeURIComponent(serviceId) + "&provider=" + encodeURIComponent(providerId);
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

