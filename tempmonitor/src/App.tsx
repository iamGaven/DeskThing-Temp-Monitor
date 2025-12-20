import React, { useEffect, useState, useRef } from "react";
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
  
  // Track if keys have been overridden
  const keysOverriddenRef = useRef(false);
  const tempButtonRef = useRef<HTMLButtonElement>(null);
  const usageButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousPageRef = useRef<Page | null>(null);


  // Auto-focus the page so keyboard events work immediately
  useEffect(() => {
    if (isDev) return;

    console.log("=== AUTO-FOCUSING PAGE FOR KEYBOARD EVENTS ===");
    
    // Focus the window
    window.focus();
    
    // Focus the container div
    if (containerRef.current) {
      containerRef.current.focus();
      console.log("Container focused");
    }
    
    // Also try focusing document.body
    document.body.focus();
    
    // Override keys after focusing
    setTimeout(() => {
      console.log("=== OVERRIDING KEYS ===");
      DeskThing.overrideKeys(['1', '2']);
      keysOverriddenRef.current = true;
    }, 100);
    
    // Set a timer to keep trying to focus in case it doesn't work the first time
    const focusInterval = setInterval(() => {
      if (document.hasFocus()) {
        console.log("Document has focus - stopping focus attempts");
        clearInterval(focusInterval);
      } else {
        console.log("Document doesn't have focus - trying again");
        window.focus();
        if (containerRef.current) {
          containerRef.current.focus();
        }
      }
    }, 100);
    
    // Stop trying after 2 seconds
    setTimeout(() => clearInterval(focusInterval), 2000);
    
    return () => clearInterval(focusInterval);
  }, []);

  // Set up keyboard event listener for physical keys
  useEffect(() => {
    if (isDev) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      const code = event.code;
      
      console.log("=== KEY PRESS DETECTED ===", { key, code });
      
      // Handle button 1 (Temperature page)
      if (key === '1' || code === 'Digit1') {
        console.log("Button 1 pressed - switching to temperature page");
        event.preventDefault();
        event.stopPropagation();
        setCurrentPage('temperature');
        return;
      }
      
      // Handle button 2 (Usage page)
      if (key === '2' || code === 'Digit2') {
        console.log("Button 2 pressed - switching to usage page");
        event.preventDefault();
        event.stopPropagation();
        setCurrentPage('usage');
        return;
      }
    };

    // Add listener with capture phase
    window.addEventListener('keydown', handleKeyPress, { capture: true, passive: false });
    console.log("=== KEYBOARD LISTENER ADDED ===");
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress, true);
      console.log("=== KEYBOARD LISTENER REMOVED ===");
      
      // Restore keys when component unmounts
      if (keysOverriddenRef.current) {
        console.log("=== RESTORING KEYS 1 AND 2 ===");
        DeskThing.restoreKeys(['1', '2']);
        keysOverriddenRef.current = false;
      }
    };
  }, []);

 // Manage subscriptions based on current page
  useEffect(() => {
    if (isDev) return;
    
    console.log(`=== PAGE CHANGED TO: ${currentPage} ===`);
    const previousPage = previousPageRef.current;
    console.log(`=== PREVIOUS PAGE WAS: ${previousPage || 'none'} ===`);
    
    // Small delay to ensure key override is processed
    const subscriptionTimer = setTimeout(() => {
      // First, unsubscribe from previous page if there was one
      if (previousPage) {
        console.log(`Unsubscribing from ${previousPage}`);
        DeskThing.send({ type: 'unsubscribe', request: previousPage });
        
        // Small delay to ensure unsubscribe is processed before subscribe
        setTimeout(() => {
          console.log(`Subscribing to ${currentPage}`);
          DeskThing.send({ type: 'subscribe', request: currentPage });
        }, 50);
      } else {
        // First time - no previous page, just subscribe
        console.log(`First subscription to ${currentPage}`);
        DeskThing.send({ type: 'subscribe', request: currentPage });
      }
      
      // Update the ref for next time
      previousPageRef.current = currentPage;
    }, 100);
    
    return () => clearTimeout(subscriptionTimer);
  }, [currentPage]);

  // Set up data listeners and fetch initial data
  useEffect(() => {
    // If in dev mode, skip the real data setup
    if (isDev) {
      console.log("=== RUNNING IN DEV MODE ===");
      setIsLoading(false);
      return;
    }

    let invalid = false;
    
    console.log("=== SETTING UP DATA LISTENERS ===");
    
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
      
      // Connection status received - the page change effect will handle subscriptions
      if (data.payload.status === 'connected') {
        console.log('Connection established');
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

    // Fetch initial connection status
    const fetchInitialData = async () => {
      console.log("=== REQUESTING INITIAL STATUS ===");
      try {
        DeskThing.send({ type: 'get', request: 'status' });
        console.log("Initial status request sent");
        
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

  console.log("Current state:", { connectionInfo, temperatureData, usageData, currentPage });

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

  // Production mode - Loading state
  if (isLoading) {
    return (
      <div className="bg-slate-900 w-screen h-screen flex justify-center items-center overflow-hidden">
        <div className="text-white text-xl">Loading backend connection...</div>
      </div>
    );
  }

  // Production mode - Main app
  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden outline-none"
    >
      {/* Production Navigation - Centered */}
      <div className="bg-slate-900/50 border-b border-slate-700/30 p-2 flex justify-center items-center gap-2 flex-shrink-0">
        <button
          ref={tempButtonRef}
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
          ref={usageButtonRef}
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