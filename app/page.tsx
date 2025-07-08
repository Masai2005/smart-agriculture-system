import { Dashboard } from "@/components/dashboard";
import { sensorOperations } from "@/lib/database";

// Add this line to disable caching and force dynamic rendering
export const dynamic = 'force-dynamic';
// Add this line to explicitly disable caching for data on this page
export const revalidate = 0;

export default function HomePage() {
  const sensors = sensorOperations.getAll();
  return <Dashboard sensors={sensors} />;
}
