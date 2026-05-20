/**
 * CivicByte — address autocomplete
 * Powered by NYC GeoSearch (geosearch.planninglabs.nyc)
 *
 * Usage:
 *   cbAutocomplete(inputId, onSelectFn)
 *   e.g.  cbAutocomplete('addr-input', () => runSearch());
 *
 * The dropdown is appended to <body> with position:fixed so it is never
 * clipped by ancestor overflow:hidden containers.
 */
(function () {
  'use strict';

  window.cbAutocomplete = function (inputId, onSelect) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const wrap = input.closest('.mock-search');

    /* ── Dropdown element ──────────────────────────────── */
    const dd = document.createElement('ul');
    dd.className = 'cb-ac-dd';
    dd.setAttribute('role', 'listbox');
    dd.setAttribute('aria-label', 'Address suggestions');
    document.body.appendChild(dd);

    let timer, suggs = [], activeIdx = -1;

    /* ── Position helper ───────────────────────────────── */
    function reposition() {
      const anchor = wrap || input;
      const r = anchor.getBoundingClientRect();
      dd.style.top   = (r.bottom + 6) + 'px';
      dd.style.left  = r.left + 'px';
      dd.style.width = r.width + 'px';
    }

    /* ── Hide / clear ──────────────────────────────────── */
    function hide() {
      suggs = [];
      dd.innerHTML = '';
      dd.classList.remove('open');
      activeIdx = -1;
    }

    /* ── Select item i ─────────────────────────────────── */
    function pick(i) {
      if (i < 0 || i >= suggs.length) return;
      input.value = suggs[i].full;
      hide();
      onSelect(suggs[i].full);
    }

    /* ── Keyboard highlight ────────────────────────────── */
    function setActive(i) {
      dd.querySelectorAll('.cb-ac-item').forEach((el, j) =>
        el.classList.toggle('active', j === i)
      );
      activeIdx = i;
    }

    /* ── Keyboard handler (capture — runs before inline handlers) ── */
    input.addEventListener('keydown', function (e) {
      if (!dd.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIdx + 1, suggs.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation(); // prevent page's own Enter → search
          pick(activeIdx);
        } else {
          hide();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      }
    }, true /* capture */);

    /* ── Typing → debounced fetch ─────────────────────── */
    input.addEventListener('input', function () {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 3) { hide(); return; }
      timer = setTimeout(function () { suggest(q); }, 280);
    });

    /* ── Close on outside click ───────────────────────── */
    document.addEventListener('mousedown', function (e) {
      if (!dd.contains(e.target) && e.target !== input) hide();
    });

    /* ── Reposition on scroll / resize ───────────────── */
    window.addEventListener('scroll', function () {
      if (dd.classList.contains('open')) reposition();
    }, true);
    window.addEventListener('resize', function () {
      if (dd.classList.contains('open')) reposition();
    });

    /* ── Fetch suggestions ────────────────────────────── */
    async function suggest(q) {
      try {
        const res = await fetch(
          'https://geosearch.planninglabs.nyc/v2/autocomplete' +
          '?text=' + encodeURIComponent(q) +
          '&size=7&layers=address'
        );
        const json = await res.json();
        suggs = (json.features || [])
          .filter(function (f) { return f.properties && f.properties.label; })
          .map(function (f) {
            // Strip ", USA" and trailing ", NY" so labels stay concise
            var lbl = f.properties.label
              .replace(/, USA$/, '')
              .replace(/, NY$/, '');
            var ci = lbl.indexOf(',');
            return {
              full: lbl,
              main: ci > 0 ? lbl.slice(0, ci) : lbl,
              sub:  ci > 0 ? lbl.slice(ci + 2) : ''
            };
          });

        if (!suggs.length) { hide(); return; }

        reposition();
        dd.innerHTML = suggs.map(function (s, i) {
          return '<li class="cb-ac-item" role="option" data-i="' + i + '">' +
            '<span class="cb-ac-main">' + esc(s.main) + '</span>' +
            (s.sub ? '<span class="cb-ac-sub">' + esc(s.sub) + '</span>' : '') +
            '</li>';
        }).join('');
        dd.classList.add('open');

        dd.querySelectorAll('.cb-ac-item').forEach(function (el) {
          el.addEventListener('mousedown', function (e) {
            e.preventDefault();
            pick(parseInt(el.dataset.i, 10));
          });
        });
      } catch (err) {
        hide();
      }
    }

    /* ── HTML escape ──────────────────────────────────── */
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  };
})();
