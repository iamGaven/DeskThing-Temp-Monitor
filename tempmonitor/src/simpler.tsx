import { useEffect, useState } from "react";
import { ConnectionInfo, LogEntry } from "./types";

interface SimpleProps {
  connectionInfo: ConnectionInfo | null;
  logs: LogEntry[];
}

const Simple = ({ connectionInfo, logs }: SimpleProps) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Update time every second
    const updateTime = () => {
      const now = new Date();
      setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get status color and icon
  const getStatusDisplay = () => {
    if (!connectionInfo) {
      return {
        color: 'text-gray-400',
        bgColor: 'bg-gray-600',
        icon: '○',
        text: 'Unknown'
      };
    }

    switch (connectionInfo.status) {
      case 'connected':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-600',
          icon: '●',
          text: 'Connected'
        };
      case 'connecting':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-600',
          icon: '◐',
          text: 'Connecting...'
        };
      case 'error':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-600',
          icon: '✕',
          text: 'Error'
        };
      case 'disconnected':
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-600',
          icon: '○',
          text: 'Disconnected'
        };
    }
  };

  const status = getStatusDisplay();

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  // Get log level styling
  const getLogStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
      default:
        return 'text-blue-400';
    }
  };

  // Format last connected time
  const formatLastConnected = (): string => {
    if (!connectionInfo?.lastConnected) return 'Never';
    
    const now = Date.now();
    const diff = now - connectionInfo.lastConnected;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${status.bgColor} animate-pulse`}></div>
          <h1 className="text-4xl font-bold">Backend Connection</h1>
        </div>
        <div className="text-3xl font-mono font-light opacity-70">{time}</div>
      </div>

      {/* Connection Status Card */}
      <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-5xl ${status.color}`}>{status.icon}</span>
            <div>
              <h2 className="text-2xl font-semibold">{status.text}</h2>
              <p className="text-sm opacity-60">
                {connectionInfo?.url || 'No URL configured'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs opacity-60 mb-1">Last Connected</p>
            <p className="text-lg font-semibold">{formatLastConnected()}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs opacity-60 mb-1">Status</p>
            <p className={`text-lg font-semibold ${status.color}`}>
              {connectionInfo?.status || 'unknown'}
            </p>
          </div>
        </div>

        {connectionInfo?.lastError && (
          <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-xs opacity-60 mb-1">Last Error</p>
            <p className="text-sm text-red-400">{connectionInfo.lastError}</p>
          </div>
        )}
      </div>

      {/* Logs Section */}
      <div className="flex-1 bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50 overflow-hidden flex flex-col">
        <h2 className="text-2xl font-semibold mb-4">Activity Log</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full opacity-50">
              <p className="text-lg">No logs yet</p>
            </div>
          ) : (
            logs.slice().reverse().map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                className="bg-slate-900/50 rounded-lg p-3 hover:bg-slate-900/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs opacity-50 font-mono mt-0.5 whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className={`text-xs font-semibold uppercase mt-0.5 ${getLogStyle(log.level)}`}>
                    [{log.level}]
                  </span>
                  <p className="text-sm flex-1">{log.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-4 flex items-center justify-between text-sm opacity-60">
        <div>Total Logs: {logs.length}</div>
        <div>
          Errors: {logs.filter(l => l.level === 'error').length} | 
          Warnings: {logs.filter(l => l.level === 'warn').length}
        </div>
      </div>
    </div>
  );
};

export default Simple;