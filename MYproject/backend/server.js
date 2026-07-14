import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');
const spellsPath = path.join(__dirname, 'data', 'spells.json');
const mathPath = path.join(__dirname, 'data', 'math.json');
const codePath = path.join(__dirname, 'data', 'code.json');

// Helper to read JSON file
const readJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
};

// Helper to write JSON file
const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
};

// Default profile setup for resets
const defaultDb = {
  profile: {
    username: "AstroCoder",
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    skills: {
      vocabulary: { level: 1, xp: 0 },
      math: { level: 1, xp: 0 },
      coding: { level: 1, xp: 0 }
    },
    achievements: [
      { id: "a1", title": "First Cast", description: "Cast your first spell successfully", unlocked: false },
      { id: "a2", title": "Speed Demon", description: "Reach a speed of 100km/h in Math Racer", unlocked: false },
      { id: "a3", title": "Mainframe Hacker", description: "Unlock 5 security nodes in CodeSpeak", unlocked: false }
    ]
  },
  history: []
};

// Ensure db.json exists, if not write default
if (!fs.existsSync(dbPath)) {
  writeJSON(dbPath, defaultDb);
}

// REST Routes

// GET Profile
app.get('/api/profile', (req, res) => {
  const db = readJSON(dbPath);
  if (!db) {
    return res.status(500).json({ error: "Failed to read database" });
  }
  res.json(db);
});

// POST Reset Profile
app.post('/api/profile/reset', (req, res) => {
  if (writeJSON(dbPath, defaultDb)) {
    res.json({ message: "Database reset successful", db: defaultDb });
  } else {
    res.status(500).json({ error: "Failed to reset database" });
  }
});

// GET Spell Questions
app.get('/api/content/spells', (req, res) => {
  const spells = readJSON(spellsPath);
  if (!spells) {
    return res.status(500).json({ error: "Failed to load spelling content" });
  }
  res.json(spells);
});

// GET Math Questions
app.get('/api/content/math', (req, res) => {
  const math = readJSON(mathPath);
  if (!math) {
    return res.status(500).json({ error: "Failed to load math content" });
  }
  res.json(math);
});

// GET Coding Questions
app.get('/api/content/code', (req, res) => {
  const code = readJSON(codePath);
  if (!code) {
    return res.status(500).json({ error: "Failed to load coding content" });
  }
  res.json(code);
});

// POST Save Game Session & Update Progress
app.post('/api/games/complete', (req, res) => {
  const { game, score, xpGained, skillChanged } = req.body;
  
  if (!game || score === undefined || xpGained === undefined || !skillChanged) {
    return res.status(400).json({ error: "Missing required session fields" });
  }

  const db = readJSON(dbPath);
  if (!db) {
    return res.status(500).json({ error: "Failed to load database" });
  }

  // Update history
  const historyEntry = {
    id: `h_${Date.now()}`,
    game,
    score,
    xpGained,
    date: new Date().toISOString()
  };
  db.history.unshift(historyEntry);

  // Update profile overall XP
  let profile = db.profile;
  profile.xp += xpGained;

  // Update specific skill XP
  if (profile.skills[skillChanged]) {
    profile.skills[skillChanged].xp += xpGained;
    // Check skill level up (every 100 XP is a level)
    const skillLevel = Math.floor(profile.skills[skillChanged].xp / 100) + 1;
    if (skillLevel > profile.skills[skillChanged].level) {
      profile.skills[skillChanged].level = skillLevel;
    }
  }

  // Check overall level up (XP threshold grows by 100 per level)
  while (profile.xp >= profile.xpToNextLevel) {
    profile.xp -= profile.xpToNextLevel;
    profile.level += 1;
    profile.xpToNextLevel = profile.level * 100;
  }

  // Dynamic achievement unlock evaluation
  profile.achievements = profile.achievements.map(ach => {
    if (ach.id === 'a1' && game === 'Spellcaster Quest' && score > 0) {
      return { ...ach, unlocked: true };
    }
    if (ach.id === 'a2' && game === 'Cyber Math Racer' && score >= 100) {
      return { ...ach, unlocked: true };
    }
    if (ach.id === 'a3' && game === 'CodeSpeak Terminal' && score >= 5) {
      return { ...ach, unlocked: true };
    }
    return ach;
  });

  // Save changes
  if (writeJSON(dbPath, db)) {
    res.json({ message: "Game progress saved successfully", db });
  } else {
    res.status(500).json({ error: "Failed to write database updates" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server active on port ${PORT}`);
});
