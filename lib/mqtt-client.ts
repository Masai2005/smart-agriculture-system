import mqtt from "mqtt"
import { moistureDataOperations, sensorOperations } from "./database" // Ensure both are imported

class MQTTClient {
  private client: mqtt.MqttClient | null = null
  private isConnected = false

  constructor() {
    this.connect()
  }

  private connect() {
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://test.mosquitto.org:1883"
    const options: mqtt.IClientOptions = {
      clientId: `agriculture_dashboard_${Math.random().toString(16).substr(2, 8)}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      clean: true, // Important for public brokers
      keepalive: 60,
    }

    console.log("Connecting to MQTT broker:", brokerUrl)
    this.client = mqtt.connect(brokerUrl, options)

    this.client.on("connect", () => {
      console.log("Connected to MQTT broker")
      this.isConnected = true
      this.subscribeToTopics()
    })

    this.client.on("error", (error) => {
      console.error("MQTT connection error:", error)
      this.isConnected = false
    })

    this.client.on("offline", () => {
      console.log("MQTT client offline")
      this.isConnected = false
    })

    this.client.on("message", this.handleMessage.bind(this))
  }

  private subscribeToTopics() {
    if (!this.client) return

    // Subscribe to sensor data topics, updated to use 'data'
    const topics = ["sensor/+/data", "sensor/+/register", "sensor/+/status"]

    topics.forEach((topic) => {
      this.client!.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err)
        } else {
          console.log(`Subscribed to ${topic}`)
        }
      })
    })
  }

  private handleMessage(topic: string, message: Buffer) {
    console.log(`[MQTT] Received raw message on topic: ${topic}`); // Log raw message
    try {
      const data = JSON.parse(message.toString())
      const topicParts = topic.split("/")

      if (topicParts.length < 3) {
        console.warn(`[MQTT] Ignoring malformed topic: ${topic}`)
        return
      }

      const sensorId = topicParts[1]
      const messageType = topicParts[2]

      console.log(`[MQTT] Parsed message from ${sensorId} (${messageType}):`, data)

      switch (messageType) {
        case "data":
          this.handleMoistureData(sensorId, data)
          break
        case "register":
          this.handleSensorRegistration(sensorId, data)
          break
        case "status":
          this.handleStatusUpdate(sensorId, data)
          break
      }
    } catch (error) {
      console.error("Error processing MQTT message:", error)
    }
  }

  private handleMoistureData(sensorId: string, data: any) {
    try {
      // First, ensure the sensor exists. If not, create it.
      let sensor = sensorOperations.getById(sensorId)
      if (!sensor) {
        console.log(`[DB] Sensor ${sensorId} not found. Registering automatically.`)
        sensorOperations.create({
          sensor_id: sensorId,
          location: "Unassigned Field", // Default location
          type: "Soil Moisture",
          status: "active",
          calibration_min: 0,
          calibration_max: 0
        })
      }

      const { moisture, timestamp } = data
      if (moisture === undefined) {
        console.error(`[DB] 'moisture' is missing from data payload for sensor ${sensorId}`)
        return
      }
      moistureDataOperations.create({
        sensor_id: sensorId,
        moisture_value: moisture,
        timestamp,
      })
      console.log(`[DB] Successfully inserted data for sensor ${sensorId}`)
    } catch (error) {
      console.error(`[DB] Failed to insert data for sensor ${sensorId}:`, error)
    }
  }

  private handleSensorRegistration(sensorId: string, data: any) {
    // Handle automatic sensor registration
    console.log(`Sensor registration request from ${sensorId}:`, data)
    // This could trigger a webhook or notification for manual approval
  }

  private handleStatusUpdate(sensorId: string, data: any) {
    console.log(`Status update from sensor ${sensorId}:`, data)
    // Update sensor status in database if needed
  }

  public publish(topic: string, message: string | object) {
    if (!this.client || !this.isConnected) {
      console.error("MQTT client not connected")
      return false
    }

    const payload = typeof message === "string" ? message : JSON.stringify(message)
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error("Failed to publish message:", err)
      } else {
        console.log(`Published to ${topic}:`, payload)
      }
    })
    return true
  }

  public disconnect() {
    if (this.client) {
      this.client.end()
      this.isConnected = false
    }
  }

  public getConnectionStatus() {
    return this.isConnected
  }
}

// Singleton instance
let mqttClient: MQTTClient | null = null

export function getMQTTClient(): MQTTClient {
  if (!mqttClient) {
    mqttClient = new MQTTClient()
  }
  return mqttClient
}

export default MQTTClient
