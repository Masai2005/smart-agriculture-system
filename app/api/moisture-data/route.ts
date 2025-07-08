import { NextResponse, type NextRequest } from "next/server";
import { moistureDataOperations } from "@/lib/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensor_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    let data;
    if (from && to) {
      data = moistureDataOperations.getByDateRange(from, to);
    } else if (sensorId) {
      data = moistureDataOperations.getBySensor(sensorId);
    } else {
      // Default to last 24 hours if no range is specified
      data = moistureDataOperations.getRecent(24);
    }
    // Ensure data is always sorted by timestamp ascending
    data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch moisture data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
