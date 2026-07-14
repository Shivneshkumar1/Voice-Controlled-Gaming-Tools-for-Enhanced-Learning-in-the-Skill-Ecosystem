import { saveGameComplete, state, playSystemSound } from './main.js';

let puzzles = [];
let currentIndex = 0;
let decryptedCount = 0;
let attemptsLeft = 3;
let terminalLogs = [];

export async function initCodeSpeak(container) {
  currentIndex = 0;
  decryptedCount = 0;
  attemptsLeft = 3;
  terminalLogs = [
    "SECURITY STATUS: CRITICAL - MAINFRAME LOCKDOWN",
    "INITIALIZING SPEECH CORRELATION TERMINAL DECRYPTOR...",
    "WARNING: SPEAK EXACT COMMAND PHRASES TO BYPASS PORTS.",
    "---------------------------------------------------"
  ];

  container.innerHTML = `<div class="monospace" style="padding: 40px; text-align: center; color: var(--accent-green);">BOOTING SYNTAX CRACKER MAINFRAME...</div>`;

  try {
    const res = await fetch('/api/content/code');
    puzzles = await res.json();
    puzzles.sort(() => Math.random() - 0.5);

    renderTerminal(container);
  } catch (error) {
    container.innerHTML = `<div class="monospace" style="padding: 40px; text-align: center; color: var(--accent-pink);">ERROR UNABLE TO SYNC SECURITY NODES.</div>`;
    console.error(error);
  }
}

function highlightCode(code) {
  // Simple syntax highlighter
  return code
    .replace(/(const|let|var|function|return|if|export|default)/g, '<span class="code-keyword">$1</span>')
    .replace(/(\w+)(?=\()/g, '<span class="code-variable">$1</span>')
    .replace(/(["'].*?["'])/g, '<span class="code-string">$1</span>')
    .replace(/(\/\/.*)/g, '<span class="code-comment">$1</span>');
}

function renderTerminal(container) {
  if (decryptedCount >= 5) {
    endHackingGame(container, true);
    return;
  }
  if (attemptsLeft <= 0) {
    endHackingGame(container, false);
    return;
  }

  const currentPuzzle = puzzles[currentIndex % puzzles.length];

  container.innerHTML = `
    <!-- Terminal Title Header -->
    <div class="game-header">
      <div class="game-title-group">
        <h2>CODESPEAK TERMINAL</h2>
        <p>Target: Inject script commands. Speak coding instruction phrases to crack server gates.</p>
      </div>
      <div class="score-hud">
        <div class="hud-item">
          <label>PORT GATES SECURED</label>
          <span style="color: var(--accent-green);">${decryptedCount} / 5</span>
        </div>
        <div class="hud-item">
          <label>FAILSAFE LIMIT</label>
          <span style="color: var(--accent-pink);">${attemptsLeft} FAILS LEFT</span>
        </div>
      </div>
    </div>

    <!-- Hacking Terminal UI Console -->
    <div class="terminal-outer">
      <div class="terminal-header">
        <div class="terminal-dots">
          <div class="tdot"></div>
          <div class="tdot yellow"></div>
          <div class="tdot green"></div>
        </div>
        <div>GATEWAY_NODE_PORT_500${currentIndex + 1}</div>
        <div>SYS_STATUS: ACTIVE</div>
      </div>

      <div class="terminal-body" id="term-logs-box">
        <!-- Log Scroll Stream -->
        <div class="term-log">
          ${terminalLogs.map(log => `<div class="term-entry">&gt; ${log}</div>`).join('')}
        </div>

        <!-- Target Snippet Panel -->
        <div class="code-container">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">REQUIRED SCRIPT INJECTION:</div>
          <pre><code>${highlightCode(currentPuzzle.codeSnippet)}</code></pre>
        </div>

        <!-- Decryption Instruction Clue -->
        <div style="background: rgba(57, 255, 20, 0.04); border: 1px dashed rgba(57, 255, 20, 0.15); padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: var(--accent-green); text-transform: uppercase; margin-bottom: 4px;">DECRYPTION VERBAL COMPASS:</div>
          <p style="font-size: 13px; color: #a4b9c8;">${currentPuzzle.prompt}</p>
          <p style="font-size: 12px; color: var(--accent-green); font-style: italic; margin-top: 8px;">Target Command: "${currentPuzzle.spokenCommand}"</p>
        </div>
      </div>

      <!-- Controls and speech recognition logs -->
      <div style="padding: 16px; background: #080a0f; border-top: 1px solid rgba(57, 255, 20, 0.1);">
        <div class="terminal-input-row">
          <button id="terminal-mic-btn" class="record-btn" style="width: 48px; height: 48px; font-size: 18px; border-color: var(--accent-green); color: var(--accent-green);">🎤</button>
          
          <div style="flex: 1;">
            <div class="speak-indicator" id="term-status-prompt">
              <div class="pulse-dot"></div>
              <span>READY FOR COMMAND VOICESTEP...</span>
            </div>
            <div id="term-speech-transcript" style="font-size: 13px; color: var(--text-muted); margin-top: 4px; font-style: italic;">
              Speak script target line...
            </div>
          </div>
        </div>

        <!-- Keyboard input bypass -->
        <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center; justify-content: center; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 8px;">
          <span style="color: var(--text-muted);">KEYBOARD BYPASS:</span>
          <input type="text" id="kb-code-field" placeholder="Type prompt exactly..." style="background: rgba(255,255,255,0.03); border: 1px solid rgba(57,255,20,0.2); border-radius: 4px; padding: 4px 8px; color: var(--accent-green); outline: none; width: 250px; font-family: monospace;">
          <button id="kb-code-btn" class="btn-neon" style="font-size: 10px; padding: 4px 10px; border-color: var(--accent-green); color: var(--accent-green);">Hack</button>
        </div>
      </div>
    </div>
  `;

  // Bind actions
  const micBtn = document.getElementById('terminal-mic-btn');
  const transcriptBox = document.getElementById('term-speech-transcript');
  const statusPrompt = document.getElementById('term-status-prompt');
  const kbField = document.getElementById('kb-code-field');
  const kbBtn = document.getElementById('kb-code-btn');
  const logsBox = document.getElementById('term-logs-box');

  // Scroll logs to bottom
  logsBox.scrollTop = logsBox.scrollHeight;

  // Mic click handler
  micBtn.addEventListener('click', () => {
    if (!state.speechManager || !state.speechManager.isSupported()) {
      transcriptBox.innerHTML = `<span style="color: var(--accent-pink);">Mic SpeechRecognition unavailable in this runner/browser. Use Keyboard.</span>`;
      return;
    }

    if (micBtn.classList.contains('recording')) {
      state.speechManager.stop();
      micBtn.classList.remove('recording');
    } else {
      micBtn.classList.add('recording');
      transcriptBox.textContent = 'Capture active. Dictate line now...';
      statusPrompt.innerHTML = `<div class="pulse-dot" style="background: var(--accent-pink); box-shadow: 0 0 8px var(--accent-pink)"></div><span style="color: var(--accent-pink);">LISTENING COMMAND MODULE...</span>`;

      state.speechManager.start(
        // Result callback
        (result) => {
          transcriptBox.innerHTML = `Spoken: <strong style="color: var(--accent-green)">"${result.text}"</strong>`;
          
          const spokenText = result.text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
          
          // Verify
          const matched = currentPuzzle.alternativeAnswers.some(ans => spokenText.includes(ans.toLowerCase()));

          if (matched) {
            state.speechManager.stop();
            micBtn.classList.remove('recording');
            handleDecryptionSuccess(container, currentPuzzle);
          } else if (result.isFinal) {
            state.speechManager.stop();
            micBtn.classList.remove('recording');
            handleDecryptionFailure(container, currentPuzzle);
          }
        },
        // Error callback
        (err) => {
          micBtn.classList.remove('recording');
          transcriptBox.innerHTML = `<span style="color: var(--accent-pink);">Recognition Error: ${err}</span>`;
        },
        // End callback
        () => {
          micBtn.classList.remove('recording');
          statusPrompt.innerHTML = `<div class="pulse-dot"></div><span>READY FOR COMMAND VOICESTEP...</span>`;
        }
      );
    }
  });

  // Keyboard hack handler
  kbBtn.addEventListener('click', () => {
    const text = kbField.value.trim().toLowerCase();
    const matched = currentPuzzle.alternativeAnswers.some(ans => text === ans.toLowerCase()) || text === currentPuzzle.spokenCommand.toLowerCase();
    
    if (matched) {
      handleDecryptionSuccess(container, currentPuzzle);
    } else {
      handleDecryptionFailure(container, currentPuzzle);
    }
  });

  kbField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') kbBtn.click();
  });
}

function handleDecryptionSuccess(container, puzzle) {
  // Beep sound
  playSystemSound(600, 'sine', 0.08);
  setTimeout(() => playSystemSound(900, 'sine', 0.12), 60);

  decryptedCount += 1;
  currentIndex += 1;
  terminalLogs.push(`[INJECTION MATCHED] Decrypting: ${puzzle.codeSnippet}`);
  terminalLogs.push(`[GATEWAY STABILITY: SECURED] Port ${currentIndex} bypassed!`);
  terminalLogs.push("---------------------------------------------------");

  renderTerminal(container);
}

function handleDecryptionFailure(container, puzzle) {
  // Buzz sound
  playSystemSound(180, 'triangle', 0.35);

  attemptsLeft -= 1;
  terminalLogs.push(`[VOICE CHECKSUM ERROR] Decrypted signature mismatch!`);
  terminalLogs.push(`[GATEWAY SECURITY WARN] Port lockout triggers in ${attemptsLeft} attempts.`);
  terminalLogs.push("---------------------------------------------------");

  renderTerminal(container);
}

async function endHackingGame(container, isVictory) {
  if (state.speechManager) {
    state.speechManager.stop();
  }

  // Siren alert / victory beeps
  if (!isVictory) {
    // Alarm sound
    playSystemSound(100, 'sawtooth', 0.5);
    setTimeout(() => playSystemSound(120, 'sawtooth', 0.5), 250);
  } else {
    // Win music sweep
    playSystemSound(400, 'triangle', 0.1);
    setTimeout(() => playSystemSound(600, 'triangle', 0.1), 100);
    setTimeout(() => playSystemSound(800, 'triangle', 0.15), 200);
  }

  const xpReward = isVictory ? 60 : 15;

  await saveGameComplete('CodeSpeak Terminal', decryptedCount, xpReward, 'coding');

  container.innerHTML = `
    <div class="game-over-panel ${isVictory ? 'victory' : 'defeat'}">
      <h2>${isVictory ? 'MAINFRAME HACK SUCCESSFUL' : 'INTRUDER DETECTED - LOCKED OUT'}</h2>
      <p style="font-size: 14px; max-width: 500px; color: var(--text-main); line-height: 1.6;">
        ${isVictory 
          ? `Spectacular script execution! You have successfully decrypted all 5 gateway firewall nodes and bypassed the database shield.` 
          : `Mainframe security has locked you out. You were only able to decode ${decryptedCount} nodes before the intrusion alert triggered.`}
      </p>

      <div class="summary-stats">
        <div class="stat-item">
          <label>Ports Bypassed</label>
          <span>${decryptedCount} / 5</span>
        </div>
        <div class="stat-item" style="border-left: 1px solid rgba(255,255,255,0.08); padding-left: 24px;">
          <label>Hacking XP Gained</label>
          <span style="color: var(--accent-green);">+${xpReward} XP</span>
        </div>
      </div>

      <div style="display: flex; gap: 16px;">
        <button id="hack-replay-btn" class="btn-neon">Hack Mainframe</button>
        <button id="hack-hub-btn" class="btn-neon purple">Return to Hub</button>
      </div>
    </div>
  `;

  document.getElementById('hack-replay-btn').addEventListener('click', () => initCodeSpeak(container));
  document.getElementById('hack-hub-btn').addEventListener('click', () => navigateTo('hub'));
}
