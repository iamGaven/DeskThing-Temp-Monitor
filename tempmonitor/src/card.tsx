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
          if (value >= 100000) return 'from-violet-500 to-purple-600';
          if (value >= 50000) return 'from-blue-500 to-indigo-600';
          if (value >= 10000) return 'from-cyan-500 to-blue-600';
          if (value >= 1000) return 'from-teal-500 to-cyan-600';
          return 'from-emerald-500 to-teal-600';
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
          if (value >= 100000) return 'from-violet-500 to-purple-600';
          if (value >= 50000) return 'from-orange-500 to-red-600';
          if (value >= 10000) return 'from-amber-500 to-orange-600';
          if (value >= 1000) return 'from-yellow-500 to-amber-600';
          return 'from-emerald-500 to-teal-600';
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
      // 4 CARDS LAYOUT - Compact sizing to prevent overlap
      return {
        padding: 'p-3',
        label: 'text-xl',
        value: 'text-6xl',
        unit: 'text-2xl',
        name: 'text-xs',
        minMaxLabel: 'text-md',
        minMaxValue: 'text-xl',
        minMaxLabelHorizontalGap: '16px',    // Horizontal gap between "Min" and "Max" labels
        minMaxValueHorizontalGap: '16px',    // Horizontal gap between min and max values
        minMaxVerticalGap: '4px',            // Vertical gap between label and value
        minMaxHorizontalOffset: '0px',       // Horizontal offset (negative = left, positive = right)
        mainLabelHorizontalOffset: '0px',    // Main label horizontal offset
        mainLabelVerticalOffset: '0px',      // Main label vertical offset
        margin: 'my-1'
      };
    } else if (cardCount === 3) {
      // 3 CARDS LAYOUT - LARGE sizing with bigger min/max
      return {
        padding: 'p-6',
        label: 'text-4xl',
        value: 'text-8xl',
        unit: 'text-5xl',
        name: 'text-lg',
        minMaxLabel: 'text-2xl',
        minMaxValue: 'text-4xl',
        minMaxLabelHorizontalGap: '50px',    // Horizontal gap between "Min" and "Max" labels
        minMaxValueHorizontalGap: '30px',    // Horizontal gap between min and max values
        minMaxVerticalGap: '16px',           // Vertical gap between label and value
        minMaxHorizontalOffset: '0px',       // Horizontal offset (negative = left, positive = right)
        mainLabelHorizontalOffset: '0px',    // Main label horizontal offset
        mainLabelVerticalOffset: '0px',      // Main label vertical offset
        margin: 'my-3'
      };
    } else {
      // 1-2 CARDS LAYOUT - Large sizing for maximum impact and readability
      return {
      padding: 'p-6',
        label: 'text-4xl',
        value: 'text-8xl',
        unit: 'text-5xl',
        name: 'text-lg',
        minMaxLabel: 'text-2xl',
        minMaxValue: 'text-4xl',
        minMaxLabelHorizontalGap: '50px',    // Horizontal gap between "Min" and "Max" labels
        minMaxValueHorizontalGap: '30px',    // Horizontal gap between min and max values
        minMaxVerticalGap: '8px',            // Vertical gap between label and value
        minMaxHorizontalOffset: '0px',       // Horizontal offset (negative = left, positive = right)
        mainLabelHorizontalOffset: '0px',    // Main label horizontal offset
        mainLabelVerticalOffset: '-10px',      // Main label vertical offset
        margin: 'my-2'
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
        <div className="flex flex-col items-center justify-center h-full min-h-0 relative">
          {/* Label */}
          <div className={`${config.colorClass} ${sizes.label} font-bold uppercase tracking-wider flex-shrink-0`} style={{ position: 'relative', left: sizes.mainLabelHorizontalOffset, top: sizes.mainLabelVerticalOffset }}>
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
            <div className="flex flex-col items-center text-slate-500 pt-2 mt-2 border-t border-slate-800 w-full">
              {/* Labels Row */}
              <div className="flex justify-center w-full" style={{ marginLeft: sizes.minMaxHorizontalOffset }}>
                <div className={`text-slate-600 uppercase ${sizes.minMaxLabel} leading-tight whitespace-nowrap`} style={{ marginRight: sizes.minMaxLabelHorizontalGap }}>Min</div>
                <div className={`text-slate-600 uppercase ${sizes.minMaxLabel} leading-tight whitespace-nowrap`}>Max</div>
              </div>
              
              {/* Vertical Gap */}
              <div style={{ height: sizes.minMaxVerticalGap, width: '100%' }} />
              
              {/* Values Row */}
              <div className="flex justify-center w-full" style={{ marginLeft: sizes.minMaxHorizontalOffset }}>
                <div className={`text-slate-300 font-semibold ${sizes.minMaxValue} leading-tight whitespace-nowrap`} style={{ marginRight: sizes.minMaxValueHorizontalGap }}>
                  {Math.round(data.min)}{data.unit}
                </div>
                <div className={`text-slate-300 font-semibold ${sizes.minMaxValue} leading-tight whitespace-nowrap`}>
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