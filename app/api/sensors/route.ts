import { type NextRequest, NextResponse } from "next/server"
import { sensorOperations } from "@/lib/database"

export async function GET() {
  try {
    const sensors = sensorOperations.getAll()
    return NextResponse.json(sensors)
  } catch (error) {
    console.error("Error fetching sensors:", error)
    return NextResponse.json({ error: "Failed to fetch sensors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sensor_id, location, type, calibration_min, calibration_max } = body

    if (!sensor_id || !location) {
      return NextResponse.json({ error: "sensor_id and location are required" }, { status: 400 })
    }

    const result = sensorOperations.create({
      sensor_id,
      location,
      type: type || "soil_moisture",
      calibration_min: calibration_min || 0,
      calibration_max: calibration_max || 1023,
      status: "active",
    })

    return NextResponse.json({ message: "Sensor created successfully", id: result.lastInsertRowid }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating sensor:", error)

    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return NextResponse.json({ error: "Sensor ID already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to create sensor" }, { status: 500 })
  }
}
