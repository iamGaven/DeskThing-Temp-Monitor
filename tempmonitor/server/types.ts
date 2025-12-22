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

// Temperature metric from HWHash
export type TemperatureMetric = {
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg?: number;
};

// Individual temperature data
export type CpuTemperatureData = {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

export type GpuTemperatureData = {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

// Combined temperature data (existing endpoint)
export type CombinedTemperatureData = {
  timestamp: string;
  cpu: TemperatureMetric | null;
  gpu: TemperatureMetric | null;
};

// Usage metric from HWHash
export type UsageMetric = {
  name: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  avg?: number;
};

// Individual usage data types
export type CpuUsageData = {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

export type MemoryLoadData = {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

export type MemoryUsedData = {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

export type GpuUsageData = {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

// Combined usage data (existing endpoint)
export type CombinedUsageData = {
  timestamp: string;
  totalCpuUtility: UsageMetric | null;
  physicalMemoryLoad: UsageMetric | null;
  physicalMemoryUsed: UsageMetric | null;
  gpuCoreLoad: UsageMetric | null;
};


// Network adapter info
export type NetworkAdapter = {
  parentName: string;
  parentCustomName: string;
  parentInstance: number;
  sensorIndex: number;
};

// Network adapters list
export type NetworkAdaptersData = {
  timestamp: string;
  count: number;
  adapters: NetworkAdapter[];
};

// Network download rate data
export type NetworkDownloadData = {
  timestamp: string;
  name: string;
  adapter: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

// Network upload rate data
export type NetworkUploadData = {
  timestamp: string;
  name: string;
  adapter: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
};

// Combined network rates data
export type NetworkRatesData = {
  timestamp: string;
  adapter: string;
  download: {
    value: number;
    unit: string;
    min: number;
    max: number;
    avg: number;
  } | null;
  upload: {
    value: number;
    unit: string;
    min: number;
    max: number;
    avg: number;
  } | null;
};

// Update SubscriptionDataType to include network types:
export type SubscriptionDataType = 
  | 'temperature' 
  | 'usage' 
  | 'stats'
  | 'cpu-temp'
  | 'gpu-temp'
  | 'cpu-usage'
  | 'memory-load'
  | 'memory-used'
  | 'gpu-usage'
  | 'network-download'
  | 'network-upload';


export type AppSettingsPayload = {
  backendUrl?: string | { value: string };
  autoConnect?: boolean | { value: boolean };
  reconnectInterval?: number | { value: number };
  maxLogs?: number | { value: number };
  card1Type?: string | { value: string };
  card2Type?: string | { value: string };
  card3Type?: string | { value: string };
  card4Type?: string | { value: string };
  selectedNetworkAdapter?: string | { value: string }; // Add this line
};
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
      payload: CombinedUsageData;
    }
  | {
      type: 'cpuUsageData';
      payload: CpuUsageData;
    }
  | {
      type: 'memoryLoadData';
      payload: MemoryLoadData;
    }
  | {
      type: 'memoryUsedData';
      payload: MemoryUsedData;
    }
  | {
      type: 'gpuUsageData';
      payload: GpuUsageData;
    }
  | {
      type: 'temperatureData';
      payload: CombinedTemperatureData;
    }
  | {
      type: 'cpuTemperatureData';
      payload: CpuTemperatureData;
    }
  | {
      type: 'gpuTemperatureData';
      payload: GpuTemperatureData;
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
      type: 'backendError';
      payload: { message: string };
    }
  | {
      type: 'networkAdaptersData';
      payload: NetworkAdaptersData;
    }
  | {
      type: 'networkDownloadData';
      payload: NetworkDownloadData;
    }
  | {
      type: 'networkUploadData';
      payload: NetworkUploadData;
    }
  | {
      type: 'networkRatesData';
      payload: NetworkRatesData;
    }
  | {
      type: 'settings';
      payload: AppSettingsPayload;
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
      request: SubscriptionDataType;
      payload?: string;
    }
  | {
      type: 'unsubscribe';
      request: SubscriptionDataType;
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
    }
  | {
      type: 'requestCpuTemp';
      payload?: string;
    }
  | {
      type: 'requestGpuTemp';
      payload?: string;
    }
  | {
      type: 'requestCpuUsage';
      payload?: string;
    }
  | {
      type: 'requestMemoryLoad';
      payload?: string;
    }
  | {
      type: 'requestMemoryUsed';
      payload?: string;
    }
  | {
      type: 'requestGpuUsage';
      payload?: string;
    }
  | {
      type: 'requestNetworkAdapters';
      payload?: string;
    }
  | {
      type: 'requestNetworkDownload';
      payload: number; // sensorIndex
    }
  | {
      type: 'requestNetworkUpload';
      payload: number; // sensorIndex
    }
  | {
      type: 'requestNetworkRates';
      payload: number; // sensorIndex
    }
  | {
      type: 'setNetworkAdapter';
      payload: number; // sensorIndex
    };
// App settings
export type BackendSettings = {
  backendUrl: string;
  autoConnect: boolean;
  autoStartServer: boolean;
  serverExecutablePath: string;
  reconnectInterval: number;
  maxLogs: number;
  selectedNetworkAdapter?: number; // Add this line
  card1Type?: string;
  card2Type?: string;
  card3Type?: string;
  card4Type?: string;
};