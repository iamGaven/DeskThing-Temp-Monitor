import React, { useEffect, useState, useRef } from "react";
import Card, { CardData, DataType } from "./card";
import { ConnectionInfo } from "./types";

const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

interface CardConfig {
  id: string;
  dataType: DataType;
  data: CardData | null;
}

interface SimplePageProps {
  connectionInfo: ConnectionInfo | null;
  settings: any;
  DeskThing: any;
}

const SimplePage: React.FC<SimplePageProps> = ({ connectionInfo, settings, DeskThing }) => {
  // Card configurations from settings
  const [cards, setCards] = useState<CardConfig[]>([
    { id: 'card1', dataType: 'cpu-temp', data: null },
    { id: 'card2', dataType: 'gpu-temp', data: null },
  ]);
  
  const [time, setTime] = useState<string>('');
  
  // Track active subscriptions
  const activeSubscriptionsRef = useRef<Set<DataType>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);


  // Handle settings updates to configure cards
  useEffect(() => {
    if (!settings) return;

    console.log("=== SIMPLE: CONFIGURING CARDS FROM SETTINGS ===");
    
    const newCards: CardConfig[] = [];
    
    // Build card configurations from settings
    for (let i = 1; i <= 4; i++) {
      const cardKey = `card${i}Type`;
      const dataType = settings[cardKey]?.value || settings[cardKey];
      
      console.log(`${cardKey}: ${dataType}`);
      
      if (dataType && dataType !== 'none') {
        newCards.push({
          id: `card${i}`,
          dataType: dataType as DataType,
          data: null
        });
      }
    }
    
    // If no cards configured, use defaults
    if (newCards.length === 0) {
      console.log("No cards configured, using defaults");
      newCards.push(
        { id: 'card1', dataType: 'cpu-temp', data: null },
        { id: 'card2', dataType: 'gpu-temp', data: null }
      );
    }
    
    console.log("Configured cards:", newCards);
    setCards(newCards);
  }, [settings]);

  // Subscribe to data types for all cards
  useEffect(() => {
    console.log("=== SIMPLE: SUBSCRIPTION EFFECT TRIGGERED ===");
    console.log("isDev:", isDev);
    console.log("cards.length:", cards.length);
    console.log("connectionInfo?.status:", connectionInfo?.status);
    
    if (isDev) {
      // Set mock data for development - only once, not constantly updating
      const mockData = cards.map(card => ({
        ...card,
        data: {
          name: `Mock ${card.dataType}`,
          value: card.dataType.includes('temp') 
            ? Math.floor(Math.random() * 40) + 40  // 40-80 for temps
            : Math.floor(Math.random() * 60) + 20, // 20-80 for usage
          unit: card.dataType.includes('temp') ? '°C' : '%',
          min: card.dataType.includes('temp') ? 35 : 15,
          max: card.dataType.includes('temp') ? 85 : 90
        }
      }));
      setCards(mockData);
      return;
    }

    if (cards.length === 0) {
      console.log("No cards, skipping subscription");
      return;
    }
    if (connectionInfo?.status !== 'connected') {
      console.log("Not connected, skipping subscription");
      return;
    }

    // Get unique data types from all cards
    const dataTypes = new Set(cards.map(card => card.dataType));
    
    console.log("=== SIMPLE: MANAGING SUBSCRIPTIONS ===");
    console.log("Current subscriptions:", Array.from(activeSubscriptionsRef.current));
    console.log("Needed subscriptions:", Array.from(dataTypes));
    
    // Unsubscribe from data types no longer needed
    const toUnsubscribe: DataType[] = [];
    activeSubscriptionsRef.current.forEach(type => {
      if (!dataTypes.has(type)) {
        toUnsubscribe.push(type);
      }
    });
    
    // Subscribe to new data types
    const toSubscribe: DataType[] = [];
    dataTypes.forEach(type => {
      if (!activeSubscriptionsRef.current.has(type)) {
        toSubscribe.push(type);
      }
    });
    
    // Only process if there are actual changes
    if (toUnsubscribe.length === 0 && toSubscribe.length === 0) {
      console.log("No subscription changes needed");
      return;
    }
    
    // Process unsubscribes first
    toUnsubscribe.forEach(type => {
      console.log(`Unsubscribing from ${type}`);
      DeskThing.send({ type: 'unsubscribe', request: type });
      activeSubscriptionsRef.current.delete(type);
    });
    
    // Then process subscribes
    toSubscribe.forEach(type => {
      console.log(`Subscribing to ${type}`);
      DeskThing.send({ type: 'subscribe', request: type });
      activeSubscriptionsRef.current.add(type);
    });
    
    console.log("=== SIMPLE: SUBSCRIPTIONS UPDATED ===");
    console.log("Active subscriptions:", Array.from(activeSubscriptionsRef.current));
    
  }, [cards.length, connectionInfo?.status, DeskThing]); // Changed dependency from cards to cards.length

// Set up data listeners
  useEffect(() => {
    if (isDev) return;

    let invalid = false;
    
    console.log("=== SIMPLE: SETTING UP DATA LISTENERS ===");

    // Individual data listeners
    const removeCpuTempListener = DeskThing.on('cpuTemperatureData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'cpu-temp' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeGpuTempListener = DeskThing.on('gpuTemperatureData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'gpu-temp' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeCpuUsageListener = DeskThing.on('cpuUsageData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'cpu-usage' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeMemoryLoadListener = DeskThing.on('memoryLoadData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'memory-load' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeMemoryUsedListener = DeskThing.on('memoryUsedData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'memory-used' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeGpuUsageListener = DeskThing.on('gpuUsageData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'gpu-usage' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeNetworkDownloadListener = DeskThing.on('networkDownloadData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'network-download' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    const removeNetworkUploadListener = DeskThing.on('networkUploadData', (data: any) => {
      if (invalid) return;
      if (!data?.payload) return;
      
      setCards(prevCards => prevCards.map(card => 
        card.dataType === 'network-upload' 
          ? { ...card, data: data.payload }
          : card
      ));
    });

    return () => {
      console.log("=== SIMPLE: CLEANING UP DATA LISTENERS ===");
      invalid = true;
      removeCpuTempListener();
      removeGpuTempListener();
      removeCpuUsageListener();
      removeMemoryLoadListener();
      removeMemoryUsedListener();
      removeGpuUsageListener();
      removeNetworkDownloadListener();
      removeNetworkUploadListener();
      
      // Unsubscribe from all active subscriptions
      activeSubscriptionsRef.current.forEach(type => {
        DeskThing.send({ type: 'unsubscribe', request: type });
      });
      activeSubscriptionsRef.current.clear();
    };
  }, [DeskThing]);

  const getStatusColor = () => {
    if (!connectionInfo) return 'bg-gray-500';
    switch (connectionInfo.status) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };
  // Determine grid layout and styling based on number of cards
  const getGridLayout = () => {
    switch (cards.length) {
      case 1:
        return {
          containerClass: 'flex items-center justify-center h-full',  // Center single card, fill height
          cardWrapperClass: 'w-full max-w-2xl'  // Single card: centered with max width
        };
      case 2:
        return {
          containerClass: 'grid grid-cols-2 h-full',  // 2 columns, fill full height
          cardWrapperClass: 'w-full h-full'            // Each card fills its grid cell
        };
      case 3:
        return {
          containerClass: 'flex items-stretch justify-center gap-5 h-full',  // Flex layout, stretch to fill height
          cardWrapperClass: 'flex-1 min-w-0 max-w-md'                         // Cards share space equally, max 448px wide
        };
      case 4:
        return {
          containerClass: 'grid grid-cols-2 grid-rows-2 h-full',  // 2x2 grid, fill full height
          cardWrapperClass: 'w-full h-full'                        // Each card fills its grid cell (50% width, 50% height)
        };
      default:
        return {
          containerClass: 'grid grid-cols-2 h-full',
          cardWrapperClass: 'w-full h-full'
        };
    }
  };

  const layout = getGridLayout();

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className="w-full h-full bg-black text-white flex flex-col relative outline-none"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-90"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Header - Reduced padding */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
          {/* Time */}
          <div className="text-3xl font-extralight tracking-wider text-slate-300">
            {time}
          </div>

          {/* Connection Status */}
          <div className="flex items-center px-4 py-1.5 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/30">
            <div
              className={`w-5 h-5 rounded-full ${
                getStatusColor() +
                (connectionInfo?.status === 'connected' ? ' animate-pulse' : '')
              }`}
              style={{ marginRight: '10px' }}
            ></div>
            <span className="text-2xl text-slate-400 uppercase tracking-wider">
              {connectionInfo?.status || 'offline'}
            </span>
          </div>
        </div>

        {/* Cards Grid - Flexible container that fills remaining space */}
        <div className="flex-1 px-4 pb-4 min-h-0 overflow-hidden">
          <div className={`${layout.containerClass} gap-3 w-full h-full`}>
            {cards.map(card => (
              <div key={card.id} className={`${layout.cardWrapperClass} min-h-0 overflow-visible`}>
                <Card
                  dataType={card.dataType}
                  data={card.data}
                  isLoading={!card.data && connectionInfo?.status === 'connected'}
                  cardCount={cards.length}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePage;