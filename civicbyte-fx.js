// CivicByte — motion
// Reveal-on-scroll with gentle stagger + console easter egg.
(function () {
  if (window.__cbFxLoaded) return;
  window.__cbFxLoaded = true;

  document.documentElement.classList.add('cb-js');

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initReveals() {
    // Auto-tag common building blocks so pages animate without markup changes.
    // Anything inside a toggled tool state (.state-*) is left alone.
    const autoSelectors = [
      '.section-head', '.ilist > li', '.endslug p', '.endslug .actions',
      '.bignums .cell', '.article-grid > *', '.form-grid > *',
      '.tool-grid', '.founder-note', '.home-tools .kicker', '.ht-title',
      '.home-tools .cta-link', '.site-foot .sf-inner'
    ];
    document.querySelectorAll(autoSelectors.join(',')).forEach((el, i) => {
      if (el.hasAttribute('data-reveal')) return;
      if (el.closest('[class*="state-"]')) return;
      el.setAttribute('data-reveal', '');
      el.setAttribute('data-d', String((i % 4) + 1));
    });

    // Tool cards stagger left-to-right as a wave, one delay step per card.
    document.querySelectorAll('.tool-card').forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.setAttribute('data-d', String((i % 6) + 1));
    });

    const els = document.querySelectorAll('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => {
      // Elements already in view on load show immediately — no pop-in.
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) el.classList.add('in');
      else io.observe(el);
    });
  }

  // Home hero — scroll parallax. The headline and search drift upward and
  // fade as you scroll past; the skyline sinks at a slower rate for depth.
  function initHeroParallax() {
    const hero = document.querySelector('.home-hero');
    if (!hero || reduceMotion) return;

    const center = hero.querySelector('.hh-center');
    const search = hero.querySelector('.hh-search');
    const canvas = hero.querySelector('.hh-canvas');
    const cue    = hero.querySelector('.hh-cue');

    // The entry animations fill forwards, which would override inline
    // transforms — drop each one once it has played.
    [center, search, cue].forEach(el => {
      if (el) el.addEventListener('animationend',
        () => { el.style.animation = 'none'; }, { once: true });
    });

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = hero.offsetHeight || 1;
        const y = Math.min(Math.max(window.scrollY, 0), h);
        const p = y / h;
        if (center) {
          center.style.transform = 'translateY(' + (y * 0.30) + 'px)';
          center.style.opacity = String(Math.max(0, 1 - p * 1.5));
        }
        if (search) {
          search.style.transform = 'translateY(' + (y * 0.18) + 'px)';
          search.style.opacity = String(Math.max(0, 1 - p * 1.8));
        }
        if (canvas) {
          canvas.style.transform = 'translateY(' + (y * 0.22) + 'px)';
        }
        if (cue) {
          cue.style.opacity = String(Math.max(0, 1 - p * 3));
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function init() {
    initReveals();
    initHeroParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Console easter egg
  try {
    const big = 'color:#141311;font-weight:bold;font-size:13px;line-height:1.3;font-family:monospace';
    const dim = 'color:#8A8375;font-size:11px;font-family:monospace';
    console.log(
      '%c\n  CivicByte.\n  Know your city.\n  An independent NYC civic-data project.\n\n' +
      '%cThanks for reading the source.\n' +
      'Want to contribute?  →  github.com/civicbytedev',
      big, dim);
  } catch (e) {}
})();
