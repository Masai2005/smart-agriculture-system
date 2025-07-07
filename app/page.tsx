import  { Dashboard }  from "@/components/dashboard"; // Use a named import
import { sensorOperations } from "@/lib/database";

// Add this line to disable caching and force dynamic rendering
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const sensors = sensorOperations.getAll();
  return <Dashboard sensors={sensors} />;
}
