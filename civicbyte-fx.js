// CivicByte — broadsheet FX
// Scroll progress bar + reveal-on-scroll + console easter egg.
(function () {
  if (window.__cbFxLoaded) return;
  window.__cbFxLoaded = true;

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Masthead dateline — issue number ticks weekly from Vol. 01 No. 01 (Jan 28, 2026)
  try {
    const now = new Date();
    const epoch = new Date(2026, 0, 28); // issue No. 01
    const issue = Math.max(1, Math.floor((now - epoch) / (7 * 864e5)) + 1);
    const issueStr = 'No. ' + String(issue).padStart(2, '0');
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    document.querySelectorAll('.masthead .l span').forEach(el => {
      if (/No\.\s*\d+/.test(el.textContent)) {
        el.innerHTML = el.innerHTML.replace(/No\.\s*\d+/, issueStr);
      } else if (/\b20\d\d\b/.test(el.textContent)) {
        el.textContent = dateStr;
      }
    });
  } catch (e) {}

  // Scroll progress bar
  const bar = document.createElement('div');
  bar.id = 'cb-progress';
  document.documentElement.appendChild(bar);
  const updateBar = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? h.scrollTop / max : 0;
    bar.style.transform = 'scaleX(' + p + ')';
  };
  document.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  // Reveal observer (skipped when the reader prefers reduced motion)
  if (reduceMotion) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
  } else {
  const autoSelectors = [
    '.sec-head', '.idx', '.pr', '.tl', '.proj',
    '.hero h1', '.hero .lede', '.hero .actions',
    '.page-hero h1', '.page-hero .lede',
    '.quote-section blockquote', '.quote-section .k',
    '.datasheet', '.split > div'
  ];
  document.querySelectorAll(autoSelectors.join(',')).forEach((el, i) => {
    if (!el.hasAttribute('data-reveal')) {
      el.setAttribute('data-reveal', '');
      el.setAttribute('data-d', String((i % 4) + 1));
    }
  });
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
  }

  // Console easter egg
  try {
    const big = 'color:#b8432b;font-weight:bold;font-size:13px;line-height:1.3;font-family:monospace';
    const dim = 'color:#3a342b;font-size:11px;font-family:monospace';
    const ochre = 'color:#c88733;font-size:11px;font-family:monospace';
    console.log(
      '%c\n  CivicByte.\n  An independent NYC civic-data project.\n  Established 2024 · NYC\n\n' +
      '%cThanks for reading the source.\n' +
      '%cWant to contribute?  →  github.com/civicbytedev',
      big, dim, ochre);
  } catch (e) {}
})();
