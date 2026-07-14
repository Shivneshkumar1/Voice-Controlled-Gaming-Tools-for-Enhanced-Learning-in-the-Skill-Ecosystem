import { navigateTo, state } from './main.js';

export function renderDashboard(container) {
  // Render structure
  container.innerHTML = `
    <div class="game-header">
      <div class="game-title-group">
        <h2>NEXUS CORE</h2>
        <p>Select an arena to train your voice-command cognitive skills.</p>
      </div>
    </div>

    <!-- Games Hub Cards Grid -->
    <div class="games-hub">
      
      <!-- Card 1: Spellcaster -->
      <div class="glass-panel game-card" id="card-spellcaster" 
           style="--card-border-color: var(--accent-cyan); --card-glow-color: var(--accent-cyan-glow); --diff-bg: rgba(0,242,254,0.08); --diff-color: var(--accent-cyan); --diff-border: rgba(0,242,254,0.15)">
        <div class="game-card-icon">🔮</div>
        <div class="game-card-info">
          <h3>Spellcaster Battle</h3>
          <p>Pronounce vocabulary and spelling terms correctly to channel elemental energy and defeat mythical beasts.</p>
        </div>
        <div class="game-card-meta">
          <span class="difficulty">Vocabulary</span>
          <span style="font-size: 12px; color: var(--accent-cyan); font-weight: bold;">ENTER ARENA &rarr;</span>
        </div>
      </div>

      <!-- Card 2: Math Racer -->
      <div class="glass-panel game-card" id="card-mathracer"
           style="--card-border-color: var(--accent-pink); --card-glow-color: var(--accent-pink-glow); --diff-bg: rgba(255,0,127,0.08); --diff-color: var(--accent-pink); --diff-border: rgba(255,0,127,0.15)">
        <div class="game-card-icon">⚡</div>
        <div class="game-card-info">
          <h3>Cyber Math Racer</h3>
          <p>Solve arithmetic puzzles aloud. Speed calculations steer and boost your hover-vehicle along a light-cycle track.</p>
        </div>
        <div class="game-card-meta">
          <span class="difficulty" style="background: rgba(255,0,127,0.05); color: var(--accent-pink); border-color: rgba(255,0,127,0.15)">Arithmetic</span>
          <span style="font-size: 12px; color: var(--accent-pink); font-weight: bold;">ENTER ARENA &rarr;</span>
        </div>
      </div>

      <!-- Card 3: CodeSpeak -->
      <div class="glass-panel game-card" id="card-codespeak"
           style="--card-border-color: var(--accent-purple); --card-glow-color: var(--accent-purple-glow); --diff-bg: rgba(157,78,221,0.08); --diff-color: #d896ff; --diff-border: rgba(157,78,221,0.15)">
        <div class="game-card-icon">⌨️</div>
        <div class="game-card-info">
          <h3>CodeSpeak Terminal</h3>
          <p>Speak code statements, tags, and parameters aloud to hack network ports and unlock high-security database nodes.</p>
        </div>
        <div class="game-card-meta">
          <span class="difficulty" style="background: rgba(157,78,221,0.05); color: #d896ff; border-color: rgba(157,78,221,0.15)">Syntax</span>
          <span style="font-size: 12px; color: var(--accent-purple); font-weight: bold;">ENTER ARENA &rarr;</span>
        </div>
      </div>

    </div>

    <!-- History Panel -->
    <div class="glass-panel" style="margin-top: 32px; padding: 20px;">
      <h3 style="font-size: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        <span>📊</span> Training Logs
      </h3>
      
      <div id="dashboard-history-list" style="max-height: 200px; overflow-y: auto;">
        <!-- Filled dynamically -->
      </div>
    </div>
  `;

  // Bind clicks
  document.getElementById('card-spellcaster').addEventListener('click', () => navigateTo('spellcaster'));
  document.getElementById('card-mathracer').addEventListener('click', () => navigateTo('mathracer'));
  document.getElementById('card-codespeak').addEventListener('click', () => navigateTo('codespeak'));

  // Render history list
  renderHistory();
}

function renderHistory() {
  const historyList = document.getElementById('dashboard-history-list');
  if (!historyList) return;

  if (state.history.length === 0) {
    historyList.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px;">No training logs found. Select an arena above to start training.</p>`;
    return;
  }

  let tableHtml = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-muted);">
          <th style="padding: 10px 0;">Date</th>
          <th>Training Arena</th>
          <th>Score</th>
          <th>XP Gained</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.history.forEach(entry => {
    const date = new Date(entry.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    tableHtml += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); height: 40px;">
        <td style="color: var(--text-muted);">${date}</td>
        <td style="font-weight: 600; color: var(--text-bright);">${entry.game}</td>
        <td style="color: var(--accent-cyan); font-family: 'Orbitron';">${entry.score}</td>
        <td style="color: var(--accent-green); font-family: 'Orbitron';">+${entry.xpGained} XP</td>
      </tr>
    `;
  });

  tableHtml += `</tbody></table>`;
  historyList.innerHTML = tableHtml;
}

// Sidebar updates handled inside main.js
export function updateDashboardUI() {
  const historyList = document.getElementById('dashboard-history-list');
  if (historyList) {
    renderHistory();
  }
}
