// CivicByte — global FX (loaded on every page).
// Adds: scroll progress bar, cursor spotlight, magnetic CTAs, reveal observer,
//       card cursor-glow, live-card tracking, console easter egg, h1 letter-stagger.
(function () {
  if (window.__cbFxLoaded) return;
  window.__cbFxLoaded = true;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Scroll progress bar ───
  const bar = document.createElement('div');
  bar.id = 'cb-progress';
  document.documentElement.appendChild(bar);
  const updateBar = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? h.scrollTop / max : 0;
    bar.style.transform = `scaleX(${p})`;
  };
  document.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  // ─── Cursor spotlight ───
  if (!reduce && matchMedia('(hover: hover)').matches) {
    const spot = document.createElement('div');
    spot.id = 'cb-spot';
    document.body.appendChild(spot);
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      spot.style.left = cx + 'px';
      spot.style.top = cy + 'px';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ─── Reveal observer ───
  // Auto-tag common section elements for reveal so all pages benefit.
  const autoSelectors = [
    '.sec-head', '.steps-row .step-card', '.src-card',
    '.related-card', '.tool-section h2', '.tool-section .k',
    '.info-card', '.preview-frame', '.tool-hero h1', '.tool-hero .desc',
    '.page-hero h1', '.page-hero .lede',
    '.proj', '.step', '.val', '.path', '.statband',
    '.quote blockquote', '.quote .k'
  ];
  document.querySelectorAll(autoSelectors.join(',')).forEach((el, i) => {
    if (el.matches('.reveal')) return; // existing reveal pattern handles it
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
  document.querySelectorAll('[data-reveal], .reveal').forEach(el => io.observe(el));

  // ─── Magnetic CTAs ───
  if (!reduce) {
    const mag = document.querySelectorAll('.btn, .cta, .nav .cta, .info-card .repo-link');
    mag.forEach(el => {
      let raf;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * 0.18;
        const dy = (e.clientY - cy) * 0.28;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.setProperty('--mx', dx + 'px');
          el.style.setProperty('--my', dy + 'px');
        });
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  // ─── Card cursor-glow ───
  const glowSelectors = '.livecard, .info-card, .preview-frame, .proj, .related-card, .step-card, .src-card, .step, .val, .path';
  document.querySelectorAll(glowSelectors).forEach(el => {
    if (!el.hasAttribute('data-glow')) el.setAttribute('data-glow', '');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--gy', (e.clientY - r.top) + 'px');
    });
  });

  // ─── h1 letter-stagger on hero h1's ───
  if (!reduce) {
    const heroH1 = document.querySelector('.hero h1, .page-hero h1, .tool-hero h1');
    if (heroH1 && !heroH1.dataset.cbLetters) {
      heroH1.dataset.cbLetters = '1';
      // Walk text nodes only — keep <em>, <u>, <svg> intact.
      // Wrap each WORD in a nowrap span so wrapping only happens at spaces,
      // then split the word into per-letter cb-letter spans inside it.
      const splitTextNodes = (node) => {
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            const parts = child.textContent.split(/(\s+)/);
            for (const part of parts) {
              if (part === '') continue;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
                continue;
              }
              const word = document.createElement('span');
              word.className = 'cb-word';
              for (const ch of part) {
                const s = document.createElement('span');
                s.className = 'cb-letter';
                s.textContent = ch;
                word.appendChild(s);
              }
              frag.appendChild(word);
            }
            child.parentNode.replaceChild(frag, child);
          } else if (child.nodeType === 1 && !['svg','script','style'].includes(child.tagName.toLowerCase())) {
            splitTextNodes(child);
          }
        }
      };
      splitTextNodes(heroH1);
      const letters = heroH1.querySelectorAll('.cb-letter');
      letters.forEach((s, i) => { s.style.transitionDelay = (40 + i * 22) + 'ms'; });
      requestAnimationFrame(() => letters.forEach(s => s.classList.add('in')));
    }
  }


  // ─── Mobile hamburger nav ───
  // .cb-ham and .nav-drawer are display:none by default (set in civicbyte.css top-level).
  // The ≤960px media query shows .cb-ham and positions .nav-drawer.
  // This JS only toggles classes — it never sets inline display, so desktop is untouched.
  const nav = document.querySelector('.nav');
  if (nav) {
    const ham = document.createElement('button');
    ham.className = 'cb-ham';
    ham.setAttribute('aria-label', 'Open navigation menu');
    ham.setAttribute('aria-expanded', 'false');
    ham.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(ham);

    const navUL  = nav.querySelector('ul');
    const navCTA = nav.querySelector('.cta');
    const drawer = document.createElement('div');
    drawer.className = 'nav-drawer';
    if (navUL)  drawer.appendChild(navUL.cloneNode(true));
    if (navCTA) {
      const mCTA = navCTA.cloneNode(true);
      mCTA.className = 'nd-cta';
      drawer.appendChild(mCTA);
    }
    nav.parentNode.insertBefore(drawer, nav.nextSibling);

    const toggle = (force) => {
      const open = force !== undefined ? force : !drawer.classList.contains('open');
      nav.classList.toggle('nav-open', open);
      drawer.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', String(open));
      ham.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };

    ham.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    drawer.addEventListener('click', e => { if (e.target.closest('a')) toggle(false); });
    document.addEventListener('click', e => {
      if (!nav.contains(e.target) && !drawer.contains(e.target)) toggle(false);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  }


  // ─── Console easter egg (for the curious admissions reader) ───
  try {
    const big = 'color:#b8432b;font-weight:bold;font-size:13px;line-height:1.3;font-family:monospace';
    const dim = 'color:#3a342b;font-size:11px;font-family:monospace';
    const ochre = 'color:#c88733;font-size:11px;font-family:monospace';
    console.log(
`%c
  ████  ██  ██  ██  ████      a public-data
  ██    ██      ██  ██        platform built
  ██    ██  ██  ██  ████      by students,
  ██    ██  ██  ██  ██        for the people
  ████  ██  ██  ██  ████  ◼   civicbyte.dev

%cThanks for reading the source.
%cWant to contribute?  →  github.com/civicbytedev`,
      big, dim, ochre);
  } catch (e) {}

  // ─── Wordmark refinement: make the "B" in "civicbyte" stand out ───
  // The mark links contain plain text "civicbyte" — split into civic + byte
  // and style the byte in brick. Skip if already split.
  document.querySelectorAll('a.mark').forEach(a => {
    if (a.dataset.cbSplit) return;
    a.dataset.cbSplit = '1';
    const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n; while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      const t = node.textContent;
      const m = t.match(/^(\s*)civicbyte(\s*)$/i);
      if (m) {
        const span = document.createElement('span');
        span.innerHTML = m[1] + '<span class="wm-civic">civic</span><span class="wm-byte">byte</span>' + m[2];
        node.parentNode.replaceChild(span, node);
      }
    });
  });
})();
