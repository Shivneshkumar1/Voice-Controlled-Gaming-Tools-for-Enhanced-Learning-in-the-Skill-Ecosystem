import { saveGameComplete, state, playSystemSound } from './main.js';

let mathQuestions = [];
let currentIndex = 0;
let speed = 0;
let distance = 0;
let timeLeft = 45;
let gameTimer = null;
let physicsTimer = null;
let maxSpeedReached = 0;
let targetDistance = 500;
let streak = 0;

export async function initMathRacer(container) {
  // Reset state
  speed = 0;
  distance = 0;
  timeLeft = 45;
  currentIndex = 0;
  maxSpeedReached = 0;
  streak = 0;

  // Clear timers
  if (gameTimer) clearInterval(gameTimer);
  if (physicsTimer) clearInterval(physicsTimer);

  container.innerHTML = `<div class="monospace" style="padding: 40px; text-align: center; color: var(--accent-pink);">SYNCING ARITHMETIC RACER CORE...</div>`;

  try {
    const res = await fetch('/api/content/math');
    mathQuestions = await res.json();
    mathQuestions.sort(() => Math.random() - 0.5);

    renderRacerScreen(container);
    startTimers(container);
  } catch (error) {
    container.innerHTML = `<div class="monospace" style="padding: 40px; text-align: center; color: var(--accent-pink);">ERROR INITIALIZING MATH RACER CONTENT.</div>`;
    console.error(error);
  }
}

function renderRacerScreen(container) {
  const currentMath = mathQuestions[currentIndex % mathQuestions.length];

  container.innerHTML = `
    <!-- Telemetry Header HUD -->
    <div class="game-header">
      <div class="game-title-group">
        <h2>CYBER MATH RACER</h2>
        <p>Goal: Reach ${targetDistance} meters. Speak arithmetic answers to boost velocity.</p>
      </div>
      <div class="score-hud">
        <div class="hud-item">
          <label>Velocity</label>
          <span id="speedometer" style="color: var(--accent-pink);">0 km/h</span>
        </div>
        <div class="hud-item">
          <label>Distance</label>
          <span id="dist-hud">0 / ${targetDistance} m</span>
        </div>
        <div class="hud-item">
          <label>Time Left</label>
          <span id="time-hud" style="color: var(--accent-green);">45s</span>
        </div>
      </div>
    </div>

    <!-- Racer visual track -->
    <div class="racer-track-container">
      <div class="racer-skyline" id="city-sky"></div>
      <div class="racer-road">
        <div class="road-stripe" id="road-stripe"></div>
      </div>
      <div class="player-ship" id="racer-ship">
        🛸
        <div class="ship-thrust"></div>
      </div>
    </div>

    <!-- Arithmetic Telemetry Logic -->
    <div class="telemetry-row">
      <div class="glass-panel speed-meter" style="flex-direction: column; align-items: stretch; justify-content: space-around;">
        <div style="text-align: center;">
          <h4 style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">BOOST STREAK</h4>
          <div id="streak-meter" style="font-family: 'Orbitron'; font-size: 24px; color: var(--accent-cyan); font-weight: 900; text-shadow: 0 0 10px var(--accent-cyan-glow);">x0</div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span>ENGINE HEAT (DECAY SPEED)</span>
            <span id="decay-text">STABLE</span>
          </div>
          <div class="skill-bar-container" style="height: 6px;">
            <div id="speed-indicator-bar" class="skill-bar" style="width: 0%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-pink));"></div>
          </div>
        </div>
      </div>

      <!-- Live Calculations Box -->
      <div class="math-challenge-console">
        <div class="prompt-title">SPEAK SOLUTION IMMEDIATELY</div>
        <div class="math-equation" id="racer-equation">${currentMath.question}</div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Clue: ${currentMath.hint}</p>

        <!-- Voice actions -->
        <div class="speech-status-bar">
          <button id="racer-mic-btn" class="record-btn" style="width: 54px; height: 54px; font-size: 20px;">🎤</button>
          <div class="spoken-feedback" id="racer-feedback-box" style="font-size: 13px; min-height: 20px;">
            <span style="color: var(--text-muted);">Speak solution...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Keyboard backup input -->
    <div class="glass-panel" style="padding: 12px; display: flex; justify-content: center; gap: 8px; align-items: center;">
      <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Keyboard Input:</label>
      <input type="text" id="kb-math-field" placeholder="Answer..." style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 4px; padding: 4px 8px; color: white; outline: none; width: 100px; text-align: center;">
      <button id="kb-math-btn" class="btn-neon pink" style="font-size: 10px; padding: 4px 10px;">Accelerate</button>
    </div>
  `;

  // Register listeners
  const micBtn = document.getElementById('racer-mic-btn');
  const feedbackBox = document.getElementById('racer-feedback-box');
  const kbField = document.getElementById('kb-math-field');
  const kbBtn = document.getElementById('kb-math-btn');

  // Mic triggers
  micBtn.addEventListener('click', () => {
    if (!state.speechManager || !state.speechManager.isSupported()) {
      feedbackBox.innerHTML = `<span style="color: var(--accent-pink);">Mic API unavailable. Use Keyboard fallback.</span>`;
      return;
    }

    if (micBtn.classList.contains('recording')) {
      state.speechManager.stop();
      micBtn.classList.remove('recording');
    } else {
      micBtn.classList.add('recording');
      feedbackBox.innerHTML = `<span class="listening">Listening...</span>`;

      state.speechManager.start(
        // Result callback
        (result) => {
          feedbackBox.innerHTML = `Spoken: <strong style="color: var(--text-bright)">"${result.text}"</strong>`;
          
          const spokenText = result.text.toLowerCase().trim();
          
          // Verify against expected values
          const matched = currentMath.alternativeAnswers.some(ans => spokenText.includes(ans.toLowerCase()));
          
          if (matched) {
            state.speechManager.stop();
            micBtn.classList.remove('recording');
            triggerAcceleration(container, currentMath.speedBoost);
          } else if (result.isFinal) {
            // Bad guess, play buzz
            playSystemSound(160, 'sawtooth', 0.15);
            feedbackBox.innerHTML = `<span class="incorrect">Wrong! Try again.</span>`;
          }
        },
        // Error callback
        (err) => {
          micBtn.classList.remove('recording');
          feedbackBox.innerHTML = `<span style="color: var(--accent-pink);">Mic error: ${err}</span>`;
        },
        // End callback
        () => {
          micBtn.classList.remove('recording');
        }
      );
    }
  });

  // Keyboard controls
  kbBtn.addEventListener('click', () => {
    const txt = kbField.value.trim();
    const matched = currentMath.alternativeAnswers.some(ans => txt === ans);
    if (matched) {
      triggerAcceleration(container, currentMath.speedBoost);
    } else {
      playSystemSound(160, 'sawtooth', 0.15);
      feedbackBox.innerHTML = `<span class="incorrect">Incorrect!</span>`;
    }
  });

  kbField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') kbBtn.click();
  });
}

function triggerAcceleration(container, boost) {
  // Accelerator SFX: rising pitch sweep
  playSystemSound(250, 'sine', 0.08);
  setTimeout(() => playSystemSound(350, 'sine', 0.08), 50);
  setTimeout(() => playSystemSound(500, 'triangle', 0.1), 100);

  // Speed math updates
  speed = Math.min(120, speed + boost);
  streak += 1;
  currentIndex += 1;

  if (speed > maxSpeedReached) {
    maxSpeedReached = speed;
  }

  // Trigger ship animation
  const ship = document.getElementById('racer-ship');
  if (ship) {
    ship.classList.add('boosting');
    setTimeout(() => ship.classList.remove('boosting'), 400);
  }

  // Flash UI update
  renderRacerScreen(container);
}

function startTimers(container) {
  // Game countdown timer (once per second)
  gameTimer = setInterval(() => {
    timeLeft -= 1;
    
    // Check game finish conditions
    if (timeLeft <= 0 || distance >= targetDistance) {
      endRacerGame(container);
      return;
    }

    const timeHud = document.getElementById('time-hud');
    if (timeHud) {
      timeHud.textContent = `${timeLeft}s`;
      if (timeLeft < 10) timeHud.style.color = 'var(--accent-pink)';
    }
  }, 1000);

  // Physics animation timer (runs every 100ms)
  physicsTimer = setInterval(() => {
    if (speed > 0) {
      // Distance grows proportional to speed
      distance += (speed * 0.1); 
      
      // Speed decays naturally
      speed = Math.max(0, speed - 1.5);
    }

    // Refresh telemetry displays
    const speedHud = document.getElementById('speedometer');
    const distHud = document.getElementById('dist-hud');
    const speedBar = document.getElementById('speed-indicator-bar');
    const road = document.getElementById('road-stripe');
    const skyline = document.getElementById('city-sky');

    if (speedHud) speedHud.textContent = `${Math.round(speed)} km/h`;
    if (distHud) distHud.textContent = `${Math.round(distance)} / ${targetDistance} m`;
    if (speedBar) speedBar.style.width = `${(speed / 120) * 100}%`;
    
    // Modify road animation duration based on speed
    if (road && skyline) {
      if (speed > 0) {
        road.style.animationPlayState = 'running';
        skyline.style.animationPlayState = 'running';
        const roadSpeed = (120 - speed) / 45; // lower value = faster scroll
        road.style.animationDuration = `${Math.max(0.1, roadSpeed)}s`;
        skyline.style.animationDuration = `${Math.max(1, roadSpeed * 6)}s`;
      } else {
        road.style.animationPlayState = 'paused';
        skyline.style.animationPlayState = 'paused';
      }
    }
  }, 100);
}

async function endRacerGame(container) {
  clearInterval(gameTimer);
  clearInterval(physicsTimer);
  
  if (state.speechManager) {
    state.speechManager.stop();
  }

  const isWin = distance >= targetDistance;
  const xpReward = Math.round(distance / 5);

  // Send completed results to backend
  await saveGameComplete('Cyber Math Racer', Math.round(distance), xpReward, 'math');

  container.innerHTML = `
    <div class="game-over-panel ${isWin ? 'victory' : 'defeat'}">
      <h2>${isWin ? 'TARGET REACHED!' : 'TIME DECAY FAILURE'}</h2>
      <p style="font-size: 14px; max-width: 500px; color: var(--text-main); line-height: 1.6;">
        ${isWin 
          ? `Spectacular! You powered the hyper-thrusters using verbal calculations and drove the light-ship to safety.` 
          : `The circuit energy expired. You traveled ${Math.round(distance)} meters out of the ${targetDistance}m goal. Train your mental math accuracy to keep speeds high.`}
      </p>

      <div class="summary-stats">
        <div class="stat-item">
          <label>Max Speed</label>
          <span>${Math.round(maxSpeedReached)} km/h</span>
        </div>
        <div class="stat-item" style="border-left: 1px solid rgba(255,255,255,0.08); padding-left: 24px;">
          <label>Distance Covered</label>
          <span>${Math.round(distance)} meters</span>
        </div>
        <div class="stat-item" style="border-left: 1px solid rgba(255,255,255,0.08); padding-left: 24px;">
          <label>XP Earned</label>
          <span style="color: var(--accent-green);">+${xpReward} XP</span>
        </div>
      </div>

      <div style="display: flex; gap: 16px;">
        <button id="racer-replay-btn" class="btn-neon">Race Again</button>
        <button id="racer-hub-btn" class="btn-neon purple">Return to Hub</button>
      </div>
    </div>
  `;

  document.getElementById('racer-replay-btn').addEventListener('click', () => initMathRacer(container));
  document.getElementById('racer-hub-btn').addEventListener('click', () => navigateTo('hub'));
}
