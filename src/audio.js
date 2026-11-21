// Web Audio API Synthesizer: Traditional Thai Khim / Ranat Loy Krathong melody & River Ambience

export class LoyKrathongAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.masterGain = null;
    this.ambienceGain = null;
    this.musicGain = null;
    this.intervalId = null;
    this.noteIndex = 0;

    // Traditional Thai Pentatonic scale notes (in Hz)
    // C4, D4, E4, G4, A4, C5, D5, E5, G5, A5
    this.pitches = {
      'G3': 196.00, 'A3': 220.00, 'C4': 261.63, 'D4': 293.66,
      'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'C5': 523.25,
      'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00,
      'R': 0 // Rest
    };

    // Iconic "Loy Krathong" Thai folk song melody progression
    this.melody = [
      // "วันเพ็ญเดือนสิบสอง..."
      { note: 'G4', dur: 0.4 }, { note: 'A4', dur: 0.4 }, { note: 'C5', dur: 0.8 },
      { note: 'A4', dur: 0.4 }, { note: 'G4', dur: 0.4 }, { note: 'E4', dur: 0.8 },
      // "น้ำนองเต็มตลิ่ง..."
      { note: 'G4', dur: 0.4 }, { note: 'E4', dur: 0.4 }, { note: 'D4', dur: 0.4 }, { note: 'C4', dur: 0.4 },
      { note: 'D4', dur: 0.8 }, { note: 'E4', dur: 0.8 },
      // "เราทั้งหลายชายหญิง..."
      { note: 'G4', dur: 0.4 }, { note: 'A4', dur: 0.4 }, { note: 'C5', dur: 0.8 },
      { note: 'D5', dur: 0.4 }, { note: 'C5', dur: 0.4 }, { note: 'A4', dur: 0.8 },
      // "สนุกกันจริงวันลอยกระทง..."
      { note: 'C5', dur: 0.4 }, { note: 'A4', dur: 0.4 }, { note: 'G4', dur: 0.4 }, { note: 'E4', dur: 0.4 },
      { note: 'G4', dur: 1.2 }, { note: 'R',  dur: 0.4 },
      // "ลอย ลอยกระทง..."
      { note: 'C5', dur: 0.6 }, { note: 'C5', dur: 0.6 }, { note: 'A4', dur: 0.4 },
      { note: 'C5', dur: 0.8 }, { note: 'D5', dur: 0.8 },
      // "ลอย ลอยกระทง..."
      { note: 'E5', dur: 0.6 }, { note: 'D5', dur: 0.4 }, { note: 'C5', dur: 0.4 },
      { note: 'A4', dur: 0.8 }, { note: 'G4', dur: 0.8 },
      // "บุญจะส่งให้เราสุขใจ..."
      { note: 'A4', dur: 0.4 }, { note: 'C5', dur: 0.4 }, { note: 'D5', dur: 0.4 }, { note: 'E5', dur: 0.4 },
      { note: 'D5', dur: 0.4 }, { note: 'C5', dur: 0.4 }, { note: 'A4', dur: 0.4 }, { note: 'G4', dur: 0.4 },
      { note: 'C5', dur: 1.6 }, { note: 'R',  dur: 0.8 },
    ];
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.ambienceGain.connect(this.masterGain);

    this.startAmbience();
  }

  // Play a metallic bell-like Khim/Ranat note with natural wooden/chime harmonics
  playKhimNote(freq, dur) {
    if (!this.ctx || freq <= 0) return;
    const now = this.ctx.currentTime;

    // Fundamental oscillator (triangle/sine blend)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // Harmonic overtone for shimmering bamboo/metal timbre
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.01, now);

    // Percussive mallet attack + gentle exponential ringing decay
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(0.5, now + 0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 1.8);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(this.musicGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur * 1.85);
    osc2.stop(now + dur * 1.85);
  }

  // Continuous synthesized river water flow + cricket chirps
  startAmbience() {
    if (!this.ctx) return;

    // 1. Water River Flow: Filtered Pink Noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.1;
    }

    const waterSource = this.ctx.createBufferSource();
    waterSource.buffer = noiseBuffer;
    waterSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, this.ctx.currentTime);

    // Slow water wave filter modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(filter.frequency);

    waterSource.connect(filter);
    filter.connect(this.ambienceGain);

    waterSource.start(0);
    lfo.start(0);

    // 2. Night Crickets periodic chirp
    this.scheduleCrickets();
  }

  scheduleCrickets() {
    if (!this.ctx) return;
    const nextChirp = Math.random() * 4000 + 2500;
    setTimeout(() => {
      if (this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.playCricketBurst();
      }
      this.scheduleCrickets();
    }, nextChirp);
  }

  playCricketBurst() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4500 + Math.random() * 400, now);

    // Multiple rapid pulses
    g.gain.setValueAtTime(0.0001, now);
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.04;
      g.gain.linearRampToValueAtTime(0.04, t + 0.01);
      g.gain.linearRampToValueAtTime(0.001, t + 0.035);
    }

    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  stepMelody() {
    if (!this.isPlaying || !this.ctx) return;

    const item = this.melody[this.noteIndex];
    const freq = this.pitches[item.note] || 0;
    this.playKhimNote(freq, item.dur);

    this.noteIndex = (this.noteIndex + 1) % this.melody.length;
    const nextTime = item.dur * 1000;
    this.intervalId = setTimeout(() => this.stepMelody(), nextTime);
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.noteIndex = 0;
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
      this.stepMelody();
    } else {
      if (this.intervalId) clearTimeout(this.intervalId);
    }
    return this.isPlaying;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setVolume(vol) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : vol, this.ctx.currentTime);
    }
  }
}
