import {
  AppSettings,
  DESKTHING_EVENTS,
  SETTING_TYPES,
} from "@deskthing/types";
import { createDeskThing } from "@deskthing/server";
import backendController from "./BackendController";
import { ToClientData, GenericTransitData } from "./types";

const DeskThing = createDeskThing<GenericTransitData, ToClientData>();

console.log("=== INITIALIZING BACKEND CONNECTION APP ===");

// Handle client requests using the generic "get" handler
DeskThing.on("get", async (data: any) => {
  console.log("=== GET REQUEST RECEIVED ===");
  console.log("Full data object:", JSON.stringify(data, null, 2));
  
  const request = data?.payload?.request || data?.request;
  
  if (request === "status") {
    console.log("Status request received - sending current connection status");
    const status = backendController.getStatus();
    DeskThing.send({ type: 'connectionStatus', payload: status });
  } 
  else if (request === "logs") {
    console.log("Logs request received - sending current logs");
    const logs = backendController.getLogs();
    DeskThing.send({ type: 'logs', payload: logs });
  }
  else {
    console.log("Unknown request type:", request);
  }
});

// NEW: Handle subscription requests
DeskThing.on("subscribe", (data: any) => {
  console.log("=== SUBSCRIBE REQUEST DEBUG ===");
  console.log("Full data object:", JSON.stringify(data, null, 2));
  
  // Extract from 'request' field (same pattern as 'get')
  const dataType = data?.request || data?.payload?.request;
  
  console.log(`Extracted dataType from request field: "${dataType}"`);
  
  if (dataType === 'temperature' || dataType === 'usage' || dataType === 'stats') {
    backendController.subscribe(dataType);
    console.log(`✓ Successfully subscribed to ${dataType}`);
  } else {
    console.warn(`✗ Unknown/invalid data type for subscription: "${dataType}"`);
  }
  console.log("=== END SUBSCRIBE DEBUG ===\n");
});

DeskThing.on("unsubscribe", (data: any) => {
  console.log("=== UNSUBSCRIBE REQUEST DEBUG ===");
  console.log("Full data object:", JSON.stringify(data, null, 2));
  
  // Extract from 'request' field (same pattern as 'get')
  const dataType = data?.request || data?.payload?.request;
  
  console.log(`Extracted dataType from request field: "${dataType}"`);
  
  if (dataType === 'temperature' || dataType === 'usage' || dataType === 'stats') {
    backendController.unsubscribe(dataType);
    console.log(`✓ Successfully unsubscribed from ${dataType}`);
  } else {
    console.warn(`✗ Unknown/invalid data type for unsubscription: "${dataType}"`);
  }
  console.log("=== END UNSUBSCRIBE DEBUG ===\n");
});

// Handle connection control from client
DeskThing.on("connect", () => {
  console.log("Connect request received from client");
  backendController.connect();
});

DeskThing.on("disconnect", () => {
  console.log("Disconnect request received from client");
  backendController.disconnect();
});

DeskThing.on("clearLogs", () => {
  console.log("Clear logs request received from client");
  backendController.clearLogs();
});

// Handle data requests from client
DeskThing.on("requestFullSensors", () => {
  console.log("Request full sensors from client");
  backendController.requestFullSensors();
});

DeskThing.on("requestRelevantSensors", () => {
  console.log("Request relevant sensors from client");
  backendController.requestRelevantSensors();
});

DeskThing.on("requestTemperatures", () => {
  console.log("Request temperatures from client");
  backendController.requestTemperatures();
});

DeskThing.on("requestUsageStats", () => {
  console.log("Request Usage from client");
  backendController.requestUsageStats();
});

// Handle settings updates
DeskThing.on(DESKTHING_EVENTS.SETTINGS, (settings) => {
  console.log("Settings update received");
  if (settings?.payload) {
    backendController.updateSettings(settings.payload);
  }
});

const setupSettings = async () => {
  console.log("Setting up backend connection settings...");
  
  const settings: AppSettings = {
    backendUrl: {
      label: "Backend URL",
      id: "backendUrl",
      value: "http://localhost:5000",
      description: "The URL of your C# SignalR backend server",
      type: SETTING_TYPES.STRING,
    },
    autoConnect: {
      label: "Auto Connect",
      id: "autoConnect",
      value: true,
      description: "Automatically connect to backend on startup",
      type: SETTING_TYPES.BOOLEAN,
    },
    reconnectInterval: {
      label: "Reconnect Interval (seconds)",
      id: "reconnectInterval",
      value: 30,
      description: "Time to wait before attempting to reconnect after failure",
      type: SETTING_TYPES.NUMBER,
      min: 5,
      max: 300,
    },
    maxLogs: {
      label: "Maximum Logs",
      id: "maxLogs",
      value: 100,
      description: "Maximum number of log entries to keep",
      type: SETTING_TYPES.NUMBER,
      min: 10,
      max: 1000,
    },
  };

  await DeskThing.initSettings(settings);
  console.log("Settings initialized");
};

const start = async () => {
  console.log("=== STARTING BACKEND CONNECTION APP ===");
  
  backendController.setDeskThing(DeskThing);
  await setupSettings();
  
  backendController.start();
  console.log("=== BACKEND CONNECTION APP STARTED SUCCESSFULLY ===");
  
  // Send initial status to client after a short delay
  setTimeout(() => {
    console.log("Sending initial status to client");
    const status = backendController.getStatus();
    DeskThing.send({ type: 'connectionStatus', payload: status });
    
    const logs = backendController.getLogs();
    DeskThing.send({ type: 'logs', payload: logs });
  }, 1000);
};

const stop = async () => {
  console.log("=== STOPPING BACKEND CONNECTION APP ===");
  await backendController.stop();
};

// Register event handlers
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
DeskThing.on(DESKTHING_EVENTS.START, start);

console.log("=== SERVER FILE LOADED, WAITING FOR START EVENT ===");