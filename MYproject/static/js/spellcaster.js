import { saveGameComplete, state, playSystemSound } from './main.js';

let questions = [];
let currentIndex = 0;
let playerHealth = 100;
let enemyHealth = 100;
let currentScore = 0;
let attemptsLeft = 2;

const enemyPool = [
  { name: "Void Gorgon", emoji: "🦖", hp: 80 },
  { name: "Neon Chimera", emoji: "🦁", hp: 90 },
  { name: "Data Wyrm", emoji: "🐉", hp: 100 },
  { name: "Cyber Minotaur", emoji: "🐂", hp: 120 }
];

let activeEnemy = null;
let combatLogs = [];

export async function initSpellcaster(container) {
  // Reset game states
  playerHealth = 100;
  enemyHealth = 100;
  currentScore = 0;
  currentIndex = 0;
  attemptsLeft = 2;
  combatLogs = ["The battle begins! Speak spelling spells to attack."];
  
  // Pick random enemy
  activeEnemy = { ...enemyPool[Math.floor(Math.random() * enemyPool.length)] };
  enemyHealth = activeEnemy.hp;

  // Show loading
  container.innerHTML = `<div class="monospace" style="padding: 40px; text-align: center; color: var(--accent-cyan);">SYNCING VOCAB SPELL DATA...</div>`;

  try {
    const res = await fetch('/api/content/spells');
    questions = await res.json();
    
    // Shuffle questions
    questions.sort(() => Math.random() - 0.5);

    renderBattleStage(container);
  } catch (error) {
    container.innerHTML = `<div class="monospace" style="padding: 40px; text-align: center; color: var(--accent-pink);">ERROR INITIALIZING SPELLS DATA.</div>`;
    console.error(error);
  }
}

function renderBattleStage(container) {
  if (playerHealth <= 0) {
    endGame(container, false);
    return;
  }
  if (enemyHealth <= 0) {
    endGame(container, true);
    return;
  }

  const currentSpell = questions[currentIndex % questions.length];

  container.innerHTML = `
    <!-- HUD Header -->
    <div class="game-header">
      <div class="game-title-group">
        <h2>SPELLCASTER QUEST</h2>
        <p>Target: Correctly pronounce vocabulary words to cast elemental spells.</p>
      </div>
      <div class="score-hud">
        <div class="hud-item">
          <label>XP Earned</label>
          <span id="game-score-val">${currentScore}</span>
        </div>
      </div>
    </div>

    <!-- Battlefield Area -->
    <div class="battlefield">
      <!-- Player Panel -->
      <div class="combatant-panel player" id="player-combat-panel">
        <div class="avatar-container">
          <div class="character-sprite" id="player-sprite">🧙‍♂️</div>
        </div>
        <div class="health-bar-wrapper">
          <div class="health-values">
            <span>PLAYER</span>
            <span>${playerHealth} / 100 HP</span>
          </div>
          <div class="health-outer">
            <div class="health-inner" style="width: ${playerHealth}%"></div>
          </div>
        </div>
      </div>

      <!-- Enemy Panel -->
      <div class="combatant-panel enemy" id="enemy-combat-panel">
        <div class="avatar-container">
          <div class="character-sprite" id="enemy-sprite">${activeEnemy.emoji}</div>
        </div>
        <div class="health-bar-wrapper">
          <div class="health-values">
            <span>${activeEnemy.name.toUpperCase()}</span>
            <span>${enemyHealth} / ${activeEnemy.hp} HP</span>
          </div>
          <div class="health-outer">
            <div class="health-inner" style="width: ${(enemyHealth / activeEnemy.hp) * 100}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Spell Cast Console -->
    <div class="spell-panel">
      <div class="challenge-card">
        <div class="prompt-title">Target Spell Phrase (${currentSpell.difficulty})</div>
        <div class="spell-target-word">${currentSpell.word}</div>
        <div class="phonetic-guide">Pronunciation: [ ${currentSpell.phonetic} ]</div>
        <div class="vocab-hint"><strong>Definition Clue:</strong> ${currentSpell.hint}</div>
      </div>

      <!-- Spoken speech recognition inputs -->
      <div class="speech-status-bar">
        <button id="spellcast-record-btn" class="record-btn">🎤</button>
        <div class="spoken-feedback" id="spellcast-feedback-box">
          <span style="color: var(--text-muted);">Press mic and speak the word aloud...</span>
        </div>
      </div>

      <!-- Keyboard override for accessibility and grading -->
      <div style="margin-top: 10px; width: 100%; display: flex; gap: 8px; align-items: center; justify-content: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
        <label style="font-size: 11px; color: var(--text-muted);">KEYBOARD FALLBACK:</label>
        <input type="text" id="keyboard-spell-field" placeholder="Type spell word..." style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 4px; padding: 4px 8px; color: white; outline: none; font-size: 12px; width: 150px;">
        <button id="keyboard-spell-btn" class="btn-neon" style="font-size: 10px; padding: 4px 10px;">Cast</button>
      </div>
    </div>

    <!-- Combat Logs -->
    <div class="combat-log" id="spell-combat-log" style="margin-top: 20px;">
      ${combatLogs.map(log => `<div class="log-entry">${log}</div>`).join('')}
    </div>
  `;

  // Bind actions
  const recordBtn = document.getElementById('spellcast-record-btn');
  const feedbackBox = document.getElementById('spellcast-feedback-box');
  const kbField = document.getElementById('keyboard-spell-field');
  const kbBtn = document.getElementById('keyboard-spell-btn');

  // Trigger elements for visual hits
  const playerSprite = document.getElementById('player-sprite');
  const enemySprite = document.getElementById('enemy-sprite');

  // Speech binding
  recordBtn.addEventListener('click', () => {
    if (!state.speechManager || !state.speechManager.isSupported()) {
      feedbackBox.innerHTML = `<span style="color: var(--accent-pink);">Voice recognition unsupported. Use Keyboard fallback.</span>`;
      return;
    }

    if (recordBtn.classList.contains('recording')) {
      state.speechManager.stop();
      recordBtn.classList.remove('recording');
      feedbackBox.innerHTML = `<span style="color: var(--text-muted);">Listening paused.</span>`;
    } else {
      recordBtn.classList.add('recording');
      feedbackBox.innerHTML = `<span class="listening">Listening...</span>`;
      
      state.speechManager.start(
        // Result callback
        (result) => {
          feedbackBox.innerHTML = `Spoken: <strong style="color: var(--text-bright)">"${result.text}"</strong>`;
          
          // Match checking
          const cleanInput = result.text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
          const cleanTarget = currentSpell.word.toLowerCase().trim();
          
          if (cleanInput.includes(cleanTarget) || cleanTarget.includes(cleanInput)) {
            // Success spell hit!
            state.speechManager.stop();
            recordBtn.classList.remove('recording');
            handleSpellSuccess(container, currentSpell, playerSprite, enemySprite);
          } else if (result.isFinal) {
            // Spell failed or word mismatch
            attemptsLeft -= 1;
            if (attemptsLeft <= 0) {
              state.speechManager.stop();
              recordBtn.classList.remove('recording');
              handleSpellFailure(container, currentSpell, playerSprite, enemySprite);
            } else {
              playSystemSound(200, 'sawtooth', 0.2); // bad buzz
              feedbackBox.innerHTML = `<span class="incorrect">Mismatch. ${attemptsLeft} attempts remaining!</span>`;
            }
          }
        },
        // Error callback
        (err) => {
          recordBtn.classList.remove('recording');
          feedbackBox.innerHTML = `<span style="color: var(--accent-pink);">Mic error: ${err}</span>`;
        },
        // End callback
        () => {
          recordBtn.classList.remove('recording');
        }
      );
    }
  });

  // Keyboard binding
  kbBtn.addEventListener('click', () => {
    const text = kbField.value.trim().toLowerCase();
    const cleanTarget = currentSpell.word.toLowerCase();
    
    if (text === cleanTarget) {
      handleSpellSuccess(container, currentSpell, playerSprite, enemySprite);
    } else {
      attemptsLeft -= 1;
      if (attemptsLeft <= 0) {
        handleSpellFailure(container, currentSpell, playerSprite, enemySprite);
      } else {
        playSystemSound(200, 'sawtooth', 0.2);
        feedbackBox.innerHTML = `<span class="incorrect">Keyboard Mismatch! ${attemptsLeft} attempts remaining!</span>`;
      }
    }
  });

  kbField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') kbBtn.click();
  });
}

function handleSpellSuccess(container, spell, playerSprite, enemySprite) {
  // Synthesize custom magical sound: high pitch slide
  playSystemSound(300, 'sine', 0.1);
  setTimeout(() => playSystemSound(500, 'triangle', 0.15), 80);
  setTimeout(() => playSystemSound(800, 'sine', 0.2), 160);

  // Attack animations
  playerSprite.classList.add('attacking');
  setTimeout(() => playerSprite.classList.remove('attacking'), 300);

  setTimeout(() => {
    enemySprite.classList.add('hit');
    setTimeout(() => enemySprite.classList.remove('hit'), 400);

    enemyHealth = Math.max(0, enemyHealth - spell.damage);
    currentScore += spell.damage;
    
    const elementEmoji = { fire: "🔥", ice: "❄️", thunder: "⚡", heal: "💚" }[spell.spellType] || "✨";
    
    combatLogs.unshift(`<span class="log-entry player-action">You cast ${spell.spellType.toUpperCase()} Spell [${spell.word}] ${elementEmoji}! Dealt ${spell.damage} DMG.</span>`);
    
    attemptsLeft = 2; // reset attempts
    currentIndex++;
    
    setTimeout(() => renderBattleStage(container), 800);
  }, 300);
}

function handleSpellFailure(container, spell, playerSprite, enemySprite) {
  // Play error feedback sound
  playSystemSound(120, 'sawtooth', 0.4);
  
  // Enemy attack animation
  enemySprite.classList.add('attacking');
  setTimeout(() => enemySprite.classList.remove('attacking'), 300);

  setTimeout(() => {
    playerSprite.classList.add('hit');
    setTimeout(() => playerSprite.classList.remove('hit'), 400);

    playerHealth = Math.max(0, playerHealth - 25);
    combatLogs.unshift(`<span class="log-entry enemy-action">${activeEnemy.name} channels Void Pulse! Dealt 25 DMG to Player.</span>`);
    
    attemptsLeft = 2; // reset
    currentIndex++;
    
    setTimeout(() => renderBattleStage(container), 800);
  }, 300);
}

async function endGame(container, isVictory) {
  // Stop recording if active
  if (state.speechManager) {
    state.speechManager.stop();
  }

  // Calculate final XP
  const xpGained = isVictory ? (25 + currentScore) : 10;
  
  // Call backend save complete API
  await saveGameComplete('Spellcaster Quest', currentScore, xpGained, 'vocabulary');

  container.innerHTML = `
    <div class="game-over-panel ${isVictory ? 'victory' : 'defeat'}">
      <h2>${isVictory ? 'VICTORY ACHIEVED' : 'SYSTEM DEFEAT'}</h2>
      <p style="font-size: 14px; max-width: 500px; color: var(--text-main); line-height: 1.6;">
        ${isVictory 
          ? `You have successfully slain the ${activeEnemy.name} using powerful spelling spells and elements.` 
          : `The ${activeEnemy.name} has depleted your health. Calibrate your spells and vocabulary keywords to strike again.`}
      </p>

      <div class="summary-stats">
        <div class="stat-item">
          <label>Final Score</label>
          <span>${currentScore}</span>
        </div>
        <div class="stat-item" style="border-left: 1px solid rgba(255,255,255,0.08); padding-left: 24px;">
          <label>XP Rewarded</label>
          <span style="color: var(--accent-green);">+${xpGained} XP</span>
        </div>
      </div>

      <div style="display: flex; gap: 16px;">
        <button id="spellcast-replay-btn" class="btn-neon">Train Again</button>
        <button id="spellcast-hub-btn" class="btn-neon purple">Return to Hub</button>
      </div>
    </div>
  `;

  document.getElementById('spellcast-replay-btn').addEventListener('click', () => initSpellcaster(container));
  document.getElementById('spellcast-hub-btn').addEventListener('click', () => navigateTo('hub'));
}
