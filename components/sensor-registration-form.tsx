"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

interface SensorRegistrationFormProps {
  onClose: () => void
  onSensorAdded: () => void
}

export default function SensorRegistrationForm({ onClose, onSensorAdded }: SensorRegistrationFormProps) {
  const [formData, setFormData] = useState({
    sensor_id: "",
    location: "",
    type: "soil_moisture",
    calibration_min: 0,
    calibration_max: 1023,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/sensors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to register sensor")
      }

      onSensorAdded()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Add New Sensor</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sensor_id">Sensor ID</Label>
              <Input
                id="sensor_id"
                value={formData.sensor_id}
                onChange={(e) => handleChange("sensor_id", e.target.value)}
                placeholder="ESP32_001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Field A - North Section"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Sensor Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soil_moisture">Soil Moisture</SelectItem>
                  <SelectItem value="temperature_humidity">Temperature & Humidity</SelectItem>
                  <SelectItem value="ph_sensor">pH Sensor</SelectItem>
                  <SelectItem value="light_sensor">Light Sensor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calibration_min">Min Value</Label>
                <Input
                  id="calibration_min"
                  type="number"
                  value={formData.calibration_min}
                  onChange={(e) => handleChange("calibration_min", Number.parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calibration_max">Max Value</Label>
                <Input
                  id="calibration_max"
                  type="number"
                  value={formData.calibration_max}
                  onChange={(e) => handleChange("calibration_max", Number.parseInt(e.target.value))}
                />
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">{error}</div>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Adding..." : "Add Sensor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
