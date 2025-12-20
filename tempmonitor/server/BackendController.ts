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
  private autoStartServer: boolean = true;
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
  private serverStartupDelay: number = 3000;
  
  private connectionStatus: ConnectionStatus = 'disconnected';
  private lastConnected: number | null = null;
  private lastSuccessfulPoll: number | null = null;
  private lastError: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  
  private logs: LogEntry[] = [];

  // NEW: Active subscriptions - what data should we poll?
  private activeSubscriptions: Set<'temperature' | 'usage' | 'stats'> = new Set();

  private constructor() {
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

  // NEW: Subscribe to specific data types
  public subscribe(dataType: 'temperature' | 'usage' | 'stats') {
    const wasEmpty = this.activeSubscriptions.size === 0;
    this.activeSubscriptions.add(dataType);
    
    this.addLog('info', `Subscribed to ${dataType} data`);
    
    // If this is the first subscription and we're connected, start polling
    if (wasEmpty && this.connectionStatus === 'connected') {
      this.startPolling();
    }
  }

  // NEW: Unsubscribe from specific data types
  public unsubscribe(dataType: 'temperature' | 'usage' | 'stats') {
    this.activeSubscriptions.delete(dataType);
    
    this.addLog('info', `Unsubscribed from ${dataType} data`);
    
    // If no more subscriptions, stop polling
    if (this.activeSubscriptions.size === 0) {
      this.stopPolling();
    }
  }

  // NEW: Clear all subscriptions
  public clearSubscriptions() {
    this.activeSubscriptions.clear();
    this.stopPolling();
    this.addLog('info', 'Cleared all subscriptions');
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
      this.serverProcess = spawn(this.serverExecutablePath, [], {
        cwd: path.dirname(this.serverExecutablePath),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.addLog('info', `[C# Server] ${output}`);
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          this.addLog('error', `[C# Server Error] ${error}`);
        }
      });

      this.serverProcess.on('exit', (code) => {
        this.isServerRunning = false;
        this.sendServerStatus();
        
        if (code === 0) {
          this.addLog('info', 'C# server stopped gracefully');
        } else {
          this.addLog('error', `C# server exited with code ${code}`);
        }

        if (this.connectionStatus === 'connected') {
          this.handleConnectionLost('Server process terminated');
        }
      });

      this.serverProcess.on('error', (err) => {
        this.addLog('error', `Failed to start C# server: ${err.message}`);
        this.isServerRunning = false;
        this.sendServerStatus();
      });

      this.isServerRunning = true;
      this.sendServerStatus();
      this.addLog('success', 'C# server process started');

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

  public async stopServer(): Promise<void> {
    if (!this.serverProcess || !this.isServerRunning) {
      this.addLog('warn', 'Server is not running');
      return;
    }

    this.addLog('info', 'Stopping C# server...');

    try {
      this.serverProcess.kill('SIGTERM');
      
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

  public async restartServer(): Promise<boolean> {
    this.addLog('info', 'Restarting C# server...');
    await this.stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
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
      this.addLog('info', `CPU: ${data.cpu?.name} - ${data.cpu?.value}${data.cpu?.unit}`);
      this.addLog('info', `GPU: ${data.gpu?.name} - ${data.gpu?.value}${data.gpu?.unit}`);
      
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

      // Only start polling if we have active subscriptions
      if (this.activeSubscriptions.size > 0) {
        this.startPolling();
      }
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

    // Don't start polling if no subscriptions
    if (this.activeSubscriptions.size === 0) {
      this.addLog('info', 'No active subscriptions, skipping polling');
      return;
    }

    this.addLog('info', `Started polling C# backend every ${this.pollInterval}ms for: ${Array.from(this.activeSubscriptions).join(', ')}`);

    const poll = async () => {
      try {
        // Poll temperature data if subscribed
        if (this.activeSubscriptions.has('temperature')) {
          const tempResponse = await this.fetchWithTimeout(`${this.backendUrl}/api/temps/cpu-gpu`);

          if (!tempResponse.ok) {
            throw new Error(`HTTP ${tempResponse.status}: ${tempResponse.statusText}`);
          }

          const tempData = await tempResponse.json();
          
          if (this.DeskThing) {
            this.DeskThing.send({ 
              type: 'temperatureData', 
              payload: tempData 
            });
          }
        }

        // Poll usage data if subscribed
        if (this.activeSubscriptions.has('usage')) {
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
        }

        // Poll stats data if subscribed
        if (this.activeSubscriptions.has('stats')) {
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
        }

        this.lastSuccessfulPoll = Date.now();
        this.consecutiveFailures = 0;

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
    
    // DON'T automatically subscribe on start - let the frontend control subscriptions
    // this.subscribe('temperature'); // REMOVED
    
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
    
    this.clearSubscriptions();
    await this.disconnect();
    await this.stopServer();
  }
}

export default BackendController.getInstance();