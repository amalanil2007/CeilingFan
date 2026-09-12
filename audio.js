/**
 * audio.js - Pure Procedural Web Audio Synthesizer for Ceiling Fan Simulator
 * Completely self-contained: No external audio files needed!
 */

class FanAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Master bus
    this.masterGain = null;
    this.fanGain = null;

    // Motor sound nodes
    this.motorOsc1 = null;
    this.motorOsc2 = null;
    this.motorFilter = null;
    this.motorGain = null;

    // Air / Whoosh sound nodes
    this.noiseNode = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.whooshLfo = null;
    this.whooshLfoGain = null;

    // Current parameters
    this.currentRPM = 0;
    this.targetRPM = 0;
  }

  /**
   * Initialize audio context on first user gesture (satisfies browser autoplay policies)
   */
  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported by this browser.');
        return;
      }
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Fan submix bus
      this.fanGain = this.ctx.createGain();
      this.fanGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.fanGain.connect(this.masterGain);

      this.setupMotorSynth();
      this.setupAirSynth();

      this.isInitialized = true;
    } catch (err) {
      console.warn('Could not initialize Web Audio:', err);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Generates continuous motor hum with electrical 60Hz-style sub-harmonics
   */
  setupMotorSynth() {
    // Oscillator 1: fundamental motor hum
    this.motorOsc1 = this.ctx.createOscillator();
    this.motorOsc1.type = 'triangle';
    this.motorOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Oscillator 2: mechanical rotor harmonic
    this.motorOsc2 = this.ctx.createOscillator();
    this.motorOsc2.type = 'sine';
    this.motorOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    // Lowpass filter to muffle raw digital wave into warm mechanical drone
    this.motorFilter = this.ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.motorFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.motorOsc1.connect(this.motorFilter);
    this.motorOsc2.connect(this.motorFilter);
    this.motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.fanGain);

    this.motorOsc1.start();
    this.motorOsc2.start();
  }

  /**
   * Generates aerodynamic whooshing sound from rotating blades
   */
  setupAirSynth() {
    // Generate 2 seconds of pink/white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation for smoother ambient air sound
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.1;
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    // Resonant bandpass filter for "wind whoosh"
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
    this.noiseFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.fanGain);

    this.noiseNode.start();
  }

  /**
   * Update audio parameters in real time based on current fan RPM
   * @param {number} rpm - Current interpolated rotational velocity
   * @param {number} maxRpm - Maximum possible RPM (e.g. 480 in TURBO)
   */
  updateFanRPM(rpm, maxRpm = 480) {
    if (!this.isInitialized || !this.ctx) return;

    const norm = Math.max(0, Math.min(1, rpm / maxRpm));
    const now = this.ctx.currentTime;

    if (rpm < 3) {
      // Fan is practically stopped
      this.fanGain.gain.setTargetAtTime(0, now, 0.2);
      return;
    }

    // Master fan volume smoothly rises with speed
    // Low: subtle soothing hum, High/Turbo: roaring air flow
    const targetVolume = Math.min(0.95, 0.15 + Math.pow(norm, 0.7) * 0.85);
    this.fanGain.gain.setTargetAtTime(targetVolume, now, 0.15);

    // Motor pitch scales with speed
    // 50Hz idle -> ~130Hz at high/turbo
    const motorFreq1 = 50 + norm * 75;
    const motorFreq2 = motorFreq1 * 2;
    this.motorOsc1.frequency.setTargetAtTime(motorFreq1, now, 0.15);
    this.motorOsc2.frequency.setTargetAtTime(motorFreq2, now, 0.15);

    // Motor volume is prominent at start/low, blend into whoosh at high
    const motorVol = 0.25 + norm * 0.45;
    this.motorGain.gain.setTargetAtTime(motorVol, now, 0.15);

    // Wind filter cutoff sweeps up as blade tip speed increases
    const windFreq = 180 + norm * 500;
    this.noiseFilter.frequency.setTargetAtTime(windFreq, now, 0.15);

    // Wind volume increases significantly with speed
    const windVol = Math.pow(norm, 1.2) * 0.75;
    this.noiseGain.gain.setTargetAtTime(windVol, now, 0.15);
  }

  /**
   * Mechanical button click sound
   */
  playClick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Tactile pull-chain sound (metallic bead chain rattling through brass eyelet)
   */
  playPullChain() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Simulate 3 quick metallic bead clicks
    for (let i = 0; i < 3; i++) {
      const clickTime = now + i * 0.028;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400 + i * 400, clickTime);
      osc.frequency.exponentialRampToValueAtTime(600, clickTime + 0.02);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, clickTime);
      filter.Q.setValueAtTime(6, clickTime);

      gain.gain.setValueAtTime(0.28, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(clickTime);
      osc.stop(clickTime + 0.03);
    }
  }

  /**
   * Silly triumphant fanfare for unlocking achievements
   */
  playAchievementChime() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.42);
    });
  }

  /**
   * Dramatic mechanical explosion sound effect (deep boom, noise blast, and flying debris clang)
   */
  playExplosion() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Deep sub-bass concussive boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.95);

    // 2. High-energy explosive noise blast
    const bufferSize = this.ctx.sampleRate * 1.5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(150, now + 1.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.95, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSrc.start(now);

    // 3. Metallic fracture crack / debris snaps
    for (let i = 0; i < 4; i++) {
      const snapTime = now + 0.05 + i * 0.08;
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(1800 - i * 300, snapTime);
      snapOsc.frequency.exponentialRampToValueAtTime(200, snapTime + 0.08);

      snapGain.gain.setValueAtTime(0.4, snapTime);
      snapGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.09);

      snapOsc.connect(snapGain);
      snapGain.connect(this.masterGain);
      snapOsc.start(snapTime);
      snapOsc.stop(snapTime + 0.1);
    }
  }

  /**
   * Overheat emergency warning alert beep
   */
  playWarningBeep() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, now); // B5 warning tone
    osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Mechanical ratchet / repair sound when reassembling the fan
   */
  playRepair() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const clickTime = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + i * 90, clickTime);
      gain.gain.setValueAtTime(0.28, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(clickTime);
      osc.stop(clickTime + 0.04);
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.8;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }
}

// Export singleton
window.fanAudio = new FanAudioEngine();
