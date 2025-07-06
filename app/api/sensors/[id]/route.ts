import { type NextRequest, NextResponse } from "next/server"
import { sensorOperations } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sensor = sensorOperations.getById(params.id)

    if (!sensor) {
      return NextResponse.json({ error: "Sensor not found" }, { status: 404 })
    }

    return NextResponse.json(sensor)
  } catch (error) {
    console.error("Error fetching sensor:", error)
    return NextResponse.json({ error: "Failed to fetch sensor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const result = sensorOperations.update(params.id, body)

    if (result.changes === 0) {
      return NextResponse.json({ error: "Sensor not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Sensor updated successfully" })
  } catch (error) {
    console.error("Error updating sensor:", error)
    return NextResponse.json({ error: "Failed to update sensor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = sensorOperations.delete(params.id)

    if (result.changes === 0) {
      return NextResponse.json({ error: "Sensor not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Sensor deleted successfully" })
  } catch (error) {
    console.error("Error deleting sensor:", error)
    return NextResponse.json({ error: "Failed to delete sensor" }, { status: 500 })
  }
}
