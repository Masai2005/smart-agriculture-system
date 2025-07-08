# Smart Agriculture System Design

This document outlines the system design, database design, ERD, and data flowchart for the Smart Agriculture System.

## 1. System Design

The system is a web-based application designed to monitor soil moisture levels using IoT sensors. It's built with a modern tech stack for real-time data processing and visualization.

### Core Components:

*   **Frontend:** A responsive web dashboard built with **Next.js** and **React**. It uses **Tailwind CSS** for styling and **Shadcn/ui** for UI components. The dashboard displays real-time sensor data, allows for sensor management, and provides data export functionalities.
*   **Backend:** Implemented as **Next.js API Routes**. The backend handles requests from the frontend, interacts with the database, and manages sensor data.
*   **Database:** A **SQLite** database (`better-sqlite3` driver) is used for data storage. It's lightweight and suitable for this application's scale. The database is initialized with a script (`scripts/init-database.js`).
*   **Real-time Communication:** An **MQTT broker (Mosquitto)** is used for real-time communication between the IoT sensors and the backend server. The Node.js server has an MQTT client (`lib/mqtt-client.ts`) that subscribes to topics and processes incoming sensor data.
*   **IoT Sensors:** **ESP32** microcontrollers with moisture sensors are used to collect data. They publish data to the MQTT broker.
*   **Containerization:** **Docker** and **Docker Compose** are used to containerize the application, making it easy to deploy and run in a consistent environment.

### Architecture Overview

```
+-----------------+      +----------------+      +----------------------+
|  ESP32 Sensor   |----->| MQTT Broker    |<-----| Next.js Server       |
| (Publishes data)|      | (Mosquitto)    |      | (MQTT Client Sub)    |
+-----------------+      +----------------+      +----------------------+
                                                     |
                                                     | (Stores data)
                                                     v
                                               +----------------+
                                               | SQLite Database|
                                               +----------------+
                                                     ^
                                                     | (Reads data)
                                                     |
+-----------------+      +----------------------+
|  User's Browser |<---->| Next.js Server       |
| (Views Dashboard)|      | (Serves Frontend)    |
+-----------------+      +----------------------+

```

## 2. Database Design

The database consists of two main tables: `sensors` and `moisture_data`.

### `sensors` Table

Stores information about each sensor.

| Column     | Type          | Constraints              | Description                               |
|------------|---------------|--------------------------|-------------------------------------------|
| `id`       | TEXT          | PRIMARY KEY, NOT NULL    | Unique identifier for the sensor (e.g., MAC address). |
| `name`     | TEXT          | NOT NULL                 | A user-friendly name for the sensor.      |
| `location` | TEXT          |                          | Physical location of the sensor.          |
| `status`   | TEXT          |                          | Current status (e.g., "active", "inactive"). |
| `created_at` | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP| Timestamp of when the sensor was registered. |

### `moisture_data` Table

Stores moisture readings from the sensors.

| Column          | Type      | Constraints                               | Description                               |
|-----------------|-----------|-------------------------------------------|-------------------------------------------|
| `id`            | INTEGER   | PRIMARY KEY AUTOINCREMENT                 | Unique identifier for the reading.        |
| `sensor_id`     | TEXT      | NOT NULL, FOREIGN KEY (sensors.id)        | The ID of the sensor that took the reading. |
| `moisture_value`| REAL      | NOT NULL                                  | The soil moisture value.                  |
| `timestamp`     | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP                 | Timestamp of when the reading was taken.  |

## 3. Entity-Relationship Diagram (ERD)

This is a textual representation of the relationship between the tables.

```
+-------------+       +-----------------+
|   sensors   |       |  moisture_data  |
+-------------+       +-----------------+
| id (PK)     |-------| id (PK)         |
| name        |       | sensor_id (FK)  |
| location    |       | moisture_value  |
| status      |       | timestamp       |
| created_at  |       +-----------------+
+-------------+
      |
      |
 (1 to Many)
      |
      v
+-----------------+
|  moisture_data  |
+-----------------+
```

A single sensor can have multiple moisture data readings.

## 4. System Flowchart

This flowchart illustrates the flow of data and user interactions within the system.

```
[Start] --> [ESP32 Sensor reads moisture level]
   |
   v
[Sensor publishes data to MQTT topic "sensor/data"]
   |
   v
[MQTT Broker receives the message]
   |
   v
[Node.js MQTT Client (subscriber) receives the message]
   |
   v
[Client checks if sensor ID exists in the database] --(No)--> [Register new sensor in `sensors` table]
   |
(Yes)
   |
   v
[Insert moisture data into `moisture_data` table]
   |
   v
[User opens the web dashboard]
   |
   v
[Next.js app fetches sensor and moisture data from the database]
   |
   v
[Dashboard displays real-time data, sensor status, and charts]
   |
   v
<User Interaction>
   |
   +-- [View historical data by selecting a date range] --> [App fetches and displays data for the range]
   |
   +-- [Edit a sensor's details] --> [App updates the sensor info in the database]
   |
   +-- [Export data as PDF/Excel] --> [App generates and downloads the report]
   |
   v
[End]
```
