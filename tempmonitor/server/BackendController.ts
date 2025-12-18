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
  private connectionCheckTimeout: number = 2000; // 2 second timeout for connection checks
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3; // Disconnect after 3 consecutive failures
  
  // Fast reconnect settings
  private fastReconnectAttempts: number = 0;
  private maxFastReconnectAttempts: number = 10; // Try fast reconnects for first 10 attempts
  private fastReconnectInterval: number = 2; // 2 seconds for fast reconnects
  private reconnectBackoffMultiplier: number = 1.5; // Exponential backoff multiplier
  private maxReconnectInterval: number = 30; // Cap at 30 seconds
  
  private connectionStatus: ConnectionStatus = 'disconnected';
  private lastConnected: number | null = null;
  private lastSuccessfulPoll: number | null = null;
  private lastError: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  
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

  private async fetchWithTimeout(url: string, timeout: number = this.connectionCheckTimeout): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private handleConnectionLost(reason: string) {
    if (this.connectionStatus === 'connected') {
      this.connectionStatus = 'error';
      this.lastError = reason;
      this.addLog('error', `Connection lost: ${reason}`);
      this.sendConnectionStatus();
      this.stopPolling();
      this.stopHealthCheck();
      
      // Schedule reconnect if auto-connect is enabled
      if (this.autoConnect) {
        this.scheduleReconnect();
      }
    }
  }

  private startHealthCheck() {
    // Stop existing health check if any
    this.stopHealthCheck();

    // Check connection health every 5 seconds
    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      
      // If we haven't had a successful poll in the last 5 seconds, consider connection lost
      if (this.lastSuccessfulPoll && (now - this.lastSuccessfulPoll > 5000)) {
        this.handleConnectionLost('No response from server for 5 seconds');
      }
    }, 5000);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
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
      // Test connection by fetching CPU/GPU temps with timeout
      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/temps/cpu-gpu`);

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
      this.lastSuccessfulPoll = Date.now();
      this.lastError = null;
      this.consecutiveFailures = 0;
      this.fastReconnectAttempts = 0; // Reset fast reconnect counter on successful connection
      this.addLog('success', `Successfully connected to C# backend at ${this.backendUrl}`);
      this.sendConnectionStatus();
      
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Start polling for data and health monitoring
      this.startPolling();
      this.startHealthCheck();
      
    } catch (error) {
      this.connectionStatus = 'error';
      let errorMsg = error instanceof Error ? error.message : String(error);
      
      // Provide more specific error messages
      if (error instanceof Error && error.name === 'AbortError') {
        errorMsg = `Connection timeout (no response after ${this.connectionCheckTimeout}ms)`;
      } else if (errorMsg.includes('fetch')) {
        errorMsg = 'Unable to reach server (network error)';
      }
      
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
        // Fetch CPU/GPU temperatures with timeout
        const tempResponse = await this.fetchWithTimeout(`${this.backendUrl}/api/temps/cpu-gpu`);

        if (!tempResponse.ok) {
          throw new Error(`HTTP ${tempResponse.status}: ${tempResponse.statusText}`);
        }

        const tempData = await tempResponse.json();
        
        // Mark successful poll
        this.lastSuccessfulPoll = Date.now();
        this.consecutiveFailures = 0;
        
        // Forward temperature data to client
        if (this.DeskThing) {
          this.DeskThing.send({ 
            type: 'temperatureData', 
            payload: tempData 
          });
        }

        // Also fetch and send stats
        const statsResponse = await this.fetchWithTimeout(`${this.backendUrl}/api/stats`);

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
        this.consecutiveFailures++;
        
        let errorMsg = error instanceof Error ? error.message : String(error);
        
        // Provide more specific error messages
        if (error instanceof Error && error.name === 'AbortError') {
          errorMsg = `Request timeout (no response after ${this.connectionCheckTimeout}ms)`;
        } else if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
          errorMsg = 'Server unreachable (network error)';
        }
        
        this.addLog('error', `Polling error (${this.consecutiveFailures}/${this.maxConsecutiveFailures}): ${errorMsg}`);
        
        // If we've had too many consecutive failures, mark as disconnected
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.handleConnectionLost(`${this.maxConsecutiveFailures} consecutive polling failures`);
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
      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/sensors/all`);

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
      
      // Check if this indicates a lost connection
      if (errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.handleConnectionLost('Request failed - server may be down');
        }
      }
    }
  }

  public async requestRelevantSensors() {
    if (this.connectionStatus !== 'connected') {
      this.addLog('warn', 'Not connected to backend');
      return;
    }

    try {
      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/sensors/relevant`);

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
      
      // Check if this indicates a lost connection
      if (errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.handleConnectionLost('Request failed - server may be down');
        }
      }
    }
  }

  public async requestTemperatures() {
    if (this.connectionStatus !== 'connected') {
      this.addLog('warn', 'Not connected to backend');
      return;
    }

    try {
      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/temps/cpu-gpu`);

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
      
      // Check if this indicates a lost connection
      if (errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.handleConnectionLost('Request failed - server may be down');
        }
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Calculate reconnect delay with exponential backoff
    let delaySeconds: number;
    
    if (this.fastReconnectAttempts < this.maxFastReconnectAttempts) {
      // Fast reconnect phase: start at 2 seconds and use exponential backoff
      delaySeconds = this.fastReconnectInterval * Math.pow(
        this.reconnectBackoffMultiplier, 
        this.fastReconnectAttempts
      );
      // Cap at max interval
      delaySeconds = Math.min(delaySeconds, this.maxReconnectInterval);
    } else {
      // After fast attempts, use configured reconnect interval
      delaySeconds = this.reconnectInterval;
    }

    this.fastReconnectAttempts++;
    const delayMs = Math.round(delaySeconds * 1000);
    
    this.addLog('info', `Will retry connection in ${delaySeconds.toFixed(1)} seconds (attempt ${this.fastReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delayMs);
  }

  public async disconnect() {
    this.stopPolling();
    this.stopHealthCheck();
    
    this.connectionStatus = 'disconnected';
    this.lastSuccessfulPoll = null;
    this.consecutiveFailures = 0;
    this.fastReconnectAttempts = 0; // Reset fast reconnect counter
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