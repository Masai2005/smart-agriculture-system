"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { type Sensor } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface SensorFormProps {
  sensor?: Sensor; // Make sensor optional
  onClose: () => void;
  onFinished: () => void;
}

export function SensorForm({ sensor, onClose, onFinished }: SensorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!sensor;

  const [formData, setFormData] = useState({
    sensor_id: sensor?.sensor_id || "",
    location: sensor?.location || "",
    type: sensor?.type || "soil_moisture",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEditMode && sensor) {
      setFormData({
        sensor_id: sensor.sensor_id,
        location: sensor.location,
        type: sensor.type,
      });
    }
  }, [sensor, isEditMode]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditMode ? `/api/sensors/${sensor.sensor_id}` : "/api/sensors";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'register'} sensor`);
      }

      toast({ title: `Sensor ${isEditMode ? 'updated' : 'registered'} successfully` });
      onFinished();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">{isEditMode ? "Edit Sensor" : "Add New Sensor"}</CardTitle>
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
                placeholder="e.g., SENSOR_01"
                required
                disabled={isEditMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Field A - North"
                required
              />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">{error}</div>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1">{loading ? "Saving..." : (isEditMode ? "Update Sensor" : "Add Sensor")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}