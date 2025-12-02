import React from 'react';
import { FlightMode, ConnectionStatus, CinematicShotType } from '../types';
import { 
  Crosshair, 
  Map as MapIcon, 
  Video, 
  Mic, 
  Navigation, 
  Zap,
  Camera,
  RotateCw,
  RotateCcw,
  MoveUpRight,
  ArrowUpCircle,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ControlPanelProps {
  flightMode: FlightMode;
  setFlightMode: (mode: FlightMode) => void;
  status: ConnectionStatus;
  armed: boolean;
  toggleArm: () => void;
  onVoiceToggle: () => void;
  isListening: boolean;
  activeShot: CinematicShotType;
  onShotSelect: (shot: CinematicShotType) => void;
  onOpenSettings: () => void;
  onToggleAudio?: (enabled: boolean) => void;
  audioEnabled?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  flightMode, 
  setFlightMode, 
  status,
  armed,
  toggleArm,
  onVoiceToggle,
  isListening,
  activeShot,
  onShotSelect,
  onOpenSettings,
  onToggleAudio,
  audioEnabled = true
}) => {
  const disabled = status !== ConnectionStatus.CONNECTED && status !== ConnectionStatus.WEAK_SIGNAL;

  return (
    <div className="h-full flex flex-col gap-4 bg-slate-900/90 border-l border-slate-700 p-4">
      
      {/* Arming Status */}
      <div className="mb-2 flex gap-2">
        <button
          onClick={toggleArm}
          disabled={disabled}
          className={`flex-1 py-4 rounded font-bold tracking-wider transition-all border-2
            ${armed 
                ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' 
                : 'bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        >
            {armed ? 'DISARM' : 'ARM'}
        </button>
        <button 
             onClick={onOpenSettings}
             className="w-14 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400 transition-colors"
             title="System Settings"
        >
            <Settings size={20} />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          
          {/* Flight Modes */}
          <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Autonomy</h3>
              <div className="grid grid-cols-2 gap-2">
                  <ControlButton 
                    active={flightMode === FlightMode.MANUAL} 
                    onClick={() => setFlightMode(FlightMode.MANUAL)}
                    icon={<Navigation size={18} />}
                    label="Manual"
                    disabled={disabled}
                  />
                  <ControlButton 
                    active={flightMode === FlightMode.FOLLOW_ME} 
                    onClick={() => setFlightMode(FlightMode.FOLLOW_ME)}
                    icon={<Crosshair size={18} />}
                    label="Smart Track"
                    disabled={disabled}
                  />
                  <ControlButton 
                    active={flightMode === FlightMode.AUTO_MISSION} 
                    onClick={() => setFlightMode(FlightMode.AUTO_MISSION)}
                    icon={<MapIcon size={18} />}
                    label="Waypoint"
                    disabled={disabled}
                  />
                  <ControlButton 
                    active={flightMode === FlightMode.RTL} 
                    onClick={() => setFlightMode(FlightMode.RTL)}
                    icon={<Zap size={18} />}
                    label="RTH"
                    color="text-orange-400 border-orange-400"
                    disabled={disabled}
                  />
              </div>
          </section>

          {/* Cinematic Modes */}
          <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">AI Cinematography</h3>
              {flightMode === FlightMode.CINEMA ? (
                <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2 rounded border border-slate-700 animate-in fade-in slide-in-from-top-2">
                     <ControlButton 
                        active={activeShot === CinematicShotType.ORBIT_LEFT} 
                        onClick={() => onShotSelect(CinematicShotType.ORBIT_LEFT)}
                        icon={<RotateCcw size={18} />}
                        label="Orbit L"
                        disabled={disabled}
                    />
                    <ControlButton 
                        active={activeShot === CinematicShotType.ORBIT_RIGHT} 
                        onClick={() => onShotSelect(CinematicShotType.ORBIT_RIGHT)}
                        icon={<RotateCw size={18} />}
                        label="Orbit R"
                        disabled={disabled}
                    />
                     <ControlButton 
                        active={activeShot === CinematicShotType.DRONIE} 
                        onClick={() => onShotSelect(CinematicShotType.DRONIE)}
                        icon={<MoveUpRight size={18} />}
                        label="Dronie"
                        disabled={disabled}
                    />
                     <ControlButton 
                        active={activeShot === CinematicShotType.HELIX} 
                        onClick={() => onShotSelect(CinematicShotType.HELIX)}
                        icon={<ArrowUpCircle size={18} />}
                        label="Helix"
                        disabled={disabled}
                    />
                    <button 
                        onClick={() => setFlightMode(FlightMode.STABILIZE)}
                        className="col-span-2 py-2 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10"
                    >
                        CANCEL SHOT
                    </button>
                </div>
              ) : (
                <button 
                    onClick={() => setFlightMode(FlightMode.CINEMA)}
                    disabled={disabled}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 transition-colors text-cyan-400"
                >
                    <Video size={18} />
                    <span>Open Shot Library</span>
                </button>
              )}
          </section>

          {/* Camera Actions */}
          <section>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Payload</h3>
             <button 
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded border border-slate-600 disabled:opacity-50"
                disabled={disabled}
            >
                 <Camera size={18} />
                 <span>Trigger Shutter</span>
             </button>
          </section>

          {/* Voice Assistant */}
          <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Voice Control</h3>
              <div className="flex gap-2">
                  <button 
                    onClick={onVoiceToggle}
                    disabled={disabled}
                    className={`flex-1 py-6 rounded border border-dashed flex flex-col items-center gap-2 transition-colors relative overflow-hidden
                        ${isListening 
                            ? 'bg-cyan-900/30 border-cyan-400 text-cyan-400' 
                            : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                  >
                      {isListening && (
                          <div className="absolute inset-0 bg-cyan-500/10 animate-pulse"></div>
                      )}
                      <Mic size={24} className={isListening ? 'animate-bounce' : ''} />
                      <span className="text-sm font-mono relative z-10">{isListening ? 'LISTENING...' : 'TAP TO SPEAK'}</span>
                  </button>
                  
                  {/* Mute Toggle */}
                  {onToggleAudio && (
                      <button 
                          onClick={() => onToggleAudio(!audioEnabled)}
                          className={`w-12 rounded border border-slate-600 flex flex-col items-center justify-center gap-2 hover:bg-slate-700
                            ${audioEnabled ? 'text-green-400 bg-slate-800' : 'text-red-400 bg-slate-900'}`}
                          title={audioEnabled ? 'Mute System Audio' : 'Unmute System Audio'}
                      >
                          {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      </button>
                  )}
              </div>
          </section>
      </div>
    </div>
  );
};

const ControlButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
    color?: string;
}> = ({ active, onClick, icon, label, disabled, color }) => {
    const baseColor = color || (active ? 'text-cyan-400 border-cyan-400 bg-cyan-900/20' : 'text-slate-300 border-slate-700 bg-slate-800');
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-3 rounded border transition-all
                ${baseColor} 
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80 active:scale-95'}
                ${active ? 'ring-1 ring-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : ''}
            `}
        >
            <div className="mb-1">{icon}</div>
            <span className="text-xs font-semibold">{label}</span>
        </button>
    )
}