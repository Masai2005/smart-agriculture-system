import mqtt from "mqtt"
import { moistureDataOperations } from "./database"

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

    // Subscribe to sensor data topics
    const topics = ["sensor/+/moisture", "sensor/+/register", "sensor/+/status"]

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
    try {
      const data = JSON.parse(message.toString())
      const topicParts = topic.split("/")
      const sensorId = topicParts[1]
      const messageType = topicParts[2]

      console.log(`Received ${messageType} from ${sensorId}:`, data)

      switch (messageType) {
        case "moisture":
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
      moistureDataOperations.create({
        sensor_id: sensorId,
        moisture_value: data.moisture || data.value,
        temperature: data.temperature,
        humidity: data.humidity,
      })
      console.log(`Stored moisture data for sensor ${sensorId}`)
    } catch (error) {
      console.error("Error storing moisture data:", error)
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
