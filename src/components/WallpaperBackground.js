import React, { useRef, useEffect } from 'react';
import './WallpaperBackground.css';

// Throttled RAF (~30fps)
function useAnimatedCanvas(draw) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animId;
    let last = 0;
    const INTERVAL = 1000 / 15;
    const loop = (ts) => {
      animId = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (ts - last < INTERVAL) return;
      last = ts;
      draw(canvas, canvas.getContext('2d'));
    };
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [draw]);
  return canvasRef;
}

// ── Galaxy ────────────────────────────────────────────────────────────────────
function GalaxyCanvas() {
  const state = useRef(null);

  const draw = React.useCallback((canvas, ctx) => {
    const w = canvas.width, h = canvas.height;
    if (!state.current || state.current.w !== w || state.current.h !== h) {
      const stars = Array.from({ length: 400 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        alpha: Math.random(),
        da: (Math.random() * 0.015 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
        color: ['#ffffff','#cce0ff','#ffd6ff','#d6f0ff','#ffe8cc'][Math.floor(Math.random() * 5)],
      }));
      state.current = { w, h, stars, t: 0 };
    }
    const { stars } = state.current;
    state.current.t += 0.002;

    // Background
    const bg = ctx.createRadialGradient(w * 0.45, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    bg.addColorStop(0, '#0e0828');
    bg.addColorStop(0.4, '#07051a');
    bg.addColorStop(1, '#020209');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Nebula patches
    const nebulas = [
      { x: w * 0.3, y: h * 0.45, r: w * 0.28, c: 'rgba(90,40,160,0.09)' },
      { x: w * 0.72, y: h * 0.55, r: w * 0.22, c: 'rgba(30,70,180,0.07)' },
      { x: w * 0.55, y: h * 0.25, r: w * 0.18, c: 'rgba(140,30,110,0.06)' },
      { x: w * 0.15, y: h * 0.75, r: w * 0.16, c: 'rgba(60,100,200,0.05)' },
    ];
    for (const n of nebulas) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Stars
    for (const s of stars) {
      s.alpha += s.da;
      if (s.alpha <= 0.05) { s.da = Math.abs(s.da); }
      if (s.alpha >= 1) { s.da = -Math.abs(s.da); }
      ctx.globalAlpha = Math.max(0.05, Math.min(1, s.alpha));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Occasional glow stars
    for (let i = 0; i < 6; i++) {
      const s = stars[i * 60];
      if (s.alpha > 0.7) {
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        glow.addColorStop(0, `rgba(180,160,255,${s.alpha * 0.18})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const canvasRef = useAnimatedCanvas(draw);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}

// Draw a star with diffraction spikes (shared helper)
function drawStar(ctx, x, y, r, alpha, colorStr) {
  if (alpha <= 0.01) return;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  halo.addColorStop(0, `rgba(${colorStr},${Math.min(1, alpha * 0.22)})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(${colorStr},${alpha})`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (r > 1.1 && alpha > 0.3) {
    const len = r * 7;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${colorStr},${alpha * 0.44})`;
    ctx.lineWidth = Math.max(0.4, r * 0.28);
    ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x + len, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); ctx.stroke();
    ctx.strokeStyle = `rgba(${colorStr},${alpha * 0.16})`;
    ctx.lineWidth = Math.max(0.25, r * 0.15);
    const d = len * 0.52;
    ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
    ctx.restore();
  }
}

// ── Night City ────────────────────────────────────────────────────────────────
function CityCanvas() {
  const state = useRef(null);

  const draw = React.useCallback((canvas, ctx) => {
    const w = canvas.width, h = canvas.height;
    const ground = h - 60;

    if (!state.current || state.current.w !== w || state.current.h !== h) {
      // Layer 0: far distant silhouette buildings
      const farBuildings = [];
      let x = -30;
      while (x < w + 50) {
        const bw = 28 + Math.random() * 55;
        const bh = 35 + Math.random() * h * 0.22;
        farBuildings.push({ x, y: ground - bh, w: bw, h: bh });
        x += bw + Math.random() * 5;
      }
      // Layer 1: mid buildings with windows
      const midBuildings = [];
      x = -40;
      while (x < w + 70) {
        const bw = 36 + Math.random() * 75;
        const bh = 60 + Math.random() * h * 0.42;
        const hasStep = Math.random() > 0.55;
        const stepW = hasStep ? bw * (0.45 + Math.random() * 0.25) : bw;
        const stepH = hasStep ? bh * (0.28 + Math.random() * 0.18) : 0;
        const windows = [];
        for (let wy = 8; wy < bh - 8; wy += 12) {
          for (let wx = 5; wx < bw - 5; wx += 12) {
            windows.push({ ox: wx, oy: wy, lit: Math.random() > 0.44, timer: Math.floor(Math.random()*280+70), warm: Math.random() > 0.35 });
          }
        }
        const hasAntenna = Math.random() > 0.5;
        midBuildings.push({ x, y: ground - bh, w: bw, h: bh, windows, shade: `hsl(220,${7+Math.random()*8}%,${5+Math.random()*5}%)`, hasStep, stepW, stepH, hasAntenna });
        x += bw + 1 + Math.random() * 6;
      }
      // Layer 2: close-range large buildings (fewer, taller)
      const nearBuildings = [];
      x = -60;
      while (x < w + 80) {
        const bw = 55 + Math.random() * 110;
        const bh = 100 + Math.random() * h * 0.55;
        const windows = [];
        for (let wy = 10; wy < bh - 10; wy += 14) {
          for (let wx = 6; wx < bw - 6; wx += 14) {
            windows.push({ ox: wx, oy: wy, lit: Math.random() > 0.5, timer: Math.floor(Math.random()*320+90), warm: Math.random() > 0.3 });
          }
        }
        nearBuildings.push({ x, y: ground - bh, w: bw, h: bh, windows, shade: `hsl(215,${6+Math.random()*7}%,${4+Math.random()*4}%)` });
        x += bw + 2 + Math.random() * 30;
      }
      // Cars — 4 lanes (2 each direction)
      const cars = [];
      for (let i = 0; i < 28; i++) {
        const lane = i % 4;
        const dir = lane < 2 ? 1 : -1;
        const cw = 28 + Math.random() * 18;
        cars.push({
          x: Math.random() * w,
          y: ground + 8 + lane * 13,
          speed: 0.6 + Math.random() * 2.5,
          color: ['#ff3333','#ffbb22','#3388ff','#44ffcc','#ffffff','#ffddaa'][Math.floor(Math.random()*6)],
          cw, ch: 7, dir,
          cabW: cw * 0.55, cabH: 4,
        });
      }
      // Streetlights
      const lights = [];
      for (let lx = 60; lx < w; lx += 110 + Math.random() * 40) {
        lights.push({ x: lx, side: Math.random() > 0.5 ? 1 : -1 });
      }
      // Stars
      const stars = [];
      const starColorStrs = ['200,220,255','255,255,255','255,240,200','220,200,255','200,240,255'];
      for (let i = 0; i < 180; i++) {
        const sc = Math.random();
        stars.push({
          x: Math.random() * w, y: Math.random() * h * 0.52,
          r: sc > 0.92 ? Math.random()*1.1+1.4 : sc > 0.75 ? Math.random()*0.6+0.6 : Math.random()*0.35+0.14,
          a: Math.random() * 0.7 + 0.12,
          twinkle: Math.random() * Math.PI * 2,
          ts: Math.random() * 0.03 + 0.006,
          colorStr: starColorStrs[Math.floor(Math.random() * starColorStrs.length)],
          bright: sc > 0.88,
        });
      }
      // Clouds
      const clouds = Array.from({ length: 5 }, () => ({
        x: Math.random() * w, y: h * 0.06 + Math.random() * h * 0.18,
        blobs: Array.from({ length: 3 + Math.floor(Math.random()*3) }, () => ({
          ox: (Math.random()-0.5)*80, oy: (Math.random()-0.5)*22,
          r: 45 + Math.random() * 65,
        })),
        speed: 0.06 + Math.random() * 0.1,
      }));
      state.current = { w, h, farBuildings, midBuildings, nearBuildings, cars, lights, stars, clouds, t: 0 };
    }

    const { farBuildings, midBuildings, nearBuildings, cars, lights, stars, clouds } = state.current;
    state.current.t++;

    // ── Sky ──────────────────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#010508');
    sky.addColorStop(0.45, '#040d18');
    sky.addColorStop(0.8, '#071422');
    sky.addColorStop(1, '#0f1f30');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of stars) {
      s.twinkle += s.ts;
      const a = s.a * (0.5 + 0.5 * Math.sin(s.twinkle));
      drawStar(ctx, s.x, s.y, s.r, a, s.colorStr);
    }

    // Moon: radial gradient body + atmospheric halo ring + craters
    const moonX = w * 0.82, moonY = h * 0.10;
    const moonAtmo = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 70);
    moonAtmo.addColorStop(0, 'rgba(180,205,255,0.12)');
    moonAtmo.addColorStop(0.45, 'rgba(140,170,240,0.05)');
    moonAtmo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = moonAtmo; ctx.beginPath(); ctx.arc(moonX, moonY, 70, 0, Math.PI*2); ctx.fill();
    // Moon body (limb darkening via radial gradient)
    const moonBody = ctx.createRadialGradient(moonX-4, moonY-4, 2, moonX, moonY, 18);
    moonBody.addColorStop(0, '#eef3ff');
    moonBody.addColorStop(0.55, '#d8e4f8');
    moonBody.addColorStop(0.85, '#b8cce8');
    moonBody.addColorStop(1, '#8aa8d8');
    ctx.fillStyle = moonBody; ctx.beginPath(); ctx.arc(moonX, moonY, 18, 0, Math.PI*2); ctx.fill();
    // Craters
    const craters = [{ox:-5,oy:-3,r:3.5},{ox:6,oy:4,r:2.2},{ox:-1,oy:7,r:1.5},{ox:8,oy:-5,r:1.2}];
    for (const c of craters) {
      ctx.fillStyle = 'rgba(130,155,200,0.35)';
      ctx.beginPath(); ctx.arc(moonX+c.ox, moonY+c.oy, c.r, 0, Math.PI*2); ctx.fill();
    }

    // Soft clouds
    for (const cl of clouds) {
      cl.x += cl.speed;
      if (cl.x > w + 200) cl.x = -200;
      for (const b of cl.blobs) {
        const cg = ctx.createRadialGradient(cl.x+b.ox, cl.y+b.oy, 0, cl.x+b.ox, cl.y+b.oy, b.r);
        cg.addColorStop(0, 'rgba(18,30,52,0.32)');
        cg.addColorStop(0.5, 'rgba(12,20,38,0.14)');
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cl.x+b.ox, cl.y+b.oy, b.r, 0, Math.PI*2); ctx.fill();
      }
    }

    // Horizon ambient glow
    const hglow = ctx.createLinearGradient(0, ground - 80, 0, ground);
    hglow.addColorStop(0, 'rgba(10,40,90,0)');
    hglow.addColorStop(1, 'rgba(12,48,110,0.32)');
    ctx.fillStyle = hglow; ctx.fillRect(0, ground - 80, w, 80);

    // Far buildings (very dark, blue-tinted, no windows)
    ctx.fillStyle = '#050a12';
    for (const b of farBuildings) ctx.fillRect(b.x, b.y, b.w, b.h + 60);
    // Aerial haze over far buildings
    const farHaze = ctx.createLinearGradient(0, ground * 0.45, 0, ground);
    farHaze.addColorStop(0, 'rgba(8,18,40,0)');
    farHaze.addColorStop(1, 'rgba(8,18,40,0.28)');
    ctx.fillStyle = farHaze; ctx.fillRect(0, ground * 0.45, w, ground * 0.55);

    // Mid buildings
    for (const b of midBuildings) {
      ctx.fillStyle = b.shade;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Step setback
      if (b.hasStep && b.stepH > 0) {
        ctx.fillStyle = b.shade;
        const stepY = b.y - b.stepH;
        ctx.fillRect(b.x + (b.w - b.stepW) * 0.5, stepY, b.stepW, b.stepH);
      }
      // Antenna
      if (b.hasAntenna) {
        ctx.strokeStyle = 'rgba(120,140,170,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.x + b.w*0.5, b.y); ctx.lineTo(b.x + b.w*0.5, b.y - 12); ctx.stroke();
        // blinking light
        const blink = Math.sin(state.current.t * 0.08 + b.x) > 0.6;
        if (blink) {
          ctx.fillStyle = 'rgba(255,80,80,0.85)';
          ctx.beginPath(); ctx.arc(b.x + b.w*0.5, b.y - 13, 1.5, 0, Math.PI*2); ctx.fill();
        }
      }
      // Windows
      for (const win of b.windows) {
        win.timer--;
        if (win.timer <= 0) { win.lit = !win.lit; win.timer = 70 + Math.floor(Math.random()*300); }
        if (!win.lit) continue;
        const wc = win.warm ? '255,235,170' : '180,210,255';
        ctx.fillStyle = `rgba(${wc},0.78)`;
        ctx.fillRect(b.x+win.ox, b.y+win.oy, 6, 4);
        ctx.fillStyle = `rgba(${wc},0.06)`;
        ctx.fillRect(b.x+win.ox-2, b.y+win.oy-2, 10, 8);
      }
    }

    // Near buildings
    for (const b of nearBuildings) {
      ctx.fillStyle = b.shade;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      for (const win of b.windows) {
        win.timer--;
        if (win.timer <= 0) { win.lit = !win.lit; win.timer = 80 + Math.floor(Math.random()*320); }
        if (!win.lit) continue;
        const wc = win.warm ? '255,230,155' : '170,205,255';
        ctx.fillStyle = `rgba(${wc},0.82)`;
        ctx.fillRect(b.x+win.ox, b.y+win.oy, 7, 5);
        ctx.fillStyle = `rgba(${wc},0.07)`;
        ctx.fillRect(b.x+win.ox-3, b.y+win.oy-2, 13, 9);
      }
    }

    // ── Road ──────────────────────────────────────────────────────────────────
    const road = ctx.createLinearGradient(0, ground, 0, h);
    road.addColorStop(0, '#0c0f16');
    road.addColorStop(1, '#060810');
    ctx.fillStyle = road; ctx.fillRect(0, ground, w, h - ground);

    // Sidewalk line
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, ground, w, 1);

    // Lane divider dashes
    ctx.fillStyle = 'rgba(255,240,160,0.11)';
    for (let dx = 0; dx < w; dx += 36) ctx.fillRect(dx, ground + 30, 20, 2);

    // Wet road reflections
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (const b of midBuildings) {
      const litWins = b.windows.filter(ww => ww.lit);
      if (litWins.length === 0) continue;
      const rg = ctx.createLinearGradient(b.x + b.w/2, ground, b.x + b.w/2, h);
      rg.addColorStop(0, litWins[0].warm ? 'rgba(255,235,170,1)' : 'rgba(170,210,255,1)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(b.x + b.w*0.15, ground, b.w*0.7, h - ground);
    }
    ctx.restore();

    // ── Streetlights ──────────────────────────────────────────────────────────
    for (const sl of lights) {
      const lx = sl.x, ly = ground - 2;
      // Pole
      ctx.strokeStyle = 'rgba(100,120,150,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 28); ctx.stroke();
      // Arm
      ctx.beginPath(); ctx.moveTo(lx, ly - 28); ctx.lineTo(lx + sl.side * 12, ly - 30); ctx.stroke();
      // Lamp glow cone on road
      const lampX = lx + sl.side * 12;
      const lampY = ly - 30;
      const cone = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY + 20, 35);
      cone.addColorStop(0, 'rgba(255,220,100,0.18)');
      cone.addColorStop(0.6, 'rgba(255,200,80,0.04)');
      cone.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cone; ctx.fillRect(lampX - 36, lampY, 72, 60);
      // Lamp dot
      ctx.fillStyle = 'rgba(255,235,160,0.9)';
      ctx.beginPath(); ctx.arc(lampX, lampY, 2, 0, Math.PI*2); ctx.fill();
    }

    // ── Cars ──────────────────────────────────────────────────────────────────
    for (const c of cars) {
      c.x += c.speed * c.dir;
      if (c.x > w + 50) c.x = -50;
      if (c.x < -50) c.x = w + 50;

      // Body (longer low part)
      ctx.fillStyle = c.color; ctx.globalAlpha = 0.78;
      ctx.fillRect(c.x - c.cw/2, c.y - c.ch, c.cw, c.ch);
      // Cabin (narrower, taller, centered)
      const cabX = c.x - c.cabW/2 + (c.dir > 0 ? 2 : -2);
      ctx.fillStyle = `rgba(8,12,20,0.85)`;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(cabX, c.y - c.ch - c.cabH, c.cabW, c.cabH);
      ctx.globalAlpha = 1;

      // Headlights or taillights
      if (c.dir > 0) {
        const hlx = c.x + c.cw/2;
        const hl = ctx.createRadialGradient(hlx, c.y - 3, 0, hlx + 14, c.y - 3, 22);
        hl.addColorStop(0, 'rgba(255,252,200,0.65)');
        hl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hl; ctx.fillRect(hlx - 4, c.y - 22, 40, 40);
        ctx.fillStyle = '#fffde0'; ctx.fillRect(hlx - 2, c.y - 5, 3, 3);
      } else {
        const tlx = c.x - c.cw/2;
        const tl = ctx.createRadialGradient(tlx, c.y - 3, 0, tlx - 10, c.y - 3, 16);
        tl.addColorStop(0, 'rgba(255,50,40,0.55)');
        tl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tl; ctx.fillRect(tlx - 32, c.y - 18, 36, 30);
        ctx.fillStyle = '#ff3322'; ctx.fillRect(tlx - 1, c.y - 5, 3, 3);
      }
    }
  }, []);

  const canvasRef = useAnimatedCanvas(draw);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Modern / Cyberpunk City ───────────────────────────────────────────────────
function ModernCityCanvas() {
  const state = useRef(null);

  const draw = React.useCallback((canvas, ctx) => {
    const w = canvas.width, h = canvas.height;
    const ground = h - 58;

    if (!state.current || state.current.w !== w || state.current.h !== h) {
      const neons = ['#ff1a6e','#00e5ff','#c400ff','#00ffb3','#ff7b00','#ff003c','#7fff00','#0066ff'];
      // Background silhouette layer
      const bgBuildings = [];
      let x = -15;
      while (x < w + 25) {
        const bw = 22 + Math.random() * 50;
        const bh = 45 + Math.random() * h * 0.32;
        bgBuildings.push({ x, y: ground - bh, w: bw, h: bh, neon: neons[Math.floor(Math.random()*neons.length)] });
        x += bw + Math.random() * 5;
      }
      // Mid buildings
      const midBuildings = [];
      x = -25;
      while (x < w + 50) {
        const bw = 28 + Math.random() * 70;
        const bh = 80 + Math.random() * h * 0.48;
        const nc = neons[Math.floor(Math.random() * neons.length)];
        const hasStep = Math.random() > 0.5;
        const stepW = hasStep ? bw * (0.4 + Math.random()*0.3) : bw;
        const stepH = hasStep ? bh * (0.2 + Math.random()*0.15) : 0;
        const windows = [];
        for (let wy = 10; wy < bh - 10; wy += 11) {
          for (let wx = 4; wx < bw - 4; wx += 11) {
            windows.push({ ox: wx, oy: wy, lit: Math.random() > 0.5, timer: Math.floor(Math.random()*150+40), color: neons[Math.floor(Math.random()*neons.length)] });
          }
        }
        const bbs = bh > h * 0.28 ? [{ oy: bh*0.15 + Math.random()*bh*0.25, bw: bw*0.65, color: nc }] : [];
        midBuildings.push({ x, y: ground - bh, w: bw, h: bh, neon: nc, windows, bbs, hasStep, stepW, stepH });
        x += bw + 2 + Math.random() * 10;
      }
      // Main foreground buildings
      const buildings = [];
      x = -40;
      while (x < w + 60) {
        const bw = 38 + Math.random() * 90;
        const bh = 120 + Math.random() * h * 0.62;
        const nc = neons[Math.floor(Math.random() * neons.length)];
        const windows = [];
        for (let wy = 12; wy < bh - 12; wy += 12) {
          for (let wx = 5; wx < bw - 5; wx += 12) {
            windows.push({ ox: wx, oy: wy, lit: Math.random() > 0.45, timer: Math.floor(Math.random()*180+50), color: neons[Math.floor(Math.random()*neons.length)] });
          }
        }
        buildings.push({ x, y: ground - bh, w: bw, h: bh, neon: nc, windows });
        x += bw + 3 + Math.random() * 12;
      }
      // Rain (angled slightly)
      const rain = Array.from({ length: 320 }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        speed: 7 + Math.random() * 8, len: 10 + Math.random() * 20,
        layer: i % 3,
      }));
      // Flying vehicles
      const flyers = Array.from({ length: 8 }, () => ({
        x: Math.random() * w, y: h * 0.08 + Math.random() * h * 0.5,
        speed: 0.35 + Math.random() * 1.4,
        dir: Math.random() < 0.5 ? 1 : -1,
        color: neons[Math.floor(Math.random()*neons.length)],
        fw: 16 + Math.random() * 14,
      }));
      state.current = { w, h, bgBuildings, midBuildings, buildings, rain, flyers, t: 0 };
    }

    const { bgBuildings, midBuildings, buildings, rain, flyers } = state.current;
    state.current.t++;
    const t = state.current.t;

    // Sky gradient — dark purple-blue
    const sky = ctx.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#010108');
    sky.addColorStop(0.5, '#07031a');
    sky.addColorStop(0.85, '#110525');
    sky.addColorStop(1, '#1a0635');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // Distant atmospheric smog glow (horizon)
    const smog = ctx.createLinearGradient(0, ground * 0.5, 0, ground);
    smog.addColorStop(0, 'rgba(0,0,0,0)');
    smog.addColorStop(0.6, 'rgba(140,0,100,0.07)');
    smog.addColorStop(1, 'rgba(0,140,255,0.14)');
    ctx.fillStyle = smog; ctx.fillRect(0, ground * 0.5, w, ground * 0.5);

    // Far background buildings — dark, faint neon outlines only
    for (const b of bgBuildings) {
      ctx.fillStyle = '#070510';
      ctx.fillRect(b.x, b.y, b.w, b.h + 60);
      ctx.strokeStyle = b.neon + '18';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }

    // Mid buildings
    for (const b of midBuildings) {
      ctx.fillStyle = '#0a0918';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.hasStep) {
        ctx.fillRect(b.x + (b.w - b.stepW)*0.5, b.y - b.stepH, b.stepW, b.stepH);
      }
      // Windows
      for (const win of b.windows) {
        win.timer--;
        if (win.timer <= 0) { win.lit = !win.lit; win.timer = 40 + Math.floor(Math.random()*200); }
        if (!win.lit) continue;
        const wa = 0.35 + 0.18 * Math.sin(t * 0.05 + win.ox);
        ctx.fillStyle = win.color; ctx.globalAlpha = wa;
        ctx.fillRect(b.x+win.ox, b.y+win.oy, 5, 4);
        ctx.globalAlpha = wa * 0.12;
        ctx.fillRect(b.x+win.ox-2, b.y+win.oy-2, 9, 8);
        ctx.globalAlpha = 1;
      }
      // Faint neon edge
      const ea2 = 0.3 + 0.15 * Math.sin(t * 0.025 + b.x * 0.01);
      ctx.strokeStyle = b.neon; ctx.lineWidth = 0.8;
      ctx.globalAlpha = ea2;
      ctx.shadowColor = b.neon; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(b.x, b.y+b.h); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x+b.w, b.y); ctx.lineTo(b.x+b.w, b.y+b.h); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // Main foreground buildings
    for (const b of buildings) {
      const bg2 = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      bg2.addColorStop(0, '#0d0c1e');
      bg2.addColorStop(1, '#080811');
      ctx.fillStyle = bg2; ctx.fillRect(b.x, b.y, b.w, b.h);

      // Windows with neon glow
      for (const win of b.windows) {
        win.timer--;
        if (win.timer <= 0) { win.lit = !win.lit; win.timer = 55 + Math.floor(Math.random()*240); }
        if (!win.lit) continue;
        const wa = 0.5 + 0.22 * Math.sin(t * 0.04 + win.ox * 0.25);
        ctx.fillStyle = win.color; ctx.globalAlpha = wa;
        ctx.fillRect(b.x+win.ox, b.y+win.oy, 6, 4);
        ctx.globalAlpha = wa * 0.18;
        ctx.fillRect(b.x+win.ox-3, b.y+win.oy-3, 12, 10);
        ctx.globalAlpha = 1;
      }

      // Neon outline with strong bloom
      const ea = 0.6 + 0.22 * Math.sin(t * 0.028 + b.x * 0.008);
      ctx.globalAlpha = ea;
      ctx.shadowColor = b.neon; ctx.shadowBlur = 20;
      ctx.strokeStyle = b.neon; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(b.x, b.y+b.h); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x+b.w, b.y); ctx.lineTo(b.x+b.w, b.y+b.h); ctx.stroke();
      // Rooftop bar
      ctx.fillStyle = b.neon;
      ctx.shadowBlur = 22;
      ctx.fillRect(b.x, b.y, b.w, 2.5);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // ── Ground / Wet Street ───────────────────────────────────────────────────
    const grd = ctx.createLinearGradient(0, ground, 0, h);
    grd.addColorStop(0, '#100e22');
    grd.addColorStop(1, '#070610');
    ctx.fillStyle = grd; ctx.fillRect(0, ground, w, h - ground);

    // Street edge glow
    ctx.shadowColor = 'rgba(0,180,255,0.5)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(0,180,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(w, ground); ctx.stroke();
    ctx.shadowBlur = 0;

    // Puddle reflections (blurry inverted neon strips)
    ctx.save();
    for (const b of buildings) {
      const rH = Math.min(h - ground - 4, 38);
      const rg = ctx.createLinearGradient(0, ground, 0, ground + rH);
      rg.addColorStop(0, b.neon + '40');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.globalAlpha = 0.55;
      ctx.fillRect(b.x + b.w*0.1, ground + 1, b.w*0.8, rH);
    }
    ctx.restore();

    // Ground fog layer (low atmospheric haze)
    const fog = ctx.createLinearGradient(0, ground - 30, 0, ground + 30);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(0.5, 'rgba(80,10,90,0.08)');
    fog.addColorStop(1, 'rgba(0,60,120,0.12)');
    ctx.fillStyle = fog; ctx.fillRect(0, ground - 30, w, 60);

    // ── Flying vehicles ───────────────────────────────────────────────────────
    for (const f of flyers) {
      f.x += f.speed * f.dir;
      if (f.x > w + 40) f.x = -40;
      if (f.x < -40) f.x = w + 40;
      const lp = 0.55 + 0.45 * Math.sin(t * 0.14 + f.x * 0.04);
      // Body
      ctx.fillStyle = '#0d0d18'; ctx.fillRect(f.x - f.fw/2, f.y - 3, f.fw, 6);
      // Engine glow trail
      const trailX = f.dir > 0 ? f.x - f.fw/2 : f.x + f.fw/2;
      const trail = ctx.createRadialGradient(trailX, f.y, 0, trailX, f.y, 18);
      trail.addColorStop(0, f.color + Math.floor(lp * 160).toString(16).padStart(2,'0'));
      trail.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = trail; ctx.fillRect(trailX - 20, f.y - 20, 40, 40);
      // Front light
      const frontX = f.dir > 0 ? f.x + f.fw/2 : f.x - f.fw/2;
      ctx.shadowColor = f.color; ctx.shadowBlur = 10;
      ctx.fillStyle = f.color; ctx.globalAlpha = lp;
      ctx.fillRect(frontX - 2, f.y - 2, 4, 4);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // ── Rain ──────────────────────────────────────────────────────────────────
    const rainAngle = 0.18; // slight lean
    for (const r of rain) {
      r.y += r.speed;
      r.x += r.speed * rainAngle;
      if (r.y > h + 20) { r.y = -20; r.x = Math.random() * w; }
      if (r.x > w + 20) r.x -= w + 40;
    }
    // Layer 0: far, thin
    ctx.save();
    ctx.strokeStyle = 'rgba(100,160,220,0.1)'; ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const r of rain) {
      if (r.layer !== 0) continue;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.len * rainAngle, r.y + r.len);
    }
    ctx.stroke();
    // Layer 1: mid
    ctx.strokeStyle = 'rgba(140,190,240,0.13)'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const r of rain) {
      if (r.layer !== 1) continue;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.len * rainAngle, r.y + r.len);
    }
    ctx.stroke();
    // Layer 2: close, brighter
    ctx.strokeStyle = 'rgba(180,220,255,0.08)'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const r of rain) {
      if (r.layer !== 2) continue;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.len * rainAngle, r.y + r.len);
    }
    ctx.stroke();
    ctx.restore();

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    for (let sy = 0; sy < h; sy += 3) ctx.fillRect(0, sy, w, 1);

    // Vignette
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.28, w/2, h/2, h*0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  }, []);

  const canvasRef = useAnimatedCanvas(draw);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const clamp01 = t => Math.max(0, Math.min(1, t));
const lerpRGB = (ca, cb, t) => ca.map((v, i) => Math.round(lerp(v, cb[i], t)));

// ── Winter Field ──────────────────────────────────────────────────────────────
function WinterFieldCanvas() {
  const state = useRef(null);

  const draw = React.useCallback((canvas, ctx) => {
    const w = canvas.width, h = canvas.height;
    const rnd = Math.random;

    if (!state.current || state.current.w !== w || state.current.h !== h) {
      const ground = h * 0.70;
      const makePines = (n, sh, sw) =>
        Array.from({ length: n }, () => ({
          x: rnd() * w,
          baseY: ground + rnd() * h * 0.018,
          th: (0.15 + rnd() * 0.12) * h * sh,
          tw: (0.018 + rnd() * 0.014) * w * sw,
          snow: 0.55 + rnd() * 0.45,
          tiers: 6 + Math.floor(rnd() * 3),
        })).sort((a, b) => a.x - b.x);

      // Far treeline as silhouette points
      const ftLine = Array.from({ length: Math.ceil(w / 7) + 2 }, (_, i) => ({
        x: i * 7,
        y: ground - (0.042 + rnd() * 0.055) * h,
      }));

      const stars = Array.from({ length: 240 }, () => ({
        x: rnd() * w, y: rnd() * h * 0.62,
        r: rnd() * 1.1 + 0.15,
        a: rnd(), da: (rnd() * 0.009 + 0.003) * (rnd() < 0.5 ? 1 : -1),
      }));
      const snow = Array.from({ length: 280 }, () => ({
        x: rnd() * w, y: rnd() * h,
        r: rnd() * 2.4 + 0.4,
        vy: rnd() * 1.0 + 0.28, vx: (rnd() - 0.5) * 0.5,
        o: rnd() * 0.65 + 0.25,
        wobble: rnd() * Math.PI * 2, ws: rnd() * 0.038 + 0.008,
        layer: Math.floor(rnd() * 3),
      }));
      state.current = {
        w, h, ground, t: rnd(),
        trees: { far: makePines(14, 0.52, 0.52), mid: makePines(9, 0.8, 0.8), near: makePines(5, 1.2, 1.2) },
        ftLine, stars, snow,
      };
    }

    const S = state.current;
    S.t += 0.00007;
    const cyc = S.t % 1;
    const ground = S.ground;

    const nightness = (() => {
      if (cyc < 0.18) return lerp(1, 0.82, cyc / 0.18);
      if (cyc < 0.28) return lerp(0.82, 0, (cyc - 0.18) / 0.1);
      if (cyc < 0.72) return 0;
      if (cyc < 0.82) return lerp(0, 0.82, (cyc - 0.72) / 0.1);
      return lerp(0.82, 1, (cyc - 0.82) / 0.18);
    })();
    const dawn = cyc > 0.18 && cyc < 0.35 ? Math.max(0, 1 - (cyc - 0.18) / 0.17) : 0;
    const dusk = cyc > 0.65 && cyc < 0.82 ? Math.max(0, 1 - (0.82 - cyc) / 0.17) : 0;
    const golden = Math.max(dawn, dusk);

    // ── Sky ──────────────────────────────────────────────────────
    // Winter day = overcast blue-gray, NOT bright blue
    let topRGB, botRGB;
    if (nightness > 0.7) {
      topRGB = [4, 6, 20]; botRGB = [7, 11, 35];
    } else if (nightness > 0) {
      if (golden > 0.06) {
        topRGB = lerpRGB([62, 82, 118], [4, 6, 20], nightness);
        botRGB = lerpRGB([210, 138, 75], [7, 11, 35], nightness);
      } else {
        topRGB = lerpRGB([78, 100, 138], [4, 6, 20], nightness);
        botRGB = lerpRGB([138, 158, 180], [7, 11, 35], nightness);
      }
    } else if (golden > 0.06) {
      topRGB = lerpRGB([78, 100, 138], [55, 70, 110], golden * 0.5);
      botRGB = lerpRGB([148, 168, 188], [225, 148, 80], golden * 0.8);
    } else {
      // Overcast winter day: desaturated gray-blue
      topRGB = [78, 100, 138]; botRGB = [148, 168, 188];
    }
    const sky = ctx.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, `rgb(${topRGB.join(',')})`);
    sky.addColorStop(1, `rgb(${botRGB.join(',')})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // Thin overcast cloud veil (daytime)
    if (nightness < 0.5) {
      const veilA = (1 - nightness) * 0.12;
      const veil = ctx.createLinearGradient(0, 0, 0, ground * 0.6);
      veil.addColorStop(0, `rgba(210,218,232,${veilA})`);
      veil.addColorStop(1, 'rgba(210,218,232,0)');
      ctx.fillStyle = veil; ctx.fillRect(0, 0, w, ground * 0.6);
    }

    // ── Stars ─────────────────────────────────────────────────────
    if (nightness > 0.04) {
      for (const s of S.stars) {
        s.a = clamp01(s.a + s.da);
        if (s.a <= 0.05 || s.a >= 1) s.da *= -1;
        ctx.fillStyle = `rgba(255,255,255,${s.a * nightness})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Moon / Sun ────────────────────────────────────────────────
    const bodyA = cyc * Math.PI * 2 - Math.PI * 0.5;
    const bx = w * 0.5 + Math.cos(bodyA) * w * 0.34;
    const by = ground * 0.36 - Math.sin(bodyA) * ground * 0.72;

    if (nightness > 0.05 && by < ground) {
      const ma = clamp01(nightness);
      const mg = ctx.createRadialGradient(bx - 4, by - 4, 0, bx, by, 20);
      mg.addColorStop(0, `rgba(255,252,230,${ma})`);
      mg.addColorStop(0.65, `rgba(220,230,255,${ma * 0.9})`);
      mg.addColorStop(1, 'rgba(200,210,255,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(bx, by, 20, 0, Math.PI * 2); ctx.fill();
      const halo = ctx.createRadialGradient(bx, by, 14, bx, by, 60);
      halo.addColorStop(0, `rgba(215,222,255,${ma * 0.14})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, 60, 0, Math.PI * 2); ctx.fill();
    }
    if (nightness < 0.95 && by < ground) {
      const sa = clamp01(1 - nightness);
      // Winter sun: pale, smaller, low on horizon
      const sg = ctx.createRadialGradient(bx, by, 0, bx, by, 22);
      sg.addColorStop(0, `rgba(255,250,228,${sa})`);
      sg.addColorStop(0.5, `rgba(255,238,195,${sa * 0.8})`);
      sg.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
      if (golden > 0.04) {
        const ag = ctx.createRadialGradient(bx, by, 18, bx, by, 95);
        ag.addColorStop(0, `rgba(255,195,100,${sa * golden * 0.38})`);
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(bx, by, 95, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Horizon atmospheric haze ───────────────────────────────────
    const hazeCol = golden > 0.08 ? `218,175,130` : (nightness > 0.4 ? `135,150,182` : `188,205,222`);
    const hazeA   = nightness > 0.5 ? 0.10 : (golden > 0.08 ? 0.22 : 0.20);
    const haze = ctx.createLinearGradient(0, ground * 0.68, 0, ground);
    haze.addColorStop(0, `rgba(${hazeCol},0)`);
    haze.addColorStop(1, `rgba(${hazeCol},${hazeA})`);
    ctx.fillStyle = haze; ctx.fillRect(0, ground * 0.68, w, ground * 0.32 + h * 0.04);

    // ── Far treeline silhouette ────────────────────────────────────
    const ftBr = lerp(0.18, 0.58, 1 - nightness);
    ctx.fillStyle = `rgb(${Math.round(20*ftBr+14)},${Math.round(32*ftBr+12)},${Math.round(24*ftBr+16)})`;
    ctx.beginPath(); ctx.moveTo(0, ground);
    for (const p of S.ftLine) ctx.lineTo(p.x, p.y);
    ctx.lineTo(w, ground); ctx.closePath(); ctx.fill();

    // ── Snow hills (3 layers) ──────────────────────────────────────
    const sb = lerp(0.62, 1, 1 - nightness);
    // Far hill — blue-gray shadow
    ctx.fillStyle = `rgb(${Math.round(168*sb)},${Math.round(182*sb)},${Math.round(208*sb)})`;
    ctx.beginPath(); ctx.moveTo(0, ground);
    ctx.bezierCurveTo(w*0.18, ground-h*0.082, w*0.55, ground-h*0.108, w, ground-h*0.052);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    // Mid hill — slightly lighter
    ctx.fillStyle = `rgb(${Math.round(188*sb)},${Math.round(200*sb)},${Math.round(224*sb)})`;
    ctx.beginPath(); ctx.moveTo(0, ground+h*0.032);
    ctx.bezierCurveTo(w*0.28, ground-h*0.038, w*0.62, ground-h*0.055, w, ground+h*0.008);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    // Flat foreground snow — bright white with faint blue shadow
    ctx.fillStyle = `rgb(${Math.round(215*sb)},${Math.round(224*sb)},${Math.round(240*sb)})`;
    ctx.fillRect(0, ground + h * 0.032, w, h);
    // Blue shadow pooling in hollows
    const shadow = ctx.createLinearGradient(0, ground, 0, ground + h * 0.06);
    shadow.addColorStop(0, `rgba(148,172,215,${0.18 * sb})`);
    shadow.addColorStop(1, 'rgba(148,172,215,0)');
    ctx.fillStyle = shadow; ctx.fillRect(0, ground, w, h * 0.06);

    // ── Pine Trees ────────────────────────────────────────────────
    const drawPine = (tree, brFactor) => {
      const { x, baseY, th, tw, snow: snowAmt, tiers } = tree;
      const br = lerp(0.2, 1, 1 - nightness) * brFactor;
      const snowBr = nightness > 0.5 ? 0.75 : 1;
      for (let l = 0; l < tiers; l++) {
        const p = l / tiers;
        const ly = baseY - p * th;
        const lw = tw * (1 - p * 0.6) * 2.4;
        const lh = th / tiers * 1.7;
        // Foliage triangle
        ctx.fillStyle = `rgb(${Math.round((15+l*3)*br)},${Math.round((30+l*4)*br)},${Math.round((18+l*2)*br)})`;
        ctx.beginPath();
        ctx.moveTo(x, ly - lh);
        ctx.lineTo(x + lw * 0.5, ly + lh * 0.08);
        ctx.lineTo(x - lw * 0.5, ly + lh * 0.08);
        ctx.closePath(); ctx.fill();
        // Snow cap on each tier
        if (l < tiers - 1 && snowAmt > 0.2) {
          ctx.globalAlpha = Math.min(1, snowAmt * 0.85);
          ctx.fillStyle = `rgba(${Math.round(208*snowBr)},${Math.round(220*snowBr)},${Math.round(238*snowBr)},0.9)`;
          ctx.beginPath();
          ctx.moveTo(x - lw*0.4, ly + lh*0.08);
          ctx.lineTo(x + lw*0.4, ly + lh*0.08);
          ctx.quadraticCurveTo(x + lw*0.18, ly - lh*0.28, x, ly - lh*0.32);
          ctx.quadraticCurveTo(x - lw*0.18, ly - lh*0.28, x - lw*0.4, ly + lh*0.08);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.fillStyle = `rgb(${Math.round(36*br)},${Math.round(26*br)},${Math.round(15*br)})`;
      ctx.fillRect(x - tw*0.065, baseY - th*0.16, tw*0.13, th*0.18);
    };
    const br = lerp(0.25, 1, 1 - nightness);
    for (const t of S.trees.far)  drawPine(t, br * 0.38);
    for (const t of S.trees.mid)  drawPine(t, br * 0.65);
    for (const t of S.trees.near) drawPine(t, br);

    // ── Snow Particles ────────────────────────────────────────────
    for (const s of S.snow) {
      s.wobble += s.ws;
      s.x += s.vx + Math.sin(s.wobble) * 0.3; s.y += s.vy;
      if (s.y > h + 6) { s.y = -6; s.x = rnd() * w; }
      if (s.x > w + 6) s.x = -6; if (s.x < -6) s.x = w + 6;
      const size = s.r * (s.layer === 2 ? 1 : s.layer === 1 ? 0.65 : 0.4);
      ctx.globalAlpha = s.o * (0.45 + nightness * 0.4);
      ctx.fillStyle = s.layer === 2 ? 'rgba(255,255,255,1)' : 'rgba(218,230,248,1)';
      ctx.beginPath(); ctx.arc(s.x, s.y, size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Vignette ──────────────────────────────────────────────────
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.28, w/2, h/2, Math.max(w,h)*0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.46)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  }, []);

  const canvasRef = useAnimatedCanvas(draw);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Summer Field ──────────────────────────────────────────────────────────────
function SummerFieldCanvas() {
  const state = useRef(null);

  const draw = React.useCallback((canvas, ctx) => {
    const w = canvas.width, h = canvas.height;
    const rnd = Math.random;

    if (!state.current || state.current.w !== w || state.current.h !== h) {
      const ground = h * 0.66;
      const makeTrees = (n, sh, sw) =>
        Array.from({ length: n }, () => ({
          x: rnd() * w,
          baseY: ground + rnd() * h * 0.018,
          trunkH: (0.055 + rnd() * 0.055) * h * sh,
          crownR: (0.04 + rnd() * 0.042) * w * sw,
          gv: Math.floor(rnd() * 32) - 8,           // green variation
          irr: Array.from({ length: 9 }, () => 0.78 + rnd() * 0.44), // crown irregularity
        })).sort((a, b) => a.x - b.x);

      const stars = Array.from({ length: 220 }, () => ({
        x: rnd() * w, y: rnd() * h * 0.6,
        r: rnd() * 1.1 + 0.15,
        a: rnd(), da: (rnd() * 0.009 + 0.003) * (rnd() < 0.5 ? 1 : -1),
      }));
      const fireflies = Array.from({ length: 38 }, () => ({
        x: rnd() * w, y: ground - rnd() * h * 0.3,
        vx: (rnd() - 0.5) * 0.4, vy: (rnd() - 0.5) * 0.3,
        a: rnd(), da: (rnd() * 0.028 + 0.01) * (rnd() < 0.5 ? 1 : -1),
        r: rnd() * 1.5 + 0.8,
      }));
      const birds = Array.from({ length: 8 }, () => ({
        x: rnd() * w, y: (0.07 + rnd() * 0.2) * h,
        vx: (rnd() * 0.58 + 0.3) * (rnd() < 0.5 ? 1 : -1),
        flapT: rnd() * Math.PI * 2,
      }));
      // Fluffy cumulus clouds — each has multiple blobs
      const clouds = Array.from({ length: 7 }, (_, i) => ({
        x: (i / 7) * w * 1.55 - w * 0.25,
        y: (0.04 + rnd() * 0.13) * h,
        cw: (0.1 + rnd() * 0.17) * w,
        ch: (0.032 + rnd() * 0.036) * h,
        speed: 0.045 + rnd() * 0.055,
        // blob layout: [xFrac, yFrac, radiusFrac]
        blobs: [
          [0,      0,      0.62],
          [-0.28,  0.22,   0.44],
          [ 0.3,   0.18,   0.52],
          [-0.12,  0.35,   0.38],
          [ 0.14, -0.18,   0.48],
          [-0.42,  0.38,   0.32],
          [ 0.44,  0.3,    0.34],
        ].map(([ox, oy, rs]) => ({ ox: ox + (rnd()-0.5)*0.08, oy: oy + (rnd()-0.5)*0.06, rs: rs * (0.88+rnd()*0.24) })),
      }));
      const grass = Array.from({ length: 130 }, () => ({
        x: rnd() * w,
        y: ground + h * 0.025 + rnd() * h * 0.18,
        gh: (0.02 + rnd() * 0.028) * h,
        angle: (rnd() - 0.5) * 0.45,
        wPhase: rnd() * Math.PI * 2,
      }));
      // Wildflowers
      const flowers = Array.from({ length: 340 }, () => ({
        x: rnd() * w,
        y: ground + h * 0.02 + rnd() * h * 0.36,
        r: rnd() * 1.9 + 0.7,
        col: ['#f5d642','#c9a8e8','#ffffff','#f87878','#ff9f3e','#a8e8c0'][Math.floor(rnd() * 6)],
      }));
      state.current = {
        w, h, ground, t: rnd(),
        trees: { far: makeTrees(16, 0.48, 0.48), mid: makeTrees(9, 0.78, 0.78), near: makeTrees(4, 1.25, 1.25) },
        stars, fireflies, birds, clouds, grass, flowers,
      };
    }

    const S = state.current;
    S.t += 0.00007;
    const cyc = S.t % 1;
    const ground = S.ground;

    const nightness = (() => {
      if (cyc < 0.18) return lerp(1, 0.82, cyc / 0.18);
      if (cyc < 0.28) return lerp(0.82, 0, (cyc - 0.18) / 0.1);
      if (cyc < 0.72) return 0;
      if (cyc < 0.82) return lerp(0, 0.82, (cyc - 0.72) / 0.1);
      return lerp(0.82, 1, (cyc - 0.82) / 0.18);
    })();
    const dawn = cyc > 0.18 && cyc < 0.36 ? Math.max(0, 1 - (cyc - 0.18) / 0.18) : 0;
    const dusk = cyc > 0.64 && cyc < 0.82 ? Math.max(0, 1 - (0.82 - cyc) / 0.18) : 0;
    const golden = Math.max(dawn, dusk);

    // ── Sky ──────────────────────────────────────────────────────
    let topRGB, botRGB;
    if (nightness > 0.7) {
      topRGB = [4, 7, 28]; botRGB = [9, 14, 48];
    } else if (nightness > 0) {
      if (golden > 0.06) {
        topRGB = lerpRGB([52, 132, 210], [4, 7, 28], nightness);
        botRGB = lerpRGB([255, 172, 65], [9, 14, 48], nightness);
      } else {
        topRGB = lerpRGB([52, 132, 210], [4, 7, 28], nightness);
        botRGB = lerpRGB([148, 208, 248], [9, 14, 48], nightness);
      }
    } else if (golden > 0.06) {
      // Golden hour: orange-pink horizon, deep blue zenith
      topRGB = lerpRGB([52, 132, 210], [42, 72, 155], golden * 0.45);
      botRGB = lerpRGB([148, 208, 248], [255, 168, 62], golden * 0.85);
    } else {
      // Vivid cerulean summer sky
      topRGB = [34, 112, 200]; botRGB = [108, 188, 248];
    }
    const sky = ctx.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, `rgb(${topRGB.join(',')})`);
    sky.addColorStop(1, `rgb(${botRGB.join(',')})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // ── Stars ────────────────────────────────────────────────────
    if (nightness > 0.04) {
      for (const s of S.stars) {
        s.a = clamp01(s.a + s.da);
        if (s.a <= 0.05 || s.a >= 1) s.da *= -1;
        ctx.fillStyle = `rgba(255,255,255,${s.a * nightness})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Moon / Sun ────────────────────────────────────────────────
    const bodyA = cyc * Math.PI * 2 - Math.PI * 0.5;
    const bx = w * 0.5 + Math.cos(bodyA) * w * 0.36;
    const by = ground * 0.38 - Math.sin(bodyA) * ground * 0.78;

    if (nightness > 0.05 && by < ground) {
      const ma = clamp01(nightness);
      const mg = ctx.createRadialGradient(bx - 4, by - 4, 0, bx, by, 22);
      mg.addColorStop(0, `rgba(255,252,225,${ma})`);
      mg.addColorStop(0.65, `rgba(220,230,255,${ma * 0.9})`);
      mg.addColorStop(1, 'rgba(200,210,255,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
      const halo = ctx.createRadialGradient(bx, by, 15, bx, by, 58);
      halo.addColorStop(0, `rgba(215,225,255,${ma * 0.13})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, 58, 0, Math.PI * 2); ctx.fill();
    }
    if (nightness < 0.9 && by < ground) {
      const sa = clamp01(1 - nightness);
      const sg = ctx.createRadialGradient(bx, by, 0, bx, by, 30);
      sg.addColorStop(0, `rgba(255,255,205,${sa})`);
      sg.addColorStop(0.4, `rgba(255,242,128,${sa * 0.88})`);
      sg.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.fill();
      const glowR = golden > 0.05 ? 130 : 95;
      const glowA = sa * (golden > 0.05 ? 0.28 + golden * 0.18 : 0.15);
      const ag = ctx.createRadialGradient(bx, by, 22, bx, by, glowR);
      ag.addColorStop(0, `rgba(255,235,130,${glowA})`);
      ag.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(bx, by, glowR, 0, Math.PI * 2); ctx.fill();
    }

    // ── Fluffy Cumulus Clouds ─────────────────────────────────────
    const cloudA = clamp01(1 - nightness * 1.6);
    if (cloudA > 0.02) {
      for (const c of S.clouds) {
        c.x += c.speed;
        if (c.x > w + c.cw * 0.6) c.x = -c.cw * 0.6;
        const goldenTint = golden * (1 - nightness);
        // Flat cloud base shadow
        ctx.fillStyle = `rgba(${Math.round(165+goldenTint*30)},${Math.round(178+goldenTint*15)},${Math.round(210-goldenTint*25)},${cloudA * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + c.ch * 1.2, c.cw * 0.52, c.ch * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Blob tops
        for (const b of c.blobs) {
          const bx2 = c.x + b.ox * c.cw, by2 = c.y + b.oy * c.ch;
          const bg = ctx.createRadialGradient(bx2, by2 - c.ch * 0.12, 0, bx2, by2, c.cw * b.rs * 0.56);
          const topL = Math.round(255 - goldenTint * 18);
          const midL = Math.round(242 - goldenTint * 12);
          bg.addColorStop(0, `rgba(${topL},${topL},${Math.round(topL - goldenTint * 30)},${cloudA * 0.96})`);
          bg.addColorStop(0.55, `rgba(${midL},${midL},${Math.round(midL - goldenTint * 20)},${cloudA * 0.68})`);
          bg.addColorStop(1, `rgba(215,222,240,0)`);
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.ellipse(bx2, by2, c.cw * b.rs * 0.56, c.ch * b.rs * 1.12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── Atmospheric horizon haze ─────────────────────────────────
    const hazeCol = golden > 0.08 ? `255,205,135` : `195,218,242`;
    const hazeA = nightness > 0.5 ? 0.08 : (golden > 0.08 ? 0.26 : 0.15);
    const haze = ctx.createLinearGradient(0, ground * 0.72, 0, ground);
    haze.addColorStop(0, `rgba(${hazeCol},0)`);
    haze.addColorStop(1, `rgba(${hazeCol},${hazeA})`);
    ctx.fillStyle = haze; ctx.fillRect(0, ground * 0.72, w, ground * 0.28 + h * 0.04);

    // ── Layered Green Hills ───────────────────────────────────────
    const db = lerp(0.26, 1, 1 - nightness);
    const gf = golden * (1 - nightness); // golden warmth
    // Far hill — desaturated (atmospheric perspective)
    ctx.fillStyle = `rgb(${Math.round((50+gf*28)*db)},${Math.round((100+gf*18)*db)},${Math.round((40-gf*12)*db)})`;
    ctx.beginPath(); ctx.moveTo(0, ground);
    ctx.bezierCurveTo(w*0.22, ground-h*0.092, w*0.58, ground-h*0.118, w, ground-h*0.055);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    // Mid hill — richer green
    ctx.fillStyle = `rgb(${Math.round((62+gf*22)*db)},${Math.round((122+gf*14)*db)},${Math.round((46-gf*8)*db)})`;
    ctx.beginPath(); ctx.moveTo(0, ground+h*0.028);
    ctx.bezierCurveTo(w*0.3, ground-h*0.044, w*0.64, ground-h*0.062, w, ground+h*0.012);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    // Foreground — bright field
    ctx.fillStyle = `rgb(${Math.round((76+gf*18)*db)},${Math.round((142+gf*12)*db)},${Math.round((52-gf*6)*db)})`;
    ctx.fillRect(0, ground + h * 0.028, w, h);
    // Sunlit grass edge highlight
    if (nightness < 0.55) {
      const edgeA = clamp01(1 - nightness * 2) * 0.48;
      ctx.fillStyle = `rgba(${Math.round((128+gf*30)*db)},${Math.round((205+gf*20)*db)},${Math.round(72*db)},${edgeA})`;
      ctx.fillRect(0, ground + h * 0.022, w, h * 0.014);
    }

    // ── Wildflowers ───────────────────────────────────────────────
    if (nightness < 0.75) {
      const flA = clamp01(1 - nightness * 1.8) * 0.88;
      ctx.globalAlpha = flA;
      for (const f of S.flowers) {
        ctx.fillStyle = f.col;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Deciduous Trees ───────────────────────────────────────────
    const drawDecid = (tree, brFactor) => {
      const { x, baseY, trunkH, crownR, gv, irr } = tree;
      const br = lerp(0.2, 1, 1 - nightness) * brFactor;
      const warm = gf * brFactor;
      const cr = Math.round(clamp01((70 + gv + warm * 42) / 255 * br) * 255);
      const cg = Math.round(clamp01((132 + gv + warm * 16) / 255 * br) * 255);
      const cb = Math.round(clamp01((44 + gv * 0.3 - warm * 18) / 255 * br) * 255);
      const trunkY = baseY - trunkH;
      // Trunk
      ctx.fillStyle = `rgb(${Math.round(50*br)},${Math.round(34*br)},${Math.round(18*br)})`;
      ctx.fillRect(x - crownR * 0.1, trunkY, crownR * 0.2, trunkH + 2);
      // Irregular crown — 9 perimeter blobs
      const blobN = irr.length;
      for (let i = 0; i < blobN; i++) {
        const ang = (i / blobN) * Math.PI * 2;
        const bx2 = x + Math.cos(ang) * crownR * 0.5 * irr[i];
        const by2 = trunkY + Math.sin(ang) * crownR * 0.44 * irr[i];
        const br2 = crownR * irr[i] * 0.6;
        const bg = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, br2);
        bg.addColorStop(0, `rgba(${cr+10},${cg+12},${cb},0.82)`);
        bg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(bx2, by2, br2, 0, Math.PI * 2); ctx.fill();
      }
      // Dense core
      const coreG = ctx.createRadialGradient(x, trunkY, 0, x, trunkY, crownR * 0.88);
      coreG.addColorStop(0, `rgba(${cr+6},${cg+8},${cb},0.75)`);
      coreG.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = coreG;
      ctx.beginPath(); ctx.arc(x, trunkY, crownR * 0.88, 0, Math.PI * 2); ctx.fill();
      // Sunlit top highlight
      if (nightness < 0.58) {
        const hlA = clamp01(1 - nightness * 2) * brFactor * 0.65;
        const hlg = ctx.createRadialGradient(x - crownR * 0.14, trunkY - crownR * 0.38, 0,
                                              x - crownR * 0.14, trunkY - crownR * 0.38, crownR * 0.52);
        hlg.addColorStop(0, `rgba(${Math.min(255,cr+45+Math.round(warm*30))},${Math.min(255,cg+38+Math.round(warm*20))},${cb+8},${hlA})`);
        hlg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hlg;
        ctx.beginPath(); ctx.arc(x - crownR*0.14, trunkY - crownR*0.38, crownR*0.52, 0, Math.PI*2); ctx.fill();
      }
    };
    for (const t of S.trees.far)  drawDecid(t, 0.42);
    for (const t of S.trees.mid)  drawDecid(t, 0.7);
    for (const t of S.trees.near) drawDecid(t, 1.0);

    // ── Grass Blades ──────────────────────────────────────────────
    const windPhase = S.t * 2.4;
    ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (const g of S.grass) {
      const wt = Math.sin(windPhase + g.wPhase) * 0.18;
      const depth = clamp01((g.y - ground) / (h * 0.25));
      const gbr = lerp(0.28, 1, 1 - nightness) * (0.5 + depth * 0.5);
      ctx.strokeStyle = `rgba(${Math.round((85+gf*25)*gbr)},${Math.round((158+gf*18)*gbr)},${Math.round(50*gbr)},0.68)`;
      const tx = g.x + Math.sin(g.angle + wt) * g.gh;
      const ty = g.y - g.gh;
      ctx.beginPath(); ctx.moveTo(g.x, g.y);
      ctx.quadraticCurveTo(g.x + (tx - g.x) * 0.5, g.y - g.gh * 0.5, tx, ty); ctx.stroke();
    }

    // ── Birds ─────────────────────────────────────────────────────
    if (nightness < 0.48) {
      const ba = clamp01((0.48 - nightness) * 2.5);
      ctx.strokeStyle = `rgba(15,15,15,${ba * 0.8})`;
      ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      for (const b of S.birds) {
        b.x += b.vx; b.flapT += 0.09;
        if (b.x > w + 22) b.x = -22; if (b.x < -22) b.x = w + 22;
        const flap = Math.sin(b.flapT) * 4.5;
        ctx.beginPath();
        ctx.moveTo(b.x - 6, b.y);
        ctx.quadraticCurveTo(b.x - 3, b.y - flap, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 3, b.y - flap, b.x + 6, b.y);
        ctx.stroke();
      }
    }

    // ── Fireflies ─────────────────────────────────────────────────
    if (nightness > 0.28) {
      for (const f of S.fireflies) {
        f.x += f.vx; f.y += f.vy;
        f.a = clamp01(f.a + f.da);
        if (f.a <= 0 || f.a >= 1) f.da *= -1;
        if (f.x < 0 || f.x > w) f.vx *= -1;
        if (f.y < ground - h * 0.34 || f.y > ground) f.vy *= -1;
        const fa = f.a * clamp01(nightness - 0.28) * 0.9;
        if (fa < 0.02) continue;
        const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7);
        fg.addColorStop(0, `rgba(200,255,100,${fa})`);
        fg.addColorStop(0.42, `rgba(160,255,55,${fa * 0.32})`);
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, f.r*7, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(238,255,185,${fa})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
      }
    }

    // ── Vignette ──────────────────────────────────────────────────
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.28, w/2, h/2, Math.max(w,h)*0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  }, []);

  const canvasRef = useAnimatedCanvas(draw);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Custom (image) ────────────────────────────────────────────────────────────
function CustomWallpaper({ url }) {
  if (!url) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `url("${url}")`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      filter: 'brightness(0.55)',
    }} />
  );
}

// ── CSS animated wallpapers ───────────────────────────────────────────────────
const CSS_WALLPAPERS = new Set(['aurora', 'nebula', 'ember', 'cyber', 'ocean', 'forest', 'sunset', 'galaxy', 'volcano', 'arctic', 'desert', 'cherry', 'midnight', 'toxic', 'royal']);

// ── Main export ───────────────────────────────────────────────────────────────
export default function WallpaperBackground({ type, customUrl }) {
  if (!type || type === 'none') return null;

  // CSS animated gradient wallpapers
  if (CSS_WALLPAPERS.has(type)) {
    return (
      <div
        className={`wallpaper-base wallpaper-${type}`}
        style={{ opacity: 0.9 }}
      />
    );
  }

  // Custom image / GIF
  if (type === 'custom' && customUrl) {
    return (
      <img
        src={customUrl}
        alt=""
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover', objectPosition: 'center',
          zIndex: 0, pointerEvents: 'none',
          filter: 'blur(1px) brightness(0.45)',
          transform: 'translateZ(0)',
          display: 'block',
        }}
      />
    );
  }

  return null;
}
