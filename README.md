# 🪷 Loy Krathong Festival • 3D Mathematical Terminal Animation

An interactive web application recreating and elevating the 3D Loy Krathong numeric ASCII terminal simulation into a real-time web experience.

![Loy Krathong](https://img.shields.io/badge/Loy%20Krathong-ประเพณีลอยกระทง-ff6ea7?style=for-the-badge)
![Simulation](https://img.shields.io/badge/Simulation-60%20FPS-2bd9c8?style=for-the-badge)
![Mathematics](https://img.shields.io/badge/Math-3D%20Parametric-f5c453?style=for-the-badge)

---

## ✨ Features

### 1. 📟 Authentic Numeric ASCII Terminal (Python 1:1)

- **Faithful Mathematical Port**: Directly ported from the Python terminal engine (`krathong.py`) into high-performance Float32 array shaders.
- **Parametric 3D Krathong**:
  - Banana-trunk base cylinder
  - Folded banana leaves with center crease & vein shading (16 outer + 16 inner petals)
  - 3 tiers of blooming lotus petals (12, 10, 8 petals) with curved profile
  - Central yellow candle with dynamic multi-frequency flickering teardrop flame
  - 3 incense sticks with pulsing emissive ember tips and curling smoke
- **Environmental Shading**:
  - Full moon with exponential glow halo
  - Distant multi-tiered Thai Chedi (Wat Arun pagoda silhouette)
  - Dynamic summed perspective water waves with ripple rings around the Krathong
  - Mirrored water reflections of the pagoda, candle flame streak, and moon trail
  - 4-component lighting model: Candle inverse-square flicker, moonlight, sky ambient, and upward water bounce
- **Density Mapping**: Density `[0..1)` mapped to numeric ASCII `0123456789` with 24-bit TrueColor ANSI styling per character.

### 2. 🎨 Multiple Visual Modes

- **📟 Numeric ASCII Matrix**: Vintage CRT terminal with scanlines, screen curvature, phosphor bloom, and truecolor glyphs.
- **🌸 Luminous Graphic Canvas**: High-definition smooth luminous canvas with atmospheric light bloom and shimmering reflections.
- **🔀 Split Dual View**: Compare the mathematical ASCII matrix side-by-side with the luminous render.

### 3. 🪷 "Make a Wish & Float" (อธิษฐาน & ปล่อยกระทง)

- Write your prayer/wish to Phra Mae Khongkha (Goddess of Water).
- Choose flower offerings: Pink Lotus, Royal Gold Marigold, White Jasmine, or Emerald Banana Leaf.
- Light the candle and watch your wish float downstream into the night!
- Release glowing **Sky Lanterns (โคมลอย - Yi Peng)** floating upward into the starry sky.

### 4. 🎵 Traditional Thai Khim & Ambient Audio

- 100% synthesized through the **Web Audio API** (requires zero external audio files and works completely offline).
- Plays the iconic Loy Krathong folk melody (*"วันเพ็ญเดือนสิบสอง น้ำนองเต็มตลิ่ง..."*) on metallic Khim dulcimer and bamboo Ranat.
- Layered with gentle river water waves and night crickets.

### 5. ⚙️ Interactive Studio Controls

- **Character Ramps**: Original Numeric (`0123456789`), Standard ASCII (`.:-=+*#%@`), Thai Digits (`๐๑๒๓๔๕๖๗๘๙`), Block Shades (`░▒▓█`), Matrix Code.
- **CRT Color Themes**: TrueColor 24-bit, Vintage Amber CRT (P3 Phosphor), Retro Green CRT (P1 Phosphor), Siam Royal Gold, Cyberpunk Cyan, Monochrome.
- **Sky Atmospheres**: Full Moon Midnight, Purple Twilight, Golden Dusk, Morning Dawn.
- **Live Physics Sliders**: Water waves, Wind force, Candle intensity, Moon radiance, Simulation speed.
- **Export Tools**: Copy plain ASCII frame, Copy 24-bit ANSI color sequence, Save PNG snapshot.

---

## 🚀 Quick Start

### Option A: Local Python Web Server (Instant, Zero Installs)

```bash
python -m http.server 8000
```

Then open your browser at:

```
http://localhost:8000
```

### Option B: Node / Vite

```bash
npm run dev
```

### Option C: Run Original Python Terminal Script

```bash
python krathong.py
```

---

## 📐 Mathematical Model Overview

| Component | Mathematical Formulation |
| :--- | :--- |
| **Floating Body Pose** | `yaw = 0.25*t + 0.15*sin(1.2*0.8*t)`<br>`roll = 0.045*sin(1.2*1.7*t)`<br>`pitch = 0.035*cos(1.2*1.3*t)` |
| **Perspective Water Waves** | `h = sin(6u + 1.4z - 3.6t) + 0.7*sin(11u - 2.3z + 4.8t) + 0.5*sin(3u + 3.9z - 2.4t + 2.1) + 0.3*sin(17u + 6.1z + 6.0t)` |
| **Teardrop Candle Flame** | `sway = 9*sin(6t + 0.7) + 5*sin(13.2t)`<br>`wid = fw * sin(pi * s^0.6)^0.8 * (1 + 0.08*sin(12s - 12t))` |
| **Water Ripples** | `ring = 0.6 * max(0, cos(rho * 0.055 - 6t))^6 * exp(-rho / 220)` |

# Krathong

wasd
