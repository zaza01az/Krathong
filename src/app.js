// Main Application Controller: State, Event Listeners, Animation Loop, and Interactive Controls
import { LoyKrathongEngine } from './engine.js';
import { AsciiTerminalRenderer, GraphicCanvasRenderer } from './renderer.js';
import { LoyKrathongAudio } from './audio.js';
import { COLS_DEFAULT, ROWS_DEFAULT, ASCII_RAMPS } from './math.js';

class LoyKrathongApp {
  constructor() {
    this.engine = new LoyKrathongEngine();
    this.audio = new LoyKrathongAudio();

    // DOM Elements
    this.asciiCanvas = document.getElementById('asciiCanvas');
    this.graphicCanvas = document.getElementById('graphicCanvas');
    this.container = document.getElementById('canvasContainer');

    this.asciiRenderer = new AsciiTerminalRenderer(this.asciiCanvas);
    this.graphicRenderer = new GraphicCanvasRenderer(this.graphicCanvas);

    // State
    this.activeMode = 'ascii'; // 'ascii', 'graphic', 'split'
    this.isPaused = false;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.simulatedTime = 0;
    this.fpsCount = 0;
    this.fpsLastUpdate = 0;
    this.fps = 60;

    this.initUI();
    this.initWishSystem();
    this.initSliders();
    this.initTactileInteractions();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initUI() {
    // Mode toggles
    const modeBtns = document.querySelectorAll('[data-mode]');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setMode(btn.dataset.mode);
      });
    });

    // Ramp selector
    const rampSelect = document.getElementById('rampSelect');
    if (rampSelect) {
      rampSelect.addEventListener('change', (e) => {
        this.asciiRenderer.setRamp(e.target.value);
      });
    }

    // Palette selector
    const palSelect = document.getElementById('palSelect');
    if (palSelect) {
      palSelect.addEventListener('change', (e) => {
        this.asciiRenderer.setPalette(e.target.value);
      });
    }

    // Lotus Style selector
    const lotusSelect = document.getElementById('lotusSelect');
    if (lotusSelect) {
      lotusSelect.addEventListener('change', (e) => {
        this.engine.setLotusStyle(e.target.value);
      });
    }

    // Theme / Sky selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.engine.theme = e.target.value;
      });
    }

    // Grid size selector
    const gridSelect = document.getElementById('gridSelect');
    if (gridSelect) {
      gridSelect.addEventListener('change', (e) => {
        const [c, r] = e.target.value.split('x').map(Number);
        this.engine.resize(c, r);
      });
    }

    // Audio button
    const audioBtn = document.getElementById('audioBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const playing = this.audio.toggle();
        audioBtn.classList.toggle('active', playing);
        const isEn = document.documentElement.lang === 'en';
        audioBtn.textContent = playing
          ? (isEn ? 'Music: ON' : 'เปิดเพลง: เปิด')
          : (isEn ? 'Music: OFF' : 'เปิดเพลง: ปิด');
      });
    }

    // Language toggle
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        const isEn = document.documentElement.lang === 'en';
        this.setLang(isEn ? 'th' : 'en');
      });
    }

    // Play/Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        const isEn = document.documentElement.lang === 'en';
        pauseBtn.textContent = this.isPaused
          ? (isEn ? 'Resume' : 'เล่นต่อ')
          : (isEn ? 'Pause' : 'หยุด');
      });
    }

    // Copy ASCII frame buttons
    const copyAsciiBtn = document.getElementById('copyAsciiBtn');
    if (copyAsciiBtn) {
      copyAsciiBtn.addEventListener('click', () => {
        const currentData = this.lastEngineOutput;
        if (currentData) {
          const text = this.asciiRenderer.toPlainText(currentData);
          navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied ASCII art frame to clipboard!', 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4cb.svg');
          });
        }
      });
    }

    const copyAnsiBtn = document.getElementById('copyAnsiBtn');
    if (copyAnsiBtn) {
      copyAnsiBtn.addEventListener('click', () => {
        const currentData = this.lastEngineOutput;
        if (currentData) {
          const ansi = this.asciiRenderer.toAnsiString(currentData);
          navigator.clipboard.writeText(ansi).then(() => {
            this.showToast('Copied 24-bit ANSI colored text!', 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f308.svg');
          });
        }
      });
    }

    // Download PNG snapshot
    const snapshotBtn = document.getElementById('snapshotBtn');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', () => {
        const activeCanvas = (this.activeMode === 'graphic') ? this.graphicCanvas : this.asciiCanvas;
        const link = document.createElement('a');
        link.download = `loy-krathong-${Date.now()}.png`;
        link.href = activeCanvas.toDataURL('image/png');
        link.click();
        this.showToast('Snapshot saved!', 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4f8.svg');
      });
    }

    // CRT Scanlines toggle
    const crtToggle = document.getElementById('crtToggle');
    if (crtToggle) {
      crtToggle.addEventListener('change', (e) => {
        this.asciiRenderer.crtEffects = e.target.checked;
        this.asciiCanvas.classList.toggle('crt-curvature', e.target.checked);
      });
    }

    // View Python Code modal toggle
    const viewCodeBtn = document.getElementById('viewCodeBtn');
    const codeModal = document.getElementById('codeModal');
    const closeCodeBtn = document.getElementById('closeCodeBtn');
    if (viewCodeBtn && codeModal) {
      viewCodeBtn.addEventListener('click', () => codeModal.classList.remove('hidden'));
    }
    if (closeCodeBtn && codeModal) {
      closeCodeBtn.addEventListener('click', () => codeModal.classList.add('hidden'));
    }
  }

  /**
   * Switch all labelled elements between Thai and English.
   * Elements carry data-th / data-en attributes for their text.
   */
  setLang(lang) {
    document.documentElement.lang = lang;
    const isEn = lang === 'en';

    // All elements with data-th / data-en
    document.querySelectorAll('[data-th]').forEach(el => {
      const text = isEn ? el.dataset.en : el.dataset.th;
      if (text !== undefined) {
        // For elements that contain only text (no child elements)
        if (el.children.length === 0) {
          el.textContent = text;
        }
      }
    });

    // Update mode buttons separately (they use data-th / data-en on themselves)
    document.querySelectorAll('[data-mode]').forEach(btn => {
      const text = isEn ? btn.dataset.en : btn.dataset.th;
      if (text) btn.textContent = text;
    });

    // Site title & subtitle
    const siteTitle = document.getElementById('site-title');
    const siteSub   = document.getElementById('site-subtitle');
    if (siteTitle) siteTitle.textContent = isEn ? 'Loy Krathong Festival' : 'อนิเมชั่นกระทง';
    if (siteSub)   siteSub.textContent   = isEn
      ? '3D Mathematical ASCII Simulation'
      : 'จำลอง 3D ตัวอักษร ASCII เชิงคณิตศาสตร์';

    // Audio button (re-sync with playing state)
    const audioBtn = document.getElementById('audioBtn');
    if (audioBtn) {
      const playing = this.audio.isPlaying?.() ?? audioBtn.classList.contains('active');
      audioBtn.textContent = playing
        ? (isEn ? 'Music: ON' : 'เปิดเพลง: เปิด')
        : (isEn ? 'Music: OFF' : 'เปิดเพลง: ปิด');
    }
  }

  initSliders() {
    const bindSlider = (id, targetObj, prop, valFormat = v => v) => {
      const slider = document.getElementById(id);
      const valDisplay = document.getElementById(`${id}Val`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const v = parseFloat(e.target.value);
          targetObj[prop] = v;
          if (valDisplay) valDisplay.textContent = valFormat(v);
        });
      }
    };

    bindSlider('speedSlider', this.engine, 'speed', v => `${v.toFixed(1)}x`);
    bindSlider('windSlider', this.engine, 'wind', v => `${v.toFixed(2)}`);
    bindSlider('candleSlider', this.engine, 'candleIntensity', v => `${v.toFixed(1)}x`);
    bindSlider('waterSlider', this.engine, 'waterRoughness', v => `${v.toFixed(1)}x`);
    bindSlider('moonSlider', this.engine, 'moonGlow', v => `${v.toFixed(1)}x`);
  }

  initWishSystem() {
    const wishBtn = document.getElementById('floatWishBtn');
    const wishModal = document.getElementById('wishModal');
    const sendWishBtn = document.getElementById('sendWishBtn');
    const closeWishBtn = document.getElementById('closeWishBtn');
    const lanternBtn = document.getElementById('floatLanternBtn');
    const wishInput = document.getElementById('wishInput');
    const wishColorSelect = document.getElementById('wishColorSelect');

    if (wishBtn && wishModal) {
      wishBtn.addEventListener('click', () => wishModal.classList.remove('hidden'));
    }
    if (closeWishBtn && wishModal) {
      closeWishBtn.addEventListener('click', () => wishModal.classList.add('hidden'));
    }

    if (sendWishBtn && wishInput) {
      sendWishBtn.addEventListener('click', () => {
        const text = wishInput.value.trim() || 'ขอขมาพระแม่คงคา & สุขภาพแข็งแรง';
        const col = wishColorSelect ? wishColorSelect.value : 'pink';
        this.engine.addWishKrathong(text, col);
        this.showToast(`Wish Krathong released: "${text}"`, 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1fab7.svg');
        wishModal.classList.add('hidden');
        wishInput.value = '';

        // Authentic Thai Piphat chime: Ranat Ek high notes with Ching shimmer
        if (this.audio.ctx) {
          const now = this.audio.ctx.currentTime;
          if (this.audio.playRanatNote) {
            this.audio.playRanatNote(523.25, now, 0.35); // C5
            this.audio.playRanatNote(659.25, now + 0.16, 0.4); // E5
            this.audio.playRanatNote(783.99, now + 0.32, 0.55); // G5
            if (this.audio.playChing) {
              this.audio.playChing(now + 0.34);
            }
          } else if (this.audio.playKhimNote) {
            this.audio.playKhimNote(523.25, 1.2);
            setTimeout(() => this.audio.playKhimNote(659.25, 1.4), 180);
          }
        }
      });
    }

    if (lanternBtn) {
      lanternBtn.addEventListener('click', () => {
        this.engine.addSkyLantern();
        this.showToast('Sky lantern (โคมลอย) released into the stars!', 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3ee.svg');
        if (this.audio.ctx) {
          const now = this.audio.ctx.currentTime;
          if (this.audio.playRanatNote) {
            this.audio.playRanatNote(783.99, now, 0.4); // G5
            this.audio.playRanatNote(880.00, now + 0.18, 0.6); // A5
            if (this.audio.playChing) {
              this.audio.playChing(now + 0.2);
            }
          } else if (this.audio.playKhimNote) {
            this.audio.playKhimNote(783.99, 1.5);
          }
        }
      });
    }
  }

  initTactileInteractions() {
    if (!this.container) return;

    // Convert mouse or touch event coordinates to internal engine canvas coordinates
    const triggerRippleAtEvent = (clientX, clientY, strength = 1.0) => {
      const activeCanvas = (this.activeMode === 'graphic') ? this.graphicCanvas : this.asciiCanvas;
      const rect = activeCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      // Ensure within canvas bounds
      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;

      const artX = normX * this.engine.artW;
      const artY = normY * this.engine.artH;

      // Trigger radiating concentric ripple on river surface
      this.engine.addRipple(artX, artY, strength);

      // Play soft water droplet sound if audio context is active
      if (this.audio && this.audio.ctx && this.audio.ctx.state === 'running') {
        if (this.audio.playRanatNote && Math.random() > 0.4) {
          const notes = [659.25, 783.99, 880.00];
          const chosen = notes[Math.floor(Math.random() * notes.length)];
          this.audio.playRanatNote(chosen, this.audio.ctx.currentTime, 0.15);
        }
      }
    };

    // Click / tap on canvas container
    this.container.addEventListener('pointerdown', (e) => {
      // Don't intercept if clicking on buttons or controls
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
        return;
      }
      triggerRippleAtEvent(e.clientX, e.clientY, 1.2);
    });

    // Touch drag on river for fluid trail ripples (throttled)
    let lastDragTime = 0;
    this.container.addEventListener('pointermove', (e) => {
      if (e.buttons > 0) { // dragging/holding
        const now = performance.now();
        if (now - lastDragTime > 80) { // ~12 fps ripple drops
          lastDragTime = now;
          triggerRippleAtEvent(e.clientX, e.clientY, 0.65);
        }
      }
    });
  }

  setMode(mode) {
    this.activeMode = mode;
    this.container.className = `canvas-container mode-${mode}`;
  }

  showToast(msg, iconUrl) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (iconUrl) {
      toast.innerHTML = `<img class="svg-icon toast-svg" src="${iconUrl}" alt=""><span>${msg}</span>`;
    } else {
      toast.textContent = msg;
    }
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const delta = (currentTime - this.lastTime) * 0.001;
    this.lastTime = currentTime;

    // Calculate FPS
    this.fpsCount++;
    if (currentTime - this.fpsLastUpdate > 500) {
      this.fps = Math.round((this.fpsCount * 1000) / (currentTime - this.fpsLastUpdate));
      this.fpsCount = 0;
      this.fpsLastUpdate = currentTime;
      const fpsElem = document.getElementById('fpsDisplay');
      if (fpsElem) fpsElem.textContent = `${this.fps} FPS`;
    }

    if (!this.isPaused) {
      this.simulatedTime += delta;
    }

    // Step simulation
    const output = this.engine.render(this.simulatedTime);
    this.lastEngineOutput = output;

    // Render active views
    if (this.activeMode === 'ascii' || this.activeMode === 'split') {
      this.asciiRenderer.render(output);
    }
    if (this.activeMode === 'graphic' || this.activeMode === 'split') {
      this.graphicRenderer.render(output);
    }
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new LoyKrathongApp();
});
