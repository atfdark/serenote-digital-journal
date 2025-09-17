const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// Create a new database or open an existing one
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// Create tables if they don't exist
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, content TEXT, type TEXT, mood TEXT, is_capsule INTEGER, capsule_open_date DATETIME, created_at DATETIME, FOREIGN KEY (user_id) REFERENCES users(id))');
  // Mood Garden Table
  db.run(`
    CREATE TABLE IF NOT EXISTS gardens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      last_updated TEXT,
      overall_vibe TEXT,
      environment TEXT,
      elements TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

const MOOD_TO_ASSET = {
  joyful: 'Sunflower',
  calm: 'Lavender',
  energetic: 'Hummingbird',
  sad: 'WeepingWillow',
  anxious: 'TangledVines',
  angry: 'ThornyBush',
};

const MOOD_SCORES = {
  joyful: 2,
  calm: 1,
  energetic: 1,
  sad: -1,
  anxious: -1,
  angry: -2,
};

// Helper to get or create a garden
const getOrCreateGarden = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM gardens WHERE user_id = ?';
    db.get(sql, [userId], (err, row) => {
      if (err) return reject(err);
      if (row) {
        // Parse JSON fields
        row.environment = JSON.parse(row.environment);
        row.elements = JSON.parse(row.elements);
        resolve(row);
      } else {
        // Create a new garden
        const newGarden = {
          gardenId: null, // will be set by DB
          userId: userId,
          lastUpdated: new Date().toISOString(),
          overallVibe: 'Serene',
          environment: { sky: 'ClearDay', ground: 'FertileSoil' },
          elements: [],
        };
        const insertSql = `
          INSERT INTO gardens (user_id, last_updated, overall_vibe, environment, elements)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.run(
          insertSql,
          [
            newGarden.userId,
            newGarden.lastUpdated,
            newGarden.overallVibe,
            JSON.stringify(newGarden.environment),
            JSON.stringify(newGarden.elements),
          ],
          function (err) {
            if (err) return reject(err);
            newGarden.gardenId = this.lastID;
            resolve(newGarden);
          }
        );
      }
    });
  });
};

// Route to serve the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to handle user registration
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide a username and password.' });
  }

  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.run(sql, [username, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Username already exists.' });
      }
      return res.status(500).json({ message: 'An error occurred during registration.' });
    }
    res.status(201).json({ message: 'User registered successfully.' });
  });
});

// Route to handle user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide a username and password.' });
  }

  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.get(sql, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'An error occurred during login.' });
    }
    if (row) {
      res.json({ message: 'Login successful.', userId: row.id });
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  });
});

// Route to create a new journal entry
app.post('/entries', (req, res) => {
  const { userId, title, content, type, mood, is_capsule, capsule_open_date } = req.body;
  if (!userId || !title || !content || !type || !mood) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const sql = 'INSERT INTO entries (user_id, title, content, type, mood, is_capsule, capsule_open_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))';
  db.run(sql, [userId, title, content, type, mood, is_capsule, capsule_open_date], function(err) {
    if (err) {
      return res.status(500).json({ message: 'An error occurred while creating the entry.' });
    }
    res.status(201).json({ message: 'Entry created successfully.' });
  });
});

// Route to get all journal entries for a user
app.get('/entries', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Please provide a user ID.' });
  }

  const sql = 'SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC';
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'An error occurred while fetching entries.' });
    }
    res.json(rows);
  });
});

// Route to create a new voice entry
app.post('/voice-entries', upload.single('audio'), (req, res) => {
  const { userId, title, mood } = req.body;
  const content = req.file.path;

  if (!userId || !title || !mood) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const sql = 'INSERT INTO entries (user_id, title, content, type, mood, is_capsule, capsule_open_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))';
  db.run(sql, [userId, title, content, 'voice', mood, 0, null], function(err) {
    if (err) {
      return res.status(500).json({ message: 'An error occurred while creating the entry.' });
    }
    res.status(201).json({ message: 'Entry created successfully.' });
  });
});

// Route to get all moods for a user
app.get('/moods', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Please provide a user ID.' });
  }

  const sql = 'SELECT mood, created_at FROM entries WHERE user_id = ? ORDER BY created_at DESC';
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'An error occurred while fetching moods.' });
    }
    res.json(rows);
  });
});

// Route to get insights data for a user
app.get('/insights', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Please provide a user ID.' });
  }

  const sql = 'SELECT mood, COUNT(*) as count FROM entries WHERE user_id = ? GROUP BY mood';
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'An error occurred while fetching insights.' });
    }
    const insights = {};
    rows.forEach(row => {
      insights[row.mood] = row.count;
    });
    res.json(insights);
  });
});

// Route to log a mood and update the garden
app.post('/logMood', async (req, res) => {
    const { userId, moodType, intensity } = req.body;
    if (!userId || !moodType || intensity === undefined) {
        return res.status(400).json({ message: 'userId, moodType, and intensity are required.' });
    }

    try {
        let garden = await getOrCreateGarden(userId);

        // Rule 2: Time-Based Decay
        const now = new Date();
        const decayThreshold = 72 * 60 * 60 * 1000; // 72 hours in ms
        garden.elements = garden.elements.filter(element => {
            const spawnTime = new Date(element.spawnTimestamp);
            if ((now - spawnTime) > decayThreshold) {
                element.attributes.health -= 0.1;
            }
            return element.attributes.health > 0.1;
        });

        // Rule 1: Process new MoodLog
        const assetKey = MOOD_TO_ASSET[moodType];
        if (assetKey) {
            const existingElement = garden.elements.find(e => e.linkedMood === moodType && e.attributes.growthStage < 1.0);
            if (existingElement) {
                existingElement.attributes.growthStage = Math.min(1.0, existingElement.attributes.growthStage + intensity * 0.2);
                existingElement.attributes.health = Math.min(1.0, existingElement.attributes.health + intensity * 0.1);
            } else {
                garden.elements.push({
                    elementId: `elem_${Date.now()}`,
                    elementType: assetKey === 'Hummingbird' ? 'Fauna' : 'Flora',
                    linkedMood: moodType,
                    assetKey: assetKey,
                    spawnTimestamp: new Date().toISOString(),
                    attributes: { growthStage: 0.1, health: 1.0 },
                    position: { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) }
                });
            }
        }

        // Rule 3: Environmental State (based on last 7 days of moods)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const moodHistorySql = 'SELECT mood FROM entries WHERE user_id = ? AND created_at >= ?';
        db.all(moodHistorySql, [userId, sevenDaysAgo], (err, rows) => {
            if (err) {
                console.error(err);
                // Continue without environment update if history fails
            } else {
                const totalScore = rows.reduce((acc, row) => acc + (MOOD_SCORES[row.mood] || 0), 0);
                const avgScore = rows.length > 0 ? totalScore / rows.length : 0;

                if (avgScore > 0.5) {
                    garden.overallVibe = 'Lush';
                    garden.environment.sky = 'ClearDay';
                } else if (avgScore < -0.5) {
                    garden.overallVibe = 'Stormy';
                    garden.environment.sky = 'Rainy';
                } else {
                    garden.overallVibe = 'Misty';
                    garden.environment.sky = 'Overcast';
                }
            }

            // Update garden in DB
            garden.lastUpdated = new Date().toISOString();
            const updateSql = `
                UPDATE gardens
                SET last_updated = ?, overall_vibe = ?, environment = ?, elements = ?
                WHERE user_id = ?
            `;
            db.run(updateSql, [
                garden.lastUpdated,
                garden.overallVibe,
                JSON.stringify(garden.environment),
                JSON.stringify(garden.elements),
                userId
            ], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to update garden.' });
                }
                res.json(garden);
            });
        });

    } catch (error) {
        res.status(500).json({ message: 'An error occurred.', error: error.message });
    }
});

// Route to get the garden for a user
app.get('/getGarden', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ message: 'userId is required.' });
    }

    try {
        let garden = await getOrCreateGarden(userId);
        
        // Apply decay check on fetch as well
        const now = new Date();
        const decayThreshold = 72 * 60 * 60 * 1000; // 72 hours
        let needsUpdate = false;
        garden.elements = garden.elements.filter(element => {
            const spawnTime = new Date(element.spawnTimestamp);
             if ((now - spawnTime) > decayThreshold) {
                element.attributes.health -= 0.1;
                needsUpdate = true;
            }
            return element.attributes.health > 0.1;
        });

        if (needsUpdate) {
             garden.lastUpdated = new Date().toISOString();
            const updateSql = `
                UPDATE gardens
                SET last_updated = ?, elements = ?
                WHERE user_id = ?
            `;
            db.run(updateSql, [
                garden.lastUpdated,
                JSON.stringify(garden.elements),
                userId
            ]);
        }

        res.json(garden);
    } catch (error) {
        res.status(500).json({ message: 'An error occurred.', error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});