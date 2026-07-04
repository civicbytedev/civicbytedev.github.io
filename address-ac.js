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

  /* Vertically place a fixed-position dropdown against its anchor rect:
     below when there's room, above when there isn't, and never taller
     than the space available. Shared by both pickers below. */
  function cbPlaceDropdown(dd, r) {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const gap = 6, margin = 10;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const room = Math.max(120, (flipUp ? spaceAbove : spaceBelow) - gap - margin);
    dd.style.maxHeight = Math.min(320, room) + 'px';
    // offsetHeight is the real rendered box (border included, capped by
    // max-height) — use it so the flipped-up list sits flush above the field.
    if (flipUp) dd.style.top = Math.max(margin, r.top - dd.offsetHeight - gap) + 'px';
    else        dd.style.top = (r.bottom + gap) + 'px';
  }

  /**
   * cbGeocode — resolve a free-text NYC address to its canonical identifiers
   * (BBL / BIN) via NYC GeoSearch. NYC Open Data stores street names in
   * inconsistent formats, so matching on streetname text is unreliable;
   * matching on BBL is exact. Returns null if the address can't be resolved.
   */
  window.cbGeocode = async function (text) {
    try {
      const res = await fetch(
        'https://geosearch.planninglabs.nyc/v2/search' +
        '?text=' + encodeURIComponent(text) + '&size=1'
      );
      if (!res.ok) return null;
      const json = await res.json();
      const f = json.features && json.features[0];
      if (!f || !f.properties) return null;
      const p = f.properties;
      const pad = (p.addendum && p.addendum.pad) || {};
      return {
        label: p.label || text,
        bbl: pad.bbl || null,
        bin: pad.bin || null,
        housenumber: p.housenumber || '',
        street: p.street || '',
        borough: p.borough || p.locality || ''
      };
    } catch (e) {
      return null;
    }
  };

  /* cbAutocomplete — remote type-ahead dropdown.
   *
   *   cbAutocomplete('addr', onSelectFn)                 → NYC address search
   *   cbAutocomplete('ll', onSelectFn, { source, ariaLabel })
   *
   * opts.source(q) is an async function returning an array of
   * { full, main, sub } suggestions; when omitted it defaults to NYC
   * GeoSearch address lookup. This lets non-address tools (e.g. Landlord
   * Watch, which searches HPD-registered owner names) reuse the exact same
   * dropdown, keyboard nav, and flip-up placement. */
  window.cbAutocomplete = function (inputId, onSelect, opts) {
    const input = document.getElementById(inputId);
    if (!input) return;
    opts = opts || {};

    const wrap = input.closest('.mock-search');

    /* ── Dropdown element ──────────────────────────────── */
    const dd = document.createElement('ul');
    dd.className = 'cb-ac-dd';
    dd.setAttribute('role', 'listbox');
    dd.setAttribute('aria-label', opts.ariaLabel || 'Address suggestions');
    document.body.appendChild(dd);

    let timer, suggs = [], activeIdx = -1;

    /* ── Position helper ───────────────────────────────── */
    /* Opens downward by default, but flips above the field when there
       isn't room below (e.g. the home hero, where the search sits low
       in the viewport). Height is capped to the space available so the
       list scrolls internally instead of running off-screen. */
    function reposition() {
      const anchor = wrap || input;
      const r = anchor.getBoundingClientRect();
      dd.style.left  = r.left + 'px';
      dd.style.width = r.width + 'px';
      cbPlaceDropdown(dd, r);
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
      const v = suggs[i].full;   // capture before hide() clears the list
      input.value = v;
      hide();
      onSelect(v);
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
    // Try /autocomplete first, then fall back to /search. NYC GeoSearch is a
    // custom PAD-only Pelias instance; passing a "layers" filter it doesn't
    // recognise yields an empty/error response, so we send only "text" — the
    // form shown in the official docs. /search is the same endpoint the tools
    // geocode against, so it is a reliable backstop if /autocomplete is empty.
    async function fetchFeatures(q) {
      const endpoints = ['autocomplete', 'search'];
      for (var i = 0; i < endpoints.length; i++) {
        try {
          const res = await fetch(
            'https://geosearch.planninglabs.nyc/v2/' + endpoints[i] +
            '?size=7&text=' + encodeURIComponent(q)
          );
          if (!res.ok) continue;
          const json = await res.json();
          const feats = (json.features || [])
            .filter(function (f) { return f.properties && f.properties.label; });
          if (feats.length) return feats;
        } catch (e) { /* try the next endpoint */ }
      }
      return [];
    }

    // Default source: NYC GeoSearch address suggestions.
    async function addressSource(q) {
      const feats = await fetchFeatures(q);
      return feats.map(function (f) {
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
    }
    const source = typeof opts.source === 'function' ? opts.source : addressSource;

    async function suggest(q) {
      try {
        suggs = (await source(q)) || [];
        if (!suggs.length) { hide(); return; }

        dd.innerHTML = suggs.map(function (s, i) {
          return '<li class="cb-ac-item" role="option" data-i="' + i + '">' +
            '<span class="cb-ac-main">' + esc(s.main) + '</span>' +
            (s.sub ? '<span class="cb-ac-sub">' + esc(s.sub) + '</span>' : '') +
            '</li>';
        }).join('');
        dd.classList.add('open');
        reposition();   // measure & place after content is in the DOM

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

  /**
   * cbLocalPicker — dropdown over a fixed local dataset.
   *
   * For tools whose data covers a known set of entries (e.g. demo mode),
   * the input becomes a combobox: focusing it lists every entry that has
   * data, and typing filters the list down, so users always pick
   * something that will actually return a result.
   *
   *   cbLocalPicker('sch', [{value, label, sub}], onSelectFn)
   */
  window.cbLocalPicker = function (inputId, items, onSelect) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');

    const dd = document.createElement('ul');
    dd.className = 'cb-ac-dd';
    dd.setAttribute('role', 'listbox');
    document.body.appendChild(dd);

    let shown = [], activeIdx = -1;

    function reposition() {
      const r = input.getBoundingClientRect();
      dd.style.left  = r.left + 'px';
      dd.style.width = r.width + 'px';
      cbPlaceDropdown(dd, r);
    }

    function hide() {
      shown = [];
      dd.innerHTML = '';
      dd.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
      activeIdx = -1;
    }

    function pick(i) {
      if (i < 0 || i >= shown.length) return;
      const v = shown[i].value;   // capture before hide() clears the list
      input.value = v;
      hide();
      onSelect(v);
    }

    function setActive(i) {
      dd.querySelectorAll('.cb-ac-item').forEach((el, j) =>
        el.classList.toggle('active', j === i)
      );
      activeIdx = i;
    }

    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function render() {
      const q = input.value.trim().toLowerCase();
      shown = !q ? items.slice() : items.filter(function (it) {
        return (it.value + ' ' + it.label + ' ' + (it.sub || ''))
          .toLowerCase().indexOf(q) !== -1;
      });
      if (!shown.length) { hide(); return; }
      dd.innerHTML = shown.map(function (it, i) {
        return '<li class="cb-ac-item" role="option" data-i="' + i + '">' +
          '<span class="cb-ac-main">' + esc(it.label) + '</span>' +
          (it.sub ? '<span class="cb-ac-sub">' + esc(it.sub) + '</span>' : '') +
          '</li>';
      }).join('');
      dd.classList.add('open');
      reposition();   // measure & place after content is in the DOM
      input.setAttribute('aria-expanded', 'true');
      activeIdx = -1;
      dd.querySelectorAll('.cb-ac-item').forEach(function (el) {
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          pick(parseInt(el.dataset.i, 10));
        });
      });
    }

    input.addEventListener('focus', render);
    input.addEventListener('input', render);

    input.addEventListener('keydown', function (e) {
      if (!dd.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIdx + 1, shown.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          pick(activeIdx);
        } else {
          hide();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      }
    }, true);

    document.addEventListener('mousedown', function (e) {
      if (!dd.contains(e.target) && e.target !== input) hide();
    });
    window.addEventListener('scroll', function () {
      if (dd.classList.contains('open')) reposition();
    }, true);
    window.addEventListener('resize', function () {
      if (dd.classList.contains('open')) reposition();
    });
  };
})();
