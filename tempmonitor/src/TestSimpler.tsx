import { useEffect, useState } from "react";
import Simple from "./simplepage";
import { ConnectionInfo } from "./types";

interface TemperatureData {
  timestamp: string;
  cpu: {
    name: string;
    value: number;
    unit: string;
    min: number;
    max: number;
  } | null;
  gpu: {
    name: string;
    value: number;
    unit: string;
    min: number;
    max: number;
  } | null;
}

const TestSimpler = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'connected',
    url: 'http://localhost:3000',
    lastConnected: Date.now(),
    lastError: null
  });

  const [temperatureData, setTemperatureData] = useState<TemperatureData>({
    timestamp: new Date().toISOString(),
    cpu: {
      name: 'AMD Ryzen 9 5950X',
      value: 65.5,
      unit: '°C',
      min: 42,
      max: 78
    },
    gpu: {
      name: 'NVIDIA RTX 4090',
      value: 72.3,
      unit: '°C',
      min: 38,
      max: 85
    }
  });

  useEffect(() => {
    // Simulate temperature changes every 2 seconds
    const interval = setInterval(() => {
      setTemperatureData(prev => ({
        timestamp: new Date().toISOString(),
        cpu: {
          ...prev.cpu!,
          value: 45 + Math.random() * 40, // Random between 45-85
        },
        gpu: {
          ...prev.gpu!,
          value: 50 + Math.random() * 40, // Random between 50-90
        }
      }));
    }, 2000);

    // Simulate connection status changes every 10 seconds
    const statusInterval = setInterval(() => {
      const statuses: Array<ConnectionInfo['status']> = ['connected', 'connecting', 'error', 'disconnected'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      setConnectionInfo(prev => ({
        ...prev,
        status: randomStatus,
        lastConnected: randomStatus === 'connected' ? Date.now() : prev.lastConnected
      }));
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-950">
      <Simple connectionInfo={connectionInfo} temperatureData={temperatureData} />
    </div>
  );
};

export default TestSimpler;