import { DeskThingClass } from "@deskthing/server";
import { 
  ToClientData, 
  GenericTransitData, 
  ConnectionStatus, 
  ConnectionInfo, 
  LogEntry 
} from "./types";

class BackendController {
  private static instance: BackendController | null = null;
  private DeskThing: DeskThingClass<GenericTransitData, ToClientData> | null = null;
  
  private backendUrl: string = "http://localhost:5000";
  private autoConnect: boolean = true;
  private reconnectInterval: number = 30;
  private maxLogs: number = 100;
  private pollInterval: number = 500; // Poll every 500ms to match C# broadcast rate
  
  private connectionStatus: ConnectionStatus = 'disconnected';
  private lastConnected: number | null = null;
  private lastError: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): BackendController {
    if (!BackendController.instance) {
      BackendController.instance = new BackendController();
    }
    return BackendController.instance;
  }

  public setDeskThing(deskThing: DeskThingClass<GenericTransitData, ToClientData>) {
    this.DeskThing = deskThing;
  }

  private addLog(level: LogEntry['level'], message: string) {
    const log: LogEntry = {
      timestamp: Date.now(),
      level,
      message
    };
    
    this.logs.push(log);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    if (this.DeskThing) {
      this.DeskThing.send({ type: 'log', payload: log });
    }
    
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  private sendConnectionStatus() {
    const info: ConnectionInfo = {
      status: this.connectionStatus,
      url: this.backendUrl,
      lastConnected: this.lastConnected,
      lastError: this.lastError
    };
    
    if (this.DeskThing) {
      this.DeskThing.send({ type: 'connectionStatus', payload: info });
    }
  }

  public async connect() {
    if (!this.backendUrl) {
      this.addLog('error', 'No backend URL configured');
      return;
    }

    if (this.connectionStatus === 'connecting') {
      this.addLog('warn', 'Already attempting to connect');
      return;
    }

    this.connectionStatus = 'connecting';
    this.sendConnectionStatus();
    this.addLog('info', `Connecting to C# backend at ${this.backendUrl}...`);

    try {
      // Test connection by fetching CPU/GPU temps
      const response = await fetch(`${this.backendUrl}/api/temps/cpu-gpu`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log the temperature data
      this.addLog('success', `Connection test successful!`);
      this.addLog('info', `CPU: ${data.cpu?.name} - ${data.cpu?.value}${data.cpu?.unit} (Min: ${data.cpu?.min}${data.cpu?.unit}, Max: ${data.cpu?.max}${data.cpu?.unit})`);
      this.addLog('info', `GPU: ${data.gpu?.name} - ${data.gpu?.value}${data.gpu?.unit} (Min: ${data.gpu?.min}${data.gpu?.unit}, Max: ${data.gpu?.max}${data.gpu?.unit})`);
      
      // Send temperature data to client
      if (this.DeskThing) {
        this.DeskThing.send({ 
          type: 'temperatureData', 
          payload: data 
        });
      }

      this.connectionStatus = 'connected';
      this.lastConnected = Date.now();
      this.lastError = null;
      this.addLog('success', `Successfully connected to C# backend at ${this.backendUrl}`);
      this.sendConnectionStatus();
      
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Start polling for data
      this.startPolling();
      
    } catch (error) {
      this.connectionStatus = 'error';
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.lastError = errorMsg;
      this.addLog('error', `Failed to connect to C# backend: ${errorMsg}`);
      this.sendConnectionStatus();
      
      // Schedule reconnect if auto-connect is enabled
      if (this.autoConnect) {
        this.scheduleReconnect();
      }
    }
  }

  private startPolling() {
    // Stop existing polling if any
    this.stopPolling();

    this.addLog('info', `Started polling C# backend every ${this.pollInterval}ms`);

    const poll = async () => {
      try {
        // Fetch CPU/GPU temperatures
        const tempResponse = await fetch(`${this.backendUrl}/api/temps/cpu-gpu`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!tempResponse.ok) {
          throw new Error(`HTTP ${tempResponse.status}: ${tempResponse.statusText}`);
        }

        const tempData = await tempResponse.json();
        
        // Forward temperature data to client
        if (this.DeskThing) {
          this.DeskThing.send({ 
            type: 'temperatureData', 
            payload: tempData 
          });
        }

        // Also fetch and send stats
        const statsResponse = await fetch(`${this.backendUrl}/api/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (this.DeskThing) {
            this.DeskThing.send({ 
              type: 'statsData', 
              payload: statsData 
            });
          }
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.addLog('error', `Polling error: ${errorMsg}`);
        this.connectionStatus = 'error';
        this.lastError = errorMsg;
        this.sendConnectionStatus();
        this.stopPolling();
        
        // Schedule reconnect
        if (this.autoConnect) {
          this.scheduleReconnect();
        }
      }
    };

    // Start polling immediately, then repeat
    poll();
    this.pollTimer = setInterval(poll, this.pollInterval);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.addLog('info', 'Stopped polling C# backend');
    }
  }

  // Method to request specific data from C# backend
  public async requestFullSensors() {
    if (this.connectionStatus !== 'connected') {
      this.addLog('warn', 'Not connected to backend');
      return;
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/sensors/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.DeskThing && data.sensors) {
        this.DeskThing.send({ 
          type: 'fullSensorData', 
          payload: data.sensors 
        });
      }
      
      this.addLog('info', 'Requested full sensors from backend');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Failed to request full sensors: ${errorMsg}`);
    }
  }

  public async requestRelevantSensors() {
    if (this.connectionStatus !== 'connected') {
      this.addLog('warn', 'Not connected to backend');
      return;
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/sensors/relevant`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.DeskThing && data.sensors) {
        this.DeskThing.send({ 
          type: 'relevantSensorData', 
          payload: data.sensors 
        });
      }
      
      this.addLog('info', 'Requested relevant sensors from backend');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Failed to request relevant sensors: ${errorMsg}`);
    }
  }

  public async requestTemperatures() {
    if (this.connectionStatus !== 'connected') {
      this.addLog('warn', 'Not connected to backend');
      return;
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/temps/cpu-gpu`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.DeskThing) {
        this.DeskThing.send({ 
          type: 'temperatureData', 
          payload: data 
        });
      }
      
      this.addLog('info', `CPU: ${data.cpu?.value}${data.cpu?.unit}, GPU: ${data.gpu?.value}${data.gpu?.unit}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Failed to request temperatures: ${errorMsg}`);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delayMs = this.reconnectInterval * 1000;
    this.addLog('info', `Will retry connection in ${this.reconnectInterval} seconds`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delayMs);
  }

  public async disconnect() {
    this.stopPolling();
    
    this.connectionStatus = 'disconnected';
    this.addLog('info', 'Disconnected from backend');
    this.sendConnectionStatus();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public getStatus(): ConnectionInfo {
    return {
      status: this.connectionStatus,
      url: this.backendUrl,
      lastConnected: this.lastConnected,
      lastError: this.lastError
    };
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('info', 'Logs cleared');
    
    if (this.DeskThing) {
      this.DeskThing.send({ type: 'logs', payload: [] });
    }
  }

  public updateSettings(settings: any) {
    if (!settings) {
      this.addLog('warn', 'No settings provided');
      return;
    }

    try {
      const newUrl = String(settings.backendUrl?.value ?? settings.backendUrl ?? "http://localhost:5000");
      const newAutoConnect = Boolean(settings.autoConnect?.value ?? settings.autoConnect ?? true);
      const newReconnectInterval = parseInt(String(settings.reconnectInterval?.value ?? settings.reconnectInterval ?? "30"));
      const newMaxLogs = parseInt(String(settings.maxLogs?.value ?? settings.maxLogs ?? "100"));

      const urlChanged = newUrl !== this.backendUrl;
      
      this.backendUrl = newUrl;
      this.autoConnect = newAutoConnect;
      this.reconnectInterval = newReconnectInterval;
      this.maxLogs = newMaxLogs;

      this.addLog('info', `Settings updated - URL: ${this.backendUrl}, Auto-connect: ${this.autoConnect}`);

      // If URL changed and we were connected, reconnect
      if (urlChanged && this.connectionStatus === 'connected') {
        this.disconnect();
        if (newUrl) {
          this.connect();
        }
      } else if (newAutoConnect && newUrl && this.connectionStatus === 'disconnected') {
        this.connect();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Error updating settings: ${errorMsg}`);
    }
  }

  public start() {
    this.addLog('info', 'Backend controller started');
    
    if (this.autoConnect && this.backendUrl) {
      this.connect();
    }
  }

  public async stop() {
    this.addLog('info', 'Backend controller stopped');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    await this.disconnect();
  }
}

export default BackendController.getInstance();