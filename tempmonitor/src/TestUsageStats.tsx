import { useEffect, useState } from "react";
import UsageStatsPage from "./UsageStatsPage";
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

const TestUsageStats = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'connected',
    url: 'http://localhost:5000',
    lastConnected: Date.now(),
    lastError: null
  });

  const [usageData, setUsageData] = useState<UsageData>({
    timestamp: new Date().toISOString(),
    totalCpuUtility: {
      name: 'Total CPU Utility',
      value: 35.5,
      unit: '%'
    },
    physicalMemoryLoad: {
      name: 'PhysicalMemoryLoad0',
      value: 67.7,
      unit: '%'
    },
    physicalMemoryUsed: {
      name: 'PhysicalMemoryUsed0',
      value: 22149,
      unit: 'MB'
    },
    gpuCoreLoad: {
      name: 'GPUCoreLoad14',
      value: 15.2,
      unit: '%'
    }
  });

  useEffect(() => {
    // Simulate usage changes every 1 second
    const interval = setInterval(() => {
      setUsageData(prev => ({
        timestamp: new Date().toISOString(),
        totalCpuUtility: {
          ...prev.totalCpuUtility!,
          value: 10 + Math.random() * 70, // Random between 10-80%
        },
        physicalMemoryLoad: {
          ...prev.physicalMemoryLoad!,
          value: 50 + Math.random() * 40, // Random between 50-90%
        },
        physicalMemoryUsed: {
          ...prev.physicalMemoryUsed!,
          value: 16000 + Math.random() * 16000, // Random between 16-32 GB
        },
        gpuCoreLoad: {
          ...prev.gpuCoreLoad!,
          value: 5 + Math.random() * 85, // Random between 5-90%
        }
      }));
    }, 1000);

    // Simulate connection status changes every 15 seconds
    const statusInterval = setInterval(() => {
      const statuses: Array<ConnectionInfo['status']> = ['connected', 'connecting', 'error', 'disconnected'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      setConnectionInfo(prev => ({
        ...prev,
        status: randomStatus,
        lastConnected: randomStatus === 'connected' ? Date.now() : prev.lastConnected
      }));
    }, 15000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-950">
      <UsageStatsPage connectionInfo={connectionInfo} usageData={usageData} />
    </div>
  );
};

export default TestUsageStats;