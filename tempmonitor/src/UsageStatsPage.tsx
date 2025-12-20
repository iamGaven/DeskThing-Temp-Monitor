import { useEffect, useState } from "react";
import { ConnectionInfo } from "./types";

interface UsageMetric {
  name: string;
  value: number;
  unit: string;
}

interface UsageData {
  timestamp: string;
  totalCpuUtility: UsageMetric | null;
  physicalMemoryLoad: UsageMetric | null;
  physicalMemoryUsed: UsageMetric | null;
  gpuCoreLoad: UsageMetric | null;
}

interface UsageStatsPageProps {
  connectionInfo: ConnectionInfo | null;
  usageData: UsageData | null;
}

const UsageStatsPage = ({ connectionInfo, usageData }: UsageStatsPageProps) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!connectionInfo) return 'bg-gray-500';
    switch (connectionInfo.status) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  const getUsageColor = (value: number) => {
    if (value >= 90) return 'from-rose-500 to-red-600';
    if (value >= 75) return 'from-orange-500 to-orange-600';
    if (value >= 50) return 'from-amber-500 to-yellow-600';
    return 'from-emerald-500 to-teal-600';
  };

  const getUsageGlow = (value: number) => {
    if (value >= 90) return 'shadow-rose-500/30';
    if (value >= 75) return 'shadow-orange-500/30';
    if (value >= 50) return 'shadow-amber-500/30';
    return 'shadow-emerald-500/30';
  };

  return (
    <div className="w-full h-full bg-black text-white flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-90"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-2">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-2">
          {/* Time */}
          <div className="text-lg font-extralight tracking-wider text-slate-300">
            {time}
          </div>

          {/* Connection Status - Compact */}
          <div className="flex items-center px-3 py-1 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/30">
            <div
              className={`w-3 h-3 rounded-full ${
                getStatusColor() +
                (connectionInfo?.status === 'connected' ? ' animate-pulse' : '')
              }`}
              style={{ marginRight: '6px' }}
            ></div>

            <span className="text-xs text-slate-400 uppercase tracking-wider">
              {connectionInfo?.status || 'offline'}
            </span>
          </div>
        </div>

        {/* Usage Stats Cards - 2x2 Grid */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {usageData ? (
            <div className="grid grid-cols-2 gap-2 w-full h-full">
              
              {/* CPU Usage Card */}
              {usageData.totalCpuUtility && (
                <div className="group relative flex items-center justify-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${getUsageColor(usageData.totalCpuUtility.value)} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`}></div>
                  <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-lg p-2 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg ${getUsageGlow(usageData.totalCpuUtility.value)} w-full h-full flex flex-col`}>
                    <div className="flex flex-col items-center justify-center h-full">
                      {/* Label */}
                      <div className="text-blue-400 text-sm font-bold uppercase tracking-wider">
                        CPU
                      </div>

                      {/* Usage Percentage */}
                      <div
                        className={`text-5xl font-black
                        bg-gradient-to-br ${getUsageColor(usageData.totalCpuUtility.value)}
                        bg-clip-text text-transparent leading-none mt-1`}
                      >
                        {Math.round(usageData.totalCpuUtility.value)}{usageData.totalCpuUtility.unit}
                      </div>

                      {/* Metric Name */}
                      <div className="text-[9px] text-slate-500 truncate w-full text-center px-1 mt-0.5">
                        {usageData.totalCpuUtility.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GPU Usage Card */}
              {usageData.gpuCoreLoad && (
                <div className="group relative flex items-center justify-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${getUsageColor(usageData.gpuCoreLoad.value)} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`}></div>
                  <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-lg p-2 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg ${getUsageGlow(usageData.gpuCoreLoad.value)} w-full h-full flex flex-col`}>
                    <div className="flex flex-col items-center justify-center h-full">
                      {/* Label */}
                      <div className="text-purple-400 text-sm font-bold uppercase tracking-wider">
                        GPU
                      </div>

                      {/* Usage Percentage */}
                      <div
                        className={`text-5xl font-black
                        bg-gradient-to-br ${getUsageColor(usageData.gpuCoreLoad.value)}
                        bg-clip-text text-transparent leading-none mt-1`}
                      >
                        {Math.round(usageData.gpuCoreLoad.value)}{usageData.gpuCoreLoad.unit}
                      </div>

                      {/* Metric Name */}
                      <div className="text-[9px] text-slate-500 truncate w-full text-center px-1 mt-0.5">
                        {usageData.gpuCoreLoad.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory Load Card */}
              {usageData.physicalMemoryLoad && (
                <div className="group relative flex items-center justify-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${getUsageColor(usageData.physicalMemoryLoad.value)} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`}></div>
                  <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-lg p-2 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg ${getUsageGlow(usageData.physicalMemoryLoad.value)} w-full h-full flex flex-col`}>
                    <div className="flex flex-col items-center justify-center h-full">
                      {/* Label */}
                      <div className="text-cyan-400 text-sm font-bold uppercase tracking-wider">
                        RAM
                      </div>

                      {/* Usage Percentage */}
                      <div
                        className={`text-5xl font-black
                        bg-gradient-to-br ${getUsageColor(usageData.physicalMemoryLoad.value)}
                        bg-clip-text text-transparent leading-none mt-1`}
                      >
                        {Math.round(usageData.physicalMemoryLoad.value)}{usageData.physicalMemoryLoad.unit}
                      </div>

                      {/* Metric Name */}
                      <div className="text-[9px] text-slate-500 truncate w-full text-center px-1 mt-0.5">
                        Memory Load
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory Used Card */}
              {usageData.physicalMemoryUsed && (
                <div className="group relative flex items-center justify-center">
                  <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`}></div>
                  <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-lg p-2 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg shadow-indigo-500/30 w-full h-full flex flex-col`}>
                    <div className="flex flex-col items-center justify-center h-full">
                      {/* Label */}
                      <div className="text-indigo-400 text-sm font-bold uppercase tracking-wider">
                        USED
                      </div>

                      {/* Memory Amount */}
                      <div
                        className={`text-4xl font-black
                        bg-gradient-to-br from-indigo-500 to-indigo-600
                        bg-clip-text text-transparent leading-none mt-1`}
                      >
                        {(usageData.physicalMemoryUsed.value / 1024).toFixed(1)}
                      </div>

                      {/* Unit */}
                      <div className="text-sm text-slate-400 font-semibold">
                        GB
                      </div>

                      {/* Metric Name */}
                      <div className="text-[9px] text-slate-500 truncate w-full text-center px-1">
                        Memory Used
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-700 border-t-emerald-500"></div>
              <div className="text-slate-500 text-xs tracking-wide">Awaiting data...</div>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        {usageData && (
          <div className="text-center text-[7px] text-slate-600 tracking-wider mt-1">
            {new Date(usageData.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageStatsPage;