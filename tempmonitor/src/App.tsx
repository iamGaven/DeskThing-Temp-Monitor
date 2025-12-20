import React, { useEffect, useState } from "react";
import Simple from "./simpler";
import UsageStatsPage from "./UsageStatsPage";
import TestSimpler from "./TestSimpler";
import TestUsageStats from "./TestUsageStats";
import { createDeskThing } from "@deskthing/client";
import { ToClientData, GenericTransitData, ConnectionInfo } from "./types";

const DeskThing = createDeskThing<ToClientData, GenericTransitData>();

// Check if we're in development mode
const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

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

type Page = 'temperature' | 'usage';

const App: React.FC = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('temperature');

  // Manage subscriptions based on current page
  useEffect(() => {
    if (isDev) return;
    
    console.log(`=== PAGE CHANGED TO: ${currentPage} ===`);
    
    if (currentPage === 'temperature') {
      // Subscribe to temperature, unsubscribe from usage
      console.log('Sending subscribe request for temperature');
      DeskThing.send({ type: 'subscribe', request: 'temperature' });
      console.log('Sending unsubscribe request for usage');
      DeskThing.send({ type: 'unsubscribe', request: 'usage' });
      console.log('Subscribed to temperature data');
    } else if (currentPage === 'usage') {
      // Subscribe to usage, unsubscribe from temperature
      console.log('Sending subscribe request for usage');
      DeskThing.send({ type: 'subscribe', request: 'usage' });
      console.log('Sending unsubscribe request for temperature');
      DeskThing.send({ type: 'unsubscribe', request: 'temperature' });
      console.log('Subscribed to usage data');
    }
  }, [currentPage]);

  useEffect(() => {
    // If in dev mode, skip the real data setup
    if (isDev) {
      console.log("=== RUNNING IN DEV MODE ===");
      return;
    }

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
      
      // Once connected, send initial subscription based on current page
      if (data.payload.status === 'connected') {
        console.log(`Connection established, subscribing to ${currentPage} data`);
        if (currentPage === 'temperature') {
          DeskThing.send({ type: 'subscribe', request: 'temperature' });
        } else if (currentPage === 'usage') {
          DeskThing.send({ type: 'subscribe', request: 'usage' });
        }
      }
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

    // Listen for usage data
    const removeUsageListener = DeskThing.on('usageData', (data) => {
      if (invalid) return;
      console.log("=== RECEIVED USAGE DATA ===", data);
      
      if (!data?.payload) {
        console.warn("No usage data in payload");
        return;
      }
      
      setUsageData(data.payload);
    });

    const fetchInitialData = async () => {
      console.log("=== REQUESTING INITIAL STATUS ===");
      try {
        // Request current connection status
        console.log("Sending: { type: 'get', request: 'status' }");
        DeskThing.send({ type: 'get', request: 'status' });
        
        console.log("Initial request sent successfully");
        
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
      removeTempListener();
      removeUsageListener();
    };
  }, []);

  console.log("Current connectionInfo state:", connectionInfo);
  console.log("Current temperature data:", temperatureData);
  console.log("Current usage data:", usageData);

  // Dev mode - show navigation and test pages
  if (isDev) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden">
        {/* Dev Navigation - Centered */}
        <div className="bg-slate-900 border-b border-slate-700 p-4 flex justify-center items-center gap-4 flex-shrink-0">
          <span className="text-emerald-500 font-bold absolute left-4">DEV MODE</span>
          <button
            onClick={() => setCurrentPage('temperature')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              currentPage === 'temperature'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setCurrentPage('usage')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              currentPage === 'usage'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Usage Stats
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentPage === 'temperature' ? <TestSimpler /> : <TestUsageStats />}
        </div>
      </div>
    );
  }

  // Production mode
  if (isLoading) {
    return (
      <div className="bg-slate-900 w-screen h-screen flex justify-center items-center overflow-hidden">
        <div className="text-white text-xl">Loading backend connection...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Production Navigation - Centered */}
      <div className="bg-slate-900/50 border-b border-slate-700/30 p-2 flex justify-center items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setCurrentPage('temperature')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            currentPage === 'temperature'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          Temps
        </button>
        <button
          onClick={() => setCurrentPage('usage')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            currentPage === 'usage'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          Usage
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentPage === 'temperature' ? (
          <Simple connectionInfo={connectionInfo} temperatureData={temperatureData} />
        ) : (
          <UsageStatsPage connectionInfo={connectionInfo} usageData={usageData} />
        )}
      </div>
    </div>
  );
};

export default App;