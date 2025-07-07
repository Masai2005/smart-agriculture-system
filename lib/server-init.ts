// filepath: lib/server-init.ts
import { getMQTTClient } from './mqtt-client';

console.log("Initializing server-side components...");
getMQTTClient(); // This will instantiate and connect the MQTT client
console.log("MQTT client initialized.");