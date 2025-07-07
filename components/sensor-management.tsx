"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Trash2, MoreVertical, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { SensorWithLatestData } from "@/lib/database"
import { format } from "date-fns"
import { SensorForm } from "./sensor-form" // Import the new form

interface SensorManagementProps {
  sensors: SensorWithLatestData[]
  onSensorUpdate: () => void
}

export default function SensorManagement({ sensors, onSensorUpdate }: SensorManagementProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editingSensor, setEditingSensor] = useState<SensorWithLatestData | null>(null)

  const handleDeleteSensor = async (sensorId: string) => {
    if (!confirm(`Are you sure you want to delete sensor ${sensorId}?`)) {
      return
    }

    setLoading(sensorId)
    try {
      const response = await fetch(`/api/sensors/${sensorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete sensor")
      }

      onSensorUpdate()
    } catch (error) {
      console.error("Error deleting sensor:", error)
      alert("Failed to delete sensor")
    } finally {
      setLoading(null)
    }
  }

  const handleToggleStatus = async (sensorId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    setLoading(sensorId)

    try {
      const response = await fetch(`/api/sensors/${sensorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update sensor status")
      }

      onSensorUpdate()
    } catch (error) {
      console.error("Error updating sensor:", error)
      alert("Failed to update sensor status")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Sensor Management</CardTitle>
          <p className="text-sm text-muted-foreground">Manage your sensors and view their status</p>
        </CardHeader>
        <CardContent>
          {/* Mobile view */}
          <div className="block md:hidden space-y-4">
            {sensors.map((sensor) => (
              <Card key={sensor.sensor_id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{sensor.sensor_id}</h3>
                      <p className="text-sm text-muted-foreground">{sensor.location}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(sensor.sensor_id, sensor.status)}
                          disabled={loading === sensor.sensor_id}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {sensor.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSensor(sensor.sensor_id)}
                          disabled={loading === sensor.sensor_id}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={sensor.status === "active" ? "default" : "secondary"}>{sensor.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm capitalize">{sensor.type.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Readings</span>
                      <span className="text-sm">{sensor.readings_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Reading</span>
                      <span className="text-sm">
                        {sensor.latest_reading?.timestamp
                          ? format(new Date(sensor.latest_reading.timestamp), "MMM d, HH:mm")
                          : "No data"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sensor ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Reading</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sensors.map((sensor) => (
                  <TableRow key={sensor.sensor_id}>
                    <TableCell className="font-medium">{sensor.sensor_id}</TableCell>
                    <TableCell>{sensor.location}</TableCell>
                    <TableCell>
                      <Badge variant={sensor.status === "active" ? "default" : "secondary"}>{sensor.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {sensor.latest_reading?.timestamp
                        ? format(new Date(sensor.latest_reading.timestamp), "PPp")
                        : "No data"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingSensor(sensor)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(sensor.sensor_id, sensor.status)}
                          disabled={loading === sensor.sensor_id}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSensor(sensor.sensor_id)}
                          disabled={loading === sensor.sensor_id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingSensor && (
        <SensorForm
          sensor={editingSensor}
          onClose={() => setEditingSensor(null)}
          onFinished={() => {
            setEditingSensor(null)
            onSensorUpdate()
          }}
        />
      )}
    </div>
  )
}
