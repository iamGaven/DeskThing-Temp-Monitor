import React, { useEffect, useState } from "react";
import Simple from "./simpler";
import { createDeskThing } from "@deskthing/client";
import { ToClientData, GenericTransitData, ConnectionInfo, LogEntry } from "./types";

const DeskThing = createDeskThing<ToClientData, GenericTransitData>();

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

const App: React.FC = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let invalid = false;
    
    console.log("=== APP MOUNTED, SETTING UP LISTENERS ===");
    
    // Listen for connection status updates
    const removeStatusListener = DeskThing.on('connectionStatus', (data) => {
      if (invalid) return;
      console.log("=== RECEIVED CONNECTION STATUS ===", data);
      
      if (!data?.payload) {
        console.warn("No connection info in payload");
        return;
      }
      
      setConnectionInfo(data.payload);
      setIsLoading(false);
    });

    // Listen for individual log entries
    const removeLogListener = DeskThing.on('log', (data) => {
      if (invalid) return;
      console.log("=== RECEIVED LOG ENTRY ===", data);
      
      if (!data?.payload) {
        console.warn("No log in payload");
        return;
      }
      
      setLogs(prevLogs => [...prevLogs, data.payload]);
    });

    // Listen for bulk logs (when requesting all logs)
    const removeLogsListener = DeskThing.on('logs', (data) => {
      if (invalid) return;
      console.log("=== RECEIVED LOGS BULK ===", data);
      
      if (!data?.payload) {
        console.warn("No logs in payload");
        return;
      }
      
      setLogs(data.payload);
    });

    // Listen for temperature data
    const removeTempListener = DeskThing.on('temperatureData', (data) => {
      if (invalid) return;
      console.log("=== RECEIVED TEMPERATURE DATA ===", data);
      
      if (!data?.payload) {
        console.warn("No temperature data in payload");
        return;
      }
      
      setTemperatureData(data.payload);
    });

    const fetchInitialData = async () => {
      console.log("=== REQUESTING INITIAL STATUS AND LOGS ===");
      try {
        // Request current connection status
        console.log("Sending: { type: 'get', request: 'status' }");
        DeskThing.send({ type: 'get', request: 'status' });
        
        // Request existing logs
        console.log("Sending: { type: 'get', request: 'logs' }");
        DeskThing.send({ type: 'get', request: 'logs' });
        
        console.log("Initial requests sent successfully");
        
        // Set a backup timeout in case we don't get a response
        setTimeout(() => {
          if (!invalid && isLoading) {
            console.warn("=== NO RESPONSE RECEIVED WITHIN 5 SECONDS ===");
            setIsLoading(false);
          }
        }, 5000);
        
      } catch (error) {
        console.error("Error requesting initial data:", error);
        setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      invalid = true;
      removeStatusListener();
      removeLogListener();
      removeLogsListener();
      removeTempListener();
    };
  }, []);

  console.log("Current connectionInfo state:", connectionInfo);
  console.log("Current logs count:", logs.length);
  console.log("Current temperature data:", temperatureData);

  if (isLoading) {
    return (
      <div className="bg-slate-900 w-screen h-screen flex justify-center items-center">
        <div className="text-white text-xl">Loading backend connection...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 w-screen h-screen flex justify-center items-center">
      <div className="w-full h-full p-4 overflow-auto">
        {/* Temperature Display */}
        {temperatureData && (
          <div className="bg-slate-800 rounded-lg p-6 mb-4">
            <h2 className="text-white text-2xl font-bold mb-4">PC Temperatures</h2>
            <div className="grid grid-cols-2 gap-4">
              {temperatureData.cpu && (
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-blue-400 text-lg font-semibold mb-2">{temperatureData.cpu.name}</h3>
                  <div className="text-white text-4xl font-bold">
                    {temperatureData.cpu.value}{temperatureData.cpu.unit}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">
                    Min: {temperatureData.cpu.min}{temperatureData.cpu.unit} | Max: {temperatureData.cpu.max}{temperatureData.cpu.unit}
                  </div>
                </div>
              )}
              {temperatureData.gpu && (
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-green-400 text-lg font-semibold mb-2">{temperatureData.gpu.name}</h3>
                  <div className="text-white text-4xl font-bold">
                    {temperatureData.gpu.value}{temperatureData.gpu.unit}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">
                    Min: {temperatureData.gpu.min}{temperatureData.gpu.unit} | Max: {temperatureData.gpu.max}{temperatureData.gpu.unit}
                  </div>
                </div>
              )}
            </div>
            <div className="text-gray-500 text-xs mt-2">
              Last updated: {new Date(temperatureData.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
        
        <Simple connectionInfo={connectionInfo} logs={logs} />
      </div>
    </div>
  );
};

export default App;