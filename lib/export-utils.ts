import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import type { MoistureData, SensorWithLatestData } from "./database"

export interface ExportData {
  sensors: SensorWithLatestData[]
  moistureData: MoistureData[]
  dateRange: {
    from: Date
    to: Date
  }
}

// Export to PDF
export const exportToPDF = (data: ExportData) => {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text("Smart Agriculture Report", 20, 20)

  doc.setFontSize(12)
  doc.text(`Generated: ${format(new Date(), "PPP")}`, 20, 30)
  doc.text(`Period: ${format(data.dateRange.from, "PPP")} - ${format(data.dateRange.to, "PPP")}`, 20, 40)

  // Sensors Summary
  doc.setFontSize(16)
  doc.text("Sensors Overview", 20, 60)

  const sensorTableData = data.sensors.map((sensor) => [
    sensor.sensor_id,
    sensor.location,
    sensor.status,
    sensor.latest_reading?.moisture_value?.toFixed(1) + "%" || "N/A",
    sensor.latest_reading?.temperature?.toFixed(1) + "°C" || "N/A",
    sensor.readings_count.toString(),
  ])

  autoTable(doc, {
    head: [["Sensor ID", "Location", "Status", "Latest Moisture", "Temperature", "Total Readings"]],
    body: sensorTableData,
    startY: 70,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  // Moisture Data
  const finalY = (doc as any).lastAutoTable.finalY || 120
  doc.setFontSize(16)
  doc.text("Recent Moisture Readings", 20, finalY + 20)

  const moistureTableData = data.moistureData
    .slice(0, 50)
    .map((reading) => [
      reading.sensor_id,
      format(new Date(reading.timestamp), "PPp"),
      reading.moisture_value.toFixed(1) + "%",
      reading.temperature?.toFixed(1) + "°C" || "N/A",
      reading.humidity?.toFixed(1) + "%" || "N/A",
    ])

  autoTable(doc, {
    head: [["Sensor ID", "Timestamp", "Moisture", "Temperature", "Humidity"]],
    body: moistureTableData,
    startY: finalY + 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  // Save the PDF
  doc.save(`agriculture-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
}

// Export to Excel
export const exportToExcel = (data: ExportData) => {
  const workbook = XLSX.utils.book_new()

  // Sensors sheet
  const sensorsData = data.sensors.map((sensor) => ({
    "Sensor ID": sensor.sensor_id,
    Location: sensor.location,
    Type: sensor.type,
    Status: sensor.status,
    "Latest Moisture (%)": sensor.latest_reading?.moisture_value?.toFixed(1) || "N/A",
    "Latest Temperature (°C)": sensor.latest_reading?.temperature?.toFixed(1) || "N/A",
    "Latest Humidity (%)": sensor.latest_reading?.humidity?.toFixed(1) || "N/A",
    "Total Readings": sensor.readings_count,
    "Created At": format(new Date(sensor.created_at), "PPP"),
    "Last Updated": format(new Date(sensor.updated_at), "PPP"),
  }))

  const sensorsSheet = XLSX.utils.json_to_sheet(sensorsData)
  XLSX.utils.book_append_sheet(workbook, sensorsSheet, "Sensors")

  // Moisture data sheet
  const moistureDataFormatted = data.moistureData.map((reading) => ({
    "Sensor ID": reading.sensor_id,
    Timestamp: format(new Date(reading.timestamp), "PPpp"),
    "Moisture (%)": reading.moisture_value.toFixed(1),
    "Temperature (°C)": reading.temperature?.toFixed(1) || "N/A",
    "Humidity (%)": reading.humidity?.toFixed(1) || "N/A",
  }))

  const moistureSheet = XLSX.utils.json_to_sheet(moistureDataFormatted)
  XLSX.utils.book_append_sheet(workbook, moistureSheet, "Moisture Data")

  // Summary sheet
  const summaryData = [
    { Metric: "Total Sensors", Value: data.sensors.length },
    { Metric: "Active Sensors", Value: data.sensors.filter((s) => s.status === "active").length },
    {
      Metric: "Average Moisture (%)",
      Value:
        data.sensors.length > 0
          ? (
              data.sensors.reduce((acc, s) => acc + (s.latest_reading?.moisture_value || 0), 0) / data.sensors.length
            ).toFixed(1)
          : "N/A",
    },
    { Metric: "Total Data Points", Value: data.moistureData.length },
    {
      Metric: "Low Moisture Alerts",
      Value: data.sensors.filter((s) => (s.latest_reading?.moisture_value || 0) < 30).length,
    },
    { Metric: "Report Generated", Value: format(new Date(), "PPpp") },
  ]

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  // Save the Excel file
  XLSX.writeFile(workbook, `agriculture-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`)
}

// Export to CSV
export const exportToCSV = (data: ExportData) => {
  const csvData = data.moistureData.map((reading) => ({
    sensor_id: reading.sensor_id,
    timestamp: format(new Date(reading.timestamp), "yyyy-MM-dd HH:mm:ss"),
    moisture_percentage: reading.moisture_value.toFixed(1),
    temperature_celsius: reading.temperature?.toFixed(1) || "",
    humidity_percentage: reading.humidity?.toFixed(1) || "",
  }))

  const worksheet = XLSX.utils.json_to_sheet(csvData)
  const csv = XLSX.utils.sheet_to_csv(worksheet)

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `moisture-data-${format(new Date(), "yyyy-MM-dd")}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
