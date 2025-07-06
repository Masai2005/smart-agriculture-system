const mqtt = require("mqtt")

// Test connection to test.mosquitto.org
const client = mqtt.connect("mqtt://test.mosquitto.org:1883", {
  clientId: `test_client_${Math.random().toString(16).substr(2, 8)}`,
  clean: true,
  keepalive: 60,
  reconnectPeriod: 5000,
})

client.on("connect", () => {
  console.log("✅ Successfully connected to test.mosquitto.org")

  // Subscribe to test topic
  const testTopic = "agriculture/test"
  client.subscribe(testTopic, (err) => {
    if (!err) {
      console.log(`✅ Subscribed to ${testTopic}`)

      // Publish test message
      const testMessage = {
        message: "Hello from Smart Agriculture System",
        timestamp: new Date().toISOString(),
        sensor_id: "TEST_001",
      }

      client.publish(testTopic, JSON.stringify(testMessage), () => {
        console.log("✅ Test message published")
      })
    } else {
      console.error("❌ Subscription failed:", err)
    }
  })
})

client.on("message", (topic, message) => {
  console.log("📨 Received message:")
  console.log("  Topic:", topic)
  console.log("  Message:", message.toString())

  // Close connection after receiving test message
  setTimeout(() => {
    client.end()
    console.log("✅ MQTT test completed successfully")
    process.exit(0)
  }, 1000)
})

client.on("error", (error) => {
  console.error("❌ MQTT connection error:", error)
  process.exit(1)
})

client.on("offline", () => {
  console.log("⚠️  MQTT client offline")
})

// Timeout after 10 seconds
setTimeout(() => {
  console.error("❌ MQTT test timeout")
  client.end()
  process.exit(1)
}, 10000)
