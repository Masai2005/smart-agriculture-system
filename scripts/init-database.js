const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
  }
} catch (error) {
  console.error('Failed to create data directory:', error);
  process.exit(1);
}

// Import better-sqlite3 with error handling
let Database;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('better-sqlite3 not installed. Please run: npm install better-sqlite3');
  process.exit(1);
}

// Create database
const dbPath = path.join(dataDir, 'agriculture.db');
console.log('Creating database at:', dbPath);
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.exec("PRAGMA journal_mode = WAL");

// Create tables
try {
  // Sensors table
  db.exec(`CREATE TABLE IF NOT EXISTS sensors (
    sensor_id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    calibration_min REAL DEFAULT 0,
    calibration_max REAL DEFAULT 100,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Moisture data table
  db.exec(`CREATE TABLE IF NOT EXISTS moisture_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT,
    moisture_value REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id) ON DELETE CASCADE
  )`);

  console.log('Database tables created successfully');

} catch (err) {
  console.error('Error creating database tables:', err.message);
  process.exit(1);
}

// Close database
db.close();
console.log('Database initialization completed');
console.log('Database connection closed');