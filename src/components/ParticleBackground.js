import React, { useEffect, useRef } from 'react';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, str: `${r},${g},${b}` };
}

// Star shape: bright core + soft halo + diffraction spikes (for r > 1.3)
function drawStarShape(ctx, x, y, r, colorStr, alpha) {
  if (alpha <= 0.01 || r <= 0) return;
  const a = Math.min(1, alpha);
  // Soft glow halo
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5.5);
  halo.addColorStop(0, `rgba(${colorStr},${Math.min(1, a * 0.28)})`);
  halo.addColorStop(0.4, `rgba(${colorStr},${a * 0.06})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 5.5, 0, Math.PI * 2); ctx.fill();
  // Bright core
  ctx.fillStyle = `rgba(${colorStr},${a})`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // Diffraction spikes (only for bright/large stars)
  if (r > 1.3 && a > 0.3) {
    const len = r * 8;
    ctx.save();
    ctx.lineCap = 'round';
    // Primary cross (H + V)
    ctx.strokeStyle = `rgba(${colorStr},${a * 0.5})`;
    ctx.lineWidth = Math.max(0.45, r * 0.3);
    ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x + len, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); ctx.stroke();
    // Diagonal (45°, shorter + more transparent)
    ctx.strokeStyle = `rgba(${colorStr},${a * 0.18})`;
    ctx.lineWidth = Math.max(0.3, r * 0.18);
    const dlen = len * 0.55;
    ctx.beginPath(); ctx.moveTo(x - dlen, y - dlen); ctx.lineTo(x + dlen, y + dlen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dlen, y - dlen); ctx.lineTo(x - dlen, y + dlen); ctx.stroke();
    ctx.restore();
  }
}

// Realistic 6-arm snowflake with 3 branch levels
function drawSnowflake(ctx, x, y, r, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(210,235,255,${opacity})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 3) * i);
    ctx.lineWidth = Math.max(0.4, r * 0.13);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke();
    // branch 1
    const b1y = -r * 0.62, b1l = r * 0.28;
    ctx.lineWidth = Math.max(0.3, r * 0.09);
    ctx.beginPath(); ctx.moveTo(0, b1y); ctx.lineTo(-b1l, b1y - b1l); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, b1y); ctx.lineTo(b1l, b1y - b1l); ctx.stroke();
    // branch 2
    const b2y = -r * 0.38, b2l = r * 0.18;
    ctx.lineWidth = Math.max(0.2, r * 0.07);
    ctx.beginPath(); ctx.moveTo(0, b2y); ctx.lineTo(-b2l, b2y - b2l); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, b2y); ctx.lineTo(b2l, b2y - b2l); ctx.stroke();
    // tip dot
    ctx.fillStyle = `rgba(230,245,255,${opacity * 0.9})`;
    ctx.beginPath(); ctx.arc(0, -r, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // center hex
  ctx.fillStyle = `rgba(220,240,255,${opacity * 0.7})`;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default function ParticleBackground({ type = 'none', accentColor = '#e03030' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (type === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let particles = [];
    let shootingStars = [];
    let matrixCols = [];
    let sparkles = [];
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    let windPhase = 0;

    const resize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    const col = hexToRgb(accentColor);

    // ── Snow ──────────────────────────────────────────────────────
    if (type === 'snow') {
      // 3 depth layers: far (small), mid, close (large detailed)
      for (let i = 0; i < 55; i++) { // far layer
        particles.push({ x: Math.random()*width, y: Math.random()*height, r: Math.random()*1.2+0.4, speed: Math.random()*0.25+0.1, drift: Math.random()*0.2-0.1, sway: Math.random()*Math.PI*2, swaySpeed: Math.random()*0.008+0.003, opacity: Math.random()*0.3+0.1, rotation: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.005, layer: 0 });
      }
      for (let i = 0; i < 55; i++) { // mid layer
        particles.push({ x: Math.random()*width, y: Math.random()*height, r: Math.random()*2.5+1.5, speed: Math.random()*0.4+0.2, drift: Math.random()*0.3-0.15, sway: Math.random()*Math.PI*2, swaySpeed: Math.random()*0.01+0.004, opacity: Math.random()*0.45+0.2, rotation: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.007, layer: 1 });
      }
      for (let i = 0; i < 35; i++) { // close layer (full crystal)
        particles.push({ x: Math.random()*width, y: Math.random()*height, r: Math.random()*5+4, speed: Math.random()*0.55+0.3, drift: Math.random()*0.4-0.2, sway: Math.random()*Math.PI*2, swaySpeed: Math.random()*0.012+0.005, opacity: Math.random()*0.55+0.35, rotation: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.009, layer: 2 });
      }

    // ── Stars ──────────────────────────────────────────────────────
    } else if (type === 'stars') {
      const starColors = ['255,255,255','220,235,255','255,245,210','255,224,180','180,210,255','255,255,220'];
      for (let i = 0; i < 290; i++) {
        const sc = Math.random();
        const r = sc > 0.95 ? Math.random()*1.4+2.0 : sc > 0.75 ? Math.random()*0.8+0.9 : Math.random()*0.45+0.18;
        particles.push({
          x: Math.random()*width, y: Math.random()*height, r,
          twinkle: Math.random()*Math.PI*2,
          twinkleSpeed: Math.random()*0.03+0.005,
          baseOpacity: sc > 0.9 ? 0.88+Math.random()*0.12 : Math.random()*0.55+0.22,
          color: starColors[Math.floor(Math.random()*starColors.length)],
          isBright: sc > 0.88,
          blinkTimer: Math.random()*400,
          blinking: false,
        });
      }

    // ── Shooting Stars ─────────────────────────────────────────────
    } else if (type === 'shooting') {
      const starColors = ['255,255,255','220,235,255','255,245,210','200,215,255'];
      for (let i = 0; i < 210; i++) {
        const sc = Math.random();
        const r = sc > 0.93 ? Math.random()*1.3+1.6 : sc > 0.75 ? Math.random()*0.6+0.7 : Math.random()*0.35+0.15;
        particles.push({
          x: Math.random()*width, y: Math.random()*height, r,
          twinkle: Math.random()*Math.PI*2,
          twinkleSpeed: Math.random()*0.025+0.004,
          baseOpacity: Math.random()*0.5+0.15,
          color: starColors[Math.floor(Math.random()*starColors.length)],
          isBright: sc > 0.9,
          blinkTimer: Math.random()*500,
          blinking: false,
        });
      }

    // ── Embers ─────────────────────────────────────────────────────
    } else if (type === 'embers') {
      for (let i = 0; i < 130; i++) {
        const life = Math.random();
        particles.push({
          x: Math.random()*width,
          y: height - life * height * 0.9,
          r: Math.random()*2.8+0.5,
          speed: Math.random()*1.1+0.5,
          drift: Math.random()*0.8-0.4,
          driftPhase: Math.random()*Math.PI*2,
          driftFreq: Math.random()*0.06+0.02,
          flicker: Math.random()*Math.PI*2,
          flickerSpeed: Math.random()*0.1+0.04,
          life,
          lifeSpeed: Math.random()*0.004+0.002,
          baseR: Math.random()*2.8+0.5,
        });
      }

    // ── Matrix ─────────────────────────────────────────────────────
    } else if (type === 'matrix') {
      const fontSize = 14;
      const cols = Math.floor(width / fontSize);
      for (let i = 0; i < cols; i++) {
        matrixCols.push({
          y: Math.random() * height,
          speed: Math.random()*2.2+0.8,
          opacity: Math.random()*0.6+0.3,
          trailLen: Math.floor(Math.random()*18+12),
          brightTimer: Math.random()*300,
          bright: false,
        });
      }

    // ── Rain ───────────────────────────────────────────────────────
    } else if (type === 'rain') {
      for (let i = 0; i < 320; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          len: Math.random() * 18 + 8,
          speed: Math.random() * 14 + 10,
          opacity: Math.random() * 0.35 + 0.12,
          thickness: Math.random() * 0.8 + 0.3,
        });
      }
    // ── Confetti ───────────────────────────────────────────────────
    } else if (type === 'confetti') {
      const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7','#dfe6e9','#ff7979','#badc58'];
      for (let i = 0; i < 180; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          size: Math.random() * 8 + 4,
          speed: Math.random() * 3 + 2,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
          drift: (Math.random() - 0.5) * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.4 + 0.6,
          shape: ['rect', 'circle', 'triangle'][Math.floor(Math.random()*3)],
        });
      }
    // ── Fireflies ─────────────────────────────────────────────────
    } else if (type === 'fireflies') {
      for (let i = 0; i < 45; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          targetX: Math.random() * width,
          targetY: Math.random() * height,
          size: Math.random() * 3 + 2,
          glow: Math.random() * Math.PI * 2,
          glowSpeed: Math.random() * 0.08 + 0.02,
          speed: Math.random() * 0.5 + 0.2,
          opacity: Math.random() * 0.3 + 0.4,
        });
      }
    // ── Bubbles ───────────────────────────────────────────────────
    } else if (type === 'bubbles') {
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: Math.random() * width,
          y: height + Math.random() * 100,
          size: Math.random() * 12 + 6,
          speed: Math.random() * 1.5 + 0.5,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.03 + 0.01,
          opacity: Math.random() * 0.3 + 0.2,
          shimmer: Math.random() * Math.PI * 2,
        });
      }
    // ── Leaves ────────────────────────────────────────────────────
    } else if (type === 'leaves') {
      const colors = ['#8B4513','#D2691E','#CD853F','#DEB887','#F4A460'];
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          size: Math.random() * 15 + 10,
          speed: Math.random() * 2 + 1,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          drift: Math.random() * 3 + 1,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.05 + 0.02,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.4 + 0.4,
        });
      }
    // ── Cherry Petals ─────────────────────────────────────────────
    } else if (type === 'petals') {
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          size: Math.random() * 8 + 6,
          speed: Math.random() * 1.5 + 0.8,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          drift: Math.random() * 2 + 0.5,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.04 + 0.01,
          opacity: Math.random() * 0.5 + 0.3,
        });
      }
    // ── Electric Sparks ───────────────────────────────────────────
    } else if (type === 'sparks') {
      for (let i = 0; i < 90; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: Math.random(),
          maxLife: Math.random() * 0.5 + 0.5,
          size: Math.random() * 2 + 1,
        });
      }
    // ── Floating Hearts ───────────────────────────────────────────
    } else if (type === 'hearts') {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * width,
          y: height + Math.random() * 100,
          size: Math.random() * 10 + 8,
          speed: Math.random() * 1.2 + 0.6,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.03 + 0.01,
          opacity: Math.random() * 0.4 + 0.3,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    // ── Diamonds ─────────────────────────────────────────────────
    } else if (type === 'diamonds') {
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 6 + 4,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.05,
          fallSpeed: Math.random() * 0.8 + 0.2,
          shimmer: Math.random() * Math.PI * 2,
          opacity: Math.random() * 0.6 + 0.2,
        });
      }
    // ── Glitch ───────────────────────────────────────────────────
    } else if (type === 'glitch') {
      for (let i = 0; i < 25; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          width: Math.random() * 100 + 50,
          height: Math.random() * 4 + 2,
          speed: Math.random() * 5 + 2,
          offset: Math.random() * 20 - 10,
          timer: Math.random() * 100,
          maxTimer: Math.random() * 50 + 30,
        });
      }
    // ── Smoke ────────────────────────────────────────────────────
    } else if (type === 'smoke') {
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: width/2 + (Math.random() - 0.5) * 100,
          y: height - Math.random() * 50,
          size: Math.random() * 20 + 10,
          speed: Math.random() * 2 + 1,
          drift: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.3 + 0.1,
          life: Math.random(),
        });
      }
    // ── Dust ─────────────────────────────────────────────────────
    } else if (type === 'dust') {
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 0.5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          shimmer: Math.random() * Math.PI * 2,
        });
      }
    }

    // Shooting star spawner — life goes 0→1 (0=born, 1=dead)
    const spawnShootingStar = () => {
      const angle = Math.PI * 0.22 + (Math.random() * 0.24 - 0.12);
      const speed = Math.random() * 13 + 9;
      shootingStars.push({
        x: Math.random() * width * 0.78,
        y: Math.random() * height * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: Math.random() * 260 + 130,
        angle, speed,
        life: 0,
        width: Math.random() * 1.6 + 0.8,
      });
    };

    let shootTimer = Math.random()*45+25;
    const TARGET_FPS = 20;
    const FRAME_MS = 1000/TARGET_FPS;
    let lastTime = 0;

    const draw = (ts) => {
      animRef.current = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (ts - lastTime < FRAME_MS) return;
      lastTime = ts;
      ctx.clearRect(0, 0, width, height);

      // ── Snow ──────────────────────────────────────────────────
      if (type === 'snow') {
        windPhase += 0.006;
        const windX = Math.sin(windPhase) * 0.4;
        particles.forEach(p => {
          p.sway += p.swaySpeed;
          p.rotation += p.rotSpeed;
          p.x += windX * (p.layer + 1) * 0.5 + p.drift + Math.sin(p.sway) * 0.3;
          p.y += p.speed;
          if (p.y > height + 14) { p.y = -14; p.x = Math.random()*width; }
          if (p.x > width + 14) p.x = -14;
          if (p.x < -14) p.x = width + 14;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          if (p.layer === 0) {
            // far: simple dot with soft edge
            const g = ctx.createRadialGradient(0,0,0,0,0,p.r*2);
            g.addColorStop(0, `rgba(200,225,255,${p.opacity})`);
            g.addColorStop(1, 'rgba(200,225,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(0,0,p.r*2,0,Math.PI*2); ctx.fill();
          } else if (p.layer === 1) {
            // mid: simple 6-arm
            ctx.strokeStyle = `rgba(210,232,255,${p.opacity})`;
            ctx.lineWidth = p.r*0.2; ctx.lineCap = 'round';
            for (let i=0;i<6;i++) {
              ctx.save(); ctx.rotate(i*Math.PI/3);
              ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-p.r); ctx.stroke();
              ctx.restore();
            }
          } else {
            // close: full crystal
            drawSnowflake(ctx, 0, 0, p.r, p.opacity);
          }
          ctx.restore();
        });

      // ── Stars ─────────────────────────────────────────────────
      } else if (type === 'stars') {
        particles.forEach(p => {
          p.twinkle += p.twinkleSpeed;
          p.blinkTimer--;
          if (p.blinkTimer <= 0 && !p.blinking) { p.blinking = true; p.blinkTimer = 8+Math.random()*14; }
          if (p.blinking && p.blinkTimer <= 0) { p.blinking = false; p.blinkTimer = Math.random()*500+80; }
          const blink = p.blinking ? 0.08 : 1;
          const alpha = p.baseOpacity * blink * (0.45 + 0.55*Math.sin(p.twinkle));
          drawStarShape(ctx, p.x, p.y, p.r, p.color, alpha);
        });

      // ── Shooting Stars ────────────────────────────────────────
      } else if (type === 'shooting') {
        // Background stars
        particles.forEach(p => {
          p.twinkle += p.twinkleSpeed;
          p.blinkTimer--;
          if (p.blinkTimer <= 0 && !p.blinking) { p.blinking = true; p.blinkTimer = 6+Math.random()*12; }
          if (p.blinking && p.blinkTimer <= 0) { p.blinking = false; p.blinkTimer = Math.random()*400+60; }
          const blink = p.blinking ? 0.06 : 1;
          const alpha = p.baseOpacity * blink * (0.4 + 0.6*Math.sin(p.twinkle));
          drawStarShape(ctx, p.x, p.y, p.r, p.color, alpha);
        });

        shootTimer--;
        if (shootTimer <= 0) {
          spawnShootingStar();
          if (Math.random() < 0.25) spawnShootingStar();
          shootTimer = Math.random() * 55 + 35;
        }

        // Sparkle fragments
        sparkles = sparkles.filter(s => s.life > 0);
        sparkles.forEach(s => {
          s.x += s.vx; s.y += s.vy; s.vy += 0.04;
          s.life -= 0.04;
          ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0.1, s.r * s.life), 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,250,230,${s.life * 0.85})`; ctx.fill();
        });

        // Shooting stars — lifecycle: life 0→1
        shootingStars = shootingStars.filter(s => s.life < 1);
        shootingStars.forEach(s => {
          s.life += 0.009; // ~110 frames lifetime at 30fps
          // Smooth fade: in 0-0.1, full 0.1-0.68, out 0.68-1.0
          const fadeIn  = Math.min(1, s.life / 0.1);
          const fadeOut = s.life > 0.68 ? Math.max(0, 1 - (s.life - 0.68) / 0.32) : 1;
          const opacity = fadeIn * fadeOut;

          // Trail length grows from 0 to full over early life
          const trailMult = Math.min(1, s.life / 0.18);
          const tailX = s.x - Math.cos(s.angle) * s.len * trailMult;
          const tailY = s.y - Math.sin(s.angle) * s.len * trailMult;

          if (opacity > 0.01) {
            ctx.save();
            ctx.lineCap = 'round';

            // Wide outer haze
            ctx.shadowColor = `rgba(200,218,255,${opacity * 0.5})`;
            ctx.shadowBlur = s.width * 14;
            ctx.strokeStyle = `rgba(180,205,255,${opacity * 0.1})`;
            ctx.lineWidth = s.width * 9;
            ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(s.x, s.y); ctx.stroke();
            ctx.shadowBlur = 0;

            // Mid glow layer
            ctx.strokeStyle = `rgba(220,232,255,${opacity * 0.28})`;
            ctx.lineWidth = s.width * 3.5;
            ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(s.x, s.y); ctx.stroke();

            // Bright core line
            ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.92})`;
            ctx.lineWidth = s.width * 0.65;
            ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(s.x, s.y); ctx.stroke();

            // Head flare glow
            ctx.shadowColor = 'rgba(255,255,255,0.95)';
            ctx.shadowBlur = s.width * 18;
            ctx.fillStyle = `rgba(255,255,255,${opacity})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.width * 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Accent color halo at head
            ctx.fillStyle = `rgba(${col.str},${opacity * 0.28})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.width * 6, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
          }

          // Sparkle fragments
          if (Math.random() < 0.22 && s.life > 0.12 && s.life < 0.62) {
            for (let i = 0; i < 2; i++) {
              sparkles.push({
                x: s.x, y: s.y,
                vx: (Math.random() - 0.5) * 1.6,
                vy: (Math.random() - 0.5) * 1.6,
                r: Math.random() * 1.1 + 0.35,
                life: 0.65 + Math.random() * 0.3,
              });
            }
          }

          s.x += s.vx; s.y += s.vy;
          if (s.x > width + 200 || s.y > height + 200 || s.x < -200) s.life = 1;
        });

      // ── Embers ────────────────────────────────────────────────
      } else if (type === 'embers') {
        particles.forEach(p => {
          p.flicker += p.flickerSpeed;
          p.driftPhase += p.driftFreq;
          p.life += p.lifeSpeed;
          if (p.life >= 1) {
            p.life = 0; p.x = Math.random()*width; p.y = height + 8;
            p.speed = Math.random()*1.1+0.5; p.r = p.baseR;
          }
          p.y -= p.speed;
          p.x += p.drift + Math.sin(p.driftPhase)*0.7;
          p.r = p.baseR * (1 - p.life * 0.6); // shrink as it rises

          const fade = Math.min(1, Math.min(p.life*6, (1-p.life)*3));
          const flicker = 0.55 + 0.45*Math.sin(p.flicker);
          const alpha = flicker * fade;

          // Color: white core → yellow → orange → red, based on life
          let r2, g2, b2;
          if (p.life < 0.15) { r2=255; g2=240; b2=200; } // white-hot
          else if (p.life < 0.35) { r2=255; g2=180; b2=30; } // yellow
          else if (p.life < 0.65) { r2=255; g2=90; b2=10; } // orange
          else { r2=col.r; g2=Math.max(0,col.g-20); b2=Math.max(0,col.b-10); } // accent red

          // outer glow
          const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5);
          glow.addColorStop(0, `rgba(${r2},${g2},${b2},${alpha*0.22})`);
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r*5,0,Math.PI*2); ctx.fill();
          // inner bright core
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle = `rgba(${r2},${g2},${b2},${alpha})`; ctx.fill();
          // hot tip
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.45,0,Math.PI*2);
          ctx.fillStyle = `rgba(255,255,240,${alpha*0.8})`; ctx.fill();
        });

      // ── Matrix ────────────────────────────────────────────────
      } else if (type === 'matrix') {
        const fontSize = 14;
        const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEF@#$%&';
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        matrixCols.forEach((mc, i) => {
          mc.y += mc.speed;
          mc.brightTimer--;
          if (mc.brightTimer <= 0) { mc.bright = !mc.bright; mc.brightTimer = mc.bright ? 8+Math.random()*15 : 100+Math.random()*400; }
          if (mc.y > height + fontSize*mc.trailLen) {
            mc.y = -fontSize * (Math.random()*10+5);
            mc.speed = Math.random()*2.2+0.8;
            mc.opacity = Math.random()*0.55+0.3;
          }
          for (let t = 0; t < mc.trailLen; t++) {
            const cy = mc.y - t*fontSize;
            if (cy < -fontSize || cy > height+fontSize) continue;
            const tFrac = 1 - t/mc.trailLen;
            const ch = CHARS[Math.floor(Math.random()*CHARS.length)];
            if (t === 0) {
              // bright white head
              ctx.fillStyle = mc.bright
                ? `rgba(220,255,220,${mc.opacity})`
                : `rgba(180,255,180,${mc.opacity})`;
              ctx.shadowColor = '#00ff41';
              ctx.shadowBlur = mc.bright ? 14 : 8;
            } else if (t < 3) {
              ctx.fillStyle = `rgba(100,255,100,${tFrac*mc.opacity*0.9})`;
              ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 4;
            } else {
              ctx.fillStyle = `rgba(0,${Math.floor(150*tFrac+50)},0,${tFrac*mc.opacity*0.7})`;
              ctx.shadowBlur = 0;
            }
            ctx.fillText(ch, i*fontSize, cy);
          }
          ctx.shadowBlur = 0;
        });

      // ── Rain ──────────────────────────────────────────────────
      } else if (type === 'rain') {
        const angleX = 2.2; // slight rightward slant
        ctx.lineCap = 'round';
        particles.forEach(p => {
          p.x += angleX;
          p.y += p.speed;
          if (p.y > height + p.len) { p.y = -p.len; p.x = Math.random() * width; }
          if (p.x > width + p.len) p.x = -p.len;
          const ex = p.x + angleX * (p.len / p.speed);
          const ey = p.y + p.len;
          const grad = ctx.createLinearGradient(p.x, p.y, ex, ey);
          grad.addColorStop(0, `rgba(180,210,255,0)`);
          grad.addColorStop(0.4, `rgba(190,218,255,${p.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(200,225,255,${p.opacity})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = p.thickness;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
        });
      // ── Confetti ──────────────────────────────────────────────
      } else if (type === 'confetti') {
        particles.forEach(p => {
          p.y += p.speed;
          p.x += p.drift + Math.sin(p.rotation * 2) * 0.4;
          p.rotation += p.rotSpeed;
          if (p.y > height + p.size) { p.y = -p.size; p.x = Math.random() * width; }
          if (p.x > width + p.size) p.x = -p.size;
          if (p.x < -p.size) p.x = width + p.size;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          const s = p.size;
          if (p.shape === 'rect') {
            ctx.fillRect(-s/2, -s/5, s, s/2.5);
          } else if (p.shape === 'circle') {
            ctx.beginPath(); ctx.arc(0, 0, s/2, 0, Math.PI*2); ctx.fill();
          } else {
            ctx.beginPath(); ctx.moveTo(0,-s/2); ctx.lineTo(s/2,s/2); ctx.lineTo(-s/2,s/2); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        });
      // ── Fireflies ───────────────────────────────────────────────
      } else if (type === 'fireflies') {
        particles.forEach(p => {
          p.glow += p.glowSpeed;
          const dx = p.targetX - p.x, dy = p.targetY - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 8) { p.targetX = Math.random()*width; p.targetY = Math.random()*height*0.85; }
          p.x += (dx/dist)*p.speed; p.y += (dy/dist)*p.speed;
          const gi = 0.4 + 0.6*Math.sin(p.glow);
          const outerR = p.size*18;
          const gr = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,outerR);
          gr.addColorStop(0, `rgba(200,255,100,${p.opacity*gi*0.9})`);
          gr.addColorStop(0.15, `rgba(180,255,80,${p.opacity*gi*0.4})`);
          gr.addColorStop(0.5, `rgba(100,200,50,${p.opacity*gi*0.1})`);
          gr.addColorStop(1, 'rgba(0,150,0,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(p.x,p.y,outerR,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = `rgba(240,255,180,${p.opacity*gi})`;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.8,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${p.opacity*gi*0.9})`;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.3,0,Math.PI*2); ctx.fill();
        });
      // ── Bubbles ─────────────────────────────────────────────────
      } else if (type === 'bubbles') {
        particles.forEach(p => {
          p.y -= p.speed;
          p.wobble += p.wobbleSpeed;
          p.shimmer += 0.04;
          p.x += Math.sin(p.wobble)*0.8;
          if (p.y < -p.size) { p.y = height+p.size; p.x = Math.random()*width; }
          const sh = 0.7+0.3*Math.sin(p.shimmer);
          // Thin colored rim
          ctx.strokeStyle = `rgba(180,230,255,${p.opacity*sh})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.stroke();
          // Inner fill near-transparent
          const fill = ctx.createRadialGradient(p.x-p.size*0.3,p.y-p.size*0.35,0,p.x,p.y,p.size);
          fill.addColorStop(0, `rgba(220,245,255,${p.opacity*0.18})`);
          fill.addColorStop(0.6, `rgba(180,220,255,${p.opacity*0.06})`);
          fill.addColorStop(1, 'rgba(100,180,255,0)');
          ctx.fillStyle = fill;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
          // Specular highlight
          ctx.fillStyle = `rgba(255,255,255,${p.opacity*sh*0.7})`;
          ctx.beginPath(); ctx.ellipse(p.x-p.size*0.28,p.y-p.size*0.3,p.size*0.18,p.size*0.1,-0.5,0,Math.PI*2); ctx.fill();
        });
      // ── Leaves ───────────────────────────────────────────────────
      } else if (type === 'leaves') {
        particles.forEach(p => {
          p.y += p.speed;
          p.x += Math.sin(p.sway)*p.drift;
          p.rotation += p.rotSpeed;
          p.sway += p.swaySpeed;
          if (p.y > height+p.size) { p.y = -p.size; p.x = Math.random()*width; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          const s = p.size;
          // Realistic leaf: oval body with pointed tip
          const lg = ctx.createLinearGradient(0,-s,0,s*0.3);
          lg.addColorStop(0, p.color);
          lg.addColorStop(0.6, p.color+'cc');
          lg.addColorStop(1, '#2d1200');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(0,-s);
          ctx.bezierCurveTo(s*0.55,-s*0.7, s*0.6, s*0.1, 0, s*0.35);
          ctx.bezierCurveTo(-s*0.6, s*0.1, -s*0.55,-s*0.7, 0,-s);
          ctx.fill();
          // Central vein
          ctx.strokeStyle = `rgba(0,0,0,0.25)`;
          ctx.lineWidth = s*0.04;
          ctx.beginPath(); ctx.moveTo(0,-s*0.9); ctx.lineTo(0,s*0.3); ctx.stroke();
          ctx.restore();
        });
      // ── Cherry Petals ───────────────────────────────────────────
      } else if (type === 'petals') {
        particles.forEach(p => {
          p.y += p.speed;
          p.x += Math.sin(p.sway)*1.5;
          p.rotation += p.rotSpeed;
          p.sway += p.swaySpeed;
          if (p.y > height+p.size) { p.y = -p.size; p.x = Math.random()*width; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          const s = p.size;
          // Petal: two-lobe teardrop
          const pg = ctx.createRadialGradient(-s*0.1,-s*0.1,0,0,0,s*0.8);
          pg.addColorStop(0, 'rgba(255,230,235,1)');
          pg.addColorStop(0.4, 'rgba(255,180,195,1)');
          pg.addColorStop(1, 'rgba(220,100,140,0.6)');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.bezierCurveTo(-s*0.5,-s*0.3,-s*0.6,-s*0.9,-s*0.2,-s);
          ctx.bezierCurveTo(0,-s*1.1, 0,-s*1.1, s*0.2,-s);
          ctx.bezierCurveTo(s*0.6,-s*0.9, s*0.5,-s*0.3, 0,0);
          ctx.fill();
          ctx.restore();
        });
      // ── Electric Sparks ────────────────────────────────────────
      } else if (type === 'sparks') {
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.15; // gravity
          p.life += 0.025;
          if (p.life > p.maxLife) {
            p.x = Math.random()*width; p.y = Math.random()*height*0.6;
            p.vx = (Math.random()-0.5)*10; p.vy = (Math.random()-0.5)*10;
            p.life = 0;
          }
          const alpha = Math.max(0, 1 - p.life/p.maxLife);
          // Spark trail line
          const tx = p.x - p.vx*4, ty = p.y - p.vy*4;
          const sg = ctx.createLinearGradient(tx,ty,p.x,p.y);
          sg.addColorStop(0, `rgba(255,255,255,0)`);
          sg.addColorStop(0.5, `rgba(180,220,255,${alpha*0.5})`);
          sg.addColorStop(1, `rgba(100,180,255,${alpha})`);
          ctx.strokeStyle = sg;
          ctx.lineWidth = Math.max(0.5, p.size*alpha);
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(p.x,p.y); ctx.stroke();
          // Bright head
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*alpha*1.5,0,Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
        });
      // ── Floating Hearts ────────────────────────────────────────
      } else if (type === 'hearts') {
        particles.forEach(p => {
          p.y -= p.speed;
          p.x += Math.sin(p.sway)*1.2;
          p.sway += p.swaySpeed;
          p.pulse += 0.06;
          if (p.y < -p.size*2) { p.y = height+p.size; p.x = Math.random()*width; }
          const scale = 1 + Math.sin(p.pulse)*0.12;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = p.opacity;
          const s = p.size;
          // Glow
          const hg = ctx.createRadialGradient(0,0,0,0,0,s*2.5);
          hg.addColorStop(0, 'rgba(255,100,160,0.35)');
          hg.addColorStop(1, 'rgba(255,50,120,0)');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(0,0,s*2.5,0,Math.PI*2); ctx.fill();
          // Heart shape using standard bezier
          const hfg = ctx.createLinearGradient(0,-s,0,s);
          hfg.addColorStop(0, 'rgba(255,150,180,1)');
          hfg.addColorStop(1, 'rgba(220,30,80,1)');
          ctx.fillStyle = hfg;
          ctx.beginPath();
          ctx.moveTo(0, s*0.25);
          ctx.bezierCurveTo(-s*0.1, s*0, -s*1.0, -s*0.25, -s*0.75, -s*0.65);
          ctx.bezierCurveTo(-s*0.5, -s*1.0, s*0, -s*0.9, 0, -s*0.5);
          ctx.bezierCurveTo(0, -s*0.9, s*0.5, -s*1.0, s*0.75, -s*0.65);
          ctx.bezierCurveTo(s*1.0, -s*0.25, s*0.1, s*0, 0, s*0.25);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      // ── Diamonds ───────────────────────────────────────────────
      } else if (type === 'diamonds') {
        particles.forEach(p => {
          p.y += p.fallSpeed;
          p.rotation += p.rotSpeed;
          p.shimmer += 0.1;
          if (p.y > height+p.size) { p.y = -p.size; p.x = Math.random()*width; }
          const flash = 0.5+0.5*Math.sin(p.shimmer);
          const flash2 = 0.5+0.5*Math.sin(p.shimmer*1.7+1);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const s = p.size;
          // Outer glow
          const dg = ctx.createRadialGradient(0,0,0,0,0,s*2.5);
          dg.addColorStop(0, `rgba(200,240,255,${p.opacity*flash*0.5})`);
          dg.addColorStop(1, 'rgba(100,200,255,0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(0,0,s*2.5,0,Math.PI*2); ctx.fill();
          // Main diamond facets
          const facetColors = [
            `rgba(220,245,255,${p.opacity*flash})`,
            `rgba(180,220,255,${p.opacity*0.7})`,
            `rgba(255,255,255,${p.opacity*flash2})`,
            `rgba(160,210,255,${p.opacity*0.6})`,
          ];
          // Top facet
          ctx.fillStyle = facetColors[0];
          ctx.beginPath(); ctx.moveTo(0,-s); ctx.lineTo(s*0.6,-s*0.2); ctx.lineTo(0,0); ctx.lineTo(-s*0.6,-s*0.2); ctx.closePath(); ctx.fill();
          // Left facet
          ctx.fillStyle = facetColors[1];
          ctx.beginPath(); ctx.moveTo(-s*0.6,-s*0.2); ctx.lineTo(0,0); ctx.lineTo(0,s); ctx.closePath(); ctx.fill();
          // Right facet
          ctx.fillStyle = facetColors[2];
          ctx.beginPath(); ctx.moveTo(s*0.6,-s*0.2); ctx.lineTo(0,0); ctx.lineTo(0,s); ctx.closePath(); ctx.fill();
          // Specular
          if (flash > 0.8) {
            ctx.fillStyle = `rgba(255,255,255,${(flash-0.8)*3})`;
            ctx.beginPath(); ctx.arc(-s*0.2,-s*0.5,s*0.12,0,Math.PI*2); ctx.fill();
          }
          ctx.restore();
        });
      // ── Glitch ───────────────────────────────────────────────────
      } else if (type === 'glitch') {
        // Scanline overlay
        if (Math.random() < 0.4) {
          const scanY = Math.random()*height;
          const scanH = Math.random()*40+10;
          ctx.fillStyle = `rgba(${col.str},${Math.random()*0.12+0.04})`;
          ctx.fillRect(0, scanY, width, scanH);
        }
        particles.forEach(p => {
          p.timer--;
          if (p.timer <= 0) {
            p.timer = p.maxTimer * (Math.random()*0.5+0.5);
            p.y = Math.random()*height;
            p.width = Math.random()*width*0.6+60;
            p.x = Math.random()*(width-p.width);
            p.height = Math.random()*5+1;
          }
          // Always draw glitch bars
          ctx.fillStyle = `rgba(${col.str},${Math.random()*0.25+0.08})`;
          ctx.fillRect(p.x, p.y, p.width, p.height);
          // RGB split
          ctx.fillStyle = `rgba(255,0,80,${Math.random()*0.15})`;
          ctx.fillRect(p.x+p.offset, p.y, p.width, p.height);
          ctx.fillStyle = `rgba(0,200,255,${Math.random()*0.12})`;
          ctx.fillRect(p.x-p.offset*0.7, p.y+1, p.width, p.height);
          // Occasional bright flash bar
          if (Math.random() < 0.08) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.35+0.1})`;
            ctx.fillRect(0, p.y, width, 1);
          }
        });
      // ── Smoke ────────────────────────────────────────────────────
      } else if (type === 'smoke') {
        particles.forEach(p => {
          p.y -= p.speed;
          p.x += p.drift + Math.sin(p.life*3)*0.4;
          p.life += 0.008;
          p.size += 0.5;
          if (p.y < -p.size || p.life > 1) {
            p.x = Math.random()*width;
            p.y = height + 20;
            p.size = Math.random()*25+15;
            p.life = 0;
            p.drift = (Math.random()-0.5)*0.6;
          }
          const fadeIn = Math.min(1, p.life*8);
          const fadeOut = Math.max(0, 1-p.life*1.2);
          const alpha = fadeIn*fadeOut*p.opacity*0.55;
          const gr = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
          gr.addColorStop(0, `rgba(160,155,150,${alpha})`);
          gr.addColorStop(0.5, `rgba(120,115,110,${alpha*0.55})`);
          gr.addColorStop(1, 'rgba(80,75,70,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
        });
      // ── Dust ─────────────────────────────────────────────────────
      } else if (type === 'dust') {
        particles.forEach(p => {
          p.x += p.vx + Math.sin(p.shimmer*0.3)*0.15;
          p.y += p.vy + Math.cos(p.shimmer*0.2)*0.1;
          p.shimmer += 0.04;
          if (p.x<0) p.x=width; if (p.x>width) p.x=0;
          if (p.y<0) p.y=height; if (p.y>height) p.y=0;
          const sh = 0.2+0.8*Math.abs(Math.sin(p.shimmer));
          // Warm golden dust mote with soft glow
          const dg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*5);
          dg.addColorStop(0, `rgba(255,235,160,${p.opacity*sh*0.9})`);
          dg.addColorStop(0.4, `rgba(255,210,100,${p.opacity*sh*0.3})`);
          dg.addColorStop(1, 'rgba(200,160,50,0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = `rgba(255,245,200,${p.opacity*sh})`;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
        });
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [type, accentColor]);

  if (type === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: type === 'matrix' ? 0.55 : 0.75,
      }}
    />
  );
}
