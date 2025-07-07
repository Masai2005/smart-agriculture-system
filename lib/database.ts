import Database from "better-sqlite3"
import path from "path"

const dbPath = path.join(process.cwd(), "data", "agriculture.db")
const db = new Database(dbPath)

// Enable WAL mode for better concurrent access
db.exec("PRAGMA journal_mode = WAL")

export interface Sensor {
  sensor_id: string
  location: string
  type: string
  calibration_min: number
  calibration_max: number
  created_at: string
  updated_at: string
  status: string
}

export interface MoistureData {
  id: number
  sensor_id: string
  timestamp: string
  moisture_value: number
}

export interface SensorWithLatestData extends Sensor {
  latest_reading?: MoistureData
  readings_count: number
}

// Sensor CRUD operations
export const sensorOperations = {
  // Create new sensor
  create: (sensor: Omit<Sensor, "created_at" | "updated_at">) => {
    const stmt = db.prepare(`
      INSERT INTO sensors (sensor_id, location, type, calibration_min, calibration_max, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      sensor.sensor_id,
      sensor.location,
      sensor.type,
      sensor.calibration_min,
      sensor.calibration_max,
      sensor.status,
    )
  },

  // Read all sensors with latest data
  getAll: (): SensorWithLatestData[] => {
    const rows = db.prepare(`
      SELECT 
        s.*,
        md.id as latest_id,
        md.moisture_value as latest_moisture,
        md.timestamp as latest_timestamp,
        COUNT(md2.id) as readings_count
      FROM sensors s
      LEFT JOIN moisture_data md ON s.sensor_id = md.sensor_id
        AND md.timestamp = (
          SELECT MAX(timestamp) 
          FROM moisture_data 
          WHERE sensor_id = s.sensor_id
        )
      LEFT JOIN moisture_data md2 ON s.sensor_id = md2.sensor_id
      GROUP BY s.sensor_id
      ORDER BY s.created_at DESC
    `).all() as any[]; // Get raw rows as an array of any type

    // Manually map the flat database result to the nested object structure
    return rows.map(row => {
      const { latest_id, latest_moisture, latest_timestamp, readings_count, ...sensorData } = row;
      
      const sensor: SensorWithLatestData = {
        ...sensorData,
        readings_count,
        latest_reading: latest_id ? {
          id: latest_id,
          sensor_id: sensorData.sensor_id,
          moisture_value: latest_moisture,
          timestamp: latest_timestamp,
        } : undefined,
      };
      return sensor;
    });
  },

  // Read single sensor
  getById: (sensor_id: string): Sensor | undefined => {
    const stmt = db.prepare("SELECT * FROM sensors WHERE sensor_id = ?")
    return stmt.get(sensor_id) as Sensor | undefined
  },

  // Update sensor
  update: (sensor_id: string, updates: Partial<Sensor>) => {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    const stmt = db.prepare(`
      UPDATE sensors 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE sensor_id = ?
    `)
    return stmt.run(...values, sensor_id)
  },

  // Delete sensor
  delete: (sensor_id: string) => {
    const stmt = db.prepare("DELETE FROM sensors WHERE sensor_id = ?")
    return stmt.run(sensor_id)
  },
}

// Moisture data operations
export const moistureDataOperations = {
  // Create new reading
  create: (data: Omit<MoistureData, "id">) => {
    const stmt = db.prepare(`
      INSERT INTO moisture_data (sensor_id, moisture_value, timestamp)
      VALUES (?, ?, ?)
    `)
    // Use provided timestamp or let the database default handle it
    const timestamp = data.timestamp || new Date().toISOString()
    return stmt.run(data.sensor_id, data.moisture_value, timestamp)
  },

  // Get readings for a sensor with pagination
  getBySensor: (sensor_id: string, limit = 100, offset = 0): MoistureData[] => {
    const stmt = db.prepare(`
      SELECT * FROM moisture_data 
      WHERE sensor_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(sensor_id, limit, offset) as MoistureData[]
  },

  // Get all readings
  getAll: (): MoistureData[] => {
    return db.prepare("SELECT * FROM moisture_data ORDER BY timestamp ASC").all() as MoistureData[]
  },

  // Get recent readings within a specific number of hours
  getRecent: (hours: number): MoistureData[] => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    return db
      .prepare("SELECT * FROM moisture_data WHERE timestamp >= ? ORDER BY timestamp ASC")
      .all(since) as MoistureData[]
  },

  // Delete old data (cleanup)
  deleteOlderThan: (days: number) => {
    const stmt = db.prepare(`
      DELETE FROM moisture_data 
      WHERE timestamp < datetime('now', '-${days} days')
    `)
    return stmt.run()
  },
}

export default db
