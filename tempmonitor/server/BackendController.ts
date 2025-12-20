import { DeskThingClass } from "@deskthing/server";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { 
  ToClientData, 
  GenericTransitData, 
  ConnectionStatus, 
  ConnectionInfo, 
  LogEntry,
  UsageData

} from "./types";
import os from 'os';


class BackendController {
  private static instance: BackendController | null = null;
  private DeskThing: DeskThingClass<GenericTransitData, ToClientData> | null = null;
  
  private backendUrl: string = "http://localhost:5000";
  private autoConnect: boolean = true;
  private autoStartServer: boolean = true; // New: Auto-start C# server
  private reconnectInterval: number = 30;
  private maxLogs: number = 100;
  private pollInterval: number = 500;
  private connectionCheckTimeout: number = 2000;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;
  
  // Fast reconnect settings
  private fastReconnectAttempts: number = 0;
  private maxFastReconnectAttempts: number = 10;
  private fastReconnectInterval: number = 2;
  private reconnectBackoffMultiplier: number = 1.5;
  private maxReconnectInterval: number = 30;
  
  // C# Server process management
  private serverProcess: ChildProcess | null = null;
  private serverExecutablePath: string = "";
  private isServerRunning: boolean = false;
  private serverStartupDelay: number = 3000; // Wait 3 seconds after starting server
  
  private connectionStatus: ConnectionStatus = 'disconnected';
  private lastConnected: number | null = null;
  private lastSuccessfulPoll: number | null = null;
  private lastError: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  
  private logs: LogEntry[] = [];

private constructor() {
  // Set default server path (can be overridden in settings)
  const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
  this.serverExecutablePath = path.join(appData, "deskthing", "apps", "tempmonitor", "client", "HWInfoBridge.exe");
}

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

  private sendServerStatus() {
    if (this.DeskThing) {
      this.DeskThing.send({ 
        type: 'serverStatus', 
        payload: { 
          isRunning: this.isServerRunning,
          executablePath: this.serverExecutablePath
        } 
      });
    }
  }

  // Check if C# server executable exists
  private checkServerExecutable(): boolean {
    if (!this.serverExecutablePath) {
      this.addLog('error', 'No server executable path configured');
      return false;
    }

    if (!fs.existsSync(this.serverExecutablePath)) {
      this.addLog('error', `Server executable not found at: ${this.serverExecutablePath}`);
      return false;
    }

    return true;
  }

  // Start the C# server process
  public async startServer(): Promise<boolean> {
    if (this.isServerRunning) {
      this.addLog('warn', 'Server is already running');
      return true;
    }

    if (!this.checkServerExecutable()) {
      return false;
    }

    this.addLog('info', `Starting C# server from: ${this.serverExecutablePath}`);

    try {
      // Spawn the C# server process
      this.serverProcess = spawn(this.serverExecutablePath, [], {
        cwd: path.dirname(this.serverExecutablePath),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle server output
      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.addLog('info', `[C# Server] ${output}`);
        }
      });

      // Handle server errors
      this.serverProcess.stderr?.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          this.addLog('error', `[C# Server Error] ${error}`);
        }
      });

      // Handle process exit
      this.serverProcess.on('exit', (code) => {
        this.isServerRunning = false;
        this.sendServerStatus();
        
        if (code === 0) {
          this.addLog('info', 'C# server stopped gracefully');
        } else {
          this.addLog('error', `C# server exited with code ${code}`);
        }

        // If we were connected, mark as disconnected
        if (this.connectionStatus === 'connected') {
          this.handleConnectionLost('Server process terminated');
        }
      });

      // Handle process errors
      this.serverProcess.on('error', (err) => {
        this.addLog('error', `Failed to start C# server: ${err.message}`);
        this.isServerRunning = false;
        this.sendServerStatus();
      });

      this.isServerRunning = true;
      this.sendServerStatus();
      this.addLog('success', 'C# server process started');

      // Wait for server to initialize
      this.addLog('info', `Waiting ${this.serverStartupDelay}ms for server to initialize...`);
      await new Promise(resolve => setTimeout(resolve, this.serverStartupDelay));

      return true;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Failed to start C# server: ${errorMsg}`);
      this.isServerRunning = false;
      this.sendServerStatus();
      return false;
    }
  }

  // Stop the C# server process
  public async stopServer(): Promise<void> {
    if (!this.serverProcess || !this.isServerRunning) {
      this.addLog('warn', 'Server is not running');
      return;
    }

    this.addLog('info', 'Stopping C# server...');

    try {
      // Try graceful shutdown first
      this.serverProcess.kill('SIGTERM');
      
      // Wait up to 5 seconds for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.serverProcess && this.isServerRunning) {
            this.addLog('warn', 'Forcing C# server to stop...');
            this.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.serverProcess?.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.serverProcess = null;
      this.isServerRunning = false;
      this.sendServerStatus();
      this.addLog('success', 'C# server stopped');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Error stopping server: ${errorMsg}`);
    }
  }

  // Restart the C# server
  public async restartServer(): Promise<boolean> {
    this.addLog('info', 'Restarting C# server...');
    await this.stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    return await this.startServer();
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
    this.stopHealthCheck();

    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      
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

    // If auto-start is enabled and server is not running, start it first
    if (this.autoStartServer && !this.isServerRunning) {
      this.addLog('info', 'Auto-starting C# server...');
      const started = await this.startServer();
      if (!started) {
        this.addLog('error', 'Failed to auto-start server. Cannot connect.');
        return;
      }
    }

    this.connectionStatus = 'connecting';
    this.sendConnectionStatus();
    this.addLog('info', `Connecting to C# backend at ${this.backendUrl}...`);

    try {
      const response = await this.fetchWithTimeout(`${this.backendUrl}/api/temps/cpu-gpu`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.addLog('success', `Connection test successful!`);
      this.addLog('info', `CPU: ${data.cpu?.name} - ${data.cpu?.value}${data.cpu?.unit} (Min: ${data.cpu?.min}${data.cpu?.unit}, Max: ${data.cpu?.max}${data.cpu?.unit})`);
      this.addLog('info', `GPU: ${data.gpu?.name} - ${data.gpu?.value}${data.gpu?.unit} (Min: ${data.gpu?.min}${data.gpu?.unit}, Max: ${data.gpu?.max}${data.gpu?.unit})`);
      
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
      this.fastReconnectAttempts = 0;
      this.addLog('success', `Successfully connected to C# backend at ${this.backendUrl}`);
      this.sendConnectionStatus();
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.startPolling();
      this.startHealthCheck();
      
    } catch (error) {
      this.connectionStatus = 'error';
      let errorMsg = error instanceof Error ? error.message : String(error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        errorMsg = `Connection timeout (no response after ${this.connectionCheckTimeout}ms)`;
      } else if (errorMsg.includes('fetch')) {
        errorMsg = 'Unable to reach server (network error)';
      }
      
      this.lastError = errorMsg;
      this.addLog('error', `Failed to connect to C# backend: ${errorMsg}`);
      this.sendConnectionStatus();
      
      if (this.autoConnect) {
        this.scheduleReconnect();
      }
    }
  }
private startPolling() {
    this.stopPolling();

    this.addLog('info', `Started polling C# backend every ${this.pollInterval}ms`);

    const poll = async () => {
      try {
        // Fetch temperature data
        const tempResponse = await this.fetchWithTimeout(`${this.backendUrl}/api/temps/cpu-gpu`);

        if (!tempResponse.ok) {
          throw new Error(`HTTP ${tempResponse.status}: ${tempResponse.statusText}`);
        }

        const tempData = await tempResponse.json();
        
        this.lastSuccessfulPoll = Date.now();
        this.consecutiveFailures = 0;
        
        if (this.DeskThing) {
          this.DeskThing.send({ 
            type: 'temperatureData', 
            payload: tempData 
          });
        }

        // Fetch usage stats
        const usageResponse = await this.fetchWithTimeout(`${this.backendUrl}/api/usage`);
        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          if (this.DeskThing) {
            this.DeskThing.send({ 
              type: 'usageData', 
              payload: usageData 
            });
          }
        }

        // Fetch general stats
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
        
        if (error instanceof Error && error.name === 'AbortError') {
          errorMsg = `Request timeout (no response after ${this.connectionCheckTimeout}ms)`;
        } else if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
          errorMsg = 'Server unreachable (network error)';
        }
        
        this.addLog('error', `Polling error (${this.consecutiveFailures}/${this.maxConsecutiveFailures}): ${errorMsg}`);
        
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.handleConnectionLost(`${this.maxConsecutiveFailures} consecutive polling failures`);
        }
      }
    };

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
      
      if (errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.handleConnectionLost('Request failed - server may be down');
        }
      }
    }
  }

  public async requestUsageStats() {
  if (this.connectionStatus !== 'connected') {
    this.addLog('warn', 'Not connected to backend');
    return;
  }

  try {
    const response = await this.fetchWithTimeout(`${this.backendUrl}/api/usage`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: UsageData = await response.json();
    
    if (this.DeskThing) {
      this.DeskThing.send({ 
        type: 'usageData', 
        payload: data 
      });
    }
    
    this.addLog('info', `Usage - CPU: ${data.totalCpuUtility?.value.toFixed(1)}${data.totalCpuUtility?.unit}, Memory: ${data.physicalMemoryLoad?.value.toFixed(1)}${data.physicalMemoryLoad?.unit}, GPU: ${data.gpuCoreLoad?.value.toFixed(1)}${data.gpuCoreLoad?.unit}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.addLog('error', `Failed to request usage stats: ${errorMsg}`);
    
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

    let delaySeconds: number;
    
    if (this.fastReconnectAttempts < this.maxFastReconnectAttempts) {
      delaySeconds = this.fastReconnectInterval * Math.pow(
        this.reconnectBackoffMultiplier, 
        this.fastReconnectAttempts
      );
      delaySeconds = Math.min(delaySeconds, this.maxReconnectInterval);
    } else {
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
    this.fastReconnectAttempts = 0;
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

  public getServerStatus() {
    return {
      isRunning: this.isServerRunning,
      executablePath: this.serverExecutablePath
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
      const newAutoStartServer = Boolean(settings.autoStartServer?.value ?? settings.autoStartServer ?? true);
      const newReconnectInterval = parseInt(String(settings.reconnectInterval?.value ?? settings.reconnectInterval ?? "30"));
      const newMaxLogs = parseInt(String(settings.maxLogs?.value ?? settings.maxLogs ?? "100"));
      const newServerPath = String(settings.serverExecutablePath?.value ?? settings.serverExecutablePath ?? this.serverExecutablePath);

      const urlChanged = newUrl !== this.backendUrl;
      const serverPathChanged = newServerPath !== this.serverExecutablePath;
      
      this.backendUrl = newUrl;
      this.autoConnect = newAutoConnect;
      this.autoStartServer = newAutoStartServer;
      this.reconnectInterval = newReconnectInterval;
      this.maxLogs = newMaxLogs;
      this.serverExecutablePath = newServerPath;

      this.addLog('info', `Settings updated - URL: ${this.backendUrl}, Auto-connect: ${this.autoConnect}, Auto-start: ${this.autoStartServer}`);

      if (serverPathChanged) {
        this.addLog('info', `Server path updated: ${this.serverExecutablePath}`);
      }

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
    
    if (this.autoStartServer && this.autoConnect && this.backendUrl) {
      this.startServer().then(() => {
        this.connect();
      });
    } else if (this.autoConnect && this.backendUrl) {
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
    await this.stopServer();
  }
}

export default BackendController.getInstance();