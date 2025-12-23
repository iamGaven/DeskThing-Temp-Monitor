import React, { useEffect, useState } from "react";
import SimplePage from "./simplepage";
import { createDeskThing } from "@deskthing/client";
import { ToClientData, GenericTransitData, ConnectionInfo } from "./types";

const DeskThing = createDeskThing<ToClientData, GenericTransitData>();

const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

const App: React.FC = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  // Set up core listeners once at the app level
  useEffect(() => {
    if (isDev) {
      console.log("=== RUNNING IN DEV MODE ===");
      setIsLoading(false);
      // Set mock connection info for dev
      setConnectionInfo({
        status: 'connected',
        url: 'http://localhost:5000',
        lastConnected: Date.now(),
        lastError: null
      });
      // Set mock settings for dev
      setSettings({
        card1Type: { value: 'cpu-temp' },
        card2Type: { value: 'gpu-temp' },
        card3Type: { value: 'cpu-usage' },
        card4Type: { value: 'none' },
      });
      return;
    }

    let invalid = false;
    
    console.log("=== SETTING UP CORE APP LISTENERS ===");
    
    // Connection status listener
    const removeStatusListener = DeskThing.on('connectionStatus', (data: any) => {
      if (invalid) return;
      console.log("=== APP: RECEIVED CONNECTION STATUS ===", data?.payload);
      
      if (!data?.payload) return;
      
      setConnectionInfo(data.payload);
      setIsLoading(false);
    });

    // Settings listener
    const removeSettingsListener = DeskThing.on('settings', (data: any) => {
      if (invalid) return;
      console.log("=== APP: RECEIVED SETTINGS ===");
      
      if (!data?.payload) {
        console.log("No payload in settings data");
        return;
      }
      
      setSettings(data.payload);
    });

    // Request initial status
    console.log("=== APP: REQUESTING INITIAL STATUS ===");
    DeskThing.send({ type: 'get', request: 'status' });
    
    // Timeout if no response
    setTimeout(() => {
      if (!invalid && isLoading) {
        console.warn("=== APP: NO RESPONSE RECEIVED WITHIN 5 SECONDS ===");
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      console.log("=== APP: CLEANING UP LISTENERS ===");
      invalid = true;
      removeStatusListener();
      removeSettingsListener();
    };
  }, [isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex justify-center items-center overflow-hidden">
        <div className="text-white text-xl">Loading backend connection...</div>
      </div>
    );
  }

  // Route to main page - use w-screen h-screen to fill viewport
  return (
    <div className="w-screen h-screen">
      <SimplePage 
        connectionInfo={connectionInfo} 
        settings={settings}
        DeskThing={DeskThing}
      />
    </div>
  );
};

export default App;