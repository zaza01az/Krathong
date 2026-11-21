// Visual Renderers: High-performance ASCII Terminal Canvas, CRT Scanline shaders, and TrueColor text generator
import { NUM_RAMP, ASCII_RAMPS } from './math.js';

export class AsciiTerminalRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.rampName = options.rampName || 'numeric';
    this.palette = options.palette || 'truecolor'; // truecolor, amber, green, cyan, gold, mono
    this.crtEffects = options.crtEffects !== undefined ? options.crtEffects : true;
    this.bloom = options.bloom !== undefined ? options.bloom : true;
    this.fontFamily = options.fontFamily || '"Courier New", "Cascadia Code", monospace';
    this.fontSize = options.fontSize || 13;
    this.cellW = 8;
    this.cellH = 15;
  }

  setRamp(name) {
    if (ASCII_RAMPS[name]) {
      this.rampName = name;
    }
  }

  setPalette(palette) {
    this.palette = palette;
  }

  setFont(family, size) {
    this.fontFamily = family;
    this.fontSize = size;
  }

  render(engineOutput) {
    const { cols, rows, density, color } = engineOutput;
    const ctx = this.ctx;
    const ramp = ASCII_RAMPS[this.rampName] || NUM_RAMP;
    const rampLen = ramp.length;

    // Adjust canvas resolution if needed
    const requiredW = cols * this.cellW;
    const requiredH = rows * this.cellH;
    if (this.canvas.width !== requiredW || this.canvas.height !== requiredH) {
      this.canvas.width = requiredW;
      this.canvas.height = requiredH;
    }

    // Clear background
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const pal = this.palette;

    for (let r = 0; r < rows; r++) {
      const y = r * this.cellH;
      const rOffset = r * cols;

      for (let c = 0; c < cols; c++) {
        const cellIdx = rOffset + c;
        const d = density[cellIdx];
        if (d <= 0.02) continue; // Skip near empty cells for speed

        // Map density to character ramp
        const charIdx = Math.min(Math.floor(d * rampLen), rampLen - 1);
        const char = ramp[charIdx];
        if (char === ' ') continue;

        const x = c * this.cellW;

        // Raw color
        const rawR = color[cellIdx * 3];
        const rawG = color[cellIdx * 3 + 1];
        const rawB = color[cellIdx * 3 + 2];

        let r255 = Math.floor(rawR * 255);
        let g255 = Math.floor(rawG * 255);
        let b255 = Math.floor(rawB * 255);

        // Apply theme color filter if selected
        if (pal === 'amber') {
          const lum = rawR * 0.3 + rawG * 0.55 + rawB * 0.15;
          r255 = Math.floor(lum * 255);
          g255 = Math.floor(lum * 170);
          b255 = Math.floor(lum * 35);
        } else if (pal === 'green') {
          const lum = rawR * 0.3 + rawG * 0.55 + rawB * 0.15;
          r255 = Math.floor(lum * 40);
          g255 = Math.floor(lum * 255);
          b255 = Math.floor(lum * 80);
        } else if (pal === 'cyan') {
          const lum = rawR * 0.3 + rawG * 0.55 + rawB * 0.15;
          r255 = Math.floor(lum * 20);
          g255 = Math.floor(lum * 230);
          b255 = Math.floor(lum * 255);
        } else if (pal === 'gold') {
          const lum = rawR * 0.3 + rawG * 0.55 + rawB * 0.15;
          r255 = Math.floor(lum * 255);
          g255 = Math.floor(lum * 215);
          b255 = Math.floor(lum * 60);
        } else if (pal === 'mono') {
          const lum = Math.floor((rawR * 0.3 + rawG * 0.55 + rawB * 0.15) * 255);
          r255 = lum; g255 = lum; b255 = lum;
        }

        ctx.fillStyle = `rgb(${r255},${g255},${b255})`;
        ctx.fillText(char, x, y);
      }
    }

    // Optional CRT scanline & vignette overlay
    if (this.crtEffects) {
      this.drawScanlines(ctx, requiredW, requiredH);
    }
  }

  drawScanlines(ctx, w, h) {
    ctx.save();
    // Subtle horizontal scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // Vignette
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.35, w * 0.5, h * 0.5, w * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,5,15,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Generate plain-text ASCII snapshot for copying to clipboard
  toPlainText(engineOutput) {
    const { cols, rows, density } = engineOutput;
    const ramp = ASCII_RAMPS[this.rampName] || NUM_RAMP;
    const rampLen = ramp.length;
    const lines = [];

    for (let r = 0; r < rows; r++) {
      let line = '';
      const rOffset = r * cols;
      for (let c = 0; c < cols; c++) {
        const d = density[rOffset + c];
        const charIdx = Math.min(Math.floor(d * rampLen), rampLen - 1);
        line += ramp[charIdx];
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  // Generate ANSI-colored terminal string identical to Python stdout
  toAnsiString(engineOutput) {
    const { cols, rows, density, color } = engineOutput;
    const ramp = ASCII_RAMPS[this.rampName] || NUM_RAMP;
    const rampLen = ramp.length;
    const lines = [];

    for (let r = 0; r < rows; r++) {
      let rowStr = '';
      const rOffset = r * cols;
      for (let c = 0; c < cols; c++) {
        const cellIdx = rOffset + c;
        const d = density[cellIdx];
        const charIdx = Math.min(Math.floor(d * rampLen), rampLen - 1);
        const char = ramp[charIdx];

        const r255 = Math.floor(color[cellIdx * 3] * 255);
        const g255 = Math.floor(color[cellIdx * 3 + 1] * 255);
        const b255 = Math.floor(color[cellIdx * 3 + 2] * 255);

        rowStr += `\x1b[38;2;${r255};${g255};${b255}m${char}`;
      }
      lines.push(rowStr + '\x1b[0m');
    }
    return lines.join('\n');
  }
}

// Photorealistic Graphic Canvas Renderer (Smooth light, water reflection, and bloom)
export class GraphicCanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(engineOutput) {
    const { cols, rows, density, color } = engineOutput;
    const ctx = this.ctx;
    const cw = 8;
    const ch = 15;
    const w = cols * cw;
    const h = rows * ch;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    // Direct pixel data manipulation for smooth continuous luminous lighting
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Fill with night water background
    for (let r = 0; r < rows; r++) {
      const rOffset = r * cols;
      const yStart = r * ch;

      for (let c = 0; c < cols; c++) {
        const cellIdx = rOffset + c;
        const d = density[cellIdx];
        const cr = color[cellIdx * 3];
        const cg = color[cellIdx * 3 + 1];
        const cb = color[cellIdx * 3 + 2];

        const r255 = Math.floor(cr * 255);
        const g255 = Math.floor(cg * 255);
        const b255 = Math.floor(cb * 255);

        const xStart = c * cw;

        // Block paint cell
        for (let dy = 0; dy < ch; dy++) {
          const pixelRow = (yStart + dy) * w;
          for (let dx = 0; dx < cw; dx++) {
            const pIdx = (pixelRow + (xStart + dx)) * 4;
            data[pIdx] = r255;
            data[pIdx + 1] = g255;
            data[pIdx + 2] = b255;
            data[pIdx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Apply atmospheric glow bloom pass
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(12px) brightness(1.25)';
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  }
}
