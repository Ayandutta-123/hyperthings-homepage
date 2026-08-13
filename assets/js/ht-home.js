/**
 * Hyperthings homepage interactions + motion
 * Safe for Elementor — scoped to .ht-home
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var root = document.querySelector(".ht-home");
    if (!root) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isDesktop = window.matchMedia("(min-width: 769px)").matches;

    var header = root.querySelector(".ht-header");
    var menuBtn = root.querySelector(".ht-menu-btn");
    var overlay = root.querySelector(".ht-overlay");
    var closeBtn = root.querySelector(".ht-overlay__close");
    var overlayLinks = root.querySelectorAll(".ht-overlay__nav a");

    // Boot entrance
    requestAnimationFrame(function () {
      root.classList.add("is-ready");
    });

    // Sticky header state
    function onScroll() {
      if (!header) return;
      if (window.scrollY > 40) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Fullscreen menu
    function openMenu() {
      if (!overlay) return;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeMenu() {
      if (!overlay) return;
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    if (menuBtn) menuBtn.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    overlayLinks.forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Mark stagger / CTA groups as reveal targets
    root.querySelectorAll(".ht-cards, .ht-news, .ht-mosaic, .ht-industries, .ht-cta").forEach(function (el) {
      if (!el.classList.contains("ht-reveal") && !el.classList.contains("ht-stagger") && !el.classList.contains("ht-cta")) {
        /* cards/news/mosaic get stagger */
      }
      if (el.classList.contains("ht-cards") || el.classList.contains("ht-news") || el.classList.contains("ht-mosaic") || el.classList.contains("ht-industries")) {
        el.classList.add("ht-stagger");
      }
    });

    // Scroll reveal
    var reveals = root.querySelectorAll(".ht-reveal, .ht-stagger, .ht-cta");
    function revealNow(el) {
      el.classList.add("is-in");
    }

    if (reduceMotion) {
      reveals.forEach(revealNow);
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              revealNow(entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
      );
      reveals.forEach(function (el) {
        // Skip hero children — handled by is-ready sequence
        if (el.closest && el.closest(".ht-hero__content")) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) revealNow(el);
        else io.observe(el);
      });
    } else {
      reveals.forEach(revealNow);
    }

    // Stories carousel controls
    var carousel = root.querySelector("[data-ht-carousel]");
    var prev = root.querySelector("[data-ht-prev]");
    var next = root.querySelector("[data-ht-next]");
    function scrollCarousel(dir) {
      if (!carousel) return;
      var amount = Math.min(carousel.clientWidth * 0.85, 740);
      carousel.scrollBy({ left: dir * amount, behavior: "smooth" });
    }
    if (prev) prev.addEventListener("click", function () { scrollCarousel(-1); });
    if (next) next.addEventListener("click", function () { scrollCarousel(1); });

    // Industry video carousel
    (function initIndustryVideo() {
      var section = root.querySelector(".ht-industries-video");
      if (!section) return;

      var slides = Array.prototype.slice.call(section.querySelectorAll("[data-ht-industry-slide]"));
      var tabs = Array.prototype.slice.call(section.querySelectorAll("[data-ht-industry-tab]"));
      var progress = section.querySelector("[data-ht-industry-progress]");
      var btnPrev = section.querySelector("[data-ht-industry-prev]");
      var btnNext = section.querySelector("[data-ht-industry-next]");
      var index = 0;
      var timer = null;
      var DURATION = 7000;
      var inView = false;

      function pauseAllVideos() {
        slides.forEach(function (slide) {
          var v = slide.querySelector("video");
          if (!v) return;
          try { v.pause(); } catch (e) {}
        });
      }

      function playActiveVideo() {
        if (reduceMotion) return;
        var slide = slides[index];
        if (!slide) return;
        var v = slide.querySelector("video");
        if (!v) return;
        // Load only when shown
        if (v.preload === "none") v.preload = "metadata";
        var playPromise = v.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            /* Autoplay blocked or missing source — poster + Ken Burns still show */
          });
        }
      }

      function setProgress(running) {
        if (!progress) return;
        progress.classList.remove("is-running");
        // reflow to restart animation
        void progress.offsetWidth;
        if (running && !reduceMotion && inView) progress.classList.add("is-running");
      }

      function goTo(i) {
        if (!slides.length) return;
        index = (i + slides.length) % slides.length;
        slides.forEach(function (slide, n) {
          slide.classList.toggle("is-active", n === index);
        });
        tabs.forEach(function (tab, n) {
          var on = n === index;
          tab.classList.toggle("is-active", on);
          tab.setAttribute("aria-selected", on ? "true" : "false");
        });
        // Keep active tab visible on mobile
        if (tabs[index] && tabs[index].scrollIntoView) {
          tabs[index].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", inline: "center", block: "nearest" });
        }
        pauseAllVideos();
        if (inView) playActiveVideo();
        restartAuto();
      }

      function nextSlide() { goTo(index + 1); }
      function prevSlide() { goTo(index - 1); }

      function restartAuto() {
        if (timer) clearInterval(timer);
        timer = null;
        setProgress(false);
        if (reduceMotion || !inView) return;
        setProgress(true);
        timer = setInterval(nextSlide, DURATION);
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          var i = parseInt(tab.getAttribute("data-ht-industry-tab"), 10);
          if (!isNaN(i)) goTo(i);
        });
      });
      if (btnPrev) btnPrev.addEventListener("click", prevSlide);
      if (btnNext) btnNext.addEventListener("click", nextSlide);

      // Pause when off-screen (saves mobile data/CPU)
      if ("IntersectionObserver" in window) {
        var vio = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              inView = entry.isIntersecting;
              if (inView) {
                playActiveVideo();
                restartAuto();
              } else {
                pauseAllVideos();
                if (timer) clearInterval(timer);
                timer = null;
                setProgress(false);
              }
            });
          },
          { threshold: 0.35 }
        );
        vio.observe(section);
      } else {
        inView = true;
        playActiveVideo();
        restartAuto();
      }

      // Pause autoplay when tab hidden
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          pauseAllVideos();
          if (timer) clearInterval(timer);
          timer = null;
          setProgress(false);
        } else if (inView) {
          playActiveVideo();
          restartAuto();
        }
      });
    })();
    // Hero collage — cycle active panel spotlight
    var heroPanels = root.querySelectorAll(".ht-hero__panel");
    if (heroPanels.length && !reduceMotion) {
      var heroIdx = 0;
      heroPanels[0].classList.add("is-active");
      window.setInterval(function () {
        heroPanels[heroIdx].classList.remove("is-active");
        heroIdx = (heroIdx + 1) % heroPanels.length;
        heroPanels[heroIdx].classList.add("is-active");
      }, 3200);
    } else if (heroPanels.length) {
      heroPanels[0].classList.add("is-active");
    }

    // After collage: crisp full-bleed feature slides (no overlap with collage)
    (function () {
      var heroEl = root.querySelector(".ht-hero");
      var features = Array.prototype.slice.call(root.querySelectorAll("[data-ht-hero-feature]"));
      if (!heroEl || !features.length || reduceMotion) return;

      var collageMs = 7000;
      var featureMs = 2800;
      var featIdx = 0;
      var phaseTimer = null;

      function clearPhase() {
        if (phaseTimer) {
          window.clearTimeout(phaseTimer);
          phaseTimer = null;
        }
      }

      function showFeature(n) {
        var prev = featIdx;
        features.forEach(function (el, i) {
          el.classList.toggle("is-on", i === n);
          el.classList.toggle("is-out", i === prev && i !== n);
        });
        if (prev !== n) {
          window.setTimeout(function () {
            features[prev].classList.remove("is-out");
          }, 750);
        }
        featIdx = n;
      }

      function runFeatures() {
        heroEl.classList.add("is-feature");
        showFeature(0);
        var step = 0;
        function nextFeature() {
          step += 1;
          if (step >= features.length) {
            heroEl.classList.remove("is-feature");
            features.forEach(function (el) {
              el.classList.remove("is-on", "is-out");
            });
            features[0].classList.add("is-on");
            featIdx = 0;
            clearPhase();
            phaseTimer = window.setTimeout(runFeatures, collageMs);
            return;
          }
          showFeature(step);
          clearPhase();
          phaseTimer = window.setTimeout(nextFeature, featureMs);
        }
        clearPhase();
        phaseTimer = window.setTimeout(nextFeature, featureMs);
      }

      clearPhase();
      phaseTimer = window.setTimeout(runFeatures, collageMs);
    })();

    // Soft parallax (desktop, motion ok)
    
    // Hero background video — ensure muted autoplay after load
    var heroVideo = root.querySelector(".ht-hero__video");
    if (heroVideo) {
      heroVideo.muted = true;
      var tryPlay = function () {
        var p = heroVideo.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      };
      tryPlay();
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) tryPlay();
      });
    }

    var heroBg = root.querySelector(".ht-hero__bg");
    var parallaxEls = root.querySelectorAll("[data-ht-parallax]");
    if (!reduceMotion && isDesktop) {
      var ticking = false;
      window.addEventListener(
        "scroll",
        function () {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(function () {
            var y = window.scrollY;
            if (heroBg && y < window.innerHeight * 1.2) {
              heroBg.style.transform = "translate3d(0," + y * 0.22 + "px,0)";
            }
            parallaxEls.forEach(function (el) {
              var rect = el.getBoundingClientRect();
              var mid = rect.top + rect.height / 2 - window.innerHeight / 2;
              var speed = parseFloat(el.getAttribute("data-ht-parallax") || "0.08");
              el.style.transform = "translate3d(0," + mid * -speed + "px,0)";
            });
            ticking = false;
          });
        },
        { passive: true }
      );
    }

    // Smooth in-page anchors
    root.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    });

    // Subtle magnetic pull on primary buttons (desktop)
    if (!reduceMotion && isDesktop) {
      root.querySelectorAll(".ht-btn--solid, .ht-btn--red").forEach(function (btn) {
        btn.addEventListener("pointermove", function (e) {
          var r = btn.getBoundingClientRect();
          var x = e.clientX - r.left - r.width / 2;
          var y = e.clientY - r.top - r.height / 2;
          btn.style.transform = "translate(" + x * 0.12 + "px," + (y * 0.12 - 3) + "px)";
        });
        btn.addEventListener("pointerleave", function () {
          btn.style.transform = "";
        });
      });
    }
  });
})();
