/**
 * fan.js - Physics, Animation & Wind Particle System for Ceiling Fan Simulator
 */

class FanPhysicsEngine {
  constructor(options = {}) {
    this.bladeGroup = options.bladeGroup || null;
    this.shadowGroup = options.shadowGroup || null;
    this.windCanvas = options.windCanvas || null;
    this.onUpdate = options.onUpdate || (() => {});

    // Target RPM configurations for each speed level
    this.speedLevels = [
      { name: 'OFF', targetRPM: 0, watts: 0 },
      { name: 'LOW', targetRPM: 65, watts: 25 },
      { name: 'MEDIUM', targetRPM: 145, watts: 50 },
      { name: 'HIGH', targetRPM: 230, watts: 75 },
      { name: 'TURBO', targetRPM: 480, watts: 100 }
    ];

    this.currentLevel = 0;
    this.currentRPM = 0;
    this.targetRPM = 0;
    this.angle = 0; // degrees

    // Inertia & physics tuning (smooth acceleration & coast-down drag)
    this.accelRate = 0.7; // RPM acceleration factor per second
    this.decelRate = 0.45; // Coasting drag factor per second
    this.lastTimestamp = null;
    this.isOverdrive = false;

    // Wind particles
    this.particles = [];
    this.ctx = this.windCanvas ? this.windCanvas.getContext('2d') : null;
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  resizeCanvas() {
    if (!this.windCanvas || !this.ctx) return;
    const rect = this.windCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.windCanvas.width = rect.width * dpr;
    this.windCanvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
  }

  /**
   * Sets fan speed level (0: OFF, 1: LOW, 2: MED, 3: HIGH, 4: TURBO)
   */
  setSpeed(level) {
    if (level < 0) level = 0;
    if (level >= this.speedLevels.length) level = this.speedLevels.length - 1;

    this.currentLevel = level;
    this.targetRPM = this.speedLevels[level].targetRPM;
    this.isOverdrive = (level === 4);

    return this.speedLevels[level];
  }

  getSpeed() {
    return this.currentLevel;
  }

  getTargetWatts() {
    return this.speedLevels[this.currentLevel].watts;
  }

  /**
   * Main animation & physics step
   */
  tick(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000); // delta time in seconds, clamped
    this.lastTimestamp = timestamp;

    // Physics: Smooth acceleration / deceleration with moment of inertia
    const diff = this.targetRPM - this.currentRPM;
    if (Math.abs(diff) > 0.05) {
      const rate = diff > 0 ? this.accelRate : this.decelRate;
      // Exponential smoothing towards target
      this.currentRPM += diff * (1 - Math.exp(-rate * dt * 2.8));
    } else {
      this.currentRPM = this.targetRPM;
    }

    // Update rotational angle
    // Rotations per second = RPM / 60
    // Degrees per second = (RPM / 60) * 360 = RPM * 6
    const deltaAngle = (this.currentRPM * 6) * dt;
    this.angle = (this.angle + deltaAngle) % 360;

    // Render fan rotation
    if (this.bladeGroup) {
      this.bladeGroup.setAttribute('transform', `rotate(${this.angle.toFixed(2)} 400 400)`);
    }

    if (this.shadowGroup) {
      // Cast shadow rotated with subtle offset
      this.shadowGroup.setAttribute('transform', `translate(16, 24) rotate(${this.angle.toFixed(2)} 400 400)`);
    }

    // Dynamic motion blur calculation
    this.updateMotionBlur();

    // Render wind particle effects
    this.updateWindParticles(dt);

    // Sync procedural audio engine
    if (window.fanAudio) {
      window.fanAudio.updateFanRPM(this.currentRPM, 480);
    }

    // Notify listeners / UI meters
    this.onUpdate({
      currentRPM: this.currentRPM,
      targetRPM: this.targetRPM,
      level: this.currentLevel,
      isRunning: this.currentRPM > 1
    });

    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  /**
   * Applies subtle or intense motion blur filter to blade SVG depending on speed
   */
  updateMotionBlur() {
    if (!this.bladeGroup) return;

    const blurFilter = document.getElementById('blade-blur-filter');
    if (blurFilter) {
      let blurStdDev = 0;
      if (this.currentRPM > 80) {
        // Smoothly scale blur from 0 at 80 RPM up to 5 at 480 RPM
        blurStdDev = ((this.currentRPM - 80) / 400) * 4.5;
      }
      blurFilter.setAttribute('stdDeviation', `${blurStdDev.toFixed(2)} 0`);
    }
  }

  /**
   * Particle simulation for visual air breeze / swirling wind streaks
   */
  updateWindParticles(dt) {
    if (!this.windCanvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Only spawn particles if fan is rotating
    if (this.currentRPM > 20) {
      const spawnChance = (this.currentRPM / 480) * 0.45;
      if (Math.random() < spawnChance) {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const spawnRadius = 40 + Math.random() * 120;
        const spawnAngle = Math.random() * Math.PI * 2;

        this.particles.push({
          x: centerX + Math.cos(spawnAngle) * spawnRadius,
          y: centerY + Math.sin(spawnAngle) * spawnRadius,
          angle: spawnAngle,
          radius: spawnRadius,
          speed: (this.currentRPM * 0.9 + 80),
          angularSpeed: (this.currentRPM / 60) * Math.PI * 2 * 0.7,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.6,
          alpha: 0.15 + (this.currentRPM / 480) * 0.45,
          length: 12 + (this.currentRPM / 480) * 35,
          width: 1.5 + Math.random() * 1.5
        });
      }
    }

    // Update and draw existing particles
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Spiral outward
      p.radius += p.speed * dt * 0.7;
      p.angle += p.angularSpeed * dt;

      const px = centerX + Math.cos(p.angle) * p.radius;
      const py = centerY + Math.sin(p.angle) * p.radius;

      // Draw curved wind streak
      const tailAngle = p.angle - (p.length / p.radius);
      const tailX = centerX + Math.cos(tailAngle) * (p.radius - 8);
      const tailY = centerY + Math.sin(tailAngle) * (p.radius - 8);

      const lifeRatio = p.life / p.maxLife;
      const currentAlpha = (1 - lifeRatio) * p.alpha;

      this.ctx.beginPath();
      this.ctx.moveTo(tailX, tailY);
      this.ctx.lineTo(px, py);
      this.ctx.strokeStyle = this.isOverdrive 
        ? `rgba(255, 120, 60, ${currentAlpha * 1.2})` 
        : `rgba(255, 255, 255, ${currentAlpha})`;
      this.ctx.lineWidth = p.width;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

window.FanPhysicsEngine = FanPhysicsEngine;
