import { renderDashboard, updateDashboardUI } from './dashboard.js';
import { initAudioVisualizer } from './visualizer.js';
import { SpeechManager } from './speech.js';
import { initSpellcaster } from './spellcaster.js';
import { initMathRacer } from './mathracer.js';
import { initCodeSpeak } from './codespeak.js';

// Global state
export const state = {
  profile: null,
  history: [],
  currentView: 'hub',
  micStream: null,
  audioContext: null,
  speechManager: null,
  visualizerActive: false
};

// DOM elements
const welcomePanel = document.getElementById('welcome-panel');
const mainWorkspace = document.getElementById('main-workspace');
const startAppBtn = document.getElementById('start-app-btn');
const usernameInput = document.getElementById('player-username-input');

const navHubBtn = document.getElementById('nav-hub-btn');
const navCalibrateBtn = document.getElementById('nav-calibrate-btn');
const headerUserTag = document.getElementById('header-user-tag');
const headerUsername = document.getElementById('header-username');

const micAuthBtn = document.getElementById('mic-auth-btn');
const micStatusText = document.getElementById('mic-status-text');

// API helpers
export async function fetchProfile() {
  try {
    const response = await fetch('/api/profile');
    const data = await response.json();
    state.profile = data.profile;
    state.history = data.history;
    updateSidebar();
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
}

export async function saveGameComplete(game, score, xpGained, skillChanged) {
  try {
    const response = await fetch('/api/games/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ game, score, xpGained, skillChanged })
    });
    const data = await response.json();
    state.profile = data.db.profile;
    state.history = data.db.history;
    updateSidebar();
    playSystemSound(400, 'triangle', 0.2); // Level/Game save success beep
    setTimeout(() => playSystemSound(600, 'sine', 0.1), 100);
    return data;
  } catch (error) {
    console.error('Error saving game progress:', error);
  }
}

// Side bar UI refresher
export function updateSidebar() {
  if (!state.profile) return;

  // Header tag
  headerUsername.textContent = state.profile.username;
  document.getElementById('profile-username').textContent = state.profile.username;
  
  // Level info
  document.getElementById('profile-level').textContent = state.profile.level;
  document.getElementById('profile-xp-val').textContent = state.profile.xp;
  document.getElementById('profile-xp-total').textContent = state.profile.xpToNextLevel;

  // XP circle calculation
  const dashoffset = 283 - (283 * (state.profile.xp / state.profile.xpToNextLevel));
  document.getElementById('profile-xp-ring').style.strokeDashoffset = dashoffset;

  // Skills
  const skills = state.profile.skills;
  document.getElementById('skill-vocab-level').textContent = `Lvl ${skills.vocabulary.level}`;
  document.getElementById('skill-vocab-bar').style.width = `${Math.min(100, skills.vocabulary.xp % 100)}%`;
  
  document.getElementById('skill-math-level').textContent = `Lvl ${skills.math.level}`;
  document.getElementById('skill-math-bar').style.width = `${Math.min(100, skills.math.xp % 100)}%`;
  
  document.getElementById('skill-code-level').textContent = `Lvl ${skills.coding.level}`;
  document.getElementById('skill-code-bar').style.width = `${Math.min(100, skills.coding.xp % 100)}%`;

  // Achievements rendering
  const achList = document.getElementById('achievements-list');
  achList.innerHTML = '';
  
  state.profile.achievements.forEach(ach => {
    const card = document.createElement('div');
    card.className = `achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div class="achievement-icon">
        ${ach.unlocked ? '🏆' : '🔒'}
      </div>
      <div class="achievement-info">
        <h4>${ach.title}</h4>
        <p>${ach.description}</p>
      </div>
    `;
    achList.appendChild(card);
  });
}

// Web Audio API custom sounds
export function playSystemSound(frequency = 440, type = 'sine', duration = 0.15) {
  try {
    if (!state.audioContext) return;
    const osc = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, state.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.08, state.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, state.audioContext.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(state.audioContext.destination);
    
    osc.start();
    osc.stop(state.audioContext.currentTime + duration);
  } catch (err) {
    console.error('Audio synthesizer error:', err);
  }
}

// Initialize Web Microphone and Visualizer
async function activateMicrophone() {
  try {
    if (state.micStream) {
      // Already running
      return;
    }

    state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Connect audio visualizer canvas
    initAudioVisualizer(state.micStream, state.audioContext);
    
    // Initialize Speech Manager
    if (!state.speechManager) {
      state.speechManager = new SpeechManager();
    }

    micStatusText.textContent = 'CONNECTED';
    micStatusText.style.color = 'var(--accent-green)';
    micAuthBtn.textContent = 'MICROPHONE ACTIVE';
    micAuthBtn.className = 'btn-neon';
    micAuthBtn.disabled = true;

    playSystemSound(600, 'sine', 0.1);
  } catch (error) {
    console.error('Error activating mic:', error);
    micStatusText.textContent = 'PERMISSION DENIED';
    micStatusText.style.color = 'var(--accent-pink)';
    alert('Microphone permission required for voice mechanics.');
  }
}

// Switching View Engine
export function navigateTo(view) {
  state.currentView = view;
  const stage = document.getElementById('game-stage-container');
  stage.innerHTML = ''; // clear current game

  // Play navigation transition audio tone
  playSystemSound(300, 'sine', 0.05);

  if (view === 'hub') {
    renderDashboard(stage);
  } else if (view === 'spellcaster') {
    initSpellcaster(stage);
  } else if (view === 'mathracer') {
    initMathRacer(stage);
  } else if (view === 'codespeak') {
    initCodeSpeak(stage);
  }
}

// Handle initialization button
startAppBtn.addEventListener('click', async () => {
  const chosenName = usernameInput.value.trim() || 'AstroCoder';
  
  // Set custom user name if they changed it
  welcomePanel.style.display = 'none';
  mainWorkspace.style.display = 'grid';
  navHubBtn.style.display = 'inline-flex';
  navCalibrateBtn.style.display = 'inline-flex';
  headerUserTag.style.display = 'flex';

  // Make a quick audio context initialization
  state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Fetch stats from backend
  await fetchProfile();
  
  // Update name if changed
  if (chosenName !== 'AstroCoder') {
    state.profile.username = chosenName;
    updateSidebar();
  }

  // Load hub
  navigateTo('hub');
  
  // Proactively request mic
  activateMicrophone();
});

// Sidebar & header events
navHubBtn.addEventListener('click', () => navigateTo('hub'));
navCalibrateBtn.addEventListener('click', () => {
  // Toggle microphone check / display speech calibration info
  alert('Calibration: Look at your visualizer while speaking. Ensure waves spike above 50% height for optimal recognition.');
});

micAuthBtn.addEventListener('click', activateMicrophone);

// Reset database handler (hidden easter-egg style trigger inside username clicking)
document.getElementById('profile-username').addEventListener('dblclick', async () => {
  if (confirm('Reset all user progress and database?')) {
    const res = await fetch('/api/profile/reset', { method: 'POST' });
    const data = await res.json();
    state.profile = data.db.profile;
    state.history = data.db.history;
    updateSidebar();
    navigateTo('hub');
  }
});
