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

// Track settings initialization state
let settingsInitialized = false;
let initialBackendSettingsApplied = false;
let lastKnownSettings: any = null;

// Handle client requests using the generic "get" handler
DeskThing.on("get", async (data: any) => {
  console.log("=== GET REQUEST RECEIVED ===");
  console.log("Request type:", data?.payload?.request || data?.request);
  
  const request = data?.payload?.request || data?.request;
  
  if (request === "status") {
    console.log("Status request - sending connection status");
    const status = backendController.getStatus();
    DeskThing.send({ type: 'connectionStatus', payload: status });
  } 
  else if (request === "logs") {
    console.log("Logs request - sending logs");
    const logs = backendController.getLogs();
    DeskThing.send({ type: 'logs', payload: logs });
  }
  else {
    console.log("Unknown request type:", request);
  }
});

// Handle subscription requests
DeskThing.on("subscribe", (data: any) => {
  const dataType = data?.request || data?.payload?.request;
  
  const validSubscriptionTypes = [
    'temperature', 'usage', 'stats',
    'cpu-temp', 'gpu-temp', 'cpu-usage', 
    'memory-load', 'memory-used', 'gpu-usage',
    'network-download', 'network-upload' 
  ];
  
  if (validSubscriptionTypes.includes(dataType)) {
    backendController.subscribe(dataType);
    console.log(`✓ Subscribed to ${dataType}`);
  } else {
    console.warn(`✗ Invalid subscription type: "${dataType}"`);
  }
});

DeskThing.on("unsubscribe", (data: any) => {
  const dataType = data?.request || data?.payload?.request;
  
  const validSubscriptionTypes = [
    'temperature', 'usage', 'stats',
    'cpu-temp', 'gpu-temp', 'cpu-usage', 
    'memory-load', 'memory-used', 'gpu-usage',
    'network-download', 'network-upload'  
  ];
  
  if (validSubscriptionTypes.includes(dataType)) {
    backendController.unsubscribe(dataType);
    console.log(`✓ Unsubscribed from ${dataType}`);
  } else {
    console.warn(`✗ Invalid unsubscription type: "${dataType}"`);
  }
});

// Handle connection control from client
DeskThing.on("connect", () => {
  console.log("Connect request from client");
  backendController.connect();
});

DeskThing.on("disconnect", () => {
  console.log("Disconnect request from client");
  backendController.disconnect();
});

DeskThing.on("clearLogs", () => {
  console.log("Clear logs request from client");
  backendController.clearLogs();
});

// Helper to extract backend-related settings only
function extractBackendSettings(settings: any) {
  return {
    backendUrl: settings.backendUrl?.value ?? settings.backendUrl,
    autoConnect: settings.autoConnect?.value ?? settings.autoConnect,
    autoStartServer: settings.autoStartServer?.value ?? settings.autoStartServer,
    reconnectInterval: settings.reconnectInterval?.value ?? settings.reconnectInterval,
    maxLogs: settings.maxLogs?.value ?? settings.maxLogs,
    serverExecutablePath: settings.serverExecutablePath?.value ?? settings.serverExecutablePath,
    selectedNetworkAdapter: settings.selectedNetworkAdapter?.value 
      ? parseInt(settings.selectedNetworkAdapter.value) 
      : undefined,
  };
}

// Helper to check if backend settings changed
function backendSettingsChanged(oldSettings: any, newSettings: any): boolean {
  if (!oldSettings || !newSettings) return true;
  
  const oldBackend = extractBackendSettings(oldSettings);
  const newBackend = extractBackendSettings(newSettings);
  
  return JSON.stringify(oldBackend) !== JSON.stringify(newBackend);
}

// Handle settings updates
DeskThing.on(DESKTHING_EVENTS.SETTINGS, (settings) => {
  console.log("=== SETTINGS UPDATE RECEIVED ===");
  
  if (!settings?.payload) {
    console.log("No payload in settings");
    return;
  }

  const currentSettings = settings.payload;

  // Always forward settings to client for card configuration
  console.log("Forwarding settings to client");
  // @ts-ignore - Custom settings event
  DeskThing.send({ type: 'settings', payload: currentSettings });

  // Apply backend settings only once on initialization or when they actually change
  if (!initialBackendSettingsApplied) {
    console.log("Applying initial backend settings");
    backendController.updateSettings(currentSettings);
    initialBackendSettingsApplied = true;
    lastKnownSettings = currentSettings;
  } else {
    // Check if backend settings actually changed
    const backendChanged = backendSettingsChanged(lastKnownSettings, currentSettings);
    
    if (backendChanged) {
      console.log("Backend settings changed - updating backend controller");
      backendController.updateSettings(currentSettings);
    } else {
      console.log("Only card settings changed - no backend update needed");
    }
    
    lastKnownSettings = currentSettings;
  }
});

// Card-specific individual requests
DeskThing.on("requestCpuTemp", () => {
  console.log("Request CPU temperature");
  backendController.requestCpuTemp();
});

DeskThing.on("requestGpuTemp", () => {
  console.log("Request GPU temperature");
  backendController.requestGpuTemp();
});

DeskThing.on("requestCpuUsage", () => {
  console.log("Request CPU usage");
  backendController.requestCpuUsage();
});

DeskThing.on("requestMemoryLoad", () => {
  console.log("Request memory load");
  backendController.requestMemoryLoad();
});

DeskThing.on("requestMemoryUsed", () => {
  console.log("Request memory used");
  backendController.requestMemoryUsed();
});

DeskThing.on("requestGpuUsage", () => {
  console.log("Request GPU usage");
  backendController.requestGpuUsage();
});

// Legacy handlers
DeskThing.on("requestFullSensors", () => {
  console.log("Request full sensors");
  backendController.requestFullSensors();
});

DeskThing.on("requestRelevantSensors", () => {
  console.log("Request relevant sensors");
  backendController.requestRelevantSensors();
});

DeskThing.on("requestTemperatures", () => {
  console.log("Request temperatures");
  backendController.requestTemperatures();
});

DeskThing.on("requestUsageStats", () => {
  console.log("Request usage stats");
  backendController.requestUsageStats();
});

DeskThing.on("requestNetworkAdapters", () => {
  console.log("Request network adapters");
  backendController.requestNetworkAdapters();
});

DeskThing.on("requestNetworkDownload", (data: any) => {
  const sensorIndex = data?.payload;
  if (typeof sensorIndex === 'number') {
    console.log(`Request network download for adapter ${sensorIndex}`);
    backendController.requestNetworkDownload(sensorIndex);
  } else {
    console.warn("Invalid sensor index for network download request");
  }
});

DeskThing.on("requestNetworkUpload", (data: any) => {
  const sensorIndex = data?.payload;
  if (typeof sensorIndex === 'number') {
    console.log(`Request network upload for adapter ${sensorIndex}`);
    backendController.requestNetworkUpload(sensorIndex);
  } else {
    console.warn("Invalid sensor index for network upload request");
  }
});

DeskThing.on("requestNetworkRates", (data: any) => {
  const sensorIndex = data?.payload;
  if (typeof sensorIndex === 'number') {
    console.log(`Request network rates for adapter ${sensorIndex}`);
    backendController.requestNetworkRates(sensorIndex);
  } else {
    console.warn("Invalid sensor index for network rates request");
  }
});

DeskThing.on("setNetworkAdapter", (data: any) => {
  const sensorIndex = data?.payload;
  if (typeof sensorIndex === 'number') {
    console.log(`Set network adapter to ${sensorIndex}`);
    backendController.setNetworkAdapter(sensorIndex);
  } else {
    console.warn("Invalid sensor index for set network adapter");
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
    card1Type: {
      label: "Card 1 Data Type",
      id: "card1Type",
      value: "cpu-temp",
      description: "What data to display in Card 1",
      type: SETTING_TYPES.SELECT,
      options: [
        { label: "CPU Temperature", value: "cpu-temp" },
        { label: "GPU Temperature", value: "gpu-temp" },
        { label: "CPU Usage", value: "cpu-usage" },
        { label: "Memory Load", value: "memory-load" },
        { label: "GPU Usage", value: "gpu-usage" },
        { label: "Network Download", value: "network-download" },
        { label: "Network Upload", value: "network-upload" },
      ],
    },
    card2Type: {
      label: "Card 2 Data Type",
      id: "card2Type",
      value: "gpu-temp",
      description: "What data to display in Card 2",
      type: SETTING_TYPES.SELECT,
      options: [
        { label: "CPU Temperature", value: "cpu-temp" },
        { label: "GPU Temperature", value: "gpu-temp" },
        { label: "CPU Usage", value: "cpu-usage" },
        { label: "Memory Load", value: "memory-load" },
        { label: "GPU Usage", value: "gpu-usage" },
        { label: "Network Download", value: "network-download" },
        { label: "Network Upload", value: "network-upload" },
      ],
    },
    card3Type: {
      label: "Card 3 Data Type",
      id: "card3Type",
      value: "none",
      description: "What data to display in Card 3 (optional)",
      type: SETTING_TYPES.SELECT,
      options: [
        { label: "None", value: "none" },
        { label: "CPU Temperature", value: "cpu-temp" },
        { label: "GPU Temperature", value: "gpu-temp" },
        { label: "CPU Usage", value: "cpu-usage" },
        { label: "Memory Load", value: "memory-load" },
        { label: "GPU Usage", value: "gpu-usage" },
        { label: "Network Download", value: "network-download" },
        { label: "Network Upload", value: "network-upload" },
      ],
    },
    card4Type: {
      label: "Card 4 Data Type",
      id: "card4Type",
      value: "none",
      description: "What data to display in Card 4 (optional)",
      type: SETTING_TYPES.SELECT,
      options: [
        { label: "None", value: "none" },
        { label: "CPU Temperature", value: "cpu-temp" },
        { label: "GPU Temperature", value: "gpu-temp" },
        { label: "CPU Usage", value: "cpu-usage" },
        { label: "Memory Load", value: "memory-load" },
        { label: "GPU Usage", value: "gpu-usage" },
        { label: "Network Download", value: "network-download" },
        { label: "Network Upload", value: "network-upload" },
      ],
    },
      selectedNetworkAdapter: {
      label: "Network Adapter Sensor Index",
      id: "selectedNetworkAdapter",
      value: "0",
      description: "Enter the sensor index of your network adapter. After connecting, check the server logs to see all available adapters and their indices. Common values: 16 (first Ethernet), 17 (second Ethernet), 18 (Wi-Fi)",
      type: SETTING_TYPES.STRING,
    },
  };


  await DeskThing.initSettings(settings);
  settingsInitialized = true;
  console.log("Settings initialized");
};
const start = async () => {
  console.log("=== STARTING BACKEND CONNECTION APP ===");
  
  backendController.setDeskThing(DeskThing);
  await setupSettings();
  
  // Start backend controller but don't auto-connect yet
  // Wait for settings to be applied first
  console.log("Backend controller ready, waiting for settings...");
  
  console.log("=== BACKEND CONNECTION APP STARTED SUCCESSFULLY ===");
  
  // Send initial status after a delay
  setTimeout(() => {
    console.log("Sending initial status to client");
    const status = backendController.getStatus();
    DeskThing.send({ type: 'connectionStatus', payload: status });
    
    const logs = backendController.getLogs();
    DeskThing.send({ type: 'logs', payload: logs });
  }, 1000);
  
  // Request network adapters after connection is established
  setTimeout(() => {
    const status = backendController.getStatus();
    if (status.status === 'connected') {
      console.log("Connection established, requesting network adapters...");
      backendController.requestNetworkAdapters();
    }
  }, 6000); // Wait a bit longer to ensure connection is fully established
};


const stop = async () => {
  console.log("=== STOPPING BACKEND CONNECTION APP ===");
  await backendController.stop();
  
  // Reset state
  settingsInitialized = false;
  initialBackendSettingsApplied = false;
  lastKnownSettings = null;
};

// Register event handlers
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
DeskThing.on(DESKTHING_EVENTS.START, start);

console.log("=== SERVER FILE LOADED, WAITING FOR START EVENT ===");