#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;
const char* sensor_id = "SENSOR_01"; // Change this for each sensor

// Sensor pins
const int MOISTURE_PIN = A0;
const int DHT_PIN = 2; // Optional: for DHT11/DHT22

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 30000; // Send data every 30 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(MOISTURE_PIN, INPUT);
  
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  // Register sensor on startup
  registerSensor();
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle commands if needed
  if (String(topic) == "sensor/" + String(sensor_id) + "/command") {
    handleCommand(message);
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to command topic
      String commandTopic = "sensor/" + String(sensor_id) + "/command";
      client.subscribe(commandTopic.c_str());
      
      // Send status update
      sendStatusUpdate("online");
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void registerSensor() {
  if (!client.connected()) {
    reconnect();
  }
  
  StaticJsonDocument<200> doc;
  doc["sensor_id"] = sensor_id;
  doc["type"] = "soil_moisture";
  doc["location"] = "Dar es Salaam"; // Customize this
  doc["timestamp"] = millis();
  doc["ip_address"] = WiFi.localIP().toString();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "sensor/" + String(sensor_id) + "/register";
  client.publish(topic.c_str(), buffer);
  
  Serial.println("Sensor registration sent");
}

void sendMoistureData() {
  // Read moisture sensor (0-1023 range)
  int moistureRaw = analogRead(MOISTURE_PIN);
  
  // Convert to percentage (you may need to calibrate these values)
  float moisturePercent = map(moistureRaw, 0, 1023, 100, 0); // Inverted: wet = high %
  
  // Optional: Read temperature/humidity if DHT sensor is connected
  // float temperature = dht.readTemperature();
  // float humidity = dht.readHumidity();
  
  StaticJsonDocument<200> doc;
  doc["sensor_id"] = sensor_id;
  doc["moisture"] = moisturePercent;
  doc["raw_value"] = moistureRaw;
  doc["timestamp"] = millis();
  
  // Uncomment if using DHT sensor
  // doc["temperature"] = temperature;
  // doc["humidity"] = humidity;
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "sensor/" + String(sensor_id) + "/moisture";
  bool published = client.publish(topic.c_str(), buffer);
  
  if (published) {
    Serial.println("Data published successfully:");
    Serial.println(buffer);
  } else {
    Serial.println("Failed to publish data");
  }
}

void sendStatusUpdate(String status) {
  StaticJsonDocument<200> doc;
  doc["sensor_id"] = sensor_id;
  doc["status"] = status;
  doc["timestamp"] = millis();
  doc["uptime"] = millis();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["wifi_rssi"] = WiFi.RSSI();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "sensor/" + String(sensor_id) + "/status";
  client.publish(topic.c_str(), buffer);
}

void handleCommand(String command) {
  Serial.println("Received command: " + command);
  
  // Parse JSON command
  StaticJsonDocument<200> doc;
  deserializeJson(doc, command);
  
  String cmd = doc["command"];
  
  if (cmd == "ping") {
    sendStatusUpdate("pong");
  } else if (cmd == "calibrate") {
    // Perform sensor calibration
    Serial.println("Calibration requested");
  } else if (cmd == "reset") {
    ESP.restart();
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    sendMoistureData();
  }
  
  // Send status update every 5 minutes
  static unsigned long lastStatus = 0;
  if (now - lastStatus > 300000) {
    lastStatus = now;
    sendStatusUpdate("running");
  }
}
