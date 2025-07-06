-- Create sensors table for metadata management
CREATE TABLE IF NOT EXISTS sensors (
    sensor_id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'soil_moisture',
    calibration_min REAL DEFAULT 0,
    calibration_max REAL DEFAULT 1023,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'
);

-- Create moisture_data table for sensor readings
CREATE TABLE IF NOT EXISTS moisture_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    moisture_value REAL NOT NULL,
    temperature REAL,
    humidity REAL,
    FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_moisture_data_sensor_timestamp 
ON moisture_data (sensor_id, timestamp);

-- Insert sample sensors for testing
INSERT OR IGNORE INTO sensors (sensor_id, location, type) VALUES 
('ESP32_001', 'Field A - North Section', 'soil_moisture'),
('ESP32_002', 'Field B - South Section', 'soil_moisture'),
('ESP32_003', 'Greenhouse 1', 'soil_moisture');

-- Insert sample data for testing
INSERT OR IGNORE INTO moisture_data (sensor_id, moisture_value, temperature, humidity) VALUES 
('ESP32_001', 65.5, 22.3, 45.2),
('ESP32_002', 72.1, 23.1, 48.7),
('ESP32_003', 58.9, 21.8, 52.3);
