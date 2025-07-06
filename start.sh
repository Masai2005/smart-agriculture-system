#!/bin/sh

# Start Mosquitto MQTT Broker in background
echo "Starting Mosquitto MQTT Broker..."
mosquitto -c /etc/mosquitto/mosquitto.conf -d

# Wait for MQTT broker to start
sleep 2

# Initialize database if it doesn't exist
if [ ! -f "/app/data/agriculture.db" ]; then
    echo "Initializing database..."
    node -e "
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const path = require('path');
    
    const dbPath = path.join(__dirname, 'data', 'agriculture.db');
    const db = new Database(dbPath);
    
    // Read and execute SQL initialization script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'scripts', 'init-database.sql'), 'utf8');
    db.exec(sqlScript);
    
    console.log('Database initialized successfully');
    db.close();
    "
fi

# Start Next.js application
echo "Starting Next.js application..."
exec node server.js
