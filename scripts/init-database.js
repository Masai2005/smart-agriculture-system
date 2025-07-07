const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory');
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
  // Users table
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'farmer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Farms table
  db.exec(`CREATE TABLE IF NOT EXISTS farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    size_hectares REAL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

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
    temperature REAL,
    humidity REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
  )`);

  // Crops table
  db.exec(`CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    variety TEXT,
    farm_id INTEGER,
    planting_date DATE,
    expected_harvest_date DATE,
    status TEXT DEFAULT 'growing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms (id)
  )`);

  // Weather data table
  db.exec(`CREATE TABLE IF NOT EXISTS weather_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER,
    temperature REAL,
    humidity REAL,
    rainfall REAL,
    wind_speed REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms (id)
  )`);

  console.log('Database tables created successfully');

  // Insert sample data
  console.log('Inserting sample data...');
  
  const insertSensor = db.prepare(`
    INSERT OR IGNORE INTO sensors (sensor_id, location, type, calibration_min, calibration_max, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertSensor.run('SENSOR_001', 'Field A - North', 'Soil Moisture', 0, 100, 'active');
  insertSensor.run('SENSOR_002', 'Field A - South', 'Soil Moisture', 0, 100, 'active');
  insertSensor.run('SENSOR_003', 'Greenhouse 1', 'Temperature/Humidity', 0, 100, 'active');

  console.log('Sample sensors inserted');

} catch (err) {
  console.error('Error creating database tables:', err.message);
  process.exit(1);
}

// Close database
db.close();
console.log('Database initialization completed');
console.log('Database connection closed');