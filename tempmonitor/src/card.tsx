import React from 'react';

export type DataType = 
  | 'cpu-temp'
  | 'gpu-temp'
  | 'cpu-usage'
  | 'memory-load'
  | 'memory-used'
  |'network-download'
  |'network-upload'
  | 'gpu-usage';
  

export interface CardData {
  name: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
}

interface CardProps {
  dataType: DataType;
  data: CardData | null;
  isLoading?: boolean;
  cardCount?: number;
}

const Card: React.FC<CardProps> = ({ dataType, data, isLoading = false, cardCount = 2 }) => {
  // Get display configuration based on data type
  const getCardConfig = () => {
    switch (dataType) {
      case 'cpu-temp':
        return {
          label: 'CPU',
          icon: '🔥',
          colorClass: 'text-blue-400',
          getGradient: (value: number) => {
            if (value >= 85) return 'from-rose-500 to-red-600';
            if (value >= 75) return 'from-orange-500 to-orange-600';
            if (value >= 65) return 'from-amber-500 to-yellow-600';
            return 'from-emerald-500 to-teal-600';
          },
          getGlow: (value: number) => {
            if (value >= 85) return 'shadow-rose-500/30';
            if (value >= 75) return 'shadow-orange-500/30';
            if (value >= 65) return 'shadow-amber-500/30';
            return 'shadow-emerald-500/30';
          }
        };
      case 'gpu-temp':
        return {
          label: 'GPU',
          icon: '🎮',
          colorClass: 'text-purple-400',
          getGradient: (value: number) => {
            if (value >= 85) return 'from-rose-500 to-red-600';
            if (value >= 75) return 'from-orange-500 to-orange-600';
            if (value >= 65) return 'from-amber-500 to-yellow-600';
            return 'from-emerald-500 to-teal-600';
          },
          getGlow: (value: number) => {
            if (value >= 85) return 'shadow-rose-500/30';
            if (value >= 75) return 'shadow-orange-500/30';
            if (value >= 65) return 'shadow-amber-500/30';
            return 'shadow-emerald-500/30';
          }
        };
      case 'cpu-usage':
        return {
          label: 'CPU',
          icon: '⚡',
          colorClass: 'text-cyan-400',
          getGradient: (value: number) => {
            if (value >= 90) return 'from-rose-500 to-red-600';
            if (value >= 70) return 'from-orange-500 to-orange-600';
            if (value >= 50) return 'from-amber-500 to-yellow-600';
            return 'from-emerald-500 to-teal-600';
          },
          getGlow: (value: number) => {
            if (value >= 90) return 'shadow-rose-500/30';
            if (value >= 70) return 'shadow-orange-500/30';
            if (value >= 50) return 'shadow-amber-500/30';
            return 'shadow-emerald-500/30';
          }
        };
      case 'memory-load':
        return {
          label: 'RAM',
          icon: '💾',
          colorClass: 'text-green-400',
          getGradient: (value: number) => {
            if (value >= 90) return 'from-rose-500 to-red-600';
            if (value >= 70) return 'from-orange-500 to-orange-600';
            if (value >= 50) return 'from-amber-500 to-yellow-600';
            return 'from-emerald-500 to-teal-600';
          },
          getGlow: (value: number) => {
            if (value >= 90) return 'shadow-rose-500/30';
            if (value >= 70) return 'shadow-orange-500/30';
            if (value >= 50) return 'shadow-amber-500/30';
            return 'shadow-emerald-500/30';
          }
        };
      case 'memory-used':
        return {
          label: 'MEM',
          icon: '📊',
          colorClass: 'text-indigo-400',
          getGradient: (value: number) => {
            if (value >= 28) return 'from-rose-500 to-red-600';
            if (value >= 20) return 'from-orange-500 to-orange-600';
            if (value >= 12) return 'from-amber-500 to-yellow-600';
            return 'from-emerald-500 to-teal-600';
          },
          getGlow: (value: number) => {
            if (value >= 28) return 'shadow-rose-500/30';
            if (value >= 20) return 'shadow-orange-500/30';
            if (value >= 12) return 'shadow-amber-500/30';
            return 'shadow-emerald-500/30';
          }
        };
      case 'gpu-usage':
        return {
          label: 'GPU',
          icon: '🎯',
          colorClass: 'text-pink-400',
          getGradient: (value: number) => {
            if (value >= 90) return 'from-rose-500 to-red-600';
            if (value >= 70) return 'from-orange-500 to-orange-600';
            if (value >= 50) return 'from-amber-500 to-yellow-600';
            return 'from-emerald-500 to-teal-600';
          },
          getGlow: (value: number) => {
            if (value >= 90) return 'shadow-rose-500/30';
            if (value >= 70) return 'shadow-orange-500/30';
            if (value >= 50) return 'shadow-amber-500/30';
            return 'shadow-emerald-500/30';
          }
        };

      case 'network-download':
      return {
        label: 'DL',
        icon: '⬇️',
        colorClass: 'text-sky-400',
        getGradient: (value: number) => {
          if (value >= 100000) return 'from-violet-500 to-purple-600'; // 100+ MB/s
          if (value >= 50000) return 'from-blue-500 to-indigo-600';    // 50+ MB/s
          if (value >= 10000) return 'from-cyan-500 to-blue-600';      // 10+ MB/s
          if (value >= 1000) return 'from-teal-500 to-cyan-600';       // 1+ MB/s
          return 'from-emerald-500 to-teal-600';                        // < 1 MB/s
        },
        getGlow: (value: number) => {
          if (value >= 100000) return 'shadow-violet-500/30';
          if (value >= 50000) return 'shadow-blue-500/30';
          if (value >= 10000) return 'shadow-cyan-500/30';
          if (value >= 1000) return 'shadow-teal-500/30';
          return 'shadow-emerald-500/30';
        }
      };
    case 'network-upload':
      return {
        label: 'UP',
        icon: '⬆️',
        colorClass: 'text-amber-400',
        getGradient: (value: number) => {
          if (value >= 100000) return 'from-violet-500 to-purple-600'; // 100+ MB/s
          if (value >= 50000) return 'from-orange-500 to-red-600';     // 50+ MB/s
          if (value >= 10000) return 'from-amber-500 to-orange-600';   // 10+ MB/s
          if (value >= 1000) return 'from-yellow-500 to-amber-600';    // 1+ MB/s
          return 'from-emerald-500 to-teal-600';                        // < 1 MB/s
        },
        getGlow: (value: number) => {
          if (value >= 100000) return 'shadow-violet-500/30';
          if (value >= 50000) return 'shadow-orange-500/30';
          if (value >= 10000) return 'shadow-amber-500/30';
          if (value >= 1000) return 'shadow-yellow-500/30';
          return 'shadow-emerald-500/30';
        }
      };
      default:
        return {
          label: 'DATA',
          icon: '📈',
          colorClass: 'text-slate-400',
          getGradient: () => 'from-slate-500 to-slate-600',
          getGlow: () => 'shadow-slate-500/30'
        };
    }
  };

  const config = getCardConfig();
  const getSizeClasses = () => {
    if (cardCount >= 4) {
      // 4 CARDS LAYOUT - Compact sizing to fit all cards without scrolling
      return {
        padding: 'p-3',                    // Card padding: 12px
        label: 'text-xl md:text-2xl',      // "CPU", "GPU" label: 20px → 24px on medium screens
        value: 'text-5xl md:text-6xl',     // Main value number "27", "36": 48px → 60px
        unit: 'text-2xl md:text-3xl',      // Unit symbol "%", "°": 24px → 30px
        name: 'text-xs',                   // Device name below value: 12px
        minMaxLabel: 'text-[10px]',        // "Min"/"Max" labels: 10px
        minMaxValue: 'text-xs',            // Min/Max values: 12px
        gap: 'gap-3',                      // Space between Min/Max sections: 12px
        margin: 'my-1'                     // Vertical margin around value: 4px
      };
    } else if (cardCount === 3) {
      // 3 CARDS LAYOUT - Medium sizing for balanced display
      return {
        padding: 'p-4',                    // Card padding: 16px
        label: 'text-2xl md:text-3xl',     // "CPU", "GPU" label: 24px → 30px on medium screens
        value: 'text-6xl md:text-7xl',     // Main value number: 60px → 72px
        unit: 'text-3xl md:text-4xl',      // Unit symbol: 30px → 36px
        name: 'text-sm',                   // Device name: 14px
        minMaxLabel: 'text-xs',            // "Min"/"Max" labels: 12px
        minMaxValue: 'text-sm',            // Min/Max values: 14px
        gap: 'gap-4',                      // Space between Min/Max sections: 16px
        margin: 'my-2'                     // Vertical margin around value: 8px
      };
    } else {
      // 1-2 CARDS LAYOUT - Large sizing for maximum impact and readability
      return {
        padding: 'p-5',                    // Card padding: 20px
        label: 'text-3xl md:text-4xl',     // "CPU", "GPU" label: 30px → 36px on medium screens
        value: 'text-7xl md:text-8xl',     // Main value number: 72px → 96px
        unit: 'text-4xl md:text-5xl',      // Unit symbol: 36px → 48px
        name: 'text-base',                 // Device name: 16px
        minMaxLabel: 'text-sm',            // "Min"/"Max" labels: 14px
        minMaxValue: 'text-lg',            // Min/Max values: 18px
        gap: 'gap-6',                      // Space between Min/Max sections: 24px
        margin: 'my-2'                     // Vertical margin around value: 8px
      };
    }
  };
  const sizes = getSizeClasses();

  if (isLoading || !data) {
    return (
      <div className="group relative flex items-center justify-center h-full min-h-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-600 opacity-10 blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 w-full h-full flex flex-col items-center justify-center min-h-0">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-emerald-500"></div>
          <div className="text-slate-500 text-sm tracking-wide mt-3">Loading...</div>
        </div>
      </div>
    );
  }

  const gradient = config.getGradient(data.value);
  const glow = config.getGlow(data.value);

  return (
    <div className="group relative flex items-center justify-center h-full min-h-0">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500`}></div>
      <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-2xl ${sizes.padding} border border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 shadow-lg ${glow} w-full h-full flex flex-col min-h-0`}>
        <div className="flex flex-col items-center justify-center h-full min-h-0 overflow-hidden">
          {/* Label */}
          <div className={`${config.colorClass} ${sizes.label} font-bold uppercase tracking-wider flex-shrink-0`}>
            {config.label}
          </div>

          {/* Value */}
          <div className={`${sizes.value} font-black bg-gradient-to-br ${gradient} bg-clip-text text-transparent leading-none flex-shrink-0 ${sizes.margin}`}>
            {Math.round(data.value)}
            <span className={sizes.unit}>{data.unit}</span>
          </div>

          {/* Device Name */}
          <div className={`${sizes.name} text-slate-500 truncate w-full text-center px-1 flex-shrink-0`}>
            {data.name}
          </div>

          {/* Min/Max */}
          {data.min !== undefined && data.max !== undefined && (
            <div className={`flex justify-center ${sizes.gap} text-slate-500 pt-1 mt-1 border-t border-slate-800 w-full flex-shrink-0`}>
              <div className="text-center">
                <div className={`text-slate-600 uppercase ${sizes.minMaxLabel}`}>Min</div>
                <div className={`text-slate-300 font-semibold ${sizes.minMaxValue}`}>
                  {Math.round(data.min)}{data.unit}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-slate-600 uppercase ${sizes.minMaxLabel}`}>Max</div>
                <div className={`text-slate-300 font-semibold ${sizes.minMaxValue}`}>
                  {Math.round(data.max)}{data.unit}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Card;