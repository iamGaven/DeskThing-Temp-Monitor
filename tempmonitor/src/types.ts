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

// Data sent to client from server
export type ToClientData = 
  | {
      type: 'connectionStatus';
      payload: ConnectionInfo;
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
      request: 'status' | 'logs';
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
      type: 'clearLogs';
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
      type: 'requestTemperatures';
      payload?: string;
    };

// App settings
export type BackendSettings = {
  backendUrl: string;
  autoConnect: boolean;
  reconnectInterval: number;
  maxLogs: number;
};