// Math and geometric helper functions matching the updated high-res Loy Krathong simulation

export const COLS_DEFAULT = 180;
export const ROWS_DEFAULT = 64;
export const CW_DEFAULT = 6;
export const CH_DEFAULT = 12;
export const ART_W = COLS_DEFAULT * CW_DEFAULT; // 1080
export const ART_H = ROWS_DEFAULT * CH_DEFAULT; // 768
export const KX = ART_W * 0.5;                   // 540
export const KY = ART_H * 0.64;                  // 491.52
export const HOR = Math.floor(ART_H * 0.43);     // 330
export const MX = ART_W * 0.79;                  // 853.2
export const KS = 285.0;                         // Larger projection scale for close-up detail
export const PERSP = 0.26;                       // Perspective factor
export const W0 = 1.15;                          // Base animation angular frequency
export const PITCH = 0.36;                       // Camera pitch angle
export const CP = Math.cos(PITCH);
export const SPH = Math.sin(PITCH);

export const CANDLE_COL = [1.0, 0.74, 0.30];
export const MOON_DIR = (function() {
  const d = [0.45, 0.65, -0.60];
  const l = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / l, d[1] / l, d[2] / l];
})();

export const MID = {
  base: 0,
  leaf: 1,
  lotus: 2,
  candle: 3,
  incense: 4,
  water: 5,
  flame: 6,
  spark: 7,
  temple: 8,
  flower: 9,
};

export const NUM_RAMP = " 0123456789";
export const ASCII_RAMPS = {
  numeric: " 0123456789",
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  thai: " ๐๑๒๓๔๕๖๗๘๙",
  minimal: " ·:!|#@",
  matrix: " 0101010101",
};

export function mix(c1, c2, t) {
  return [
    c1[0] * (1.0 - t) + c2[0] * t,
    c1[1] * (1.0 - t) + c2[1] * t,
    c1[2] * (1.0 - t) + c2[2] * t,
  ];
}

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

// 3x3 Rotation around Y
export function Ry(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [c, 0.0, s],
    [0.0, 1.0, 0.0],
    [-s, 0.0, c]
  ];
}

// 3x3 Rotation around X
export function Rx(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [1.0, 0.0, 0.0],
    [0.0, c, -s],
    [0.0, s, c]
  ];
}

// 3x3 Rotation around Z
export function Rz(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [c, -s, 0.0],
    [s, c, 0.0],
    [0.0, 0.0, 1.0]
  ];
}

// Multiply 3x3 matrix by 3x3 matrix: A @ B
export function matMul3(A, B) {
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

// Transform 3D point by 3x3 matrix: p @ R^T (which is R @ p)
export function transformPoint(p, R, off = [0, 0, 0]) {
  return [
    p[0] * R[0][0] + p[1] * R[0][1] + p[2] * R[0][2] + off[0],
    p[0] * R[1][0] + p[1] * R[1][1] + p[2] * R[1][2] + off[1],
    p[0] * R[2][0] + p[1] * R[2][1] + p[2] * R[2][2] + off[2]
  ];
}

// Rotate normal by 3x3 matrix
export function transformNormal(n, R) {
  return [
    n[0] * R[0][0] + n[1] * R[0][1] + n[2] * R[0][2],
    n[0] * R[1][0] + n[1] * R[1][1] + n[2] * R[1][2],
    n[0] * R[2][0] + n[1] * R[2][1] + n[2] * R[2][2]
  ];
}

// Deterministic pseudo-random noise per cell matching python hash2
export function hash2(r, c, seed = 0.0) {
  const val = Math.sin(r * 12.9898 + c * 78.233 + seed) * 43758.5453;
  return val - Math.floor(val);
}

// Krathong floating body dynamics: gentle bobbing, swaying, and slow rotation on water
export function body_pose(t, speedFactor = 1.0) {
  const time = t * speedFactor;
  const yaw = 0.22 * time + 0.14 * Math.sin(W0 * 0.75 * time);
  const roll = 0.042 * Math.sin(W0 * 1.6 * time);
  const pitch = 0.032 * Math.cos(W0 * 1.25 * time);

  // R = Ry(yaw) @ Rx(pitch) @ Rz(roll)
  const Ry_mat = Ry(yaw);
  const Rx_mat = Rx(pitch);
  const Rz_mat = Rz(roll);
  const R_intermediate = matMul3(Ry_mat, Rx_mat);
  const R = matMul3(R_intermediate, Rz_mat);

  const T = [
    0.055 * Math.sin(W0 * 0.85 * time),
    0.022 * Math.sin(W0 * 2.0 * time),
    0.0
  ];
  return { R, T, yaw, roll, pitch };
}

// 3D World point -> screen x, y in pixels, plus depth zv
export function projectPoint(p, kx = KX, ky = KY, ks = KS, pitch = PITCH, persp = PERSP) {
  const cp = Math.cos(pitch);
  const sph = Math.sin(pitch);
  const yv = p[1] * cp - p[2] * sph;
  const zv = p[1] * sph + p[2] * cp;
  const f = 1.0 / Math.max(1e-4, 1.0 - persp * zv);
  return {
    x: kx + ks * p[0] * f,
    y: ky - ks * yv * f,
    zv: zv,
    yv: yv,
    f: f
  };
}
