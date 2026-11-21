// Ultra-detailed 3D Geometry generation matching updated krathong.py
import {
  Ry, Rx, mix, transformPoint, transformNormal, MID, KS,
  ROWS_DEFAULT, COLS_DEFAULT, HOR, CH_DEFAULT
} from './math.js';

function grid(h, w, step = 1.45) {
  const nu = Math.max(12, Math.floor((h * KS) / step));
  const nv = Math.max(12, Math.floor((w * KS) / step));
  const uArr = new Float32Array(nu);
  const vArr = new Float32Array(nv);
  for (let i = 0; i < nu; i++) uArr[i] = i / (nu - 1);
  for (let j = 0; j < nv; j++) vArr[j] = j / (nv - 1);
  return { uArr, vArr, nu, nv };
}

function computeMeshNormals(pts, nu, nv) {
  const norms = new Float32Array(nu * nv * 3);
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const idx = (i * nv + j) * 3;

      // du = pts[i+1, j] - pts[i-1, j]
      const iPrev = Math.max(0, i - 1);
      const iNext = Math.min(nu - 1, i + 1);
      const idxPrevU = (iPrev * nv + j) * 3;
      const idxNextU = (iNext * nv + j) * 3;
      const du0 = pts[idxNextU] - pts[idxPrevU];
      const du1 = pts[idxNextU + 1] - pts[idxPrevU + 1];
      const du2 = pts[idxNextU + 2] - pts[idxPrevU + 2];

      // dv = pts[i, j+1] - pts[i, j-1]
      const jPrev = Math.max(0, j - 1);
      const jNext = Math.min(nv - 1, j + 1);
      const idxPrevV = (i * nv + jPrev) * 3;
      const idxNextV = (i * nv + jNext) * 3;
      const dv0 = pts[idxNextV] - pts[idxPrevV];
      const dv1 = pts[idxNextV + 1] - pts[idxPrevV + 1];
      const dv2 = pts[idxNextV + 2] - pts[idxPrevV + 2];

      // Cross product du x dv
      let nx = du1 * dv2 - du2 * dv1;
      let ny = du2 * dv0 - du0 * dv2;
      let nz = du0 * dv1 - du1 * dv0;
      const len = Math.hypot(nx, ny, nz) || 1e-6;
      norms[idx] = nx / len;
      norms[idx + 1] = ny / len;
      norms[idx + 2] = nz / len;
    }
  }
  return norms;
}

export function buildKrathongGeometry(lotusStyle = 'pink') {
  const parts = [];

  function emit(pts, nrms, cols, mid, R = [[1,0,0],[0,1,0],[0,0,1]], offset = [0,0,0], emissive = 0.0) {
    const numPts = pts.length / 3;
    const transPts = new Float32Array(numPts * 3);
    const transNrm = new Float32Array(numPts * 3);
    const finalCols = new Float32Array(numPts * 3);
    const mids = new Int32Array(numPts);
    const emiss = new Float32Array(numPts);

    const isColSingle = cols.length === 3 && typeof cols[0] === 'number';

    for (let k = 0; k < numPts; k++) {
      const idx = k * 3;
      const p = [pts[idx], pts[idx + 1], pts[idx + 2]];
      const n = [nrms[idx], nrms[idx + 1], nrms[idx + 2]];

      const tp = transformPoint(p, R, offset);
      transPts[idx] = tp[0];
      transPts[idx + 1] = tp[1];
      transPts[idx + 2] = tp[2];

      const tn = transformNormal(n, R);
      transNrm[idx] = tn[0];
      transNrm[idx + 1] = tn[1];
      transNrm[idx + 2] = tn[2];

      if (isColSingle) {
        finalCols[idx] = cols[0];
        finalCols[idx + 1] = cols[1];
        finalCols[idx + 2] = cols[2];
      } else {
        finalCols[idx] = cols[idx];
        finalCols[idx + 1] = cols[idx + 1];
        finalCols[idx + 2] = cols[idx + 2];
      }

      mids[k] = mid;
      emiss[k] = emissive;
    }

    parts.push({ pts: transPts, nrm: transNrm, col: finalCols, mid: mids, em: emiss, count: numPts });
  }

  // 1. Carved/fluted banana-trunk base cylinder
  {
    const { uArr, vArr, nu, nv } = grid(0.32, 2.0 * Math.PI * 0.76, 1.8);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);

    for (let i = 0; i < nu; i++) {
      const U = uArr[i];
      const baseC = mix([0.14, 0.30, 0.07], [0.34, 0.56, 0.16], U);
      for (let j = 0; j < nv; j++) {
        const ang = vArr[j] * 2.0 * Math.PI;
        const flute = 0.012 * Math.cos(ang * 32.0);
        const r_base = 0.76 + flute;
        const idx = (i * nv + j) * 3;
        pts[idx] = r_base * Math.sin(ang);
        pts[idx + 1] = U * 0.26 - 0.13;
        pts[idx + 2] = r_base * Math.cos(ang);

        const fluteShade = 0.88 + 0.12 * Math.cos(ang * 32.0);
        cols[idx] = baseC[0] * fluteShade;
        cols[idx + 1] = baseC[1] * fluteShade;
        cols[idx + 2] = baseC[2] * fluteShade;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    emit(pts, nrms, cols, MID.base);
  }

  // Inner moss/leaf deck
  {
    const { uArr, vArr, nu, nv } = grid(0.74, 2.0 * Math.PI * 0.74, 2.2);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);
    for (let i = 0; i < nu; i++) {
      const rad = uArr[i] * 0.74;
      for (let j = 0; j < nv; j++) {
        const ang = vArr[j] * 2.0 * Math.PI;
        const idx = (i * nv + j) * 3;
        pts[idx] = rad * Math.sin(ang);
        pts[idx + 1] = 0.13;
        pts[idx + 2] = rad * Math.cos(ang);
        cols[idx] = 0.18;
        cols[idx + 1] = 0.42;
        cols[idx + 2] = 0.12;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    emit(pts, nrms, cols, MID.base);
  }

  // 2. Folded banana-leaf petal function
  function leafPetal(ro, yo, a, wd, hh, tilt, fold) {
    const { uArr, vArr, nu, nv } = grid(hh * 1.1, wd * 2.1, 1.4);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);

    for (let i = 0; i < nu; i++) {
      const U = uArr[i];
      const w = wd * Math.pow(1.0 - U, 0.82);
      const baseCol = mix([0.14, 0.42, 0.08], [0.64, 0.85, 0.24], Math.pow(U, 0.9));

      for (let j = 0; j < nv; j++) {
        const v = vArr[j] * 2.0 - 1.0;
        const z = ro + tilt * U * hh + 0.11 * U * U * hh + fold * (1.0 - Math.abs(v)) * Math.sqrt(U + 0.015) * (1.0 - 0.58 * U);
        const idx = (i * nv + j) * 3;
        pts[idx] = v * w;
        pts[idx + 1] = U * hh;
        pts[idx + 2] = z;

        const vein = 0.78 + 0.22 * (0.5 + 0.5 * Math.cos(v * 34.0));
        const crease = 1.0 - 0.42 * Math.exp(-Math.pow(v / 0.04, 2));
        let c0 = baseCol[0] * vein * crease;
        let c1 = baseCol[1] * vein * crease;
        let c2 = baseCol[2] * vein * crease;

        const edgeFactor = 0.35 * Math.pow(Math.abs(v), 5);
        c0 = c0 * (1.0 - edgeFactor) + 0.90 * edgeFactor;
        c1 = c1 * (1.0 - edgeFactor) + 0.94 * edgeFactor;
        c2 = c2 * (1.0 - edgeFactor) + 0.42 * edgeFactor;

        cols[idx] = c0;
        cols[idx + 1] = c1;
        cols[idx + 2] = c2;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    emit(pts, nrms, cols, MID.leaf, Ry(a), [0, yo, 0]);
  }

  // Three concentric tiers of folded banana leaves (48 petals total)
  for (let i = 0; i < 18; i++) {
    leafPetal(0.77, -0.03, i * (2 * Math.PI / 18), 0.15, 0.35, 0.28, 0.075);
  }
  for (let i = 0; i < 16; i++) {
    leafPetal(0.67, 0.05, (i + 0.5) * (2 * Math.PI / 16), 0.14, 0.34, 0.18, 0.068);
  }
  for (let i = 0; i < 14; i++) {
    leafPetal(0.56, 0.11, i * (2 * Math.PI / 14), 0.12, 0.30, 0.08, 0.055);
  }

  // 3. Marigold & Purple Globe Amaranth flower accents
  function addMarigold(ro, yo, a, radius = 0.052, isPurple = false) {
    const { uArr, vArr, nu, nv } = grid(radius * 2.4, radius * 2.4, 1.8);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);

    for (let i = 0; i < nu; i++) {
      const theta = uArr[i] * Math.PI * 0.75;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const thetaPower = Math.pow(Math.max(0, cosTheta), 0.7);

      for (let j = 0; j < nv; j++) {
        const phi = vArr[j] * 2.0 * Math.PI;
        const ruffle = 1.0 + 0.22 * Math.sin(theta * 14.0) * Math.cos(phi * 10.0);
        const r = radius * ruffle;

        const idx = (i * nv + j) * 3;
        pts[idx] = r * sinTheta * Math.cos(phi);
        pts[idx + 1] = r * cosTheta * 0.85;
        pts[idx + 2] = r * sinTheta * Math.sin(phi);

        let c;
        if (isPurple) {
          c = mix([0.45, 0.06, 0.38], [0.92, 0.35, 0.78], thetaPower);
        } else {
          c = mix([0.92, 0.42, 0.02], [1.0, 0.88, 0.12], thetaPower);
        }
        cols[idx] = c[0];
        cols[idx + 1] = c[1];
        cols[idx + 2] = c[2];
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    const pos = [ro * Math.sin(a), yo, ro * Math.cos(a)];
    emit(pts, nrms, cols, MID.flower, Ry(a), pos);
  }

  // Ring of 14 alternating marigolds & purple globe amaranths
  for (let i = 0; i < 14; i++) {
    const ang_f = (i + 0.5) * (2 * Math.PI / 14);
    addMarigold(0.51, 0.16, ang_f, 0.052, i % 2 === 1);
  }

  // 4. Four tiers of blooming Lotus petals (42 petals total)
  let tipTint = [0.96, 0.22, 0.55];
  if (lotusStyle === 'gold') {
    tipTint = [1.0, 0.78, 0.15];
  } else if (lotusStyle === 'emerald') {
    tipTint = [0.15, 0.75, 0.55];
  } else if (lotusStyle === 'white') {
    tipTint = [0.92, 0.95, 0.98];
  }

  function lotusPetal(a, op, ln, wd, yo, ro, customTip = tipTint) {
    const { uArr, vArr, nu, nv } = grid(ln * 1.15, wd * 2.1, 1.4);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);

    const cosOp = Math.cos(op);
    const sinOp = Math.sin(op);

    for (let i = 0; i < nu; i++) {
      const U = uArr[i];
      const w = wd * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(Math.max(U, 0), 1), 0.72)), 0.78) + 0.003;
      const ly = U * ln;
      const baseCol = mix([0.98, 0.92, 0.95], customTip, Math.pow(U, 1.15));

      for (let j = 0; j < nv; j++) {
        const v = vArr[j] * 2.0 - 1.0;
        const zl = 0.55 * wd * (1.0 - v * v) * (1.0 - 0.45 * U);
        const y = ly * cosOp - zl * sinOp;
        const z = ro + ly * sinOp + zl * cosOp;

        const idx = (i * nv + j) * 3;
        pts[idx] = v * w;
        pts[idx + 1] = y;
        pts[idx + 2] = z;

        const striation = 0.85 + 0.15 * Math.cos(v * 24.0);
        cols[idx] = baseCol[0] * striation;
        cols[idx + 1] = baseCol[1] * striation;
        cols[idx + 2] = baseCol[2] * striation;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    emit(pts, nrms, cols, MID.lotus, Ry(a), [0, yo, 0]);
  }

  // 4 tiers
  for (let i = 0; i < 14; i++) {
    lotusPetal(i * (2 * Math.PI / 14), 0.92, 0.40, 0.13, 0.14, 0.38, tipTint);
  }
  for (let i = 0; i < 12; i++) {
    lotusPetal((i + 0.5) * (2 * Math.PI / 12), 0.64, 0.36, 0.115, 0.16, 0.29, tipTint);
  }
  for (let i = 0; i < 10; i++) {
    lotusPetal(i * (2 * Math.PI / 10), 0.38, 0.31, 0.10, 0.18, 0.20, tipTint);
  }
  for (let i = 0; i < 6; i++) {
    lotusPetal((i + 0.5) * (2 * Math.PI / 6), 0.16, 0.24, 0.08, 0.20, 0.12, tipTint);
  }

  // 5. Golden lotus stamens ring
  for (let i = 0; i < 18; i++) {
    const a_s = i * (2 * Math.PI / 18);
    const { uArr, vArr, nu, nv } = grid(0.12, 0.04, 2.0);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);

    for (let uI = 0; uI < nu; uI++) {
      const U = uArr[uI];
      for (let vI = 0; vI < nv; vI++) {
        const av_s = vArr[vI] * 2.0 * Math.PI;
        const idx = (uI * nv + vI) * 3;
        pts[idx] = 0.008 * Math.sin(av_s);
        pts[idx + 1] = 0.17 + U * 0.11;
        pts[idx + 2] = 0.008 * Math.cos(av_s);
        cols[idx] = 1.0;
        cols[idx + 1] = 0.85;
        cols[idx + 2] = 0.15;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    const off_s = [0.095 * Math.sin(a_s), 0.0, 0.095 * Math.cos(a_s)];
    const R_stam = matMul2(Ry(a_s), Rx(0.25));
    emit(pts, nrms, cols, MID.flower, R_stam, off_s);
  }

  // 6. Central Beeswax Candle with melted wax drips & wick
  const candle_h = 0.46;
  {
    const { uArr, vArr, nu, nv } = grid(0.48, 0.34, 1.5);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);

    for (let i = 0; i < nu; i++) {
      const U = uArr[i];
      const c = mix([0.92, 0.58, 0.08], [1.0, 0.94, 0.42], Math.pow(U, 0.8));
      for (let j = 0; j < nv; j++) {
        const ang = vArr[j] * 2.0 * Math.PI;
        const drip = 0.005 * Math.sin(ang * 7.0 + U * 12.0) * (U > 0.55 ? 1.0 : 0.0);
        const rc = 0.046 + drip;
        const idx = (i * nv + j) * 3;
        pts[idx] = rc * Math.sin(ang);
        pts[idx + 1] = 0.16 + U * candle_h;
        pts[idx + 2] = rc * Math.cos(ang);
        cols[idx] = c[0];
        cols[idx + 1] = c[1];
        cols[idx + 2] = c[2];
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    emit(pts, nrms, cols, MID.candle);
  }

  // Wick
  {
    const { uArr, vArr, nu, nv } = grid(0.05, 0.03, 1.8);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const aw = vArr[j] * 2.0 * Math.PI;
        const idx = (i * nv + j) * 3;
        pts[idx] = 0.006 * Math.sin(aw);
        pts[idx + 1] = 0.16 + candle_h + uArr[i] * 0.04;
        pts[idx + 2] = 0.006 * Math.cos(aw);
        cols[idx] = 0.15;
        cols[idx + 1] = 0.08;
        cols[idx + 2] = 0.05;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    emit(pts, nrms, cols, MID.candle);
  }
  const candle_top = [0.0, 0.16 + candle_h + 0.035, 0.0];

  // 7. Three Incense Sticks with glowing tips
  const tips = [];
  const stickConfigs = [
    [-0.20, 0.13],
    [0.0, 0.16],
    [0.20, 0.13]
  ];

  for (let k = 0; k < 3; k++) {
    const [ang_i, tilt_i] = stickConfigs[k];
    const { uArr, vArr, nu, nv } = grid(0.62, 0.14, 1.8);
    const pts = new Float32Array(nu * nv * 3);
    const cols = new Float32Array(nu * nv * 3);
    const ri = 0.011;

    for (let i = 0; i < nu; i++) {
      const U = uArr[i];
      for (let j = 0; j < nv; j++) {
        const a_v = vArr[j] * 2.0 * Math.PI;
        const idx = (i * nv + j) * 3;
        pts[idx] = ri * Math.sin(a_v);
        pts[idx + 1] = U * 0.62;
        pts[idx + 2] = ri * Math.cos(a_v);
        cols[idx] = 0.48;
        cols[idx + 1] = 0.24;
        cols[idx + 2] = 0.10;
      }
    }
    const nrms = computeMeshNormals(pts, nu, nv);
    const R_inc = matMul2(Ry(ang_i), Rx(tilt_i));
    const off = [0.055 * (k - 1), 0.17, -0.035];
    emit(pts, nrms, cols, MID.incense, R_inc, off);

    const tipLocal = [0.0, 0.62, 0.0];
    const tipWorld = transformPoint(tipLocal, R_inc, off);
    tips.push(tipWorld);

    // Tip geometry
    const { nu: neu, nv: nev, uArr: euArr, vArr: evArr } = grid(0.04, 0.12, 1.5);
    const epts = new Float32Array(neu * nev * 3);
    const ecols = new Float32Array(neu * nev * 3);
    for (let i = 0; i < neu; i++) {
      for (let j = 0; j < nev; j++) {
        const a_v = evArr[j] * 2.0 * Math.PI;
        const idx = (i * nev + j) * 3;
        epts[idx] = 0.015 * Math.sin(a_v);
        epts[idx + 1] = euArr[i] * 0.028;
        epts[idx + 2] = 0.015 * Math.cos(a_v);
        ecols[idx] = 1.0;
        ecols[idx + 1] = 0.42;
        ecols[idx + 2] = 0.10;
      }
    }
    const enrms = computeMeshNormals(epts, neu, nev);
    emit(epts, enrms, ecols, MID.incense, R_inc, tipWorld, 1.0);
  }

  // Concatenate all parts
  let totalCount = 0;
  for (const part of parts) totalCount += part.count;

  const P_all = new Float32Array(totalCount * 3);
  const N_all = new Float32Array(totalCount * 3);
  const C_all = new Float32Array(totalCount * 3);
  const M_all = new Int32Array(totalCount);
  const E_all = new Float32Array(totalCount);

  let cursor = 0;
  for (const part of parts) {
    P_all.set(part.pts, cursor * 3);
    N_all.set(part.nrm, cursor * 3);
    C_all.set(part.col, cursor * 3);
    M_all.set(part.mid, cursor);
    E_all.set(part.em, cursor);
    cursor += part.count;
  }

  return {
    geom: { P_all, N_all, C_all, M_all, E_all, count: totalCount },
    candle_top,
    tips
  };
}

function matMul2(A, B) {
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    }
  }
  return C;
}

// Build detailed 3-spire Thai Temple (Wat Arun style) + illuminated windows
export function buildTempleSilhouette(cols = COLS_DEFAULT, rows = ROWS_DEFAULT, hor = HOR, ch = CH_DEFAULT) {
  const mask = new Uint8Array(rows * cols);
  const lights = new Uint8Array(rows * cols);
  const r_hor = Math.floor(hor / ch);
  const c_center = Math.floor(cols * 0.22);

  function addSpire(cx, base_r, height, half_base) {
    for (let dy = 0; dy < height; dy++) {
      const r = base_r - dy;
      if (r >= 0 && r < rows) {
        const frac = dy / Math.max(height, 1);
        const hw = Math.max(0, Math.round(half_base * (1.0 - Math.pow(frac, 0.72))));
        const c0 = Math.max(0, cx - hw);
        const c1 = Math.min(cols, cx + hw + 1);
        for (let c = c0; c < c1; c++) {
          mask[r * cols + c] = 1;
        }
        if (dy % 3 === 1 && hw >= 2) {
          lights[r * cols + cx] = 1;
        }
      }
    }
  }

  // Base platform
  const baseRStart = Math.max(0, r_hor - 2);
  const baseCStart = Math.max(0, c_center - 26);
  const baseCEnd = Math.min(cols, c_center + 27);
  for (let r = baseRStart; r < r_hor; r++) {
    for (let c = baseCStart; c < baseCEnd; c++) {
      mask[r * cols + c] = 1;
    }
  }

  // Central tall Prang + flanking Prangs
  addSpire(c_center, r_hor - 2, 14, 11);
  addSpire(c_center - 15, r_hor - 2, 9, 7);
  addSpire(c_center + 15, r_hor - 2, 9, 7);

  return { mask, lights };
}
