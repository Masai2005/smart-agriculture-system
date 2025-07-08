"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Download, Plus, Droplets, Wifi, WifiOff, Activity, Database, Thermometer, FileText, FileSpreadsheet } from "lucide-react"
import { DateRange } from "react-day-picker"
import { addDays, format, subDays, startOfDay, eachDayOfInterval, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LineChart, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SensorWithLatestData, MoistureData } from "@/lib/database"
import { exportToPDF, exportToExcel, exportToCSV, type ExportData } from "@/lib/export-utils"
import SensorRegistrationForm from "./sensor-registration-form"
import SensorManagement from "./sensor-management"
import { ThemeToggle } from "./theme-toggle"
import { Progress } from "@/components/ui/progress" // Import Progress component

interface DashboardProps {
  sensors: SensorWithLatestData[]
}

export function Dashboard({ sensors }: DashboardProps) {
  const router = useRouter()
  const [moistureData, setMoistureData] = useState<MoistureData[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegistration, setShowRegistration] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  })

  const fetchMoistureData = async () => {
    if (!date?.from || !date?.to) return
    setLoading(true)
    try {
      const from = date.from.toISOString()
      const to = date.to.toISOString()
      const response = await fetch(`/api/moisture-data?from=${from}&to=${to}`)
      const data = await response.json()
      setMoistureData(data)
    } catch (error) {
      console.error("Error fetching moisture data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMoistureData()

    // Set up an interval to auto-refresh data every 30 seconds
    const intervalId = setInterval(() => {
      fetchMoistureData()
      router.refresh() // This re-fetches the server-side props, including the sensor list
    }, 30000)

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId)
  }, [date]) // Rerun when date changes

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleDataUpdate = () => router.refresh()

  // --- Calculations ---
  const activeSensors = sensors.filter((s) => s.status === "active").length
  const avgMoisture =
    moistureData.length > 0
      ? Math.round(moistureData.reduce((acc, r) => acc + r.moisture_value, 0) / moistureData.length)
      : 0
  const lowMoistureAlerts = sensors.filter((s) => (s.latest_reading?.moisture_value || 0) < 30).length
  const chartData = moistureData.slice(-100).map((item) => ({
    time: format(new Date(item.timestamp), "HH:mm"),
    fullTime: format(new Date(item.timestamp), "PPp"),
    moisture: item.moisture_value,
  }))
  const dailyAverages = date?.from && date?.to ? eachDayOfInterval({
    start: startOfDay(date.from),
    end: endOfDay(date.to)
  }).map(day => {
    const readingsForDay = moistureData.filter(d => new Date(d.timestamp) >= startOfDay(day) && new Date(d.timestamp) <= endOfDay(day));
    const total = readingsForDay.reduce((acc, r) => acc + r.moisture_value, 0);
    return {
      date: format(day, "MMM dd"),
      average: readingsForDay.length > 0 ? Math.round(total / readingsForDay.length) : 0
    };
  }) : [];

  const handleExport = (type: "pdf" | "excel" | "csv") => {
    const exportData: ExportData = { sensors, moistureData, dateRange: { from: date?.from || new Date(), to: date?.to || new Date() } }
    if (type === 'pdf') exportToPDF(exportData)
    if (type === 'excel') exportToExcel(exportData)
    if (type === 'csv') exportToCSV(exportData)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Droplets className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">AgriSense</h1>
              <div className="flex items-center space-x-1">
                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <span className="text-sm text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (date.to ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}` : format(date.from, "LLL dd, y")) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("pdf")}><FileText className="h-4 w-4 mr-2" />Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}><FileSpreadsheet className="h-4 w-4 mr-2" />Export as Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setShowRegistration(true)} size="sm"><Plus className="h-4 w-4 mr-2" />Add Sensor</Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div></div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sensors">Sensors</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Sensors</CardTitle><Activity className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeSensors}</div><p className="text-xs text-muted-foreground">of {sensors.length} total</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Moisture</CardTitle><Droplets className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{avgMoisture}%</div><p className="text-xs text-muted-foreground">in selected range</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Data Points</CardTitle><Database className="h-4 w-4 text-purple-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{moistureData.length}</div><p className="text-xs text-muted-foreground">in selected range</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle><Thermometer className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{lowMoistureAlerts}</div><p className="text-xs text-muted-foreground">Low moisture</p></CardContent></Card>
              </div>
              <Card><CardHeader><CardTitle>Moisture Levels</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><AreaChart data={chartData}><defs><linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} labelFormatter={(v, p) => p?.[0]?.payload.fullTime || v} /><Area type="monotone" dataKey="moisture" stroke="hsl(var(--primary))" fill="url(#moistureGradient)" /></AreaChart></ResponsiveContainer></CardContent></Card>
            </TabsContent>

            {/* Sensors Tab */}
            <TabsContent value="sensors">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sensors.map((sensor) => {
                  const moisture = sensor.latest_reading?.moisture_value || 0
                  return (
                    <Card key={sensor.sensor_id}>
                      <CardHeader>
                        <CardTitle className="text-base">{sensor.sensor_id}</CardTitle>
                        <p className="text-sm text-muted-foreground">{sensor.location}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Moisture</span>
                          <span className="text-lg font-bold">{moisture}%</span>
                        </div>
                        <Progress value={moisture} className="h-2" />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Status: <Badge variant={sensor.status === 'active' ? 'default' : 'secondary'}>{sensor.status}</Badge></span>
                          <span>Readings: {sensor.readings_count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* Management Tab */}
            <TabsContent value="management">
              <SensorManagement sensors={sensors} onSensorUpdate={handleDataUpdate} />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <Card><CardHeader><CardTitle>Daily Average Moisture</CardTitle><p className="text-sm text-muted-foreground">Average moisture for each day in the selected period.</p></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Average Moisture</TableHead></TableRow></TableHeader><TableBody>{dailyAverages.map((item) => (<TableRow key={item.date}><TableCell className="font-medium">{item.date}</TableCell><TableCell className="text-right">{item.average > 0 ? `${item.average}%` : "No Data"}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Sensor Registration Modal */}
      {showRegistration && <SensorRegistrationForm onClose={() => setShowRegistration(false)} onSensorAdded={() => { handleDataUpdate(); setShowRegistration(false); }} />}
    </div>
  )
}
