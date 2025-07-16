import { type NextRequest, NextResponse } from "next/server"
import { getMQTTClient } from "@/lib/mqtt-client"

export async function GET() {
  try {
    const mqttClient = getMQTTClient()
    const allowedSensors = mqttClient.getAllowedSensors()
    return NextResponse.json({ allowedSensors })
  } catch (error) {
    console.error("Error fetching allowed sensors:", error)
    return NextResponse.json({ error: "Failed to fetch allowed sensors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sensorId, action } = body

    if (!sensorId || !action) {
      return NextResponse.json({ error: "sensorId and action are required" }, { status: 400 })
    }

    const mqttClient = getMQTTClient()

    if (action === "add") {
      mqttClient.addAllowedSensor(sensorId)
      return NextResponse.json({ message: `Sensor ${sensorId} added to allowed list` })
    } else if (action === "remove") {
      mqttClient.removeAllowedSensor(sensorId)
      return NextResponse.json({ message: `Sensor ${sensorId} removed from allowed list` })
    } else {
      return NextResponse.json({ error: "Action must be 'add' or 'remove'" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error managing allowed sensors:", error)
    return NextResponse.json({ error: "Failed to manage allowed sensors" }, { status: 500 })
  }
}
