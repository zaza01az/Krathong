import math
import sys
import time
import numpy as np

# ==========================================
# 1. HIGH-RESOLUTION CONFIGURATION
# ==========================================
COLS, ROWS = 180, 64          # Ultra-high density character grid (expand terminal!)
CW, CH = 6, 12                # Fine virtual pixel size per character cell
ART_W, ART_H = COLS * CW, ROWS * CH
KX, KY = ART_W * 0.5, ART_H * 0.64
HOR = int(ART_H * 0.43)       # Horizon line (px)
MX = ART_W * 0.79             # Moon X position
KS = 285.0                    # Larger projection scale for close-up detail
PERSP = 0.26                  # Perspective factor
W0 = 1.15                     # Base animation angular frequency

# Camera pitch angle
PITCH = 0.36
CP, SPH = math.cos(PITCH), math.sin(PITCH)

# Lighting & Material IDs
CANDLE_COL = np.array([1.0, 0.74, 0.30], np.float32)
MOON_DIR = np.array([0.45, 0.65, -0.60], np.float32)
MOON_DIR /= np.linalg.norm(MOON_DIR)

MID = {
    "base": 0,
    "leaf": 1,
    "lotus": 2,
    "candle": 3,
    "incense": 4,
    "water": 5,
    "flame": 6,
    "spark": 7,
    "temple": 8,
    "flower": 9,
}

# Numeric ASCII character ramp (dark/sparse -> bright/dense)
NUM_RAMP = np.array(list(" 0123456789"))

# Precompute screen pixel & grid coordinates
CC, RR = np.meshgrid(np.arange(COLS), np.arange(ROWS))
X = (CC + 0.5) * CW
Y = (RR + 0.5) * CH


# ==========================================
# 2. HELPER & MATH FUNCTIONS
# ==========================================
def mix(c1, c2, t):
    """Linearly interpolate between two RGB colors."""
    c1 = np.asarray(c1, dtype=np.float32)
    c2 = np.asarray(c2, dtype=np.float32)
    if np.ndim(t) > 0 and t.shape != c1.shape:
        t = t[..., None]
    return c1 * (1.0 - t) + c2 * t


def Ry(a):
    """3x3 Rotation matrix around Y axis."""
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]], dtype=np.float32)


def Rx(a):
    """3x3 Rotation matrix around X axis."""
    c, s = math.cos(a), math.sin(a)
    return np.array([[1.0, 0.0, 0.0], [0.0, c, -s], [0.0, s, c]], dtype=np.float32)


def grid(h, w, step=1.45):
    """High-density normalized (U, V) surface mesh grid."""
    nu = max(12, int(h * KS / step))
    nv = max(12, int(w * KS / step))
    u = np.linspace(0.0, 1.0, nu, dtype=np.float32)
    v = np.linspace(0.0, 1.0, nv, dtype=np.float32)
    return np.meshgrid(u, v, indexing="ij")


def normals(P):
    """Compute surface normals for a (Nu, Nv, 3) point grid."""
    du = np.gradient(P, axis=0)
    dv = np.gradient(P, axis=1)
    n = np.cross(du, dv)
    norm = np.linalg.norm(n, axis=-1, keepdims=True)
    return n / np.maximum(norm, 1e-6)


def hash2(r, c, seed=0.0):
    """Deterministic pseudo-random noise per cell."""
    val = np.sin(r * 12.9898 + c * 78.233 + seed) * 43758.5453
    return val - np.floor(val)


def body_pose(t):
    """Gentle bobbing, swaying, and slow rotation on water."""
    yaw = 0.22 * t + 0.14 * math.sin(W0 * 0.75 * t)
    roll = 0.042 * math.sin(W0 * 1.6 * t)
    pitch = 0.032 * math.cos(W0 * 1.25 * t)
    R = (
        Ry(yaw)
        @ Rx(pitch)
        @ np.array(
            [[math.cos(roll), -math.sin(roll), 0], [math.sin(roll), math.cos(roll), 0], [0, 0, 1]],
            dtype=np.float32,
        )
    )
    T = np.array(
        [0.055 * math.sin(W0 * 0.85 * t), 0.022 * math.sin(W0 * 2.0 * t), 0.0],
        dtype=np.float32,
    )
    return R, T


# ==========================================
# 3. ULTRA-DETAILED 3D GEOMETRY BUILDER
# ==========================================
_PARTS = []


def emit(P, N, col, mid, R=np.eye(3, dtype=np.float32), offset=(0.0, 0.0, 0.0), emissive=0.0):
    """Transform and append a 3D surface mesh to the global geometry buffer."""
    pts = P.reshape(-1, 3) @ R.T + np.asarray(offset, dtype=np.float32)
    nrm = N.reshape(-1, 3) @ R.T
    if np.ndim(col) == 1:
        c = np.broadcast_to(np.asarray(col, dtype=np.float32), pts.shape).copy()
    else:
        c = col.reshape(-1, 3).astype(np.float32)
    m = np.full(len(pts), mid, dtype=np.int32)
    e = np.full(len(pts), emissive, dtype=np.float32)
    _PARTS.append((pts, nrm, c, m, e))


def leaf_petal(ro, yo, a, wd, hh, tilt, fold):
    """Folded banana-leaf petal: crisp centre crease, parallel veins, and golden trim."""
    U, V = grid(hh * 1.1, wd * 2.1, step=1.4)
    v = V * 2 - 1
    w = wd * (1 - U) ** 0.82
    z = (
        ro
        + tilt * U * hh
        + 0.11 * U**2 * hh
        + fold * (1 - np.abs(v)) * np.sqrt(U + 0.015) * (1 - 0.58 * U)
    )
    P = np.stack([v * w, U * hh, z], -1)
    # Rich natural banana-leaf green gradient + fine veins + central fold shadow
    col = mix((0.14, 0.42, 0.08), (0.64, 0.85, 0.24), U**0.9)
    col = col * (0.78 + 0.22 * (0.5 + 0.5 * np.cos(v * 34)))[..., None]
    col = col * (1 - 0.42 * np.exp(-((v / 0.04) ** 2)))[..., None]
    # Brighter edge highlight along folded rims
    col = mix(col, (0.90, 0.94, 0.42), 0.35 * np.abs(v) ** 5)
    emit(P, normals(P), col, MID["leaf"], Ry(a), (0, yo, 0))


def lotus_petal(a, op, ln, wd, yo, ro, tip_tint=(1.0, 0.24, 0.58)):
    """Lotus petal: cupped boat profile, fine longitudinal striations, and pink/white gradient."""
    U, V = grid(ln * 1.15, wd * 2.1, step=1.4)
    v = V * 2 - 1
    w = wd * np.sin(np.pi * np.clip(U, 0, 1) ** 0.72) ** 0.78 + 0.003
    ly = U * ln
    zl = 0.55 * wd * (1 - v * v) * (1 - 0.45 * U)
    y = ly * math.cos(op) - zl * math.sin(op)
    z = ro + ly * math.sin(op) + zl * math.cos(op)
    P = np.stack([v * w, y, z], -1)
    col = mix((0.98, 0.92, 0.95), tip_tint, U**1.15)
    col = col * (0.85 + 0.15 * np.cos(v * 24))[..., None]
    emit(P, normals(P), col, MID["lotus"], Ry(a), (0, yo, 0))


def add_marigold(ro, yo, a, radius=0.052, is_purple=False):
    """Ruffled spherical marigold or globe amaranth flower accent."""
    U, V = grid(radius * 2.4, radius * 2.4, step=1.8)
    theta = U * math.pi * 0.75
    phi = V * 2.0 * math.pi
    ruffle = 1.0 + 0.22 * np.sin(theta * 14) * np.cos(phi * 10)
    r = radius * ruffle
    px = r * np.sin(theta) * np.cos(phi)
    py = r * np.cos(theta) * 0.85
    pz = r * np.sin(theta) * np.sin(phi)
    P = np.stack([px, py, pz], -1)
    if is_purple:
        col = mix((0.45, 0.06, 0.38), (0.92, 0.35, 0.78), np.cos(theta) ** 0.7)
    else:
        col = mix((0.92, 0.42, 0.02), (1.0, 0.88, 0.12), np.cos(theta) ** 0.7)
    pos = np.array([ro * math.sin(a), yo, ro * math.cos(a)], dtype=np.float32)
    emit(P, normals(P), col, MID["flower"], Ry(a), pos)


def build_krathong_geometry():
    """Assemble ultra-detailed Krathong: fluted trunk, 3 leaf tiers, 4 lotus tiers, flowers, stamens, candle & incense."""
    _PARTS.clear()

    # 1. Carved/fluted banana-trunk base cylinder + top deck
    U, V = grid(0.32, 2.0 * math.pi * 0.76, step=1.8)
    ang = V * 2.0 * math.pi
    flute = 0.012 * np.cos(ang * 32)
    r_base = 0.76 + flute
    P_base = np.stack([r_base * np.sin(ang), U * 0.26 - 0.13, r_base * np.cos(ang)], -1)
    c_base = mix((0.14, 0.30, 0.07), (0.34, 0.56, 0.16), U) * (0.88 + 0.12 * np.cos(ang * 32))[..., None]
    emit(P_base, normals(P_base), c_base, MID["base"])

    # Inner moss/leaf deck
    U_d, V_d = grid(0.74, 2.0 * math.pi * 0.74, step=2.2)
    rad_d = U_d * 0.74
    ang_d = V_d * 2.0 * math.pi
    P_deck = np.stack([rad_d * np.sin(ang_d), np.full_like(rad_d, 0.13), rad_d * np.cos(ang_d)], -1)
    emit(P_deck, normals(P_deck), (0.18, 0.42, 0.12), MID["base"])

    # 2. Three concentric tiers of folded banana leaves (48 petals total)
    for i in range(18):
        leaf_petal(ro=0.77, yo=-0.03, a=i * (2 * math.pi / 18), wd=0.15, hh=0.35, tilt=0.28, fold=0.075)
    for i in range(16):
        leaf_petal(ro=0.67, yo=0.05, a=(i + 0.5) * (2 * math.pi / 16), wd=0.14, hh=0.34, tilt=0.18, fold=0.068)
    for i in range(14):
        leaf_petal(ro=0.56, yo=0.11, a=i * (2 * math.pi / 14), wd=0.12, hh=0.30, tilt=0.08, fold=0.055)

    # 3. Ring of alternating Marigolds & Purple Globe Amaranths nestled inside the leaves
    for i in range(14):
        ang_f = (i + 0.5) * (2 * math.pi / 14)
        add_marigold(ro=0.51, yo=0.16, a=ang_f, radius=0.052, is_purple=(i % 2 == 1))

    # 4. Four tiers of blooming Lotus petals (42 petals total)
    for i in range(14):
        lotus_petal(a=i * (2 * math.pi / 14), op=0.92, ln=0.40, wd=0.13, yo=0.14, ro=0.38, tip_tint=(0.96, 0.22, 0.55))
    for i in range(12):
        lotus_petal(a=(i + 0.5) * (2 * math.pi / 12), op=0.64, ln=0.36, wd=0.115, yo=0.16, ro=0.29, tip_tint=(1.0, 0.34, 0.65))
    for i in range(10):
        lotus_petal(a=i * (2 * math.pi / 10), op=0.38, ln=0.31, wd=0.10, yo=0.18, ro=0.20, tip_tint=(1.0, 0.48, 0.74))
    for i in range(6):
        lotus_petal(a=(i + 0.5) * (2 * math.pi / 6), op=0.16, ln=0.24, wd=0.08, yo=0.20, ro=0.12, tip_tint=(1.0, 0.65, 0.84))

    # 5. Golden lotus stamens ring around the center
    for i in range(18):
        a_s = i * (2 * math.pi / 18)
        U_s, V_s = grid(0.12, 0.04, step=2.0)
        av_s = V_s * 2.0 * math.pi
        P_st = np.stack([0.008 * np.sin(av_s), 0.17 + U_s * 0.11, 0.008 * np.cos(av_s)], -1)
        off_s = (0.095 * math.sin(a_s), 0.0, 0.095 * math.cos(a_s))
        emit(P_st, normals(P_st), (1.0, 0.85, 0.15), MID["flower"], Ry(a_s) @ Rx(0.25), off_s)

    # 6. Central Beeswax Candle with melted wax drips & dark wick
    U, V = grid(0.48, 0.34, step=1.5)
    ang = V * 2.0 * math.pi
    drip = 0.005 * np.sin(ang * 7 + U * 12) * (U > 0.55)
    rc = 0.046 + drip
    candle_h = 0.46
    P_cnd = np.stack([rc * np.sin(ang), 0.16 + U * candle_h, rc * np.cos(ang)], -1)
    col_cnd = mix((0.92, 0.58, 0.08), (1.0, 0.94, 0.42), U**0.8)
    emit(P_cnd, normals(P_cnd), col_cnd, MID["candle"])

    # Wick
    U_w, V_w = grid(0.05, 0.03, step=1.8)
    aw = V_w * 2.0 * math.pi
    P_wk = np.stack([0.006 * np.sin(aw), 0.16 + candle_h + U_w * 0.04, 0.006 * np.cos(aw)], -1)
    emit(P_wk, normals(P_wk), (0.15, 0.08, 0.05), MID["candle"])
    candle_top = np.array([0.0, 0.16 + candle_h + 0.035, 0.0], dtype=np.float32)

    # 7. Three Incense Sticks with glowing red-orange ember tips
    tips = []
    for k, (ang_i, tilt_i) in enumerate([(-0.20, 0.13), (0.0, 0.16), (0.20, 0.13)]):
        U, V = grid(0.62, 0.14, step=1.8)
        a_v = V * 2.0 * math.pi
        ri = 0.011
        P_inc = np.stack([ri * np.sin(a_v), U * 0.62, ri * np.cos(a_v)], -1)
        R_inc = Ry(ang_i) @ Rx(tilt_i)
        off = (0.055 * (k - 1), 0.17, -0.035)
        emit(P_inc, normals(P_inc), (0.48, 0.24, 0.10), MID["incense"], R_inc, off)

        tip_local = np.array([0.0, 0.62, 0.0], dtype=np.float32)
        tip_world = tip_local @ R_inc.T + np.asarray(off, dtype=np.float32)
        tips.append(tip_world)
        P_emb = np.stack([0.015 * np.sin(a_v), U * 0.028, 0.015 * np.cos(a_v)], -1)
        emit(P_emb, normals(P_emb), (1.0, 0.42, 0.10), MID["incense"], R_inc, tip_world, emissive=1.0)

    P_all = np.concatenate([p[0] for p in _PARTS], axis=0)
    N_all = np.concatenate([p[1] for p in _PARTS], axis=0)
    C_all = np.concatenate([p[2] for p in _PARTS], axis=0)
    M_all = np.concatenate([p[3] for p in _PARTS], axis=0)
    E_all = np.concatenate([p[4] for p in _PARTS], axis=0)
    return (P_all, N_all, C_all, M_all, E_all), candle_top, np.array(tips, dtype=np.float32)


def build_temple_silhouette():
    """Create detailed 3-spire Thai Temple / Wat Arun style silhouette + lit windows."""
    mask = np.zeros((ROWS, COLS), dtype=bool)
    lights = np.zeros((ROWS, COLS), dtype=bool)
    r_hor = HOR // CH

    def add_spire(cx, base_r, height, half_base):
        for dy in range(height):
            r = base_r - dy
            if 0 <= r < ROWS:
                frac = dy / max(height, 1)
                hw = max(0, int(round(half_base * (1.0 - frac**0.72))))
                c0, c1 = max(0, cx - hw), min(COLS, cx + hw + 1)
                mask[r, c0:c1] = True
                if dy % 3 == 1 and hw >= 2:
                    lights[r, cx] = True

    # Temple base platform
    c_center = int(COLS * 0.22)
    mask[max(0, r_hor - 2) : r_hor, max(0, c_center - 26) : min(COLS, c_center + 27)] = True
    # Central tall Prang + two flanking smaller Prangs
    add_spire(c_center, r_hor - 2, height=14, half_base=11)
    add_spire(c_center - 15, r_hor - 2, height=9, half_base=7)
    add_spire(c_center + 15, r_hor - 2, height=9, half_base=7)
    return mask, lights


GEOM, CANDLE_TOP, TIPS = build_krathong_geometry()
TEMPLE, TEMPLE_LIGHTS = build_temple_silhouette()


# ==========================================
# 4. CANVAS DRAWING & RENDERING LAYERS
# ==========================================
def put(cv, mask, dens, col, mid):
    """Write masked density, color, and material ID onto the canvas."""
    cv[0][mask] = dens[mask] if np.ndim(dens) > 0 else dens
    cv[1][mask] = col[mask] if col.ndim == 3 else col
    cv[2][mask] = mid


def putmax(cv, halo, col, mid, thresh=0.12):
    """Additive/max blend for glows, lanterns, fireflies, and sparks."""
    mask = halo > thresh
    cv[0][mask] = np.maximum(cv[0][mask], halo[mask])
    cv[1][mask] = np.clip(cv[1][mask] + col * halo[mask][..., None], 0.0, 1.0)
    cv[2][mask] = mid


def splat(cv, rx, ry, dens, col, mid):
    """Scatter reflection points onto the water grid."""
    c = np.floor(rx / CW).astype(np.int32)
    r = np.floor(ry / CH).astype(np.int32)
    valid = (c >= 0) & (c < COLS) & (r >= 0) & (r < ROWS) & (dens > 0.02)
    c, r, d, cl = c[valid], r[valid], dens[valid], col[valid]
    cur_d = cv[0][r, c]
    better = d > cur_d
    cv[0][r[better], c[better]] = d[better]
    cv[1][r[better], c[better]] = cl[better]
    cv[2][r[better], c[better]] = mid[valid][better] if np.ndim(mid) > 0 else mid


def project(P):
    """World points (N,3) -> screen x, y in pixels, plus depth."""
    yv = P[:, 1] * CP - P[:, 2] * SPH
    zv = P[:, 1] * SPH + P[:, 2] * CP
    f = 1.0 / (1.0 - PERSP * zv)
    return KX + KS * P[:, 0] * f, KY - KS * yv * f, zv


def sky_layer(cv, t):
    """Night sky gradient, twinkling stars, textured full moon, floating Khom Loi lanterns & temple."""
    sky_mask = Y < HOR
    ty = np.clip(Y / max(HOR, 1), 0.0, 1.0)
    sky_col = mix((0.02, 0.03, 0.11), (0.15, 0.17, 0.34), ty**1.5)
    sky_dens = 0.04 + 0.09 * ty

    # Multi-layer twinkling stars
    star_seed = hash2(RR, CC, 3.14)
    stars = sky_mask & (star_seed > 0.982)
    twinkle = 0.35 + 0.65 * np.sin(W0 * 4.5 * t + star_seed * 80.0)
    sky_dens = np.where(stars, 0.30 + 0.65 * twinkle, sky_dens)
    sky_col = np.where(stars[..., None], np.array([0.85, 0.92, 1.0], np.float32), sky_col)

    # Full Moon with subtle crater shading & atmospheric halo
    my = HOR * 0.31
    d_moon = np.hypot(X - MX, Y - my)
    moon_disc = d_moon < 38.0
    crater = 0.92 + 0.08 * np.sin(X * 0.14) * np.cos(Y * 0.14)
    moon_glow = np.exp(-((d_moon / 110.0) ** 2)) * 0.48
    sky_dens = np.where(moon_disc, 0.96 * crater, np.maximum(sky_dens, moon_glow))
    sky_col = np.where(
        moon_disc[..., None],
        np.array([1.0, 0.96, 0.78], np.float32) * crater[..., None],
        sky_col,
    )

    put(cv, sky_mask, sky_dens, sky_col, MID["base"])

    # Floating Sky Lanterns (Khom Loi) drifting gently upward
    lanterns = [
        (0.12, 0.25, 11.0, 0.0),
        (0.36, 0.18, 9.0, 1.7),
        (0.55, 0.22, 12.5, 3.1),
        (0.66, 0.15, 8.5, 4.4),
        (0.90, 0.26, 10.5, 2.2),
    ]
    for lx_frac, ly_frac, speed, phase in lanterns:
        ly_px = ((HOR * ly_frac - t * speed + phase * 40.0) % max(HOR - 12, 1)) + 8.0
        lx_px = ART_W * lx_frac + 14.0 * math.sin(t * 0.6 + phase)
        dl = np.hypot((X - lx_px) / 7.5, (Y - ly_px) / 10.5)
        l_glow = np.exp(-dl * dl * 1.4) * (0.78 + 0.15 * math.sin(W0 * 6 * t + phase))
        putmax(cv, np.where(sky_mask, l_glow, 0.0), np.array([1.0, 0.65, 0.22], np.float32), MID["spark"], 0.12)

    # Distant 3-spire Thai Temple silhouette + golden temple lights
    put(cv, TEMPLE, 0.68, np.array([0.14, 0.10, 0.15], np.float32), MID["temple"])
    put(cv, TEMPLE_LIGHTS, 0.95, np.array([1.0, 0.78, 0.25], np.float32), MID["temple"])


def water_layer(cv, t, fx):
    """Water per cell: summed waves, perspective, temple reflection, candle & moon shimmer, and concentric ripples."""
    q = np.clip((Y - HOR) / (ART_H - HOR), 0, 1)
    z = 1.0 / (q + 0.07)
    u = (X - KX) / (60 + q * 700)
    h = (
        np.sin(u * 6 + z * 1.4 - W0 * 3 * t)
        + 0.7 * np.sin(u * 11 - z * 2.3 + W0 * 4 * t)
        + 0.5 * np.sin(u * 3 + z * 3.9 - W0 * 2 * t + 2.1)
        + 0.3 * np.sin(u * 17 + z * 6.1 + W0 * 5 * t)
    )
    wave = 0.5 + 0.5 * np.tanh(h * 0.9)
    wm = Y >= HOR
    dens = 0.12 + 0.32 * wave * (0.4 + 0.6 * q)
    col = mix((0.03, 0.26, 0.30), (0.12, 0.56, 0.54), wave)
    col = mix(col, (0.55, 0.30, 0.10), np.clip(1 - q * 9, 0, 1) * 0.7)

    # Temple reflection on water
    r0 = HOR // CH
    rm = np.clip(2 * r0 - RR, 0, ROWS - 1)
    cm = np.clip(CC + np.round(h * 1.1).astype(int), 0, COLS - 1)
    refl = TEMPLE[rm, cm] & (RR >= r0) & ((RR - r0) < 28)
    refl_lit = TEMPLE_LIGHTS[rm, cm] & refl
    dens = np.where(refl, np.maximum(dens, 0.42), dens)
    col = np.where(refl[..., None], np.array([0.82, 0.44, 0.15], np.float32) * (0.7 + 0.3 * wave[..., None]), col)
    col = np.where(refl_lit[..., None], np.array([1.0, 0.80, 0.30], np.float32), col)

    # Candle reflection column
    dyr = Y - KY
    wid = 26 + np.clip(dyr, 0, None) * 0.11
    fr = (
        np.exp(-(((X - fx) + 6 * h) / wid) ** 2)
        * (dyr > -45)
        * np.exp(-np.abs(dyr) / 280)
        * (0.5 + 0.5 * np.sin(dyr * 0.12 + h * 2.2 - W0 * 6 * t)) ** 1.5
    )
    fr_f = 0.85 + 0.15 * math.sin(W0 * 7 * t)

    # Moon reflection column
    mr = Y - HOR
    mw = 16 + mr * 0.065
    mo = (
        np.exp(-(((X - MX) + 6 * h) / mw) ** 2)
        * np.exp(-mr / 440)
        * (0.5 + 0.5 * np.sin(mr * 0.10 + h * 3 - W0 * 5 * t)) ** 1.5
    )

    # Warm glow pool & expanding concentric water ripples around Krathong
    pool = np.exp(-(((X - KX) / 330) ** 2 + ((Y - KY - 15) / 130) ** 2) * 1.35)
    pool = pool * 0.55 * (0.35 + 0.65 * wave)
    rho = np.hypot(X - KX, (Y - KY - 20) * 2.6)
    ring = np.clip(np.cos(rho * 0.055 - W0 * 5 * t), 0, 1) ** 6 * np.exp(-rho / 240)

    gold = np.array([1.0, 0.76, 0.26], np.float32)
    d = np.maximum.reduce([dens, 0.92 * fr * fr_f, 0.82 * mo, pool, 0.65 * ring])
    best = np.argmax(np.stack([dens, 0.92 * fr, 0.82 * mo, pool, 0.65 * ring]), axis=0)
    cs = np.stack(
        [
            col,
            np.broadcast_to(gold, col.shape),
            np.broadcast_to(np.array([1.0, 0.95, 0.72], np.float32), col.shape),
            np.broadcast_to(np.array([1.0, 0.62, 0.20], np.float32), col.shape),
            np.broadcast_to(np.array([1.0, 0.82, 0.42], np.float32), col.shape),
        ]
    )
    colf = np.take_along_axis(cs, best[None, ..., None], axis=0)[0]
    put(cv, wm, d, colf, MID["water"])


def render_krathong(cv, t):
    """Z-buffer surface points into the high-res char grid, then light each cell."""
    P, N, Cb, Mt, Em = GEOM
    R, T = body_pose(t)
    Pw = P @ R.T + T
    Nw = N @ R.T
    xs, ys, zv = project(Pw)
    col = np.floor(xs / CW).astype(np.int32)
    row = np.floor(ys / CH).astype(np.int32)
    idx = np.nonzero((col >= 0) & (col < COLS) & (row >= 0) & (row < ROWS))[0]
    order = idx[np.argsort(zv[idx])]
    buf = np.full(ROWS * COLS, -1, np.int64)
    buf[row[order] * COLS + col[order]] = order  # nearest point wins
    cells = np.nonzero(buf >= 0)[0]
    w = buf[cells]
    nx = Nw[w, 0]
    ny = Nw[w, 1] * CP - Nw[w, 2] * SPH
    nz = Nw[w, 1] * SPH + Nw[w, 2] * CP
    flip = np.where(nz < 0, -1.0, 1.0)  # two-sided leaves face camera
    nx, ny, nz = nx * flip, ny * flip, nz * flip
    pv = np.stack([Pw[w, 0], Pw[w, 1] * CP - Pw[w, 2] * SPH, zv[w]], -1)
    lw = (CANDLE_TOP @ R.T + T) + np.array([0, 0.25, 0], np.float32)
    lv = np.array([lw[0], lw[1] * CP - lw[2] * SPH, lw[1] * SPH + lw[2] * CP])
    d = lv - pv
    dist2 = (d**2).sum(1)
    dn = d / np.sqrt(dist2)[:, None]
    lam = np.clip(nx * dn[:, 0] + ny * dn[:, 1] + nz * dn[:, 2], 0, 1)
    flick = 1 + 0.12 * math.sin(W0 * 7 * t) + 0.08 * math.sin(W0 * 13 * t + 1.0)
    cand = (2.65 * flick * lam / (0.16 + 1.15 * dist2))[:, None] * CANDLE_COL
    lm = np.clip(nx * MOON_DIR[0] + ny * MOON_DIR[1] + nz * MOON_DIR[2], 0, 1)
    moon = 0.38 * lm[:, None] * np.array([0.6, 0.72, 1.0], np.float32)
    amb = (0.28 + 0.10 * ny + 0.30 * nz)[:, None] * np.array([1.0, 0.88, 0.78], np.float32)
    bounce = 0.26 * np.clip(-ny, 0, 1)[:, None] * np.array([0.5, 0.35, 0.1], np.float32)
    lit = np.clip(Cb[w] * (amb + cand + moon + bounce), 0, 1) ** 0.78
    em = Em[w] > 0
    ember = np.array([1.0, 0.42, 0.12], np.float32) * (0.9 + 0.2 * math.sin(W0 * 5 * t))
    lit[em] = ember
    lum = lit @ np.array([0.3, 0.55, 0.15], np.float32)
    dens = np.clip(0.38 + 0.88 * lum, 0.40, 1.0)
    dens[em] = 1.0
    yw = KY + 0.479 * KS  # near waterline (px)
    cx, cy = (cells % COLS + 0.5) * CW, (cells // COLS + 0.5) * CH
    ry = yw + (yw - cy) * 0.7
    rx = cx + 5 * np.sin(ry * 0.05 - W0 * 4 * t)
    splat(cv, rx, ry, 0.34 * dens * (cy < yw), lit * 0.44, Mt[w][0] * 0 + MID["water"])
    cv[0].reshape(-1)[cells] = dens
    cv[1].reshape(-1, 3)[cells] = lit
    cv[2].reshape(-1)[cells] = Mt[w]
    base = project((CANDLE_TOP @ R.T + T)[None])
    tp = project(TIPS @ R.T + T)
    return (float(base[0][0]), float(base[1][0])), (tp[0], tp[1])


def flame_layer(cv, fx, fy, t):
    """Teardrop candle flame: multi-frequency flicker, white core to red tip, plus warm sparks."""
    fh, fw = 150.0, 34.0
    flick = 1 + 0.10 * math.sin(W0 * 7 * t) + 0.06 * math.sin(W0 * 13 * t + 1.0)
    sway = 10 * math.sin(W0 * 5 * t + 0.7) + 5 * math.sin(W0 * 11 * t)
    s = (fy - Y) / (fh * flick)
    sc = np.clip(s, 0, 1)
    xo = sway * sc**2 + 3 * np.sin(s * 9 - W0 * 9 * t) * sc
    wid = fw * np.clip(np.sin(np.pi * sc**0.6), 0, 1) ** 0.8 * (1 + 0.08 * np.sin(s * 12 - W0 * 10 * t))
    q = np.abs(X - fx - xo) / np.maximum(wid, 1e-3)
    inside = (s > -0.06) & (s < 1.0) & (q < 1.0)
    core = (q < 0.45) & (s < 0.55)
    col = mix((1.0, 0.38, 0.06), (1.0, 0.84, 0.25), np.clip(1.25 * s - q * 0.6, 0, 1))
    col = np.where(core[..., None], np.array([1.0, 0.98, 0.82], np.float32), col)
    put(cv, inside, np.where(core, 1.0, 0.90), col, MID["flame"])
    dh = np.hypot((X - fx - xo * 0.5) / 110.0, (Y - fy + 45) / 135.0)
    halo = 0.46 * np.exp(-dh * dh * 2.1) * (hash2(RR, CC, 7.0) > 0.32)
    putmax(cv, halo, np.array([1.0, 0.62, 0.20], np.float32), MID["spark"], 0.12)


def atmosphere_layer(cv, tips_xy, t):
    """Wispy curling incense smoke trails + dancing fireflies around the Krathong."""
    tx, ty = tips_xy
    for i in range(len(tx)):
        sy = ty[i] - Y
        active = (sy > 0) & (sy < 210)
        sx = tx[i] + 14 * np.sin(sy * 0.042 - W0 * 3.5 * t + i * 1.2) * (sy / 130.0)
        w = 4.5 + sy * 0.095
        smoke = np.exp(-(((X - sx) / w) ** 2)) * np.exp(-sy / 120.0) * 0.48
        putmax(cv, np.where(active, smoke, 0.0), np.array([0.68, 0.74, 0.85], np.float32), MID["spark"], 0.07)

    # Fireflies gently orbiting above the water
    for f_id in range(7):
        fx_pos = KX + (240 + f_id * 35) * math.cos(t * 0.55 + f_id * 1.9)
        fy_pos = KY - 35 + 55 * math.sin(t * 0.95 + f_id * 2.4)
        pulse = 0.5 + 0.5 * math.sin(W0 * 4.2 * t + f_id * 3.1)
        df = np.hypot((X - fx_pos) / 9.0, (Y - fy_pos) / 9.0)
        ff_glow = np.exp(-df * df * 1.6) * (0.45 + 0.55 * pulse)
        putmax(cv, ff_glow, np.array([0.75, 1.0, 0.35], np.float32), MID["spark"], 0.15)


# ==========================================
# 5. FAST RLE NUMERIC ASCII TERMINAL RENDERER
# ==========================================
def to_numeric_ascii(cv):
    """Convert canvas density & RGB buffers into a run-length-optimized ANSI digit frame."""
    dens = np.clip(cv[0], 0.0, 0.999)
    rgb = (np.clip(cv[1], 0.0, 1.0) * 255).astype(np.uint8)

    idx = (dens * len(NUM_RAMP)).astype(np.int32)
    chars = NUM_RAMP[idx]

    lines = []
    for r in range(ROWS):
        row_chars = chars[r]
        row_rgb = rgb[r]
        out = []
        prev_c = (-1, -1, -1)
        for c in range(COLS):
            ch = row_chars[c]
            if ch == " ":
                out.append(" ")
                continue
            cur_c = (int(row_rgb[c, 0]), int(row_rgb[c, 1]), int(row_rgb[c, 2]))
            if cur_c != prev_c:
                out.append(f"\033[38;2;{cur_c[0]};{cur_c[1]};{cur_c[2]}m")
                prev_c = cur_c
            out.append(ch)
        out.append("\033[0m")
        lines.append("".join(out))
    return "\n".join(lines)


def main():
    t0 = time.perf_counter()
    sys.stdout.write("\033[?25l\033[2J")
    sys.stdout.flush()

    try:
        while True:
            t = time.perf_counter() - t0
            cv = [
                np.zeros((ROWS, COLS), dtype=np.float32),
                np.zeros((ROWS, COLS, 3), dtype=np.float32),
                np.zeros((ROWS, COLS), dtype=np.int32),
            ]

            R, T = body_pose(t)
            fx_est, _, _ = project((CANDLE_TOP @ R.T + T)[None])

            sky_layer(cv, t)
            water_layer(cv, t, float(fx_est[0]))
            (fx, fy), tips_xy = render_krathong(cv, t)
            flame_layer(cv, fx, fy, t)
            atmosphere_layer(cv, tips_xy, t)

            frame = to_numeric_ascii(cv)
            sys.stdout.write("\033[H" + frame)
            sys.stdout.flush()

            time.sleep(0.025)
    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\033[0m\033[?25h\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()