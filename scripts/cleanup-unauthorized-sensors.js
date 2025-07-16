const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

// Connect to the database
const dbPath = path.join(process.cwd(), 'data', 'agriculture.db');

try {
  const db = new Database(dbPath);
  
  console.log('🧹 Starting unauthorized sensor cleanup...');
  console.log(`📁 Database: ${dbPath}`);
  
  // Define allowed sensor patterns - sync with MQTT client
  const allowedPrefixes = ['ESP32_', 'SENSOR_', 'AGRI_'];
  const allowedSensors = (process.env.ALLOWED_SENSORS || 'SENSOR_01,ESP32_001,ESP32_002,ESP32_TEST').split(',').map(s => s.trim());
  
  console.log('✅ Allowed prefixes:', allowedPrefixes.join(', '));
  console.log('✅ Explicitly allowed sensors:', allowedSensors.join(', '));
  
  function isAllowedSensor(sensorId) {
    const isExplicitlyAllowed = allowedSensors.includes(sensorId);
    const hasAllowedPrefix = allowedPrefixes.some(prefix => sensorId.startsWith(prefix));
    return isExplicitlyAllowed || hasAllowedPrefix;
  }
  
  // Get all sensors with their data counts
  const getAllSensorsQuery = db.prepare(`
    SELECT 
      s.*,
      COUNT(md.id) as data_count,
      MAX(md.timestamp) as last_data
    FROM sensors s
    LEFT JOIN moisture_data md ON s.sensor_id = md.sensor_id
    GROUP BY s.sensor_id
    ORDER BY s.sensor_id
  `);
  
  const sensors = getAllSensorsQuery.all();
  console.log(`\n📊 Found ${sensors.length} sensors in database:`);
  
  // Categorize sensors
  const authorizedSensors = [];
  const unauthorizedSensors = [];
  
  sensors.forEach(sensor => {
    if (isAllowedSensor(sensor.sensor_id)) {
      authorizedSensors.push(sensor);
      console.log(`   ✅ ${sensor.sensor_id} (${sensor.location}) - ${sensor.data_count} records`);
    } else {
      unauthorizedSensors.push(sensor);
      console.log(`   ❌ ${sensor.sensor_id} (${sensor.location}) - ${sensor.data_count} records - UNAUTHORIZED`);
    }
  });
  
  if (unauthorizedSensors.length === 0) {
    console.log('\n🎉 No unauthorized sensors found. Database is clean!');
    db.close();
    process.exit(0);
  }
  
  console.log(`\n⚠️  Found ${unauthorizedSensors.length} unauthorized sensors:`);
  let totalUnauthorizedRecords = 0;
  unauthorizedSensors.forEach(sensor => {
    totalUnauthorizedRecords += sensor.data_count;
    console.log(`   🗑️  ${sensor.sensor_id}: ${sensor.data_count} data records (last: ${sensor.last_data || 'never'})`);
  });
  
  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Authorized sensors: ${authorizedSensors.length}`);
  console.log(`   ❌ Unauthorized sensors: ${unauthorizedSensors.length}`);
  console.log(`   🗑️  Data records to delete: ${totalUnauthorizedRecords}`);
  
  // Interactive confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question(`\n🗑️  Delete ${unauthorizedSensors.length} unauthorized sensors and ${totalUnauthorizedRecords} data records? (y/N): `, (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      
      console.log('\n🚀 Starting deletion process...');
      
      // Prepare delete statements
      const deleteMoistureData = db.prepare('DELETE FROM moisture_data WHERE sensor_id = ?');
      const deleteSensor = db.prepare('DELETE FROM sensors WHERE sensor_id = ?');
      
      // Delete in transaction for safety
      const deleteUnauthorized = db.transaction((sensorsToDelete) => {
        let deletedDataCount = 0;
        let deletedSensorCount = 0;
        
        for (const sensor of sensorsToDelete) {
          console.log(`   🗑️  Deleting ${sensor.sensor_id} (${sensor.data_count} records)...`);
          
          // Delete moisture data first (due to foreign key constraint)
          const dataResult = deleteMoistureData.run(sensor.sensor_id);
          deletedDataCount += dataResult.changes;
          
          // Delete sensor
          const sensorResult = deleteSensor.run(sensor.sensor_id);
          deletedSensorCount += sensorResult.changes;
        }
        
        return { deletedDataCount, deletedSensorCount };
      });
      
      try {
        const result = deleteUnauthorized(unauthorizedSensors);
        console.log(`\n✅ Cleanup completed successfully!`);
        console.log(`   🗑️  Deleted ${result.deletedSensorCount} sensors`);
        console.log(`   🗑️  Deleted ${result.deletedDataCount} data records`);
        
        // Show final state
        const remainingSensors = getAllSensorsQuery.all();
        console.log(`\n📊 Final database state: ${remainingSensors.length} sensors remaining`);
        remainingSensors.forEach(sensor => {
          console.log(`   ✅ ${sensor.sensor_id} (${sensor.location}) - ${sensor.data_count} records`);
        });
        
        console.log('\n🎉 Database cleanup complete! Only authorized sensors remain.');
        
      } catch (error) {
        console.error('\n❌ Error during cleanup:', error);
        console.log('🔄 Database rolled back to previous state.');
      }
      
    } else {
      console.log('\n🚫 Cleanup cancelled. Database unchanged.');
    }
    
    db.close();
    rl.close();
  });
  
} catch (error) {
  console.error('❌ Database connection error:', error);
  console.log('📝 Make sure the database exists and is accessible.');
  process.exit(1);
}
