import React, { useEffect, useState } from "react";
import Simple from "./simpler";
import TestSimpler from "./TestSimpler";
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

const App: React.FC = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If in dev mode, skip the real data setup
    if (isDev) {
      console.log("=== RUNNING IN DEV MODE - Using TestSimpler ===");
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
    };
  }, []);

  console.log("Current connectionInfo state:", connectionInfo);
  console.log("Current temperature data:", temperatureData);

  // If in dev mode, use TestSimpler
  if (isDev) {
    return <TestSimpler />;
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 w-screen h-screen flex justify-center items-center">
        <div className="text-white text-xl">Loading backend connection...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950">
      <Simple connectionInfo={connectionInfo} temperatureData={temperatureData} />
    </div>
  );
};

export default App;