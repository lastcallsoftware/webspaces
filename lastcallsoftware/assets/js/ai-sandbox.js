(function () {
  "use strict";

  var episodes = window.AI_SANDBOX_EPISODES || [];

  var feedEl = document.getElementById("episode-feed");
  var jumpListEl = document.getElementById("episode-jump-list");
  var statusEl = document.getElementById("feed-status");
  var statusTextEl = statusEl ? statusEl.querySelector(".feed-status-text") : null;

  if (!feedEl || !episodes.length) {
    if (statusEl) {
      statusEl.classList.add("done");
      if (statusTextEl) statusTextEl.textContent = "";
    }
    return;
  }

  // ==============================
  // Rendering
  // ==============================
  function formatEpisodeDate(value) {
    if (!value) return "";

    var parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(parsed);
    }

    return value;
  }

  function getEpisodeDateLabel(episode) {
    if (episode.airedOn) {
      return "Aired on " + formatEpisodeDate(episode.airedOn);
    }
    if (episode.scheduledFor) {
      var scheduled = formatEpisodeDate(episode.scheduledFor);
      if (scheduled && scheduled.toLowerCase() !== "coming soon") {
        return "Scheduled for " + scheduled;
      }
      return "Coming soon";
    }
    return "Coming soon";
  }

  function renderNextEpisode() {
    var section = document.getElementById("next-episode");
    var episode = episodes.find(function (item) { return !item.airedOn; });
    if (!section || !episode) return;

    section.querySelector("#next-episode-number").textContent = "Episode " + episode.number;
    section.querySelector("#next-episode-title").textContent = episode.title;
    section.querySelector("#next-episode-date").textContent = getEpisodeDateLabel(episode);
    section.querySelector("#next-episode-link").href = "#" + episode.id;

    if (episode.imageUrl) {
      var thumbnail = section.querySelector("#next-episode-thumbnail");
      thumbnail.alt = episode.imageAlt || episode.title;
      thumbnail.addEventListener("error", function () {
        thumbnail.hidden = true;
      }, { once: true });
      thumbnail.src = episode.imageUrl;
      thumbnail.hidden = false;
    }

    section.hidden = false;
  }

  function buildEpisodeCard(episode) {
    var card = document.createElement("article");
    card.className = "episode-card";
    card.id = episode.id;

    // ---- Body (text side) ----
    var body = document.createElement("div");
    body.className = "episode-card-body";

    var number = document.createElement("p");
    number.className = "episode-card-number";
    number.textContent = "Episode " + episode.number;

    var title = document.createElement("h3");
    title.className = "episode-card-title";
    title.textContent = episode.title;

    var meta = document.createElement("p");
    meta.className = "episode-card-meta";
    meta.textContent = getEpisodeDateLabel(episode);

    var desc = document.createElement("p");
    desc.className = "episode-card-desc";
    desc.textContent = episode.description;

    body.appendChild(number);
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(desc);

    // ---- Media (recording, upcoming image, or placeholder) ----
    var media = document.createElement("div");
    media.className = "episode-card-media";
    media.setAttribute("data-youtube-id", episode.youtubeId || "");

    var placeholder = document.createElement("div");
    placeholder.className = "episode-video-placeholder";
    placeholder.innerHTML =
      '<svg class="episode-video-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<circle cx="12" cy="12" r="9"></circle>' +
      '<path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor"></path>' +
      "</svg>" +
      '<span class="episode-video-placeholder-text">Recording coming soon</span>';
    if (!episode.youtubeId && episode.imageUrl) {
      var image = document.createElement("img");
      image.className = "episode-card-image";
      image.alt = episode.imageAlt || episode.title;
      image.loading = "lazy";
      image.addEventListener("error", function () {
        image.remove();
        media.appendChild(placeholder);
      }, { once: true });
      image.src = episode.imageUrl;
      media.appendChild(image);
    } else {
      media.appendChild(placeholder);
    }

    // ---- Footer ----
    var footer = document.createElement("div");
    footer.className = "episode-card-footer";

    // Resources block (only when resources are listed)
    if (episode.resources && episode.resources.length) {
      var resourcesBlock = document.createElement("div");
      resourcesBlock.className = "episode-resources";

      var resourcesLabel = document.createElement("p");
      resourcesLabel.className = "episode-resources-label";
      resourcesLabel.textContent = "Resources";

      var resourcesList = document.createElement("ul");
      resourcesList.className = "episode-resources-list";

      episode.resources.forEach(function (res) {
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.href = res.url;
        link.textContent = res.label;
        if (res.url === "#") {
          link.setAttribute("aria-disabled", "true");
          link.addEventListener("click", function (e) {
            e.preventDefault();
          });
        }
        li.appendChild(link);
        resourcesList.appendChild(li);
      });
      resourcesBlock.appendChild(resourcesLabel);
      resourcesBlock.appendChild(resourcesList);

      footer.appendChild(resourcesBlock);
    }

    var hasUpcomingSession = episode.scheduledFor &&
      episode.scheduledFor.trim().toLowerCase() !== "coming soon" &&
      !episode.airedOn;
    if (hasUpcomingSession && episode.rsvpUrl && episode.rsvpUrl !== "#") {
      var rsvpLink = document.createElement("a");
      rsvpLink.className = "episode-rsvp-link";
      rsvpLink.href = episode.rsvpUrl;
      if (episode.lumaEventId) {
        rsvpLink.classList.add("luma-checkout--button");
        rsvpLink.setAttribute("data-luma-action", "checkout");
        rsvpLink.setAttribute("data-luma-event-id", episode.lumaEventId);
      } else {
        rsvpLink.target = "_blank";
        rsvpLink.rel = "noopener noreferrer";
      }
      rsvpLink.textContent = "Register for Event";
      rsvpLink.setAttribute("aria-label", "RSVP for Episode " + episode.number);
      footer.appendChild(rsvpLink);
    }

    // Assemble
    card.appendChild(body);
    card.appendChild(media);
    card.appendChild(footer);

    return card;
  }

  function buildJumpLink(episode) {
    var li = document.createElement("li");
    var link = document.createElement("a");
    link.href = "#" + episode.id;
    link.textContent = episode.number;
    link.setAttribute("aria-label", "Jump to " + episode.title);
    li.appendChild(link);
    return li;
  }

  // ==============================
  // Episode feed
  // ==============================
  function renderEpisode(episode) {
    var card = buildEpisodeCard(episode);
    feedEl.appendChild(card);

    // Reveal animation on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.classList.add("in-view");
      });
    });

    // Lazy-load the YouTube embed when the card scrolls near the viewport
    lazyLoadVideo(card.querySelector(".episode-card-media"));
  }

  // ==============================
  // Lazy YouTube embed
  // ==============================
  function lazyLoadVideo(mediaEl) {
    if (!mediaEl || !("IntersectionObserver" in window)) return;

    var loaded = false;

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !loaded) {
            loaded = true;
            var videoId = mediaEl.getAttribute("data-youtube-id");
            if (!videoId) {
              obs.unobserve(mediaEl);
              return;
            }

            var iframe = document.createElement("iframe");
            iframe.src =
              "https://www.youtube.com/embed/" +
              encodeURIComponent(videoId);
            iframe.title = "YouTube video player";
            iframe.setAttribute(
              "allow",
              "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            );
            iframe.setAttribute("allowfullscreen", "");
            iframe.referrerPolicy = "strict-origin-when-cross-origin";

            var placeholder = mediaEl.querySelector(".episode-video-placeholder");
            if (placeholder) placeholder.remove();
            mediaEl.appendChild(iframe);

            obs.unobserve(mediaEl);
          }
        });
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(mediaEl);
  }

  // ==============================
  // Jump nav shortcuts
  // ==============================
  function buildJumpNav() {
    if (!jumpListEl) return;
    episodes.forEach(function (episode) {
      jumpListEl.appendChild(buildJumpLink(episode));
    });
  }

  buildJumpNav();

  // Render every episode immediately so all jump links have a target.
  episodes.forEach(renderEpisode);
  renderNextEpisode();
  if (statusEl) {
    statusEl.classList.add("done");
    if (statusTextEl) statusTextEl.textContent = "";
  }
})();
