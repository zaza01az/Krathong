// Core Loy Krathong Engine synced with updated krathong.py
import {
  COLS_DEFAULT, ROWS_DEFAULT, CW_DEFAULT, CH_DEFAULT, ART_W, ART_H,
  KX, KY, HOR, MX, KS, PERSP, W0, PITCH, CP, SPH, CANDLE_COL, MOON_DIR,
  MID, mix, clamp, hash2, body_pose, projectPoint, transformPoint, transformNormal
} from './math.js';
import { buildKrathongGeometry, buildTempleSilhouette } from './geometry.js';

export class LoyKrathongEngine {
  constructor(options = {}) {
    this.cols = options.cols || COLS_DEFAULT;
    this.rows = options.rows || ROWS_DEFAULT;
    this.cw = options.cw || CW_DEFAULT;
    this.ch = options.ch || CH_DEFAULT;
    this.artW = this.cols * this.cw;
    this.artH = this.rows * this.ch;
    this.kx = this.artW * 0.5;
    this.ky = this.artH * 0.64;
    this.hor = Math.floor(this.artH * 0.43);
    this.mx = this.artW * 0.79;
    this.ks = options.ks || KS;
    this.persp = PERSP;
    this.pitch = options.pitch || PITCH;

    // Simulation settings
    this.lotusStyle = options.lotusStyle || 'pink';
    this.speed = options.speed !== undefined ? options.speed : 1.0;
    this.wind = options.wind !== undefined ? options.wind : 0.0;
    this.candleIntensity = options.candleIntensity !== undefined ? options.candleIntensity : 1.0;
    this.waterRoughness = options.waterRoughness !== undefined ? options.waterRoughness : 1.0;
    this.moonGlow = options.moonGlow !== undefined ? options.moonGlow : 1.0;
    this.theme = options.theme || 'night';

    // Sky lanterns list from python script
    this.baseLanterns = [
      { lx: 0.12, ly: 0.25, speed: 11.0, phase: 0.0 },
      { lx: 0.36, ly: 0.18, speed: 9.0, phase: 1.7 },
      { lx: 0.55, ly: 0.22, speed: 12.5, phase: 3.1 },
      { lx: 0.66, ly: 0.15, speed: 8.5, phase: 4.4 },
      { lx: 0.90, ly: 0.26, speed: 10.5, phase: 2.2 },
    ];

    // Secondary floating Krathongs (from wishes)
    this.floatingWishes = [];
    // User-released sky lanterns
    this.userSkyLanterns = [];
    // Interactive dynamic water ripples
    this.interactiveRipples = [];

    this.initGeometry();
    this.initBuffers();
  }

  initGeometry() {
    const { geom, candle_top, tips } = buildKrathongGeometry(this.lotusStyle);
    this.geom = geom;
    this.candleTop = candle_top;
    this.tips = tips;
    const { mask, lights } = buildTempleSilhouette(this.cols, this.rows, this.hor, this.ch);
    this.temple = mask;
    this.templeLights = lights;
  }

  setLotusStyle(style) {
    this.lotusStyle = style;
    this.initGeometry();
  }

  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.artW = this.cols * this.cw;
    this.artH = this.rows * this.ch;
    this.kx = this.artW * 0.5;
    this.ky = this.artH * 0.64;
    this.hor = Math.floor(this.artH * 0.43);
    this.mx = this.artW * 0.79;
    const { mask, lights } = buildTempleSilhouette(this.cols, this.rows, this.hor, this.ch);
    this.temple = mask;
    this.templeLights = lights;
    this.initBuffers();
  }

  initBuffers() {
    const totalCells = this.rows * this.cols;
    this.densBuffer = new Float32Array(totalCells);
    this.colorBuffer = new Float32Array(totalCells * 3);
    this.midBuffer = new Int32Array(totalCells);
    this.zBuffer = new Float32Array(totalCells);
  }

  addWishKrathong(text, color = 'pink') {
    // Launch near center-bottom with slight random spread, then naturally bob & drift downstream
    const startX = this.kx + (Math.random() - 0.5) * (this.artW * 0.25);
    const startY = this.ky + 25 + Math.random() * 20;
    this.floatingWishes.push({
      id: Math.random().toString(36).slice(2, 9),
      text: text || 'ขอขมาพระแม่คงคา',
      color: color,
      x: startX,
      y: startY,
      z: 0.1,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.18 + Math.random() * 0.12), // drifting toward horizon
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      flickerOffset: Math.random() * 20,
      chaosPhase: Math.random() * 50,
      scale: 1.0,
      born: performance.now() * 0.001
    });

    // Create a welcoming water ripple on release
    this.addRipple(startX, startY, 1.2);
  }

  addRipple(artX, artY, strength = 1.0) {
    // Ensure ripple is on river water (below or near horizon)
    if (artY < this.hor * 0.85) return;
    this.interactiveRipples.push({
      x: artX,
      y: artY,
      radius: 0,
      maxRadius: 180 + strength * 100,
      speed: 130 + strength * 40, // pixels per sec
      strength: Math.min(Math.max(strength, 0.4), 2.5),
      age: 0,
      maxAge: 2.8 + strength * 0.8
    });

    // Limit active ripples for performance
    if (this.interactiveRipples.length > 12) {
      this.interactiveRipples.shift();
    }
  }

  addSkyLantern(wishText = '') {
    this.userSkyLanterns.push({
      x: (Math.random() * 0.7 + 0.15) * this.artW,
      y: this.hor + 20,
      vx: (Math.random() - 0.5) * 0.2 + (this.wind * 0.4),
      vy: -(0.35 + Math.random() * 0.3),
      flicker: Math.random() * 10,
      text: wishText,
      life: 0
    });
  }

  clearBuffers() {
    this.densBuffer.fill(0);
    this.colorBuffer.fill(0);
    this.midBuffer.fill(0);
  }

  render(t) {
    this.clearBuffers();
    const simTime = t * this.speed;

    // Update interactive water ripples
    const dt = 0.016; // approximate per-frame delta
    for (let i = this.interactiveRipples.length - 1; i >= 0; i--) {
      const rip = this.interactiveRipples[i];
      rip.age += dt;
      rip.radius += rip.speed * dt;
      if (rip.age >= rip.maxAge || rip.radius >= rip.maxRadius) {
        this.interactiveRipples.splice(i, 1);
      }
    }

    // 1. Calculate candle projection for reflection alignment
    const { R, T } = body_pose(simTime);
    const candleWorld = transformPoint(this.candleTop, R, T);
    const fxEst = projectPoint(candleWorld, this.kx, this.ky, this.ks, this.pitch, this.persp);

    // 2. Sky Layer (stars, cratered full moon, temple silhouette + lights, floating lanterns)
    this.renderSky(simTime);

    // 3. Water Layer (summed waves, perspective, reflections, pool glow, ripple rings)
    this.renderWater(simTime, fxEst.x);

    // 4. Floating wish krathongs downstream
    this.renderFloatingWishes(simTime);

    // 5. Main 3D Krathong (Z-buffer, marigolds, 4-tier lotus, stamens, candle & incense)
    const { flameBase, tipsXY } = this.renderKrathong(simTime, R, T);

    // 6. Candle Flame Layer (sway, halo & sparks)
    this.renderFlame(simTime, flameBase.x, flameBase.y);

    // 7. Atmosphere Layer (curling incense smoke + dancing fireflies)
    this.renderAtmosphere(simTime, tipsXY);

    // 8. User-released sky lanterns
    this.renderUserLanterns(simTime);

    return {
      cols: this.cols,
      rows: this.rows,
      density: this.densBuffer,
      color: this.colorBuffer,
      mid: this.midBuffer,
      flameX: flameBase.x,
      flameY: flameBase.y
    };
  }

  renderSky(t) {
    const { cols, rows, cw, ch, hor, mx, artW, temple, templeLights } = this;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;
    const moonY = hor * 0.31;

    let skyColTop = [0.02, 0.03, 0.11];
    let skyColBot = [0.15, 0.17, 0.34];

    if (this.theme === 'twilight') {
      skyColTop = [0.05, 0.06, 0.20];
      skyColBot = [0.35, 0.18, 0.32];
    } else if (this.theme === 'dusk') {
      skyColTop = [0.08, 0.08, 0.22];
      skyColBot = [0.55, 0.25, 0.18];
    } else if (this.theme === 'dawn') {
      skyColTop = [0.06, 0.12, 0.28];
      skyColBot = [0.45, 0.35, 0.40];
    }

    const starTwinkleBase = W0 * 4.5 * t;

    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * ch;
      if (y >= hor) continue;

      const ty = Math.min(Math.max(y / Math.max(hor, 1), 0.0), 1.0);
      const tyPow = Math.pow(ty, 1.5);
      const baseSky = mix(skyColTop, skyColBot, tyPow);
      const baseDens = 0.04 + 0.09 * ty;

      const rOffset = r * cols;

      for (let c = 0; c < cols; c++) {
        const cellIdx = rOffset + c;
        const x = (c + 0.5) * cw;

        // Check distant temple lights & silhouette
        if (templeLights[cellIdx]) {
          dens[cellIdx] = 0.95;
          col[cellIdx * 3] = 1.0;
          col[cellIdx * 3 + 1] = 0.78;
          col[cellIdx * 3 + 2] = 0.25;
          mid[cellIdx] = MID.temple;
          continue;
        }

        if (temple[cellIdx]) {
          dens[cellIdx] = 0.68;
          col[cellIdx * 3] = 0.14;
          col[cellIdx * 3 + 1] = 0.10;
          col[cellIdx * 3 + 2] = 0.15;
          mid[cellIdx] = MID.temple;
          continue;
        }

        let d = baseDens;
        let cr = baseSky[0], cg = baseSky[1], cb = baseSky[2];

        // Twinkling stars
        const starSeed = hash2(r, c, 3.14);
        if (starSeed > 0.982) {
          const twinkle = 0.35 + 0.65 * Math.sin(starTwinkleBase + starSeed * 80.0);
          d = 0.30 + 0.65 * twinkle;
          cr = 0.85; cg = 0.92; cb = 1.0;
        }

        // Full Moon with crater shading & atmospheric halo
        const dx = x - mx;
        const dy = y - moonY;
        const dMoon = Math.hypot(dx, dy);

        if (dMoon < 38.0) {
          const crater = 0.92 + 0.08 * Math.sin(x * 0.14) * Math.cos(y * 0.14);
          d = 0.96 * crater;
          cr = 1.0 * crater; cg = 0.96 * crater; cb = 0.78 * crater;
        } else {
          const moonGlow = Math.exp(-Math.pow(dMoon / 110.0, 2)) * 0.48 * this.moonGlow;
          if (moonGlow > d) {
            d = moonGlow;
            cr = 0.68; cg = 0.74; cb = 0.96;
          }
        }

        dens[cellIdx] = d;
        col[cellIdx * 3] = cr;
        col[cellIdx * 3 + 1] = cg;
        col[cellIdx * 3 + 2] = cb;
        mid[cellIdx] = MID.base;
      }
    }

    // Floating Sky Lanterns (Khom Loi) drifting in the sky
    for (const lan of this.baseLanterns) {
      const ly_px = ((hor * lan.ly - t * lan.speed + lan.phase * 40.0) % Math.max(hor - 12, 1)) + 8.0;
      const lx_px = artW * lan.lx + 14.0 * Math.sin(t * 0.6 + lan.phase) + (this.wind * 10.0);
      const rMin = Math.max(0, Math.floor((ly_px - 25) / ch));
      const rMax = Math.min(rows, Math.ceil((ly_px + 25) / ch));

      for (let r = rMin; r < rMax; r++) {
        const y = (r + 0.5) * ch;
        if (y >= hor) continue;
        const rOffset = r * cols;

        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cw;
          const dl = Math.hypot((x - lx_px) / 7.5, (y - ly_px) / 10.5);
          const l_glow = Math.exp(-dl * dl * 1.4) * (0.78 + 0.15 * Math.sin(W0 * 6.0 * t + lan.phase));

          if (l_glow > 0.12) {
            const cellIdx = rOffset + c;
            dens[cellIdx] = Math.max(dens[cellIdx], l_glow);
            col[cellIdx * 3] = Math.min(col[cellIdx * 3] + 1.0 * l_glow, 1.0);
            col[cellIdx * 3 + 1] = Math.min(col[cellIdx * 3 + 1] + 0.65 * l_glow, 1.0);
            col[cellIdx * 3 + 2] = Math.min(col[cellIdx * 3 + 2] + 0.22 * l_glow, 1.0);
            mid[cellIdx] = MID.spark;
          }
        }
      }
    }
  }

  renderWater(t, fx) {
    const { cols, rows, cw, ch, hor, artH, kx, ky, mx, temple, templeLights } = this;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;
    const r0 = Math.floor(hor / ch);
    const rough = this.waterRoughness;

    const gold = [1.0, 0.76, 0.26];
    const moonReflCol = [1.0, 0.95, 0.72];
    const poolCol = [1.0, 0.62, 0.20];
    const ringCol = [1.0, 0.82, 0.42];

    const fr_f = 0.85 + 0.15 * Math.sin(W0 * 7.0 * t);

    for (let r = r0; r < rows; r++) {
      const y = (r + 0.5) * ch;
      const q = Math.min(Math.max((y - hor) / Math.max(artH - hor, 1), 0.0), 1.0);
      const z = 1.0 / (q + 0.07);
      const dyr = y - ky;
      const mr = y - hor;
      const wid = 26.0 + Math.max(dyr, 0) * 0.11;
      const mw = 16.0 + mr * 0.065;

      const rOffset = r * cols;

      for (let c = 0; c < cols; c++) {
        const cellIdx = rOffset + c;
        const x = (c + 0.5) * cw;
        const u = (x - kx) / (60.0 + q * 700.0);

        let h = (
          Math.sin(u * 6.0 + z * 1.4 - W0 * 3.0 * t) +
          0.7 * Math.sin(u * 11.0 - z * 2.3 + W0 * 4.0 * t) +
          0.5 * Math.sin(u * 3.0 + z * 3.9 - W0 * 2.0 * t + 2.1) +
          0.3 * Math.sin(u * 17.0 + z * 6.1 + W0 * 5.0 * t)
        ) * rough;

        // Radiating dynamic concentric ripples from touch/clicks
        let rippleElevation = 0.0;
        let rippleLight = 0.0;
        if (this.interactiveRipples.length > 0) {
          for (let ri = 0; ri < this.interactiveRipples.length; ri++) {
            const rip = this.interactiveRipples[ri];
            // Elliptical perspective aspect for river ripples (water surface viewed at pitch)
            const drx = x - rip.x;
            const dry = (y - rip.y) * 2.4;
            const dist = Math.hypot(drx, dry);
            const waveFront = dist - rip.radius;

            // Concentric radiating sine waves around waveFront
            if (Math.abs(waveFront) < 42.0) {
              const fade = Math.max(0, 1.0 - rip.age / rip.maxAge) * Math.max(0, 1.0 - dist / rip.maxRadius);
              const waveVal = Math.sin(waveFront * 0.28) * Math.exp(-Math.pow(waveFront / 18.0, 2)) * rip.strength * fade;
              rippleElevation += waveVal;
              rippleLight += Math.max(0, waveVal) * 0.85;
            }
          }
          h += rippleElevation * 1.5;
        }

        const wave = 0.5 + 0.5 * Math.tanh(h * 0.9);
        let d = 0.12 + 0.32 * wave * (0.4 + 0.6 * q) + rippleLight * 0.45;

        let wc = mix([0.03, 0.26, 0.30], [0.12, 0.56, 0.54], wave);
        wc = mix(wc, [0.55, 0.30, 0.10], Math.min(Math.max(1.0 - q * 9.0, 0.0), 1.0) * 0.7);

        // Temple reflection on water
        const rm = Math.min(Math.max(2 * r0 - r, 0), rows - 1);
        const cm = Math.min(Math.max(c + Math.round(h * 1.1), 0), cols - 1);
        const targetIdx = rm * cols + cm;
        const refl = (r >= r0) && ((r - r0) < 28) && temple[targetIdx];
        const reflLit = refl && templeLights[targetIdx];

        if (refl) {
          d = Math.max(d, 0.42);
          const tFactor = (0.7 + 0.3 * wave);
          wc[0] = 0.82 * tFactor;
          wc[1] = 0.44 * tFactor;
          wc[2] = 0.15 * tFactor;
        }
        if (reflLit) {
          wc[0] = 1.0;
          wc[1] = 0.80;
          wc[2] = 0.30;
        }

        // Candle reflection column (fr)
        let fr = 0.0;
        if (dyr > -45) {
          const xDist = (x - fx) + 6.0 * h;
          const streak = Math.exp(-Math.pow(xDist / wid, 2)) * Math.exp(-Math.abs(dyr) / 280.0);
          const shimm = Math.pow(0.5 + 0.5 * Math.sin(dyr * 0.12 + h * 2.2 - W0 * 6.0 * t), 1.5);
          fr = streak * shimm * this.candleIntensity;
        }
        const frVal = 0.92 * fr * fr_f;

        // Moon reflection column (mo)
        const mxDist = (x - mx) + 6.0 * h;
        const moStreak = Math.exp(-Math.pow(mxDist / mw, 2)) * Math.exp(-mr / 440.0);
        const moShimm = Math.pow(0.5 + 0.5 * Math.sin(mr * 0.10 + h * 3.0 - W0 * 5.0 * t), 1.5);
        const moVal = 0.82 * moStreak * moShimm * this.moonGlow;

        // Warm glow pool
        const poolDist = Math.pow((x - kx) / 330.0, 2) + Math.pow((y - ky - 15.0) / 130.0, 2);
        const pool = Math.exp(-poolDist * 1.35) * 0.55 * (0.35 + 0.65 * wave) * this.candleIntensity;

        // Expanding concentric water ripples
        const rho = Math.hypot(x - kx, (y - ky - 20.0) * 2.6);
        const ringWave = Math.max(0, Math.cos(rho * 0.055 - W0 * 5.0 * t));
        const ring = 0.65 * Math.pow(ringWave, 6) * Math.exp(-rho / 240.0);

        let maxD = d;
        let chosenCol = wc;

        if (rippleLight > 0.08) {
          const ripTint = mix(wc, gold, Math.min(rippleLight * 1.2, 0.85));
          chosenCol = ripTint;
        }

        if (frVal > maxD) {
          maxD = frVal;
          chosenCol = gold;
        }
        if (moVal > maxD) {
          maxD = moVal;
          chosenCol = moonReflCol;
        }
        if (pool > maxD) {
          maxD = pool;
          chosenCol = poolCol;
        }
        if (ring > maxD) {
          maxD = ring;
          chosenCol = ringCol;
        }

        dens[cellIdx] = maxD;
        col[cellIdx * 3] = chosenCol[0];
        col[cellIdx * 3 + 1] = chosenCol[1];
        col[cellIdx * 3 + 2] = chosenCol[2];
        mid[cellIdx] = MID.water;
      }
    }
  }

  renderKrathong(t, R, T) {
    const { cols, rows, cw, ch, kx, ky, ks, pitch, cp = CP, sph = SPH } = this;
    const { P_all, N_all, C_all, M_all, E_all, count } = this.geom;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;
    const zBuf = this.zBuffer;
    zBuf.fill(1e9);

    const flick = (1.0 + 0.12 * Math.sin(W0 * 7.0 * t) + 0.08 * Math.sin(W0 * 13.0 * t + 1.0)) * this.candleIntensity;
    const emberPulse = 0.9 + 0.2 * Math.sin(W0 * 5.0 * t);

    const lw = transformPoint(this.candleTop, R, [T[0], T[1] + 0.25, T[2]]);
    const lv = [
      lw[0],
      lw[1] * CP - lw[2] * SPH,
      lw[1] * SPH + lw[2] * CP
    ];

    const ywWater = ky + 0.479 * ks;

    for (let k = 0; k < count; k++) {
      const idx = k * 3;
      const p = [P_all[idx], P_all[idx + 1], P_all[idx + 2]];
      const n = [N_all[idx], N_all[idx + 1], N_all[idx + 2]];

      const pw = transformPoint(p, R, T);
      const nw = transformNormal(n, R);

      const prj = projectPoint(pw, kx, ky, ks, pitch, this.persp);
      const colX = Math.floor(prj.x / cw);
      const rowY = Math.floor(prj.y / ch);

      if (colX < 0 || colX >= cols || rowY < 0 || rowY >= rows) continue;

      const cellIdx = rowY * cols + colX;
      if (prj.zv >= zBuf[cellIdx]) continue;

      zBuf[cellIdx] = prj.zv;

      let nx = nw[0];
      let ny = nw[1] * CP - nw[2] * SPH;
      let nz = nw[1] * SPH + nw[2] * CP;

      if (nz < 0) {
        nx = -nx; ny = -ny; nz = -nz;
      }

      const pv = [pw[0], pw[1] * CP - pw[2] * SPH, prj.zv];

      const dx = lv[0] - pv[0];
      const dy = lv[1] - pv[1];
      const dz = lv[2] - pv[2];
      const dist2 = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(dist2) || 1e-4;
      const dnx = dx / dist, dny = dy / dist, dnz = dz / dist;

      const lam = Math.max(0, nx * dnx + ny * dny + nz * dnz);
      const candAtten = (2.65 * flick * lam) / (0.16 + 1.15 * dist2);

      const lm = Math.max(0, nx * MOON_DIR[0] + ny * MOON_DIR[1] + nz * MOON_DIR[2]);
      const moonAtten = 0.38 * lm * this.moonGlow;

      const ambFactor = 0.28 + 0.10 * ny + 0.30 * nz;
      const bounceFactor = 0.26 * Math.max(0, -ny);

      const cBaseR = C_all[idx];
      const cBaseG = C_all[idx + 1];
      const cBaseB = C_all[idx + 2];

      let litR = cBaseR * (ambFactor * 1.0 + candAtten * CANDLE_COL[0] + moonAtten * 0.6 + bounceFactor * 0.5);
      let litG = cBaseG * (ambFactor * 0.88 + candAtten * CANDLE_COL[1] + moonAtten * 0.72 + bounceFactor * 0.35);
      let litB = cBaseB * (ambFactor * 0.78 + candAtten * CANDLE_COL[2] + moonAtten * 1.0 + bounceFactor * 0.1);

      litR = Math.pow(Math.min(Math.max(litR, 0), 1.0), 0.78);
      litG = Math.pow(Math.min(Math.max(litG, 0), 1.0), 0.78);
      litB = Math.pow(Math.min(Math.max(litB, 0), 1.0), 0.78);

      let d = 0.38 + 0.88 * (litR * 0.3 + litG * 0.55 + litB * 0.15);
      d = Math.min(Math.max(d, 0.40), 1.0);

      if (E_all[k] > 0.0) {
        litR = 1.0 * emberPulse;
        litG = 0.42 * emberPulse;
        litB = 0.12 * emberPulse;
        d = 1.0;
      }

      dens[cellIdx] = d;
      col[cellIdx * 3] = litR;
      col[cellIdx * 3 + 1] = litG;
      col[cellIdx * 3 + 2] = litB;
      mid[cellIdx] = M_all[k];

      // Waterline reflection splatting
      const cy = (rowY + 0.5) * ch;
      if (cy < ywWater) {
        const ry = ywWater + (ywWater - cy) * 0.7;
        const rx = (colX + 0.5) * cw + 5.0 * Math.sin(ry * 0.05 - W0 * 4.0 * t);
        const splatCol = Math.floor(rx / cw);
        const splatRow = Math.floor(ry / ch);
        if (splatCol >= 0 && splatCol < cols && splatRow >= 0 && splatRow < rows) {
          const sIdx = splatRow * cols + splatCol;
          const sDens = 0.34 * d;
          if (sDens > dens[sIdx]) {
            dens[sIdx] = sDens;
            col[sIdx * 3] = litR * 0.44;
            col[sIdx * 3 + 1] = litG * 0.44;
            col[sIdx * 3 + 2] = litB * 0.44;
            mid[sIdx] = MID.water;
          }
        }
      }
    }

    const candleBaseWorld = transformPoint(this.candleTop, R, T);
    const flameBasePrj = projectPoint(candleBaseWorld, kx, ky, ks, pitch, this.persp);

    const tipsXY = [];
    for (const tip of this.tips) {
      const tipWorld = transformPoint(tip, R, T);
      const prj = projectPoint(tipWorld, kx, ky, ks, pitch, this.persp);
      tipsXY.push({ x: prj.x, y: prj.y });
    }

    return {
      flameBase: { x: flameBasePrj.x, y: flameBasePrj.y },
      tipsXY
    };
  }

  renderFlame(t, fx, fy) {
    const { cols, rows, cw, ch } = this;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;

    const fh = 150.0;
    const fw = 34.0;

    // Multi-harmonic chaotic turbulence (Lorenz-like pseudo-chaotic attractor micro-jitters)
    const tChaos1 = t * 1.83;
    const tChaos2 = t * 4.37;
    const tChaos3 = t * 9.61;
    const tChaos4 = t * 19.3;
    const chaoticJitter = (
      0.55 * Math.sin(tChaos1) +
      0.30 * Math.sin(tChaos2 + 1.2) +
      0.15 * Math.sin(tChaos3 + 2.7) +
      0.08 * Math.sin(tChaos4 + 4.1)
    );
    const microPulse = 0.05 * Math.sin(t * 31.7) * Math.cos(t * 14.2);

    const flick = (1.0 + 0.12 * chaoticJitter + microPulse) * this.candleIntensity;
    const sway = (
      8.0 * Math.sin(W0 * 4.2 * t + 0.7) +
      4.0 * Math.sin(W0 * 9.5 * t + 1.4) +
      2.5 * Math.sin(tChaos3) +
      this.wind * 16.0
    );

    const rMin = Math.max(0, Math.floor((fy - fh * 1.5) / ch));
    const rMax = Math.min(rows, Math.ceil((fy + 25) / ch));

    for (let r = rMin; r < rMax; r++) {
      const y = (r + 0.5) * ch;
      const s = (fy - y) / (fh * flick);
      const sc = Math.min(Math.max(s, 0.0), 1.0);
      const xo = sway * sc * sc + (3.0 * Math.sin(s * 9.0 - W0 * 9.0 * t) + chaoticJitter * 2.0) * sc;
      const wid = fw * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(sc, 0.6))), 0.8) *
                  (1.0 + 0.08 * Math.sin(s * 12.0 - W0 * 10.0 * t) + 0.04 * chaoticJitter);

      const rOffset = r * cols;

      for (let c = 0; c < cols; c++) {
        const cellIdx = rOffset + c;
        const x = (c + 0.5) * cw;
        const q = Math.abs(x - fx - xo) / Math.max(wid, 1e-3);

        const inside = (s > -0.06) && (s < 1.0) && (q < 1.0);
        if (inside) {
          const core = (q < 0.45) && (s < 0.55);
          let cr, cg, cb;

          if (core) {
            cr = 1.0; cg = 0.98; cb = 0.82;
          } else {
            const gradT = Math.min(Math.max(1.25 * s - q * 0.6, 0.0), 1.0);
            const flmCol = mix([1.0, 0.38, 0.06], [1.0, 0.84, 0.25], gradT);
            cr = flmCol[0]; cg = flmCol[1]; cb = flmCol[2];
          }

          dens[cellIdx] = core ? 1.0 : 0.90;
          col[cellIdx * 3] = cr;
          col[cellIdx * 3 + 1] = cg;
          col[cellIdx * 3 + 2] = cb;
          mid[cellIdx] = MID.flame;
        }

        const dh = Math.hypot((x - fx - xo * 0.5) / 110.0, (y - fy + 45.0) / 135.0);
        const halo = 0.46 * Math.exp(-dh * dh * 2.1) * (hash2(r, c, 7.0) > 0.32 ? 1.0 : 0.0) * this.candleIntensity;
        if (halo > 0.12) {
          dens[cellIdx] = Math.max(dens[cellIdx], halo);
          col[cellIdx * 3] = Math.min(col[cellIdx * 3] + 1.0 * halo, 1.0);
          col[cellIdx * 3 + 1] = Math.min(col[cellIdx * 3 + 1] + 0.62 * halo, 1.0);
          col[cellIdx * 3 + 2] = Math.min(col[cellIdx * 3 + 2] + 0.20 * halo, 1.0);
          mid[cellIdx] = MID.spark;
        }
      }
    }
  }

  renderAtmosphere(t, tipsXY) {
    const { cols, rows, cw, ch, kx, ky } = this;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;

    // 1. Wispy curling incense smoke with natural chaotic turbulence
    for (let i = 0; i < tipsXY.length; i++) {
      const { x: tx, y: ty } = tipsXY[i];
      const rMin = Math.max(0, Math.floor((ty - 220) / ch));
      const rMax = Math.min(rows, Math.ceil(ty / ch));

      for (let r = rMin; r < rMax; r++) {
        const y = (r + 0.5) * ch;
        const sy = ty - y;
        if (sy <= 0 || sy >= 220) continue;

        const syNorm = sy / 140.0;
        // Non-linear turbulent curl with multi-frequency eddy currents
        const eddy = (
          Math.sin(sy * 0.038 - W0 * 3.2 * t + i * 1.3) +
          0.45 * Math.sin(sy * 0.082 + W0 * 5.1 * t + i * 2.1) +
          0.25 * Math.sin(sy * 0.16 - t * 8.4)
        );
        const sx = tx + 15.0 * eddy * syNorm + (this.wind * sy * 0.16);
        const w = 4.0 + sy * 0.098 + 1.2 * Math.sin(sy * 0.05 + t * 2.0);
        const rOffset = r * cols;

        for (let c = 0; c < cols; c++) {
          const cellIdx = rOffset + c;
          const x = (c + 0.5) * cw;
          const smoke = Math.exp(-Math.pow((x - sx) / Math.max(w, 1.0), 2)) * Math.exp(-sy / 115.0) * 0.48;

          if (smoke > 0.06) {
            dens[cellIdx] = Math.max(dens[cellIdx], smoke);
            col[cellIdx * 3] = Math.min(col[cellIdx * 3] + 0.68 * smoke, 1.0);
            col[cellIdx * 3 + 1] = Math.min(col[cellIdx * 3 + 1] + 0.74 * smoke, 1.0);
            col[cellIdx * 3 + 2] = Math.min(col[cellIdx * 3 + 2] + 0.85 * smoke, 1.0);
            mid[cellIdx] = MID.spark;
          }
        }
      }
    }

    // 2. Dancing Fireflies gently orbiting above the water
    for (let f_id = 0; f_id < 7; f_id++) {
      const fx_pos = kx + (240 + f_id * 35) * Math.cos(t * 0.55 + f_id * 1.9);
      const fy_pos = ky - 35 + 55 * Math.sin(t * 0.95 + f_id * 2.4);
      const pulse = 0.5 + 0.5 * Math.sin(W0 * 4.2 * t + f_id * 3.1);

      const rMin = Math.max(0, Math.floor((fy_pos - 20) / ch));
      const rMax = Math.min(rows, Math.ceil((fy_pos + 20) / ch));

      for (let r = rMin; r < rMax; r++) {
        const y = (r + 0.5) * ch;
        const rOffset = r * cols;
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cw;
          const df = Math.hypot((x - fx_pos) / 9.0, (y - fy_pos) / 9.0);
          const ff_glow = Math.exp(-df * df * 1.6) * (0.45 + 0.55 * pulse);

          if (ff_glow > 0.15) {
            const cellIdx = rOffset + c;
            dens[cellIdx] = Math.max(dens[cellIdx], ff_glow);
            col[cellIdx * 3] = Math.min(col[cellIdx * 3] + 0.75 * ff_glow, 1.0);
            col[cellIdx * 3 + 1] = Math.min(col[cellIdx * 3 + 1] + 1.0 * ff_glow, 1.0);
            col[cellIdx * 3 + 2] = Math.min(col[cellIdx * 3 + 2] + 0.35 * ff_glow, 1.0);
            mid[cellIdx] = MID.spark;
          }
        }
      }
    }
  }

  renderFloatingWishes(t) {
    const { cols, rows, cw, ch, hor, kx, ky } = this;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;

    // Palette colors for wish krathong offerings
    const paletteMap = {
      pink: { lotus: [0.95, 0.45, 0.65], base: [0.22, 0.55, 0.25] },
      gold: { lotus: [0.98, 0.82, 0.28], base: [0.72, 0.52, 0.18] },
      white: { lotus: [0.95, 0.95, 0.98], base: [0.24, 0.52, 0.26] },
      emerald: { lotus: [0.18, 0.78, 0.45], base: [0.12, 0.48, 0.20] }
    };

    for (let i = this.floatingWishes.length - 1; i >= 0; i--) {
      const wish = this.floatingWishes[i];
      // River current dynamics: flows forward (y drifts towards horizon) and gently undulates
      wish.rot += wish.rotSpeed;
      const riverFlow = (wish.y - hor) / Math.max(this.artH - hor, 1); // 0 at horizon, 1 near bottom
      const currentSpeed = 0.35 + 0.65 * riverFlow;

      // Natural meandering current sway
      const meander = Math.sin(t * 0.8 + wish.chaosPhase) * 0.4 + (this.wind * 0.45);
      wish.x += (wish.vx + meander) * currentSpeed;
      wish.y += wish.vy * currentSpeed;

      // Z depth increases as it recedes towards horizon
      const depthT = Math.max(0.0, Math.min(1.0, (ky - wish.y) / Math.max(ky - hor, 1)));
      const scale = Math.max(0.2, 1.0 - depthT * 0.75);

      if (wish.y < hor + 12 || wish.x < 10 || wish.x > this.artW - 10) {
        this.floatingWishes.splice(i, 1);
        continue;
      }

      const colors = paletteMap[wish.color] || paletteMap.pink;
      const cx = Math.floor(wish.x / cw);
      const cy = Math.floor(wish.y / ch);

      // Organic bobbing & candle flicker
      const bob = Math.sin(t * 3.5 + wish.chaosPhase) * 1.5 * scale;
      const candleY = wish.y - 10 * scale + bob;
      const candleR = Math.floor(candleY / ch);
      const flick = 0.82 + 0.28 * Math.sin(W0 * 8.5 * t + wish.flickerOffset) + 0.1 * Math.sin(t * 19.0 + wish.chaosPhase);

      // Render Krathong Body (Lotus Petals & Base Oval)
      const baseRadiusX = Math.max(2, Math.floor(6.5 * scale));
      const baseRadiusY = Math.max(1, Math.floor(2.8 * scale));

      for (let dr = -baseRadiusY; dr <= baseRadiusY; dr++) {
        const nr = cy + dr;
        if (nr < 0 || nr >= rows) continue;
        const rOffset = nr * cols;

        for (let dc = -baseRadiusX; dc <= baseRadiusX; dc++) {
          const nc = cx + dc;
          if (nc < 0 || nc >= cols) continue;

          const nDist = (dc * dc) / (baseRadiusX * baseRadiusX) + (dr * dr) / (baseRadiusY * baseRadiusY);
          if (nDist <= 1.0) {
            const cellIdx = rOffset + nc;
            const isRim = nDist > 0.55;
            const pCol = isRim ? colors.lotus : colors.base;
            const bDens = Math.max(0.55 * scale, 0.4);

            if (bDens > dens[cellIdx]) {
              dens[cellIdx] = bDens;
              col[cellIdx * 3] = pCol[0];
              col[cellIdx * 3 + 1] = pCol[1];
              col[cellIdx * 3 + 2] = pCol[2];
              mid[cellIdx] = isRim ? MID.lotus : MID.leaf;
            }
          }
        }
      }

      // Render Candle Flame Core & Glow
      if (candleR >= 0 && candleR < rows && cx >= 0 && cx < cols) {
        const flameIdx = candleR * cols + cx;
        dens[flameIdx] = 1.0;
        col[flameIdx * 3] = 1.0;
        col[flameIdx * 3 + 1] = 0.92 * flick;
        col[flameIdx * 3 + 2] = 0.45;
        mid[flameIdx] = MID.flame;

        // Radiating water aura from the glowing candle
        const glowRad = Math.max(1, Math.floor(3 * scale));
        for (let gr = -glowRad; gr <= glowRad; gr++) {
          const gRow = candleR + gr;
          if (gRow < 0 || gRow >= rows) continue;
          for (let gc = -glowRad; gc <= glowRad; gc++) {
            const gCol = cx + gc;
            if (gCol < 0 || gCol >= cols) continue;
            const gDist = Math.hypot(gc, gr);
            if (gDist > 0 && gDist <= glowRad) {
              const gIdx = gRow * cols + gCol;
              const gVal = (0.55 * scale * flick) / (gDist + 0.8);
              if (gVal > dens[gIdx]) {
                dens[gIdx] = gVal;
                col[gIdx * 3] = 0.95;
                col[gIdx * 3 + 1] = 0.65;
                col[gIdx * 3 + 2] = 0.22;
                mid[gIdx] = MID.spark;
              }
            }
          }
        }
      }

      // Parchment wish tag (short subtle text / symbol trailing in the gentle current)
      if (scale > 0.45 && wish.text) {
        const tagText = wish.text.length > 10 ? wish.text.slice(0, 8) + '..' : wish.text;
        const tagRow = cy + Math.max(1, Math.floor(3 * scale));
        if (tagRow >= 0 && tagRow < rows) {
          const startCol = cx - Math.floor(tagText.length / 2);
          for (let ti = 0; ti < tagText.length; ti++) {
            const tc = startCol + ti;
            if (tc >= 0 && tc < cols) {
              const tIdx = tagRow * cols + tc;
              dens[tIdx] = 0.72;
              col[tIdx * 3] = 0.96;     // warm parchment tone
              col[tIdx * 3 + 1] = 0.90;
              col[tIdx * 3 + 2] = 0.75;
              mid[tIdx] = MID.base;
            }
          }
        }
      }
    }
  }

  renderUserLanterns(t) {
    const { cols, rows, cw, ch } = this;
    const dens = this.densBuffer;
    const col = this.colorBuffer;
    const mid = this.midBuffer;

    for (let i = this.userSkyLanterns.length - 1; i >= 0; i--) {
      const lan = this.userSkyLanterns[i];
      lan.x += lan.vx + (this.wind * 0.2);
      lan.y += lan.vy;
      lan.life += 0.016;

      if (lan.y < 0 || lan.x < 0 || lan.x > this.artW) {
        this.userSkyLanterns.splice(i, 1);
        continue;
      }

      const cx = Math.floor(lan.x / cw);
      const cy = Math.floor(lan.y / ch);

      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
        const cellIdx = cy * cols + cx;
        const flick = 0.85 + 0.25 * Math.sin(W0 * 6.0 * t + lan.flicker);

        dens[cellIdx] = Math.max(dens[cellIdx], 0.98 * flick);
        col[cellIdx * 3] = 1.0;
        col[cellIdx * 3 + 1] = 0.82;
        col[cellIdx * 3 + 2] = 0.38;
        mid[cellIdx] = MID.flame;

        const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dc, dr] of neighbors) {
          const nr = cy + dr;
          const nc = cx + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const nIdx = nr * cols + nc;
            dens[nIdx] = Math.max(dens[nIdx], 0.65 * flick);
            col[nIdx * 3] = 0.95;
            col[nIdx * 3 + 1] = 0.60;
            col[nIdx * 3 + 2] = 0.22;
          }
        }
      }
    }
  }
}
