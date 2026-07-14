from flask import Flask, jsonify, request, send_from_directory
import json
import os
import time

app = Flask(__name__, static_folder='static', static_url_path='')

DB_PATH = 'db.json'
SPELLS_PATH = os.path.join('data', 'spells.json')
MATH_PATH = os.path.join('data', 'math.json')
CODE_PATH = os.path.join('data', 'code.json')

DEFAULT_DB = {
    "profile": {
        "username": "AstroCoder",
        "level": 1,
        "xp": 0,
        "xpToNextLevel": 100,
        "skills": {
            "vocabulary": {"level": 1, "xp": 0},
            "math": {"level": 1, "xp": 0},
            "coding": {"level": 1, "xp": 0}
        },
        "achievements": [
            {"id": "a1", "title": "First Cast", "description": "Cast your first spell successfully", "unlocked": False},
            {"id": "a2", "title": "Speed Demon", "description": "Reach a speed of 100km/h in Math Racer", "unlocked": False},
            {"id": "a3", "title": "Mainframe Hacker", "description": "Unlock 5 security nodes in CodeSpeak", "unlocked": False}
        ]
    },
    "history": []
}

def read_db():
    if not os.path.exists(DB_PATH):
        write_db(DEFAULT_DB)
        return DEFAULT_DB
    try:
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading DB: {e}")
        return DEFAULT_DB

def write_db(data):
    try:
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing DB: {e}")
        return False

# Route to serve the main HTML file
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# API Endpoints
@app.route('/api/profile', methods=['GET'])
def get_profile():
    return jsonify(read_db())

@app.route('/api/profile/reset', methods=['POST'])
def reset_profile():
    if write_db(DEFAULT_DB):
        return jsonify({"message": "Database reset successful", "db": DEFAULT_DB})
    else:
        return jsonify({"error": "Failed to reset database"}), 500

@app.route('/api/content/spells', methods=['GET'])
def get_spells():
    if not os.path.exists(SPELLS_PATH):
        return jsonify({"error": "Spells data not found"}), 404
    try:
        with open(SPELLS_PATH, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({"error": f"Failed to load spelling content: {e}"}), 500

@app.route('/api/content/math', methods=['GET'])
def get_math():
    if not os.path.exists(MATH_PATH):
        return jsonify({"error": "Math data not found"}), 404
    try:
        with open(MATH_PATH, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({"error": f"Failed to load math content: {e}"}), 500

@app.route('/api/content/code', methods=['GET'])
def get_code():
    if not os.path.exists(CODE_PATH):
        return jsonify({"error": "Coding data not found"}), 404
    try:
        with open(CODE_PATH, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({"error": f"Failed to load coding content: {e}"}), 500

@app.route('/api/games/complete', methods=['POST'])
def complete_game():
    data = request.get_json() or {}
    game = data.get('game')
    score = data.get('score')
    xp_gained = data.get('xpGained')
    skill_changed = data.get('skillChanged')

    if not game or score is None or xp_gained is None or not skill_changed:
        return jsonify({"error": "Missing required fields"}), 400

    db = read_db()
    
    # Save history
    history_entry = {
        "id": f"h_{int(time.time() * 1000)}",
        "game": game,
        "score": score,
        "xpGained": xp_gained,
        "date": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    db['history'].insert(0, history_entry)

    # Update overall and skill XP
    profile = db['profile']
    profile['xp'] += xp_gained

    if skill_changed in profile['skills']:
        profile['skills'][skill_changed]['xp'] += xp_gained
        # Every 100 XP is a level
        skill_level = (profile['skills'][skill_changed]['xp'] // 100) + 1
        if skill_level > profile['skills'][skill_changed]['level']:
            profile['skills'][skill_changed]['level'] = skill_level

    # Overall level up logic
    while profile['xp'] >= profile['xpToNextLevel']:
        profile['xp'] -= profile['xpToNextLevel']
        profile['level'] += 1
        profile['xpToNextLevel'] = profile['level'] * 100

    # Achievements logic
    for ach in profile['achievements']:
        if ach['id'] == 'a1' and game == 'Spellcaster Quest' and score > 0:
            ach['unlocked'] = True
        elif ach['id'] == 'a2' and game == 'Cyber Math Racer' and score >= 100:
            ach['unlocked'] = True
        elif ach['id'] == 'a3' and game == 'CodeSpeak Terminal' and score >= 5:
            ach['unlocked'] = True

    if write_db(db):
        return jsonify({"message": "Progress updated successfully", "db": db})
    else:
        return jsonify({"error": "Failed to save progress"}), 500

if __name__ == '__main__':
    # Ensure static directory exists
    os.makedirs('static', exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
