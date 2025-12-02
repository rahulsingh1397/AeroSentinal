import React, { useRef, useEffect, useState } from 'react';
import { DetectedObject, FlightMode, CinematicShotType } from '../types';
import { Target, AlertTriangle, Video, MousePointerClick, Lock, Camera, Keyboard } from 'lucide-react';

interface VideoFeedProps {
  objects: DetectedObject[];
  isConnected: boolean;
  flightMode: FlightMode;
  obstacleWarning: boolean;
  activeShot: CinematicShotType;
  onObjectSelect: (id: number | null) => void;
  gimbalPitch?: number;
  onGimbalPitchChange?: (pitch: number) => void;
  streamUrl?: string; // For WebRTC stream
}

export const VideoFeed: React.FC<VideoFeedProps> = ({ 
  objects, 
  isConnected, 
  flightMode, 
  obstacleWarning,
  activeShot,
  onObjectSelect,
  gimbalPitch = 0,
  onGimbalPitchChange,
  streamUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showShortcut, setShowShortcut] = useState<{key: string, action: string} | null>(null);

  // Listen for shortcut events dispatched from App
  useEffect(() => {
      const handleShortcut = (e: CustomEvent) => {
          setShowShortcut(e.detail);
          setTimeout(() => setShowShortcut(null), 1000);
      };
      window.addEventListener('shortcut-triggered' as any, handleShortcut as any);
      return () => window.removeEventListener('shortcut-triggered' as any, handleShortcut as any);
  }, []);

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full bg-black overflow-hidden rounded-lg border border-slate-700 shadow-2xl group select-none"
        onClick={() => onObjectSelect(null)} // Click bg to deselect
    >
      {/* Video Source */}
      {isConnected ? (
        <div className="absolute inset-0 bg-slate-900">
           <div className="w-full h-full overflow-hidden relative">
             {streamUrl ? (
                 <img 
                    src={streamUrl}
                    className="w-full h-full object-cover"
                    alt="Live Feed"
                 />
             ) : (
                 /* Simulation Fallback */
                 <img 
                    src="https://picsum.photos/1280/720" 
                    alt="Drone Feed" 
                    className="w-full h-full object-cover opacity-80 transition-transform duration-300 ease-out"
                    style={{ transform: `scale(1.1) translateY(${gimbalPitch * 0.5}%)` }} 
                 />
             )}
           </div>
           {/* Scanlines effect */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none"></div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-center text-slate-500">
             <p className="text-xl font-mono animate-pulse">NO SIGNAL</p>
             <p className="text-sm mt-2">Waiting for video uplink...</p>
          </div>
        </div>
      )}

      {/* AI Overlays (Bounding Boxes) */}
      {isConnected && objects.map((obj) => {
        const style = {
            left: `${obj.bbox[0] * 100}%`,
            top: `${obj.bbox[1] * 100}%`,
            width: `${obj.bbox[2] * 100}%`,
            height: `${obj.bbox[3] * 100}%`,
        };
        
        return (
            <div 
                key={obj.id} 
                className="absolute transition-all duration-100 ease-linear cursor-pointer z-10" 
                style={style}
                onClick={(e) => {
                    e.stopPropagation();
                    onObjectSelect(obj.tracking ? null : obj.id);
                }}
            >
                {/* Bounding Box */}
                <div className={`w-full h-full border-2 ${obj.tracking ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'border-cyan-500/50 hover:border-cyan-400'} relative group-hover/box`}>
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-current"></div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-current"></div>
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-current"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-current"></div>
                    
                    {/* Label */}
                    <div className={`absolute -top-8 left-0 flex items-center gap-1 px-2 py-1 text-xs font-mono rounded transition-colors
                        ${obj.tracking ? 'bg-green-500 text-black font-bold' : 'bg-black/60 text-white'}`}>
                        {obj.tracking ? <Lock size={12} /> : <Target size={12} className="text-cyan-400" />}
                        <span className="uppercase">{obj.label}</span>
                        <span className="opacity-75">{(obj.confidence * 100).toFixed(0)}%</span>
                    </div>
                    
                    {!obj.tracking && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                             <div className="bg-black/50 backdrop-blur px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                                <MousePointerClick size={12} />
                                <span>CLICK TO TRACK</span>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        );
      })}

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
         <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="1">
            <line x1="50" y1="40" x2="50" y2="60" />
            <line x1="40" y1="50" x2="60" y2="50" />
            <circle cx="50" cy="50" r="40" strokeDasharray="4 4" opacity="0.5" />
         </svg>
      </div>

      {/* Gimbal Control Slider */}
      {isConnected && onGimbalPitchChange && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-48 w-8 bg-black/40 backdrop-blur rounded-full border border-slate-600 flex flex-col items-center py-2 gap-2 z-30"
             onClick={(e) => e.stopPropagation()}>
           <Camera size={14} className="text-slate-400" />
           <div className="relative flex-1 w-full flex justify-center">
               <input 
                  type="range" 
                  min="-90" 
                  max="20" 
                  value={gimbalPitch}
                  onChange={(e) => onGimbalPitchChange(Number(e.target.value))}
                  className="w-48 h-full -rotate-90 absolute top-0 origin-center appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-slate-500/50 [&::-webkit-slider-runnable-track]:rounded"
                  style={{ width: '160px', left: '-64px', top: '0' }}
               />
           </div>
           <span className="text-[10px] font-mono text-cyan-400">{gimbalPitch.toFixed(0)}°</span>
        </div>
      )}

      {/* Obstacle Warning Overlay */}
      {obstacleWarning && (
        <div className="absolute inset-0 border-4 border-red-500/50 animate-pulse pointer-events-none z-40 flex items-start justify-center pt-10">
            <div className="bg-red-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-xl">
                <AlertTriangle size={24} className="animate-bounce" />
                PROXIMITY ALERT
            </div>
        </div>
      )}

      {/* Keyboard Shortcut Feedback */}
      {showShortcut && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-in zoom-in duration-200 fade-out">
              <div className="bg-black/70 backdrop-blur px-8 py-4 rounded-xl border border-slate-500 flex flex-col items-center gap-2">
                  <div className="text-4xl font-bold text-white tracking-widest">{showShortcut.key}</div>
                  <div className="text-sm text-cyan-400 font-mono uppercase tracking-widest">{showShortcut.action}</div>
              </div>
          </div>
      )}

      {/* Active Cinema Shot Indicator */}
      {activeShot !== CinematicShotType.NONE && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-cyan-500/50 text-cyan-400 font-mono flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative">
                  <Video size={20} />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <span className="font-bold tracking-widest">AUTO: {activeShot}</span>
          </div>
      )}

      {/* Mode Indicator Overlay */}
      <div className="absolute top-4 right-4 text-right pointer-events-none z-20">
          <div className="text-xs text-slate-400 font-mono mb-1">FLIGHT MODE</div>
          <div className="text-2xl text-cyan-400 font-bold font-mono tracking-widest drop-shadow-lg">{flightMode.replace('_', ' ')}</div>
      </div>

      {/* Keyboard Hint (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex gap-2 opacity-50 hover:opacity-100 transition-opacity pointer-events-none">
         <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded text-[10px] text-slate-300 border border-slate-700">
             <Keyboard size={10} />
             <span>SPACE: BRAKE</span>
         </div>
         <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded text-[10px] text-slate-300 border border-slate-700">
             <span>M: MAP</span>
         </div>
      </div>
    </div>
  );
};