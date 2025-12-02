import React from 'react';

interface AttitudeIndicatorProps {
  pitch: number;
  roll: number;
}

export const AttitudeIndicator: React.FC<AttitudeIndicatorProps> = ({ pitch, roll }) => {
  // Clamp values for SVG rendering limits
  const safePitch = Math.max(-45, Math.min(45, pitch));
  
  // Transform for the horizon line. 
  // Pitch moves the horizon up/down. Roll rotates it.
  const pitchOffset = safePitch * 1.5; // Scaling factor for visual movement

  return (
    <div className="w-48 h-48 relative rounded-full overflow-hidden border-2 border-slate-600 bg-slate-800/50 backdrop-blur-sm shadow-lg">
       {/* Background (Sky/Ground) */}
       <div 
         className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%] transition-transform duration-100 ease-linear will-change-transform"
         style={{ transform: `rotate(${-roll}deg) translateY(${pitchOffset}px)` }}
       >
          <div className="w-full h-1/2 bg-sky-600/30 border-b border-white/50"></div>
          <div className="w-full h-1/2 bg-emerald-700/30 border-t border-white/50"></div>
       </div>

       {/* Pitch Ladder */}
       <div 
         className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-100 ease-linear pointer-events-none"
         style={{ transform: `rotate(${-roll}deg) translateY(${pitchOffset}px)` }}
       >
          {/* Example ladder lines */}
          <div className="flex flex-col gap-6 opacity-60">
             <div className="w-12 h-px bg-white text-center text-[8px] text-white">10</div>
             <div className="w-24 h-px bg-white text-center text-[8px] text-white">0</div>
             <div className="w-12 h-px bg-white text-center text-[8px] text-white">-10</div>
          </div>
       </div>

       {/* Fixed Aircraft Symbol (The "W" or crosshair) */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="60" height="20" viewBox="0 0 60 20" stroke="yellow" strokeWidth="2" fill="none">
             <path d="M0 10 L20 10 L30 15 L40 10 L60 10" />
             <circle cx="30" cy="10" r="1" fill="yellow" />
          </svg>
       </div>

       {/* Roll Indicator Arc Top */}
       <div className="absolute top-2 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full border-t-2 border-white/30 pointer-events-none"></div>
       <div 
            className="absolute top-0 left-1/2 w-0.5 h-3 bg-red-500 origin-bottom transition-transform duration-100"
            style={{ transform: `translateX(-50%) rotate(${-roll}deg)` }}
        ></div>
    </div>
  );
};