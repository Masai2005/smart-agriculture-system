# Smart Agriculture IoT System

A comprehensive IoT-based smart agriculture monitoring system built with Next.js, SQLite, and MQTT for real-time soil moisture monitoring and sensor management.

## Features

- **Real-time Monitoring**: Live soil moisture, temperature, and humidity tracking
- **IoT Integration**: MQTT protocol for ESP32 sensor communication
- **Data Visualization**: Interactive charts and graphs using Recharts
- **Sensor Management**: CRUD operations for sensor registration and management
- **Local Storage**: SQLite database for reliable data persistence
- **Responsive Dashboard**: Modern UI built with Tailwind CSS and shadcn/ui
- **Docker Support**: Containerized deployment with MQTT broker included
- **Raspberry Pi Ready**: Optimized for edge deployment

## System Architecture

\`\`\`
ESP32 Sensors → MQTT Broker → Next.js API → SQLite Database → Dashboard
\`\`\`

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized deployment)
- Mosquitto MQTT Broker (included in Docker setup)

## Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd smart-agriculture-system
npm install
\`\`\`

### 2. Environment Setup

\`\`\`bash
cp .env.example .env.local
# Edit .env.local with your configuration
\`\`\`

### 3. Database Initialization

\`\`\`bash
mkdir -p data
npm run db:init
\`\`\`

### 4. Development Mode

\`\`\`bash
# Start MQTT broker (if not using Docker)
mosquitto -c mosquitto.conf -d

# Start Next.js development server
npm run dev
\`\`\`

Visit `http://localhost:3000` to access the dashboard.

### 5. Docker Deployment

\`\`\`bash
# Build and run with Docker
npm run docker:build
npm run docker:run
\`\`\`

## Testing the System

### 1. Test MQTT Connection
\`\`\`bash
npm run mqtt:test
\`\`\`

### 2. Simulate Sensor Data
You can publish test data directly to the broker:

\`\`\`bash
# Install mosquitto clients
sudo apt install mosquitto-clients

# Publish test moisture data
mosquitto_pub -h test.mosquitto.org -t "sensor/ESP32_TEST/moisture" -m '{"sensor_id":"ESP32_TEST","moisture":65.5,"temperature":22.3,"timestamp":1640995200000}'

# Subscribe to all sensor topics
mosquitto_sub -h test.mosquitto.org -t "sensor/+/+"
\`\`\`

## MQTT Configuration

### Using test.mosquitto.org (Public Broker)

The system is configured to use the public test.mosquitto.org broker by default:

\`\`\`bash
MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883
\`\`\`

**Important Notes about test.mosquitto.org:**
- ✅ Free to use for testing and development
- ✅ No authentication required
- ⚠️ Public broker - anyone can see your data
- ⚠️ Not suitable for production use
- ⚠️ May experience downtime or instability
- ⚠️ No data persistence guarantees

**Available Ports:**
- 1883: MQTT, unencrypted, unauthenticated
- 8883: MQTT, encrypted, unauthenticated
- 8080: MQTT over WebSockets, unencrypted
- 8081: MQTT over WebSockets, encrypted

### Testing MQTT Connection

\`\`\`bash
# Test MQTT connectivity
npm run mqtt:test
\`\`\`

### For Production Use

Consider using:
- Local Mosquitto broker on Raspberry Pi
- Cloud MQTT services (AWS IoT, Google Cloud IoT, etc.)
- Private MQTT broker with authentication

## ESP32 Sensor Code Example

\`\`\`cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_RASPBERRY_PI_IP";
const char* sensor_id = "ESP32_001";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Read sensor data
  int moistureValue = analogRead(A0);
  float moisturePercent = map(moistureValue, 0, 1023, 0, 100);
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["moisture"] = moisturePercent;
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  // Publish to MQTT
  String topic = "sensor/" + String(sensor_id) + "/moisture";
  client.publish(topic.c_str(), buffer);
  
  delay(30000); // Send every 30 seconds
}
\`\`\`

## API Endpoints

### Sensors
- `GET /api/sensors` - List all sensors
- `POST /api/sensors` - Register new sensor
- `GET /api/sensors/[id]` - Get sensor details
- `PUT /api/sensors/[id]` - Update sensor
- `DELETE /api/sensors/[id]` - Delete sensor

### Moisture Data
- `GET /api/moisture-data` - Get moisture readings
- `POST /api/moisture-data` - Add new reading

## MQTT Topics

- `sensor/{sensor_id}/moisture` - Moisture data
- `sensor/{sensor_id}/register` - Sensor registration
- `sensor/{sensor_id}/status` - Status updates

## Database Schema

### Sensors Table
\`\`\`sql
CREATE TABLE sensors (
    sensor_id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    type TEXT DEFAULT 'soil_moisture',
    calibration_min REAL DEFAULT 0,
    calibration_max REAL DEFAULT 1023,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'
);
\`\`\`

### Moisture Data Table
\`\`\`sql
CREATE TABLE moisture_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    moisture_value REAL NOT NULL,
    temperature REAL,
    humidity REAL,
    FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
);
\`\`\`

## Deployment on Raspberry Pi

1. **Install Dependencies**
\`\`\`bash
sudo apt update
sudo apt install nodejs npm mosquitto mosquitto-clients
\`\`\`

2. **Clone and Setup**
\`\`\`bash
git clone <repository-url>
cd smart-agriculture-system
npm install
npm run build
\`\`\`

3. **Configure Services**
\`\`\`bash
# Copy mosquitto config
sudo cp mosquitto.conf /etc/mosquitto/conf.d/

# Start services
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
\`\`\`

4. **Run Application**
\`\`\`bash
npm start
\`\`\`

## Monitoring and Alerts

The system includes built-in monitoring for:
- Low moisture levels (< 30%)
- Sensor connectivity status
- Data collection rates
- System health metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints

## Roadmap

- [ ] Mobile app integration
- [ ] Weather API integration
- [ ] Machine learning predictions
- [ ] Multi-tenant support
- [ ] Cloud synchronization
- [ ] Advanced alerting system
