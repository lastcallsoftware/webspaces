(function () {
  "use strict";

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Scroll reveal for service cards
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  // Contact form submission
  var form = document.getElementById("contact-form");
  if (!form) return;

  var loadingEl = form.querySelector(".loading");
  var errorEl = form.querySelector(".error-message");
  var sentEl = form.querySelector(".sent-message");
  var submitButton = form.querySelector('button[type="submit"]');
  var backendBase = (document.querySelector('meta[name="backend-base-url"]') || {}).content || "";

  function showStatus(el) {
    [loadingEl, errorEl, sentEl].forEach(function (node) {
      if (node) node.style.display = "none";
    });
    if (el) el.style.display = "block";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (submitButton.disabled) return;

    var data = new FormData(form);
    var payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
      turnstileToken: String(data.get("cf-turnstile-response") || "").trim()
    };

    if (!payload.turnstileToken) {
      errorEl.textContent = "Please complete the Turnstile challenge.";
      showStatus(errorEl);
      return;
    }

    showStatus(loadingEl);
    submitButton.disabled = true;

    try {
      if (!backendBase || backendBase.includes("__BACKEND_BASE_URL__")) {
        throw new Error("Contact form is not configured. Please try again later.");
      }
      var res = await fetch(backendBase.replace(/\/+$/, "") + "/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        var backendMessage = "";
        try {
          var response = await res.json();
          if (response && typeof response.msg === "string") backendMessage = response.msg;
        } catch (_) {
          backendMessage = "";
        }
        throw new Error(backendMessage || "Unable to send your message (status " + res.status + "). Please try again.");
      }
      form.reset();
      showStatus(sentEl);
    } catch (error) {
      errorEl.textContent = error instanceof Error ? error.message : "Unable to send your message. Please try again.";
      showStatus(errorEl);
    } finally {
      submitButton.disabled = false;
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
