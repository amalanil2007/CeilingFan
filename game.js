/**
 * game.js - Core Simulator Logic, Stats, Metrics, Achievements & Funny Ticker
 */

(function () {
  'use strict';

  // --- Constants & Achievement Definitions ---
  const ACHIEVEMENTS = [
    {
      id: 'first_spin',
      icon: '🏆',
      title: 'First Spin',
      desc: 'Turn the fan on for the first time.'
    },
    {
      id: 'fan_addict',
      icon: '🏆',
      title: 'Fan Addict',
      desc: 'Keep the fan running for 1 minute.'
    },
    {
      id: 'maximum_overkill',
      icon: '🏆',
      title: 'Maximum Overkill',
      desc: 'Use TURBO mode.'
    },
    {
      id: 'why',
      icon: '🏆',
      title: 'Why?',
      desc: 'Keep the fan running for 5 minutes.'
    },
    {
      id: 'absolutely_useless',
      icon: '🏆',
      title: 'Absolutely Useless',
      desc: 'Reach 10 minutes of total fan runtime.'
    },
    {
      id: 'chain_puller',
      icon: '✨',
      title: 'Chain Puller',
      desc: 'Pull one of the hanging bead chains.'
    },
    {
      id: 'luminescence',
      icon: '💡',
      title: 'Let There Be Light',
      desc: 'Toggle the ceiling light fixture.'
    },
    {
      id: 'eco_warrior',
      icon: '🌱',
      title: 'Eco Warrior',
      desc: 'Turn the fan off after running for 30+ seconds.'
    },
    {
      id: 'rgb_gamer',
      icon: '🌈',
      title: 'RGB Gamer',
      desc: 'Enable Chroma RGB Rainbow LED lighting.'
    },
    {
      id: 'living_room_rave',
      icon: '🎉',
      title: 'Ceiling Rave',
      desc: 'Run TURBO overdrive with RGB LEDs blazing!'
    },
    {
      id: 'meltdown_overload',
      icon: '💥',
      title: 'Thermodynamic Failure',
      desc: 'Run TURBO for 30+ seconds until the motor violently explodes!'
    }
  ];

  const FUNNY_QUOTES = [
    "Congratulations. You turned on a fan.",
    "Amazing technological achievement.",
    "The fan is doing its best.",
    "You could have just bought a real fan.",
    "Why are you still watching this?",
    "Your fan is now emotionally attached to you.",
    "This project has absolutely no purpose.",
    "Air molecules are being vigorously re-arranged.",
    "Your fan now has better RGB than your gaming PC.",
    "Adding LEDs increases virtual airflow by approximately 0.00%.",
    "High-performance RGB cooling. Scientifically unproven.",
    "Disco ball manufacturers are getting nervous.",
    "Warning: May cause intense feelings of relaxation or mild existential dread.",
    "Electricity bill estimated increase: +$0.000004 per minute.",
    "The blades are turning. The universe remains indifferent.",
    "No actual cooling is being transmitted through your monitor.",
    "Hypnotic rotational therapy in progress.",
    "Scientifically proven to move 0.00% of real air in your bedroom.",
    "Fans only: The wholesome kind.",
    "Give it a raise, it's working hard."
  ];

  const TURBO_QUOTES = [
    "🚨 MAXIMUM OVERKILL ACTIVATED: Ceiling integrity questionable.",
    "🌪️ Virtual hurricane imminent! Hold onto your desk!",
    "⚠️ The fan motor is re-evaluating its life choices.",
    "🚀 Preparing for atmospheric takeoff in 3... 2... 1...",
    "🎉 RGB RAVE ALERT: The ceiling has become a nightclub!",
    "🔥 THERMAL WARNING: Bearing temperature rising rapidly!"
  ];

  // --- State ---
  let fanPhysics = null;
  let isLightOn = true;
  let currentLedMode = 'warm'; // warm | cool | cyber | rgb | off
  let sessionRunningSeconds = 0;
  let totalRunningSeconds = 0;
  let currentWattage = 0;
  let targetWattage = 0;
  let lastSessionRunTime = 0;
  let quoteIndex = 0;
  let quoteInterval = null;
  let unlockedAchievements = {};

  // Heat & Explosion State
  let motorTemperature = 24.0; // Ambient °C
  let turboActiveSeconds = 0; // Consecutive seconds in TURBO
  let isExploded = false;

  const LED_WATTS = {
    'warm': 8,
    'cool': 10,
    'cyber': 14,
    'rgb': 18,
    'off': 0
  };

  // --- DOM Elements ---
  const els = {};

  function initElements() {
    els.app = document.getElementById('app');
    els.room = document.getElementById('room-container');
    els.bladeGroup = document.getElementById('blade-assembly');
    els.shadowGroup = document.getElementById('blade-shadows');
    els.windCanvas = document.getElementById('wind-canvas');
    els.ceilingLight = document.getElementById('light-dome');
    els.lightAura = document.getElementById('light-aura');

    // Pull chains
    els.chainSpeed = document.getElementById('chain-speed');
    els.chainLight = document.getElementById('chain-light');
    els.pullChainContainer = document.querySelector('.pull-chain-container');

    // Blade pieces for independent explosion ejection
    els.bladePieces = [
      document.getElementById('blade-w-0'),
      document.getElementById('blade-w-1'),
      document.getElementById('blade-w-2'),
      document.getElementById('blade-w-3'),
      document.getElementById('blade-w-4')
    ];

    // Explosion and repair FX
    els.explosionFlash = document.getElementById('explosion-flash');
    els.explosionFx = document.getElementById('explosion-fx');
    els.scorchedMotor = document.getElementById('scorched-motor');
    els.repairBanner = document.getElementById('repair-banner');
    els.btnRepair = document.getElementById('btn-repair');

    // Meters
    els.rpmDisplay = document.getElementById('rpm-val');
    els.wattDisplay = document.getElementById('watt-val');
    els.sessionTimeDisplay = document.getElementById('session-time');
    els.totalTimeDisplay = document.getElementById('total-time');
    els.tempDisplay = document.getElementById('temp-val');
    els.thermometerFill = document.getElementById('thermometer-fill');
    els.tempMeterCard = document.getElementById('temp-meter-card');

    // Controls
    els.btnPower = document.getElementById('btn-power');
    els.btnSpeedDown = document.getElementById('btn-speed-down');
    els.btnSpeedUp = document.getElementById('btn-speed-up');
    els.btnLight = document.getElementById('btn-light');
    els.btnReset = document.getElementById('btn-reset');
    els.btnMute = document.getElementById('btn-mute');
    els.btnTrophy = document.getElementById('btn-trophy');

    // Preset pills
    els.speedPills = document.querySelectorAll('.speed-pill');
    els.ledPills = document.querySelectorAll('.led-pill');

    // Funny ticker
    els.tickerText = document.getElementById('ticker-text');

    // Overkill warning banner
    els.overkillBanner = document.getElementById('overkill-banner');

    // Modals & Toasts
    els.toastContainer = document.getElementById('toast-container');
    els.achievementModal = document.getElementById('achievement-modal');
    els.modalClose = document.getElementById('modal-close');
    els.achievementsList = document.getElementById('achievements-list');
    els.achievementCount = document.getElementById('achievement-count');
  }

  // --- Persistence ---
  function loadStorage() {
    try {
      const savedTotal = localStorage.getItem('cfs_total_time');
      if (savedTotal) totalRunningSeconds = parseInt(savedTotal, 10) || 0;

      const savedAchievements = localStorage.getItem('cfs_achievements');
      if (savedAchievements) {
        unlockedAchievements = JSON.parse(savedAchievements);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem('cfs_total_time', totalRunningSeconds.toString());
      localStorage.setItem('cfs_achievements', JSON.stringify(unlockedAchievements));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // --- Formatters ---
  function formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const pad = (n) => (n < 10 ? '0' + n : n);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${pad(hrs)}:${pad(remMins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  // --- Achievements Logic ---
  function unlockAchievement(id) {
    if (unlockedAchievements[id]) return; // Already unlocked

    const item = ACHIEVEMENTS.find((a) => a.id === id);
    if (!item) return;

    unlockedAchievements[id] = {
      unlockedAt: Date.now()
    };
    saveStorage();

    // Play chime sound
    if (window.fanAudio) {
      window.fanAudio.playAchievementChime();
    }

    // Show celebratory toast
    showAchievementToast(item);
    updateAchievementUI();
  }

  function showAchievementToast(item) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="toast-icon">${item.icon}</div>
      <div class="toast-content">
        <div class="toast-heading">ACHIEVEMENT UNLOCKED!</div>
        <div class="toast-title">${item.title}</div>
        <div class="toast-desc">${item.desc}</div>
      </div>
    `;

    els.toastContainer.appendChild(toast);

    // Auto remove after 4.5s
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 450);
    }, 4500);
  }

  function updateAchievementUI() {
    const count = Object.keys(unlockedAchievements).length;
    if (els.achievementCount) {
      els.achievementCount.textContent = `${count}/${ACHIEVEMENTS.length}`;
    }

    if (!els.achievementsList) return;

    els.achievementsList.innerHTML = ACHIEVEMENTS.map((a) => {
      const isUnlocked = !!unlockedAchievements[a.id];
      const unlockDate = isUnlocked
        ? new Date(unlockedAchievements[a.id].unlockedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="card-icon">${isUnlocked ? a.icon : '🔒'}</div>
          <div class="card-info">
            <div class="card-title">${a.title} ${isUnlocked ? `<span class="card-time">${unlockDate}</span>` : ''}</div>
            <div class="card-desc">${a.desc}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Funny Quotes Cycler ---
  function showNextQuote() {
    if (!els.tickerText) return;

    // Smooth transition
    els.tickerText.classList.add('fade-out');

    setTimeout(() => {
      let quote = "";
      const currentLevel = fanPhysics ? fanPhysics.getSpeed() : 0;

      if (currentLevel === 4) {
        quote = TURBO_QUOTES[Math.floor(Math.random() * TURBO_QUOTES.length)];
      } else if (currentLevel === 0) {
        quote = "The fan is dormant. The room awaits your command.";
      } else {
        quote = FUNNY_QUOTES[quoteIndex % FUNNY_QUOTES.length];
        quoteIndex++;
      }

      els.tickerText.textContent = quote;
      els.tickerText.classList.remove('fade-out');
    }, 300);
  }

  // --- UI Update on Engine Tick ---
  function onEngineUpdate(data) {
    const rpm = data.currentRPM;
    const motorWatts = fanPhysics ? fanPhysics.getTargetWatts() : 0;
    const ledWatts = (currentLedMode !== 'off') ? (LED_WATTS[currentLedMode] || 0) : 0;
    const ceilingLightWatts = isLightOn ? 12 : 0;
    const baseWatts = motorWatts + ledWatts + ceilingLightWatts;

    // Realistic wattage jitter
    if (rpm > 2 || ledWatts > 0 || ceilingLightWatts > 0) {
      const jitter = (Math.random() - 0.5) * 0.4;
      targetWattage = baseWatts + jitter;
    } else {
      targetWattage = 0;
    }

    // Smooth wattage meter interpolation
    currentWattage += (targetWattage - currentWattage) * 0.12;
    if (currentWattage < 0.05) currentWattage = 0;

    if (els.rpmDisplay) {
      els.rpmDisplay.textContent = Math.round(rpm);
    }
    if (els.wattDisplay) {
      els.wattDisplay.textContent = Math.round(currentWattage);
    }

    // Update screen shake in TURBO
    if (data.level === 4 && rpm > 320) {
      els.room.classList.add('turbo-shake');
      if (els.overkillBanner) els.overkillBanner.classList.add('active');
    } else {
      els.room.classList.remove('turbo-shake');
      if (els.overkillBanner) els.overkillBanner.classList.remove('active');
    }
  }

  // --- LED Lighting Mode Handler ---
  function setLedMode(mode, playSound = true) {
    currentLedMode = mode;

    if (playSound && window.fanAudio) {
      window.fanAudio.playClick();
    }

    const allModes = ['led-warm', 'led-cool', 'led-cyber', 'led-rgb', 'led-off'];
    allModes.forEach((m) => {
      document.body.classList.remove(m);
      if (els.room) els.room.classList.remove(m);
    });

    document.body.classList.add(`led-${mode}`);
    if (els.room) els.room.classList.add(`led-${mode}`);

    // Update Pill Buttons
    if (els.ledPills) {
      els.ledPills.forEach((pill) => {
        pill.classList.toggle('active', pill.dataset.led === mode);
      });
    }

    // Achievements check
    if (mode === 'rgb') {
      unlockAchievement('rgb_gamer');
      if (fanPhysics && fanPhysics.getSpeed() === 4) {
        unlockAchievement('living_room_rave');
      }
    }
  }

  // --- Controls Handling ---
  function setSpeedLevel(level, playSound = true) {
    if (!fanPhysics) return;

    if (isExploded && level > 0) {
      if (els.tickerText) {
        els.tickerText.textContent = "⚠️ Motor destroyed! Click REPAIR FAN to reassemble.";
      }
      return;
    }

    const oldLevel = fanPhysics.getSpeed();
    const config = fanPhysics.setSpeed(level);

    if (playSound && window.fanAudio) {
      window.fanAudio.playClick();
    }

    // Update Speed Pills UI
    els.speedPills.forEach((pill) => {
      const pillLevel = parseInt(pill.dataset.speed, 10);
      if (pillLevel === level) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Update Power Button visual state
    if (level === 0) {
      els.btnPower.classList.remove('on');
      // Achievement check: Eco Warrior (turned off after 30+ seconds run)
      if (sessionRunningSeconds - lastSessionRunTime >= 30) {
        unlockAchievement('eco_warrior');
      }
      lastSessionRunTime = sessionRunningSeconds;
    } else {
      els.btnPower.classList.add('on');
      // Achievement check: First Spin
      unlockAchievement('first_spin');

      if (level === 4) {
        // Achievement check: Maximum Overkill
        unlockAchievement('maximum_overkill');
        if (currentLedMode === 'rgb') {
          unlockAchievement('living_room_rave');
        }
      }
    }
  }

  function togglePower() {
    if (!fanPhysics) return;
    const current = fanPhysics.getSpeed();
    if (current === 0) {
      setSpeedLevel(1); // Default to LOW
    } else {
      setSpeedLevel(0); // Turn OFF
    }
  }

  function speedStep(delta) {
    if (!fanPhysics) return;
    const current = fanPhysics.getSpeed();
    setSpeedLevel(current + delta);
  }

  function toggleLight(playSound = true) {
    isLightOn = !isLightOn;

    if (playSound && window.fanAudio) {
      window.fanAudio.playClick();
    }

    if (isLightOn) {
      els.room.classList.remove('lights-off');
      els.room.classList.add('lights-on');
      els.btnLight.classList.add('active');
      els.btnLight.querySelector('.btn-label').textContent = 'Light ON';
    } else {
      els.room.classList.remove('lights-on');
      els.room.classList.add('lights-off');
      els.btnLight.classList.remove('active');
      els.btnLight.querySelector('.btn-label').textContent = 'Light OFF';
    }

    unlockAchievement('luminescence');
  }

  // Trigger realistic pull-chain physics bounce
  function pullChain(type) {
    if (window.fanAudio) {
      window.fanAudio.playPullChain();
    }

    unlockAchievement('chain_puller');

    if (type === 'speed') {
      els.chainSpeed.classList.remove('chain-pull-anim');
      void els.chainSpeed.offsetWidth; // trigger reflow
      els.chainSpeed.classList.add('chain-pull-anim');

      // Cycle speed: 0 -> 1 -> 2 -> 3 -> 4 -> 0
      const nextLevel = ((fanPhysics.getSpeed() + 1) % 5);
      setSpeedLevel(nextLevel, false);
    } else if (type === 'light') {
      els.chainLight.classList.remove('chain-pull-anim');
      void els.chainLight.offsetWidth; // trigger reflow
      els.chainLight.classList.add('chain-pull-anim');

      toggleLight(false);
    }
  }

  // --- Heat & Thermometer UI Update ---
  function updateTemperatureUI() {
    if (els.tempDisplay) {
      els.tempDisplay.textContent = Math.round(motorTemperature);
    }
    if (els.thermometerFill) {
      // Scale 20°C (0%) to 120°C (100%)
      const pct = Math.max(8, Math.min(100, ((motorTemperature - 20) / 100) * 100));
      els.thermometerFill.style.width = `${pct}%`;
    }

    if (els.tempMeterCard) {
      els.tempMeterCard.classList.remove('temp-warm', 'temp-hot', 'temp-critical');
      if (motorTemperature >= 95) {
        els.tempMeterCard.classList.add('temp-critical');
      } else if (motorTemperature >= 65) {
        els.tempMeterCard.classList.add('temp-hot');
      } else if (motorTemperature >= 42) {
        els.tempMeterCard.classList.add('temp-warm');
      }
    }
  }

  // --- Dynamic Fan Explosion (Triggered after >30s in TURBO or >=120°C) ---
  function explodeFan() {
    isExploded = true;
    setSpeedLevel(0, false);
    if (fanPhysics) {
      fanPhysics.currentRPM = 0;
      fanPhysics.targetRPM = 0;
    }

    // Dramatic explosion audio
    if (window.fanAudio) {
      window.fanAudio.playExplosion();
    }

    // Flash screen white-hot
    if (els.explosionFlash) {
      els.explosionFlash.classList.remove('active');
      void els.explosionFlash.offsetWidth; // force reflow
      els.explosionFlash.classList.add('active');
    }

    // Explosion FX shockwave and blast fire
    if (els.explosionFx) {
      els.explosionFx.classList.remove('hidden');
      els.explosionFx.classList.add('active');
      setTimeout(() => {
        if (els.explosionFx) {
          els.explosionFx.classList.remove('active');
          els.explosionFx.classList.add('hidden');
        }
      }, 900);
    }

    // Scorched destroyed motor core
    if (els.scorchedMotor) {
      els.scorchedMotor.classList.remove('hidden');
      els.scorchedMotor.classList.add('active');
    }

    // Eject all 5 fan blades violently to their respective radial sides!
    els.bladePieces.forEach((piece, idx) => {
      if (piece) {
        piece.classList.add(`ejected-${idx}`);
      }
    });

    // Hide pull chains
    if (els.pullChainContainer) {
      els.pullChainContainer.style.opacity = '0';
      els.pullChainContainer.style.pointerEvents = 'none';
    }

    // Unlock achievement: Thermodynamic Failure
    unlockAchievement('meltdown_overload');

    // Update thoughts ticker
    if (els.tickerText) {
      els.tickerText.textContent = "💥 CRITICAL MELTDOWN: Continuous TURBO exceeded 120°C. Internal motor destroyed!";
    }

    // Show repair modal after brief dramatic delay
    setTimeout(() => {
      if (els.repairBanner) {
        els.repairBanner.classList.remove('hidden');
      }
    }, 750);
  }

  // --- Repair & Reassemble Fan ---
  function repairFan() {
    if (window.fanAudio) {
      window.fanAudio.playRepair();
    }

    isExploded = false;
    turboActiveSeconds = 0;
    motorTemperature = 24.0;

    // Reset all 5 blade pieces back to center
    els.bladePieces.forEach((piece, idx) => {
      if (piece) {
        piece.classList.remove(`ejected-${idx}`);
      }
    });

    // Hide scorched motor
    if (els.scorchedMotor) {
      els.scorchedMotor.classList.remove('active');
      els.scorchedMotor.classList.add('hidden');
    }

    // Restore pull chains
    if (els.pullChainContainer) {
      els.pullChainContainer.style.opacity = '1';
      els.pullChainContainer.style.pointerEvents = 'auto';
    }

    // Hide repair banner
    if (els.repairBanner) {
      els.repairBanner.classList.add('hidden');
    }

    updateTemperatureUI();
    setSpeedLevel(0, false);

    if (els.tickerText) {
      els.tickerText.textContent = "Fan reassembled with duct tape and hope. Please don't do that again.";
    }
  }

  function resetSession() {
    if (window.fanAudio) {
      window.fanAudio.playClick();
    }

    setSpeedLevel(0, false);
    sessionRunningSeconds = 0;
    lastSessionRunTime = 0;
    turboActiveSeconds = 0;
    if (els.sessionTimeDisplay) {
      els.sessionTimeDisplay.textContent = '00:00';
    }
  }

  // --- Second-by-Second Timer & Tracker ---
  function startSecondTimer() {
    setInterval(() => {
      // 1. Temperature & TURBO Overheat Simulation
      if (isExploded) {
        if (motorTemperature > 25) {
          motorTemperature = Math.max(24, motorTemperature - 2.5);
        }
        updateTemperatureUI();
        return;
      }

      const currentLevel = fanPhysics ? fanPhysics.getSpeed() : 0;
      if (currentLevel === 4) {
        // TURBO: rapid heat buildup, reaches 120°C in ~30 seconds
        turboActiveSeconds++;
        motorTemperature = Math.min(125, 24 + turboActiveSeconds * 3.2);

        // Warning beeps when nearing critical meltdown (>92°C)
        if (turboActiveSeconds >= 22 && turboActiveSeconds < 30) {
          if (window.fanAudio) {
            window.fanAudio.playWarningBeep();
          }
        }

        // EXPLOSION TRIGGER: 30 seconds of TURBO or 120°C reached!
        if (turboActiveSeconds >= 30 || motorTemperature >= 120) {
          explodeFan();
          return;
        }
      } else {
        // Not in turbo: cool down or converge towards speed target
        turboActiveSeconds = Math.max(0, turboActiveSeconds - 1.5);
        let targetTemp = 24.0;
        if (currentLevel === 1) targetTemp = 36.0;
        else if (currentLevel === 2) targetTemp = 54.0;
        else if (currentLevel === 3) targetTemp = 78.0;

        if (motorTemperature < targetTemp) {
          motorTemperature += Math.min(targetTemp - motorTemperature, 1.8);
        } else if (motorTemperature > targetTemp) {
          motorTemperature -= Math.min(motorTemperature - targetTemp, 1.4);
        }
      }

      updateTemperatureUI();

      // 2. Active Session Running Time
      const isSpinning = fanPhysics && fanPhysics.currentRPM > 4;
      if (isSpinning) {
        sessionRunningSeconds++;
        totalRunningSeconds++;

        if (els.sessionTimeDisplay) {
          els.sessionTimeDisplay.textContent = formatTime(sessionRunningSeconds);
        }
        if (els.totalTimeDisplay) {
          els.totalTimeDisplay.textContent = formatTime(totalRunningSeconds);
        }

        if (totalRunningSeconds % 5 === 0) {
          saveStorage();
        }

        if (sessionRunningSeconds >= 60) {
          unlockAchievement('fan_addict');
        }
        if (sessionRunningSeconds >= 300) {
          unlockAchievement('why');
        }
        if (totalRunningSeconds >= 600) {
          unlockAchievement('absolutely_useless');
        }
      }
    }, 1000);
  }

  // --- Setup Event Listeners ---
  function bindEvents() {
    // User interaction audio activation
    const wakeAudio = () => {
      if (window.fanAudio) window.fanAudio.ensureContext();
    };
    window.addEventListener('pointerdown', wakeAudio, { once: false });

    // Buttons
    els.btnPower.addEventListener('click', togglePower);
    els.btnSpeedDown.addEventListener('click', () => speedStep(-1));
    els.btnSpeedUp.addEventListener('click', () => speedStep(1));
    els.btnLight.addEventListener('click', () => toggleLight(true));
    els.btnReset.addEventListener('click', resetSession);

    // Repair Button
    if (els.btnRepair) {
      els.btnRepair.addEventListener('click', repairFan);
    }

    // Speed Preset Pills
    els.speedPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const lvl = parseInt(pill.dataset.speed, 10);
        setSpeedLevel(lvl, true);
      });
    });

    // LED Preset Pills
    if (els.ledPills) {
      els.ledPills.forEach((pill) => {
        pill.addEventListener('click', () => {
          setLedMode(pill.dataset.led, true);
        });
      });
    }

    // Mute Button
    els.btnMute.addEventListener('click', () => {
      if (!window.fanAudio) return;
      const isMuted = window.fanAudio.toggleMute();
      els.btnMute.innerHTML = isMuted ? '🔇 <span class="btn-label">Muted</span>' : '🔊 <span class="btn-label">Sound</span>';
      els.btnMute.classList.toggle('muted', isMuted);
    });

    // Pull Chains
    els.chainSpeed.addEventListener('click', () => pullChain('speed'));
    els.chainLight.addEventListener('click', () => pullChain('light'));

    // Achievements Modal
    els.btnTrophy.addEventListener('click', () => {
      if (window.fanAudio) window.fanAudio.playClick();
      updateAchievementUI();
      els.achievementModal.classList.add('open');
    });

    els.modalClose.addEventListener('click', () => {
      if (window.fanAudio) window.fanAudio.playClick();
      els.achievementModal.classList.remove('open');
    });

    els.achievementModal.addEventListener('click', (e) => {
      if (e.target === els.achievementModal) {
        els.achievementModal.classList.remove('open');
      }
    });

    // Keyboard shortcuts for power users!
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePower();
      } else if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
        speedStep(1);
      } else if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown') {
        speedStep(-1);
      } else if (e.key.toLowerCase() === 'l') {
        toggleLight(true);
      } else if (e.key.toLowerCase() === 'r') {
        const modes = ['warm', 'cool', 'cyber', 'rgb', 'off'];
        const next = modes[(modes.indexOf(currentLedMode) + 1) % modes.length];
        setLedMode(next, true);
      } else if (e.key.toLowerCase() === 'm') {
        els.btnMute.click();
      } else if (e.key >= '0' && e.key <= '4') {
        setSpeedLevel(parseInt(e.key, 10), true);
      }
    });
  }

  // --- App Bootstrap ---
  function init() {
    initElements();
    loadStorage();

    // Instantiate physics engine
    fanPhysics = new window.FanPhysicsEngine({
      bladeGroup: els.bladeGroup,
      shadowGroup: els.shadowGroup,
      windCanvas: els.windCanvas,
      onUpdate: onEngineUpdate
    });

    bindEvents();
    startSecondTimer();
    setLedMode('warm', false);

    // Initial total time display
    if (els.totalTimeDisplay) {
      els.totalTimeDisplay.textContent = formatTime(totalRunningSeconds);
    }

    // Expose controls for testing / debugging
    window.explodeFan = explodeFan;
    window.repairFan = repairFan;

    // Funny quotes timer
    showNextQuote();
    quoteInterval = setInterval(showNextQuote, 9500);

    // Initial UI state
    updateAchievementUI();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
