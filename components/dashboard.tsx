"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import {
  Droplets,
  Thermometer,
  Activity,
  Plus,
  Download,
  FileText,
  FileSpreadsheet,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react"
import type { SensorWithLatestData, MoistureData } from "@/lib/database"
import { exportToPDF, exportToExcel, exportToCSV, type ExportData } from "@/lib/export-utils"
import { format, subDays } from "date-fns"
import SensorRegistrationForm from "./sensor-registration-form"
import SensorManagement from "./sensor-management"
import { ThemeToggle } from "./theme-toggle"

export default function Dashboard() {
  const [sensors, setSensors] = useState<SensorWithLatestData[]>([])
  const [moistureData, setMoistureData] = useState<MoistureData[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegistration, setShowRegistration] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    fetchSensors()
    fetchMoistureData()

    // Set up real-time updates
    const interval = setInterval(() => {
      fetchSensors()
      fetchMoistureData()
    }, 30000) // Update every 30 seconds

    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const fetchSensors = async () => {
    try {
      const response = await fetch("/api/sensors")
      const data = await response.json()
      setSensors(data)
    } catch (error) {
      console.error("Error fetching sensors:", error)
    }
  }

  const fetchMoistureData = async () => {
    try {
      const response = await fetch("/api/moisture-data?hours=24")
      const data = await response.json()
      setMoistureData(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching moisture data:", error)
      setLoading(false)
    }
  }

  const getStatusColor = (value: number) => {
    if (value < 30) return "destructive"
    if (value < 60) return "secondary"
    return "default"
  }

  const getStatusText = (value: number) => {
    if (value < 30) return "Low"
    if (value < 60) return "Medium"
    return "Optimal"
  }

  // Prepare chart data with better formatting
  const chartData = moistureData
    .slice(0, 100)
    .reverse()
    .map((item) => ({
      time: format(new Date(item.timestamp), "HH:mm"),
      fullTime: format(new Date(item.timestamp), "PPp"),
      moisture: item.moisture_value,
      temperature: item.temperature,
      sensor: item.sensor_id,
    }))

  // Group data by sensor for multi-line chart
  const sensorGroups = chartData.reduce(
    (acc, item) => {
      if (!acc[item.sensor]) {
        acc[item.sensor] = []
      }
      acc[item.sensor].push(item)
      return acc
    },
    {} as Record<string, typeof chartData>,
  )

  const handleExport = (type: "pdf" | "excel" | "csv") => {
    const exportData: ExportData = {
      sensors,
      moistureData,
      dateRange: {
        from: subDays(new Date(), 7),
        to: new Date(),
      },
    }

    switch (type) {
      case "pdf":
        exportToPDF(exportData)
        break
      case "excel":
        exportToExcel(exportData)
        break
      case "csv":
        exportToCSV(exportData)
        break
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const activeSensors = sensors.filter((s) => s.status === "active").length
  const avgMoisture =
    sensors.length > 0
      ? Math.round(sensors.reduce((acc, s) => acc + (s.latest_reading?.moisture_value || 0), 0) / sensors.length)
      : 0
  const lowMoistureAlerts = sensors.filter((s) => (s.latest_reading?.moisture_value || 0) < 30).length

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Droplets className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">AgriSense</h1>
              </div>
              <div className="flex items-center space-x-1">
                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <span className="text-sm text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <Database className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setShowRegistration(true)} size="sm" className="hidden sm:flex">
                <Plus className="h-4 w-4 mr-2" />
                Add Sensor
              </Button>

              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sensors">Sensors</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="management">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Sensors</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeSensors}</div>
                  <p className="text-xs text-muted-foreground">of {sensors.length} total</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Moisture</CardTitle>
                  <Droplets className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgMoisture}%</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Data Points</CardTitle>
                  <Database className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moistureData.length}</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
                  <Thermometer className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lowMoistureAlerts}</div>
                  <p className="text-xs text-muted-foreground">Low moisture</p>
                </CardContent>
              </Card>
            </div>

            {/* Real-time Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Moisture Levels</CardTitle>
                <p className="text-sm text-muted-foreground">Real-time sensor data</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs fill-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis className="text-xs fill-muted-foreground" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelFormatter={(value, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullTime
                        }
                        return value
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="moisture"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#moistureGradient)"
                      name="Moisture (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sensors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Sensor Status</h2>
              <Button onClick={() => setShowRegistration(true)} size="sm" className="sm:hidden">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sensors.map((sensor) => (
                <Card key={sensor.sensor_id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-medium">{sensor.sensor_id}</CardTitle>
                        <p className="text-sm text-muted-foreground">{sensor.location}</p>
                      </div>
                      <Badge variant={sensor.status === "active" ? "default" : "secondary"}>{sensor.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Moisture</span>
                      <Badge variant={getStatusColor(sensor.latest_reading?.moisture_value || 0)}>
                        {getStatusText(sensor.latest_reading?.moisture_value || 0)}
                      </Badge>
                    </div>

                    <div className="text-3xl font-bold text-primary">
                      {sensor.latest_reading?.moisture_value?.toFixed(1) || "N/A"}%
                    </div>

                    {sensor.latest_reading?.temperature && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Thermometer className="w-4 h-4" />
                        <span>{sensor.latest_reading.temperature.toFixed(1)}°C</span>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        Last:{" "}
                        {sensor.latest_reading?.timestamp
                          ? format(new Date(sensor.latest_reading.timestamp), "PPp")
                          : "No data"}
                      </div>
                      <div>{sensor.readings_count} readings</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Sensor Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="time"
                        className="text-xs fill-muted-foreground"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis className="text-xs fill-muted-foreground" axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      {Object.keys(sensorGroups).map((sensorId, index) => (
                        <Line
                          key={sensorId}
                          type="monotone"
                          dataKey="moisture"
                          data={sensorGroups[sensorId]}
                          stroke={`hsl(${index * 60}, 70%, 50%)`}
                          strokeWidth={2}
                          name={sensorId}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Sensors</span>
                    <Badge variant="default">{activeSensors}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Low Moisture Alerts</span>
                    <Badge variant={lowMoistureAlerts > 0 ? "destructive" : "default"}>{lowMoistureAlerts}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Optimal Range (60-80%)</span>
                    <Badge variant="default">
                      {
                        sensors.filter((s) => {
                          const moisture = s.latest_reading?.moisture_value || 0
                          return moisture >= 60 && moisture <= 80
                        }).length
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Collection Rate</span>
                    <Badge variant="default">{Math.round(moistureData.length / 24)} /hour</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="management">
            <SensorManagement sensors={sensors} onSensorUpdate={fetchSensors} />
          </TabsContent>
        </Tabs>

        {/* Sensor Registration Modal */}
        {showRegistration && (
          <SensorRegistrationForm
            onClose={() => setShowRegistration(false)}
            onSensorAdded={() => {
              fetchSensors()
              setShowRegistration(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
