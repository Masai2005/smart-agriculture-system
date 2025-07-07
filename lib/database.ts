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
  temperature?: number
  humidity?: number
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
    const stmt = db.prepare(`
      SELECT 
        s.*,
        md.moisture_value as latest_moisture,
        md.temperature as latest_temperature,
        md.humidity as latest_humidity,
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
    `)
    return stmt.all() as SensorWithLatestData[]
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
  create: (data: Omit<MoistureData, "id" | "timestamp">) => {
    const stmt = db.prepare(`
      INSERT INTO moisture_data (sensor_id, moisture_value, temperature, humidity)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(data.sensor_id, data.moisture_value, data.temperature, data.humidity)
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

  // Get recent readings for dashboard
  getRecent: (hours = 24): MoistureData[] => {
    const stmt = db.prepare(`
      SELECT * FROM moisture_data 
      WHERE timestamp >= datetime('now', '-${hours} hours')
      ORDER BY timestamp DESC
    `)
    return stmt.all() as MoistureData[]
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
