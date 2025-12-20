/**
 * Type definitions for Backend Connection DeskThing App
 */

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Log entry
export type LogEntry = {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
};

// Backend connection info
export type ConnectionInfo = {
  status: ConnectionStatus;
  url: string;
  lastConnected: number | null;
  lastError: string | null;
};

// Server status info
export type ServerStatus = {
  isRunning: boolean;
  executablePath: string;
};

// Usage metric from HWHash
export type UsageMetric = {
  name: string;
  value: number;
  unit: string;
};

// Usage data from /api/usage endpoint
export type UsageData = {
  timestamp: string;
  totalCpuUtility: UsageMetric | null;
  physicalMemoryLoad: UsageMetric | null;
  physicalMemoryUsed: UsageMetric | null;
  gpuCoreLoad: UsageMetric | null;
};

// Data types that can be subscribed to
export type SubscriptionDataType = 'temperature' | 'usage' | 'stats';

// Data sent to client from server
export type ToClientData = 
  | {
      type: 'connectionStatus';
      payload: ConnectionInfo;
    }
  | {
      type: 'serverStatus';
      payload: ServerStatus;
    }
  | {
      type: 'log';
      payload: LogEntry;
    }
  | {
      type: 'logs';
      payload: LogEntry[];
    }
  | {
      type: 'usageData';
      payload: UsageData;
    }
  | {
      type: 'sensorData';
      payload: any; // Sensor updates from C# SignalR
    }
  | {
      type: 'statsData';
      payload: any; // Stats updates from C# SignalR
    }
  | {
      type: 'fullSensorData';
      payload: any; // Full sensor data from C# SignalR
    }
  | {
      type: 'relevantSensorData';
      payload: any; // Relevant sensor data from C# SignalR
    }
  | {
      type: 'temperatureData';
      payload: any; // Temperature data from C# SignalR
    }
  | {
      type: 'backendError';
      payload: { message: string };
    };

// Data sent from client to server
export type GenericTransitData = 
  | {
      type: 'get';
      request: 'status' | 'logs' | 'serverStatus';
      payload?: string;
    }
  | {
      type: 'connect';
      payload?: string;
    }
  | {
      type: 'disconnect';
      payload?: string;
    }
  | {
      type: 'startServer';
      payload?: string;
    }
  | {
      type: 'stopServer';
      payload?: string;
    }
  | {
      type: 'restartServer';
      payload?: string;
    }
  | {
      type: 'clearLogs';
      payload?: string;
    }
  | {
      type: 'subscribe';
      request: SubscriptionDataType; // Use 'request' field like 'get' does
      payload?: string;
    }
  | {
      type: 'unsubscribe';
      request: SubscriptionDataType; // Use 'request' field like 'get' does
      payload?: string;
    }
  | {
      type: 'requestFullSensors';
      payload?: string;
    }
  | {
      type: 'requestRelevantSensors';
      payload?: string;
    }
  | {
      type: 'requestUsageStats';
      payload?: string;
    }
  | {
      type: 'requestTemperatures';
      payload?: string;
    };

// App settings
export type BackendSettings = {
  backendUrl: string;
  autoConnect: boolean;
  autoStartServer: boolean;
  serverExecutablePath: string;
  reconnectInterval: number;
  maxLogs: number;
};