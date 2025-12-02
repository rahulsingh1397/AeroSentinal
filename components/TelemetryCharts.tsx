import React, { useMemo } from 'react';

interface DataPoint {
  timestamp: number;
  altitude: number;
  speed: number;
  battery: number;
}

interface TelemetryChartsProps {
  data: DataPoint[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ data }) => {
  // We render the last 60 points (assuming 1 point per sec approx, or whatever buffer size is)
  const width = 300;
  const height = 100;

  const PathLine = ({ 
      values, 
      maxVal, 
      color 
  }: { 
      values: number[], 
      maxVal: number, 
      color: string 
  }) => {
      if (values.length < 2) return null;
      
      const points = values.map((v, i) => {
          const x = (i / (values.length - 1)) * width;
          const y = height - (v / (maxVal || 1)) * height;
          return `${x},${y}`;
      }).join(' ');

      return (
          <polyline 
             points={points} 
             fill="none" 
             stroke={color} 
             strokeWidth="2" 
             strokeLinecap="round" 
             strokeLinejoin="round"
          />
      );
  };

  return (
    <div className="flex h-full w-full bg-black/80 text-xs font-mono border-t border-slate-700">
       
       {/* Altitude Chart */}
       <div className="flex-1 border-r border-slate-800 p-2 relative group">
           <div className="absolute top-2 left-2 font-bold text-cyan-400 flex items-center gap-2">
               ALTITUDE
               <span className="text-slate-500 font-normal text-[10px]">{data[data.length-1]?.altitude.toFixed(1)}m</span>
           </div>
           <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
               <PathLine 
                  values={data.map(d => d.altitude)} 
                  maxVal={Math.max(50, ...data.map(d => d.altitude))} 
                  color="#22d3ee" 
               />
               {/* Grid line at 0 */}
               <line x1="0" y1={height} x2={width} y2={height} stroke="#334155" strokeWidth="1" />
           </svg>
       </div>

       {/* Speed Chart */}
       <div className="flex-1 border-r border-slate-800 p-2 relative">
           <div className="absolute top-2 left-2 font-bold text-emerald-400 flex items-center gap-2">
               SPEED
               <span className="text-slate-500 font-normal text-[10px]">{data[data.length-1]?.speed.toFixed(1)}m/s</span>
           </div>
           <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
               <PathLine 
                  values={data.map(d => d.speed)} 
                  maxVal={Math.max(15, ...data.map(d => d.speed))} 
                  color="#34d399" 
               />
               <line x1="0" y1={height} x2={width} y2={height} stroke="#334155" strokeWidth="1" />
           </svg>
       </div>

       {/* Battery Chart */}
       <div className="flex-1 p-2 relative">
           <div className="absolute top-2 left-2 font-bold text-purple-400 flex items-center gap-2">
               BATTERY
               <span className="text-slate-500 font-normal text-[10px]">{data[data.length-1]?.battery.toFixed(0)}%</span>
           </div>
           <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
               <PathLine 
                  values={data.map(d => d.battery)} 
                  maxVal={100} 
                  color="#a855f7" 
               />
               {/* Warning Threshold */}
               <line x1="0" y1={height * 0.7} x2={width} y2={height * 0.7} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
           </svg>
       </div>

    </div>
  );
};