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

    var desc = document.createElement("p");
    desc.className = "episode-card-desc";
    desc.textContent = episode.description;

    body.appendChild(number);
    body.appendChild(title);
    body.appendChild(desc);

    // ---- Media (video side) ----
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
    media.appendChild(placeholder);

    // ---- Footer ----
    var footer = document.createElement("div");
    footer.className = "episode-card-footer";

    // Resources block
    var resourcesBlock = document.createElement("div");
    resourcesBlock.className = "episode-resources";

    var resourcesLabel = document.createElement("p");
    resourcesLabel.className = "episode-resources-label";
    resourcesLabel.textContent = "Resources";

    var resourcesList = document.createElement("ul");
    resourcesList.className = "episode-resources-list";

    if (episode.resources && episode.resources.length) {
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
    }

    resourcesBlock.appendChild(resourcesLabel);
    resourcesBlock.appendChild(resourcesList);

    // YouTube link
    var ytLink = document.createElement("a");
    ytLink.className = "episode-yt-link";
    ytLink.href = episode.youtubeUrl || "#";
    ytLink.target = "_blank";
    ytLink.rel = "noopener noreferrer";
    ytLink.textContent = "Watch on YouTube";
    if (!episode.youtubeUrl || episode.youtubeUrl === "#") {
      ytLink.setAttribute("aria-disabled", "true");
      ytLink.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }

    footer.appendChild(resourcesBlock);
    footer.appendChild(ytLink);

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
  // Infinite scroll
  // ==============================
  var currentIndex = 0;
  var scrollObserver = null;

  function loadNext() {
    if (currentIndex >= episodes.length) {
      if (statusEl) {
        statusEl.classList.add("done");
        if (statusTextEl) statusTextEl.textContent = "";
      }
      if (scrollObserver) scrollObserver.disconnect();
      return;
    }

    var episode = episodes[currentIndex];
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

    currentIndex++;

    // If the sentinel is still in view after appending, keep loading
    // (the IntersectionObserver only fires on state transitions, so we
    // need to manually check when the sentinel stays visible).
    if (statusEl && isInViewport(statusEl)) {
      loadNext();
    }
  }

  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    var rootMargin = 600; // matches the observer's rootMargin
    return rect.top <= (window.innerHeight || document.documentElement.clientHeight) + rootMargin &&
           rect.bottom >= -rootMargin;
  }

  // ==============================
  // Scroll sentinel observation
  // ==============================
  if ("IntersectionObserver" in window && statusEl) {
    scrollObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadNext();
          }
        });
      },
      { rootMargin: "600px 0px" }
    );
    scrollObserver.observe(statusEl);
  } else {
    // Fallback: load all immediately
    while (currentIndex < episodes.length) loadNext();
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

  // Load the first episode immediately to avoid a blank above the sentinel
  loadNext();
})();