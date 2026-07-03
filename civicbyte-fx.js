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
      '.home-tools .cta-link'
    ];
    document.querySelectorAll(autoSelectors.join(',')).forEach((el, i) => {
      if (el.hasAttribute('data-reveal')) return;
      if (el.closest('[class*="state-"]')) return;
      el.setAttribute('data-reveal', '');
      el.setAttribute('data-d', String((i % 4) + 1));
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveals);
  } else {
    initReveals();
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
