// Web Audio API Synthesizer: Authentic Thai Classical Piphat Ensemble
// Featuring 'ค้างคาวกินกล้วย' (Khang Khao Kin Kluay) with Ranat Ek, Ching/Chap, Taphon/Klong & River Ambience

export class PiphatAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = false;

    // Gains
    this.masterGain = null;
    this.musicGain = null;
    this.ranatGain = null;
    this.percussionGain = null;
    this.ambienceGain = null;

    // Tempo & Scheduling settings
    // 140 BPM brisk upbeat tempo. In 2-step (Song Chan), 1 bar = 2 beats, 4 ticks per bar.
    // Each tick = (60 / 140) / 2 = 0.21428 seconds
    this.bpm = 140;
    this.tickDuration = (60 / this.bpm) / 2;
    this.scheduleAheadTime = 0.15; // Schedule 150ms ahead
    this.lookaheadInterval = 30;   // Check every 30ms
    this.schedulerTimerId = null;
    this.nextTickTime = 0;
    this.currentTick = 0;

    // Pitch Frequency Mapping (Thai Classical 7-note diatonic/pentatonic range)
    // Scale: ด=C, ร=D, ม=E, ซ=G, ล=A, ท=B
    this.pitches = {
      // Octave 3 (Low body / sub-harmonics)
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      // Octave 4 (Middle / ด ร ม ซ ล ท)
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      // Octave 5 (High / ดํ รํ มํ ซํ ลํ ทํ)
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      // Octave 6 (Shimmering overtones)
      'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98, 'A6': 1760.00,
      '-': 0, 'R': 0
    };

    // Build the complete score for "ค้างคาวกินกล้วย" (Khang Khao Kin Kluay)
    // 3 Authentic Sections, 16 bars each (64 ticks per section, 192 ticks total)
    this.score = this.buildScore();

    // Ambience state
    this.cicadaTimeout = null;
  }

  // Parse notation array into sequential tick items
  buildScore() {
    // Section 1 (16 bars)
    // |- ล - ซ | ซ ซ - มํ | - - ซํ มํ | - - รํ มํ |
    // |- - ซํ มํ | - - รํ มํ | ซํ มํ รํ ดํ | - รํ - มํ |
    // |- ล - ซ | ซ ซ - มํ | - - ซํ มํ | - - รํ มํ |
    // |- - ซํ มํ | - - รํ มํ | ซํ มํ รํ ดํ | - รํ - ดํ |
    const s1 = [
      ['-', 'A4', '-', 'G4'], ['G4', 'G4', '-', 'E5'], ['-', '-', 'G5', 'E5'], ['-', '-', 'D5', 'E5'],
      ['-', '-', 'G5', 'E5'], ['-', '-', 'D5', 'E5'], ['G5', 'E5', 'D5', 'C5'], ['-', 'D5', '-', 'E5'],
      ['-', 'A4', '-', 'G4'], ['G4', 'G4', '-', 'E5'], ['-', '-', 'G5', 'E5'], ['-', '-', 'D5', 'E5'],
      ['-', '-', 'G5', 'E5'], ['-', '-', 'D5', 'E5'], ['G5', 'E5', 'D5', 'C5'], ['-', 'D5', '-', 'C5']
    ];

    // Section 2 (16 bars)
    // |- - - - | - รํ - รํ | - - มํ รํ | ดํ รํ - - |
    // |- มํ - รํ | - ดํ - ท | ล ซ ล ท | - ดํ - รํ |
    // |- - - - | - รํ - รํ | - - มํ รํ | ดํ รํ - - |
    // |- ดํ รํ มํ | ซํ มํ รํ ดํ | รํ มํ รํ ดํ | - ท - ล |
    const s2 = [
      ['-', '-', '-', '-'], ['-', 'D5', '-', 'D5'], ['-', '-', 'E5', 'D5'], ['C5', 'D5', '-', '-'],
      ['-', 'E5', '-', 'D5'], ['-', 'C5', '-', 'B4'], ['A4', 'G4', 'A4', 'B4'], ['-', 'C5', '-', 'D5'],
      ['-', '-', '-', '-'], ['-', 'D5', '-', 'D5'], ['-', '-', 'E5', 'D5'], ['C5', 'D5', '-', '-'],
      ['-', 'C5', 'D5', 'E5'], ['G5', 'E5', 'D5', 'C5'], ['D5', 'E5', 'D5', 'C5'], ['-', 'B4', '-', 'A4']
    ];

    // Section 3 (16 bars)
    // |- - - - | - ล - ล | ซ ล ดํ ล | ซ ม - ซ |
    // |- ม - ล | ซ ม - ซ | ล ซ ม ซ | ล ดํ - ล |
    // |- - - - | - ล - ล | ซ ล ดํ ล | ซ ม - ซ |
    // |- ม - ล | ซ ม - ซ | - มํ - รํ | ซํ มํ มํ มํ |
    const s3 = [
      ['-', '-', '-', '-'], ['-', 'A4', '-', 'A4'], ['G4', 'A4', 'C5', 'A4'], ['G4', 'E4', '-', 'G4'],
      ['-', 'E4', '-', 'A4'], ['G4', 'E4', '-', 'G4'], ['A4', 'G4', 'E4', 'G4'], ['A4', 'C5', '-', 'A4'],
      ['-', '-', '-', '-'], ['-', 'A4', '-', 'A4'], ['G4', 'A4', 'C5', 'A4'], ['G4', 'E4', '-', 'G4'],
      ['-', 'E4', '-', 'A4'], ['G4', 'E4', '-', 'G4'], ['-', 'E5', '-', 'D5'], ['G5', 'E5', 'E5', 'E5']
    ];

    const allBars = [
      ...s1.map((b, i) => ({ section: 1, bar: i + 1, notes: b })),
      ...s2.map((b, i) => ({ section: 2, bar: i + 1, notes: b })),
      ...s3.map((b, i) => ({ section: 3, bar: i + 1, notes: b }))
    ];

    const score = [];
    allBars.forEach((barObj, barIdx) => {
      barObj.notes.forEach((note, tickInBar) => {
        score.push({
          section: barObj.section,
          bar: barObj.bar,
          barIndex: barIdx,
          tickInBar, // 0, 1, 2, 3
          note,
          freq: this.pitches[note] || 0
        });
      });
    });

    return score;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Music Sub-bus
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // Ranat Ek Bus (with subtle wooden warmth filter)
    this.ranatGain = this.ctx.createGain();
    this.ranatGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.ranatGain.connect(this.musicGain);

    // Percussion Bus (Ching, Chap, Taphon)
    this.percussionGain = this.ctx.createGain();
    this.percussionGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    this.percussionGain.connect(this.musicGain);

    // Ambience Bus
    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.ambienceGain.connect(this.masterGain);

    this.startAmbience();
  }

  // -------------------------------------------------------------
  // INSTRUMENT 1: Ranat Ek (ระนาดเอก)
  // Rosewood bar attack + harmonic overtones + wooden hollow body
  // -------------------------------------------------------------
  playRanatNote(freq, time, dur = 0.28) {
    if (!this.ctx || freq <= 0) return;

    // 1. Attack Mallet Transient (ไม้ระนาดกระทบรางไม้ชิงชัน)
    const attackFilter = this.ctx.createBiquadFilter();
    attackFilter.type = 'bandpass';
    attackFilter.frequency.setValueAtTime(2400, time);
    attackFilter.Q.setValueAtTime(3.5, time);

    const attackGain = this.ctx.createGain();
    attackGain.gain.setValueAtTime(0.0001, time);
    attackGain.gain.linearRampToValueAtTime(0.25, time + 0.002);
    attackGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

    const clickOsc = this.ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1200, time);
    clickOsc.frequency.exponentialRampToValueAtTime(300, time + 0.025);
    clickOsc.connect(attackGain);
    attackGain.connect(this.ranatGain);
    clickOsc.start(time);
    clickOsc.stop(time + 0.03);

    // 2. Fundamental Voice (ไม้ระนาดเอก เสียงหลัก)
    const oscMain = this.ctx.createOscillator();
    const mainGain = this.ctx.createGain();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, time);

    mainGain.gain.setValueAtTime(0.001, time);
    mainGain.gain.linearRampToValueAtTime(0.48, time + 0.003);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 1.5);

    // 3. Rosewood Inharmonic Overtone (การสั่นฮาร์มอนิก 3f ของไม้ระนาด)
    const oscOvertone = this.ctx.createOscillator();
    const overtoneGain = this.ctx.createGain();
    oscOvertone.type = 'triangle';
    oscOvertone.frequency.setValueAtTime(freq * 3.01, time);

    overtoneGain.gain.setValueAtTime(0.0001, time);
    overtoneGain.gain.linearRampToValueAtTime(0.18, time + 0.002);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.5);

    // 4. Wooden Boat Resonator (รางระนาด กลวงก้องกังวาน)
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(560, time);
    bodyFilter.gain.setValueAtTime(4.0, time);
    bodyFilter.Q.setValueAtTime(2.0, time);

    oscMain.connect(mainGain);
    oscOvertone.connect(overtoneGain);

    mainGain.connect(bodyFilter);
    overtoneGain.connect(bodyFilter);
    bodyFilter.connect(this.ranatGain);

    oscMain.start(time);
    oscOvertone.start(time);
    oscMain.stop(time + dur * 1.6);
    oscOvertone.stop(time + dur * 0.6);
  }

  // Legacy method compatibility for app.js
  playKhimNote(freq, dur) {
    if (!this.ctx) return;
    this.playRanatNote(freq, this.ctx.currentTime, dur);
  }

  // -------------------------------------------------------------
  // INSTRUMENT 2: Ching & Chap (ฉิ่ง - ฉับ)
  // Ching: Bright crystalline resonant ring (3200Hz + sustained tail)
  // Chap: Muted, damped metallic clack
  // -------------------------------------------------------------
  playChing(time) {
    if (!this.ctx) return;

    // High crystalline brass resonance with slight beat frequency
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(3220, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3265, time); // Beating for shimmering ring

    // Overtone shimmer
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(6480, time);
    const gain3 = this.ctx.createGain();
    gain3.gain.setValueAtTime(0.06, time);
    gain3.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
    osc3.connect(gain3);
    gain3.connect(this.percussionGain);

    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.linearRampToValueAtTime(0.22, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.95); // Long sustained ring

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.percussionGain);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);
    osc1.stop(time + 1.0);
    osc2.stop(time + 1.0);
    osc3.stop(time + 0.45);
  }

  playChap(time) {
    if (!this.ctx) return;

    // Damped, muted metallic clack (chup)
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, time);
    filter.Q.setValueAtTime(4.0, time);

    osc.type = 'square';
    osc.frequency.setValueAtTime(750, time);
    osc.frequency.exponentialRampToValueAtTime(240, time + 0.06);

    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.linearRampToValueAtTime(0.18, time + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.065); // Abrupt damping

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.percussionGain);

    osc.start(time);
    osc.stop(time + 0.075);
  }

  // -------------------------------------------------------------
  // INSTRUMENT 3: Taphon / Klong (ตะโพน / กลองแขก)
  // Low resonant punch with slight pitch drop + leather membrane warmth
  // -------------------------------------------------------------
  playTaphon(type, time) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (type === 'deep') {
      // "ทั่ง" (Thung): Deep resonant barrel membrane
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(54, time + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.percussionGain);

      osc.start(time);
      osc.stop(time + 0.4);
    } else {
      // "เทิ่ง" (Teung): Mid-high drum strike
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, time);
      osc.frequency.exponentialRampToValueAtTime(95, time + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, time);
      filter.Q.setValueAtTime(2.0, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.22, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.percussionGain);

      osc.start(time);
      osc.stop(time + 0.25);
    }
  }

  // -------------------------------------------------------------
  // INSTRUMENT 4: Ambient River Water & Night Cicadas
  // -------------------------------------------------------------
  startAmbience() {
    if (!this.ctx) return;

    // 1. Water River Flow: Continuous Pink Noise + Wave LFO Filter
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.12;
    }

    const waterSource = this.ctx.createBufferSource();
    waterSource.buffer = noiseBuffer;
    waterSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, this.ctx.currentTime);

    // Wave modulation LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(130, this.ctx.currentTime);
    lfo.connect(filter.frequency);

    waterSource.connect(filter);
    filter.connect(this.ambienceGain);

    waterSource.start(0);
    lfo.start(0);

    // 2. Night Cicada / Crickets
    this.scheduleCicadas();
  }

  scheduleCicadas() {
    if (!this.ctx) return;
    const nextInterval = Math.random() * 3500 + 2000;
    this.cicadaTimeout = setTimeout(() => {
      if (this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.playCicadaPulse();
      }
      this.scheduleCicadas();
    }, nextInterval);
  }

  playCicadaPulse() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(5200 + Math.random() * 400, now);

    g.gain.setValueAtTime(0.0001, now);
    const pulses = 5;
    for (let i = 0; i < pulses; i++) {
      const t = now + i * 0.038;
      g.gain.linearRampToValueAtTime(0.035, t + 0.01);
      g.gain.linearRampToValueAtTime(0.001, t + 0.034);
    }

    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + pulses * 0.04);
  }

  // -------------------------------------------------------------
  // Precise Lookahead Sequencer & Scheduler
  // -------------------------------------------------------------
  scheduleStep() {
    if (!this.isPlaying || !this.ctx) return;

    // Schedule all ticks that fall within the lookahead window
    while (this.nextTickTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleTick(this.currentTick, this.nextTickTime);
      this.nextTickTime += this.tickDuration;
      this.currentTick = (this.currentTick + 1) % this.score.length;
    }

    this.schedulerTimerId = setTimeout(() => this.scheduleStep(), this.lookaheadInterval);
  }

  scheduleTick(tickIndex, time) {
    const item = this.score[tickIndex];
    if (!item) return;

    // 1. Play Ranat Ek melody note
    if (item.freq > 0) {
      this.playRanatNote(item.freq, time, this.tickDuration * 1.35);
    }

    // 2. Play Ching & Chap (ฉิ่ง - ฉับ)
    // Thai Classical Song Chan metric:
    // Tick 3 (the 4th tick of the 0-indexed bar):
    // Odd bar -> "ฉิ่ง" (Ching)
    // Even bar -> "ฉับ" (Chap)
    if (item.tickInBar === 3) {
      const isOddBar = (item.bar % 2 !== 0);
      if (isOddBar) {
        this.playChing(time);
      } else {
        this.playChap(time);
      }
    }

    // 3. Play Taphon / Klong (หน้าทับกลอง)
    // Traditional buoyant syncopation:
    // Odd bar: tick 0 (Tung deep), tick 2 (Teung mid)
    // Even bar: tick 1 (Teung mid), tick 3 (Tung deep accompanying Chap)
    const isOddBar = (item.bar % 2 !== 0);
    if (isOddBar) {
      if (item.tickInBar === 0) {
        this.playTaphon('deep', time);
      } else if (item.tickInBar === 2) {
        this.playTaphon('mid', time);
      }
    } else {
      if (item.tickInBar === 1) {
        this.playTaphon('mid', time);
      } else if (item.tickInBar === 3) {
        this.playTaphon('deep', time);
      }
    }
  }

  // -------------------------------------------------------------
  // Public Control API
  // -------------------------------------------------------------
  play() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextTickTime = this.ctx.currentTime + 0.05;
    this.currentTick = 0;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    this.scheduleStep();
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerTimerId) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
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
      const v = Math.max(0, Math.min(1, vol));
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : v, this.ctx.currentTime);
    }
  }

  setMusicVolume(vol) {
    if (this.musicGain && this.ctx) {
      const v = Math.max(0, Math.min(1, vol));
      this.musicGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  setAmbienceVolume(vol) {
    if (this.ambienceGain && this.ctx) {
      const v = Math.max(0, Math.min(1, vol));
      this.ambienceGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  setTempo(bpm) {
    this.bpm = Math.max(80, Math.min(220, bpm));
    this.tickDuration = (60 / this.bpm) / 2;
  }

  getStatus() {
    const current = this.score[this.currentTick] || {};
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      bpm: this.bpm,
      section: current.section || 1,
      bar: current.bar || 1,
      tick: current.tickInBar || 0,
      note: current.note || '-'
    };
  }
}

// Backward compatibility alias so existing app.js imports work seamlessly
export const LoyKrathongAudio = PiphatAudio;
export default PiphatAudio;
