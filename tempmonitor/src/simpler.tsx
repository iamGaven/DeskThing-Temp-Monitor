import { useEffect, useState } from "react";
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

interface SimpleProps {
  connectionInfo: ConnectionInfo | null;
  temperatureData: TemperatureData | null;
}

const Simple = ({ connectionInfo, temperatureData }: SimpleProps) => {
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

  const getTempColor = (value: number) => {
    if (value >= 85) return 'from-rose-500 to-red-600';
    if (value >= 75) return 'from-orange-500 to-orange-600';
    if (value >= 65) return 'from-amber-500 to-yellow-600';
    return 'from-emerald-500 to-teal-600';
  };

  const getTempGlow = (value: number) => {
    if (value >= 85) return 'shadow-rose-500/30';
    if (value >= 75) return 'shadow-orange-500/30';
    if (value >= 65) return 'shadow-amber-500/30';
    return 'shadow-emerald-500/30';
  };

  return (
   <div className="w-full h-full bg-black text-white flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-90"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-2 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {/* Time */}
          <div className="text-xl sm:text-2xl md:text-4xl font-extralight tracking-wider text-slate-300">
            {time}
          </div>

          {/* Connection Status */}
          <div className="flex items-center px-6 py-2 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/30">
            {/* Status dot */}
            <div
              className={`w-6 h-6 rounded-full ${
                getStatusColor() +
                (connectionInfo?.status === 'connected' ? ' animate-pulse' : '')
              }`}
              style={{ marginRight: '12px' }}
            ></div>

            <span className="text-[30px] text-slate-400 uppercase tracking-wider">
              {connectionInfo?.status || 'offline'}
            </span>
          </div>
        </div>



        {/* Temperature Cards */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {temperatureData ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 w-full h-full max-h-full">
              
              {/* CPU Card */}
              {temperatureData.cpu && (
                <div className="group relative flex items-center justify-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${getTempColor(temperatureData.cpu.value)} opacity-10 sm:opacity-20 blur-xl sm:blur-2xl group-hover:opacity-30 transition-opacity duration-500`}></div>
                  <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-5 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg ${getTempGlow(temperatureData.cpu.value)} w-full h-full flex flex-col`}>
                    <div className="flex flex-col items-center justify-center h-full space-y-1 sm:space-y-2">
                      {/* Icon and Label */}
                      <div className="text-blue-400 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold uppercase tracking-wider">
                        CPU
                      </div>

                    {/* Temperature */}

                      <div
                        className={`text-[6rem] sm:text-[7rem] md:text-[8rem] font-black
                        bg-gradient-to-br ${getTempColor(temperatureData.cpu.value)}
                        bg-clip-text text-transparent leading-none`}
                      >
                        {Math.round(temperatureData.cpu.value)}°
                      </div>

                      {/* Device Name */}
                      <div className="text-[18px] text-slate-500 truncate w-full text-center px-1">
                        {temperatureData.cpu.name}
                      </div>

                      
                      {/* Min/Max */}
                        {/* Min/Max */}
                      <div className="flex justify-center gap-8 text-[14px] text-slate-500 pt-2 border-t border-slate-800 w-full">
                        <div className="text-center">
                          <div className="text-slate-600 uppercase text-[20px]">Min</div>
                          <div className="text-slate-300 font-semibold text-[30px]">
                            {temperatureData.cpu.min}°
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-slate-600 uppercase text-[20px]">Max</div>
                          <div className="text-slate-300 font-semibold text-[30px]">
                            {temperatureData.cpu.max}°
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GPU Card */}
              {temperatureData.gpu && (
                <div className="group relative flex items-center justify-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${getTempColor(temperatureData.gpu.value)} opacity-10 sm:opacity-20 blur-xl sm:blur-2xl group-hover:opacity-30 transition-opacity duration-500`}></div>
                  <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-5 border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg ${getTempGlow(temperatureData.gpu.value)} w-full h-full flex flex-col`}>
                    <div className="flex flex-col items-center justify-center h-full space-y-1 sm:space-y-2">
                      {/* Icon and Label */}
                      <div className="text-blue-400 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold uppercase tracking-wider">
                        GPU
                      </div>

                 {/* Temperature */}

                      <div
                        className={`text-[6rem] sm:text-[7rem] md:text-[8rem] font-black
                        bg-gradient-to-br ${getTempColor(temperatureData.gpu.value)}
                        bg-clip-text text-transparent leading-none`}
                      >
                        {Math.round(temperatureData.gpu.value)}°
                      </div>


                      {/* Device Name */}
                      <div className="text-[18px] text-slate-500 truncate w-full text-center px-1">
                        {temperatureData.gpu.name}
                      </div>

                      {/* Min/Max */}
                      <div className="flex justify-center gap-8 text-[14px] text-slate-500 pt-2 border-t border-slate-800 w-full">
                        <div className="text-center">
                          <div className="text-slate-600 uppercase text-[20px]">Min</div>
                          <div className="text-slate-300 font-semibold text-[30px]">
                            {Math.round(temperatureData.gpu.min)}°
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-slate-600 uppercase text-[20px]">Max</div>
                          <div className="text-slate-300 font-semibold text-[30px]">
                            {Math.round(temperatureData.gpu.max)}°
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-2 sm:space-y-3">
              <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-slate-700 border-t-emerald-500"></div>
              <div className="text-slate-500 text-xs sm:text-sm tracking-wide">Awaiting data...</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {temperatureData && (
          <div className="text-center text-[7px] sm:text-[8px] md:text-[9px] text-slate-600 tracking-wider mt-1 sm:mt-2">
            {new Date(temperatureData.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Simple;