// CivicByte — generative NYC night skyline for the home hero.
// Three parallax silhouette layers, twinkling windows, drifting stars,
// a blinking spire. Canvas-only, no assets. Respects reduced motion,
// pauses when the hero is off-screen or the tab is hidden.
(function () {
  const canvas = document.getElementById('skyline');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Seeded PRNG so the skyline is the same city on every visit.
  let seed = 20260703;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  let W = 0, H = 0, DPR = 1;
  let stars = [];
  let layers = [];   // back → front
  let spire = null;  // the Empire-State-style landmark
  let running = false;
  let visible = true;

  const LAYER_SPECS = [
    { color: '#161B26', winAlpha: 0.00, hMin: 0.18, hMax: 0.42, wMin: 40, wMax: 110, speed: 2.0 },
    { color: '#10141D', winAlpha: 0.55, hMin: 0.28, hMax: 0.58, wMin: 36, wMax: 90,  speed: 5.0 },
    { color: '#0A0D12', winAlpha: 0.95, hMin: 0.22, hMax: 0.50, wMin: 44, wMax: 120, speed: 9.0 }
  ];

  function buildCity() {
    stars = [];
    const starCount = Math.round(W / 9);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: rand() * W,
        y: rand() * H * 0.55,
        r: 0.4 + rand() * 0.9,
        base: 0.25 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
        freq: 0.3 + rand() * 0.8
      });
    }

    layers = LAYER_SPECS.map((spec, li) => {
      const buildings = [];
      // Cover 2× width so the layer can drift and wrap seamlessly.
      let x = -60;
      while (x < W * 2 + 60) {
        const bw = spec.wMin + rand() * (spec.wMax - spec.wMin);
        const bh = H * (spec.hMin + rand() * (spec.hMax - spec.hMin));
        const b = { x, w: bw, h: bh, windows: [], caps: [] };

        // Occasional stepped setbacks (very NYC).
        if (rand() < 0.35) {
          b.caps.push({ dx: bw * 0.2, w: bw * 0.6, h: bh * 0.12 });
          if (rand() < 0.4) b.caps.push({ dx: bw * 0.35, w: bw * 0.3, h: bh * 0.22 });
        }
        // Rooftop water tank or antenna, front layer only.
        if (li === 2 && rand() < 0.3) b.tank = { dx: bw * (0.2 + rand() * 0.5) };
        if (li === 2 && rand() < 0.22) b.mast = { dx: bw * (0.3 + rand() * 0.4), h: 12 + rand() * 22 };

        // Windows for lit layers.
        if (spec.winAlpha > 0) {
          const cw = 3.2, ch = 4.6, gx = 8.5, gy = 11;
          const cols = Math.floor((bw - 10) / gx);
          const rows = Math.floor((bh - 16) / gy);
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              if (rand() > 0.30) continue;   // most windows dark
              b.windows.push({
                x: 6 + c * gx, y: 10 + r * gy, w: cw, h: ch,
                a: 0.35 + rand() * 0.65,
                tw: rand() < 0.16,           // some windows twinkle
                phase: rand() * Math.PI * 2,
                freq: 0.15 + rand() * 0.5
              });
            }
          }
        }
        buildings.push(b);
        x += bw + 2 + rand() * 14;
      }
      return { spec, buildings, offset: 0 };
    });

    // One landmark spire, mid layer, around 60–70% across.
    spire = {
      x: W * (0.60 + rand() * 0.1),
      w: Math.max(54, W * 0.045),
      h: H * 0.66
    };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed = 20260703;
    buildCity();
    if (!running) draw(0);
  }

  function drawSpire(t) {
    const { x, w, h } = spire;
    const base = H;
    ctx.fillStyle = '#0D1119';
    // Stepped tiers
    ctx.fillRect(x, base - h * 0.55, w, h * 0.55);
    ctx.fillRect(x + w * 0.14, base - h * 0.75, w * 0.72, h * 0.25);
    ctx.fillRect(x + w * 0.30, base - h * 0.90, w * 0.40, h * 0.18);
    // Needle
    ctx.fillRect(x + w * 0.47, base - h, w * 0.06, h * 0.12);
    // Beacon — slow blink
    const blink = reduceMotion ? 0.8 : (0.35 + 0.65 * Math.abs(Math.sin(t * 0.9)));
    ctx.fillStyle = 'rgba(240,90,70,' + (0.55 * blink) + ')';
    ctx.beginPath();
    ctx.arc(x + w * 0.5, base - h + 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // A few lit floors on the tiers
    ctx.fillStyle = 'rgba(245,217,160,0.5)';
    for (let i = 0; i < 5; i++) {
      const wy = base - h * 0.52 + i * (h * 0.09);
      for (let wx = x + 6; wx < x + w - 6; wx += 9) {
        if ((i * 31 + wx) % 4 < 1.4) ctx.fillRect(wx, wy, 3, 4);
      }
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // Stars
    for (const s of stars) {
      const a = reduceMotion ? s.base :
        s.base * (0.55 + 0.45 * Math.sin(s.phase + t * s.freq));
      ctx.fillStyle = 'rgba(226,232,244,' + a.toFixed(3) + ')';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }

    // Layers, back to front
    layers.forEach((layer, li) => {
      const { spec, buildings } = layer;
      const drift = reduceMotion ? 0 : (t * spec.speed) % (W);

      if (li === 2) drawSpire(t);  // landmark sits between mid and front

      for (const b of buildings) {
        let bx = b.x - drift;
        if (bx + b.w < -80) bx += W * 2;   // wrap
        if (bx > W + 80) continue;

        const by = H - b.h;
        ctx.fillStyle = spec.color;
        ctx.fillRect(bx, by, b.w, b.h);
        for (const cap of b.caps) {
          ctx.fillRect(bx + cap.dx, by - cap.h, cap.w, cap.h);
        }
        if (b.tank) {
          ctx.fillRect(bx + b.tank.dx, by - 9, 10, 9);
          ctx.fillRect(bx + b.tank.dx + 1.5, by - 12, 7, 3);
        }
        if (b.mast) {
          ctx.fillRect(bx + b.mast.dx, by - b.mast.h, 1.4, b.mast.h);
        }

        if (spec.winAlpha > 0) {
          for (const win of b.windows) {
            let a = win.a * spec.winAlpha;
            if (win.tw && !reduceMotion) {
              a *= 0.3 + 0.7 * Math.abs(Math.sin(win.phase + t * win.freq));
            }
            ctx.fillStyle = 'rgba(245,217,160,' + a.toFixed(3) + ')';
            ctx.fillRect(bx + win.x, by + win.y, win.w, win.h);
          }
        }
      }
    });
  }

  let rafId = null;
  let start = null;
  function loop(now) {
    if (!start) start = now;
    draw((now - start) / 1000);
    rafId = requestAnimationFrame(loop);
  }
  function play() {
    if (running || reduceMotion) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.addEventListener('resize', () => {
    clearTimeout(window.__cbSkyRz);
    window.__cbSkyRz = setTimeout(resize, 120);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (visible) play();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && !document.hidden) play();
      else pause();
    }, { threshold: 0.02 }).observe(canvas);
  }

  resize();
  if (reduceMotion) draw(0);   // one static frame
  else play();
})();
