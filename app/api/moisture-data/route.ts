import { type NextRequest, NextResponse } from "next/server"
import { moistureDataOperations } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sensorId = searchParams.get("sensor_id")
    const hours = Number.parseInt(searchParams.get("hours") || "24")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let data
    if (sensorId) {
      data = moistureDataOperations.getBySensor(sensorId, limit, offset)
    } else {
      data = moistureDataOperations.getRecent(hours)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching moisture data:", error)
    return NextResponse.json({ error: "Failed to fetch moisture data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sensor_id, moisture_value } = body

    if (!sensor_id || moisture_value === undefined) {
      return NextResponse.json({ error: "sensor_id and moisture_value are required" }, { status: 400 })
    }

    const result = moistureDataOperations.create({
      sensor_id,
      moisture_value,
      timestamp: new Date().toISOString(), // API calls will generate their own timestamp
    })

    return NextResponse.json({ message: "Data recorded successfully", id: result.lastInsertRowid }, { status: 201 })
  } catch (error) {
    console.error("Error recording moisture data:", error)
    return NextResponse.json({ error: "Failed to record data" }, { status: 500 })
  }
}
