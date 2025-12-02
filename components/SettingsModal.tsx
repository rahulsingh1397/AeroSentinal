import React, { useState } from 'react';
import { X, Shield, Activity, Sliders, Save, AlertTriangle, Wifi } from 'lucide-react';
import { DroneConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DroneConfig) => void;
  currentConfig?: DroneConfig;
  isLive?: boolean;
  onToggleLive?: (isLive: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig, isLive, onToggleLive }) => {
  const [activeTab, setActiveTab] = useState<'SAFETY' | 'CONTROL' | 'CONNECTION'>('SAFETY');
  
  // Local state for form
  const [config, setConfig] = useState<DroneConfig>(currentConfig || {
      maxAltitude: 120,
      maxSpeed: 15,
      rthAltitude: 30,
      obstacleAvoidanceEnabled: true,
      geofenceRadius: 500,
      pid: { p: 1.2, i: 0.05, d: 0.3 }
  });

  if (!isOpen) return null;

  const handleChange = (field: keyof DroneConfig, value: any) => {
      setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handlePidChange = (field: 'p'|'i'|'d', value: number) => {
      setConfig(prev => ({ ...prev, pid: { ...prev.pid, [field]: value } }));
  };

  const handleSave = () => {
      onSave(config);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Sliders className="text-cyan-400" />
             Flight Configuration
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900">
            <button 
                onClick={() => setActiveTab('SAFETY')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'SAFETY' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}
                `}
            >
                <Shield size={16} />
                SAFETY
            </button>
            <button 
                onClick={() => setActiveTab('CONTROL')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'CONTROL' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}
                `}
            >
                <Activity size={16} />
                TUNING
            </button>
            {onToggleLive && (
                <button 
                    onClick={() => setActiveTab('CONNECTION')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors
                        ${activeTab === 'CONNECTION' ? 'text-green-400 border-b-2 border-green-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}
                    `}
                >
                    <Wifi size={16} />
                    SOURCE
                </button>
            )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-slate-950/50 min-h-[300px]">
            
            {activeTab === 'SAFETY' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-400 uppercase">Max Altitude (m)</label>
                            <input 
                                type="number" 
                                value={config.maxAltitude}
                                onChange={(e) => handleChange('maxAltitude', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-cyan-400 outline-none"
                            />
                            <p className="text-[10px] text-slate-500">Legal limit is typically 120m.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-400 uppercase">Return Home Altitude (m)</label>
                            <input 
                                type="number" 
                                value={config.rthAltitude}
                                onChange={(e) => handleChange('rthAltitude', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-cyan-400 outline-none"
                            />
                            <p className="text-[10px] text-slate-500">Safe height above obstacles.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-400 uppercase">Max Speed (m/s)</label>
                            <input 
                                type="range" 
                                min="1" max="25"
                                value={config.maxSpeed}
                                onChange={(e) => handleChange('maxSpeed', Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <div className="text-right text-xs text-cyan-400 font-mono">{config.maxSpeed} m/s</div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-400 uppercase">Geofence Radius (m)</label>
                            <input 
                                type="number" 
                                value={config.geofenceRadius}
                                onChange={(e) => handleChange('geofenceRadius', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-cyan-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-white mb-1">Obstacle Avoidance</div>
                            <div className="text-xs text-slate-500">Utilize depth sensors to brake automatically.</div>
                        </div>
                        <button 
                            onClick={() => handleChange('obstacleAvoidanceEnabled', !config.obstacleAvoidanceEnabled)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${config.obstacleAvoidanceEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.obstacleAvoidanceEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'CONTROL' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded flex items-start gap-3">
                        <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                        <div className="text-xs text-orange-200">
                            <strong>Advanced Tuning:</strong> Improper PID values can cause oscillation or instability. Only adjust if you know what you are doing.
                        </div>
                     </div>

                     <div className="space-y-4">
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-slate-400 uppercase">
                                <label>Proportional (P)</label>
                                <span>{config.pid.p.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" min="0.1" max="5.0" step="0.1"
                                value={config.pid.p}
                                onChange={(e) => handlePidChange('p', Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                            />
                         </div>
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-slate-400 uppercase">
                                <label>Integral (I)</label>
                                <span>{config.pid.i.toFixed(3)}</span>
                            </div>
                            <input 
                                type="range" min="0.0" max="1.0" step="0.01"
                                value={config.pid.i}
                                onChange={(e) => handlePidChange('i', Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                            />
                         </div>
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-slate-400 uppercase">
                                <label>Derivative (D)</label>
                                <span>{config.pid.d.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" min="0.0" max="2.0" step="0.1"
                                value={config.pid.d}
                                onChange={(e) => handlePidChange('d', Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                            />
                         </div>
                     </div>
                </div>
            )}

            {activeTab === 'CONNECTION' && onToggleLive && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                     <div className="p-4 bg-slate-800 border border-slate-700 rounded">
                         <div className="flex items-center justify-between mb-4">
                             <div className="text-sm font-bold">Data Source Mode</div>
                             <div className={`px-3 py-1 rounded text-xs font-bold ${isLive ? 'bg-red-500 text-white' : 'bg-cyan-500 text-black'}`}>
                                 {isLive ? 'LIVE BRIDGE' : 'SIMULATION'}
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                             <button
                                onClick={() => onToggleLive(false)}
                                className={`p-4 rounded border flex flex-col items-center gap-2 transition-all
                                    ${!isLive ? 'bg-cyan-900/30 border-cyan-400 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500 opacity-50 hover:opacity-100'}
                                `}
                             >
                                 <Activity size={24} />
                                 <span>Simulation</span>
                             </button>
                             <button
                                onClick={() => onToggleLive(true)}
                                className={`p-4 rounded border flex flex-col items-center gap-2 transition-all
                                    ${isLive ? 'bg-red-900/30 border-red-400 text-red-400' : 'bg-slate-900 border-slate-700 text-slate-500 opacity-50 hover:opacity-100'}
                                `}
                             >
                                 <Wifi size={24} />
                                 <span>Live Hardware</span>
                             </button>
                         </div>

                         <div className="mt-4 text-xs text-slate-400 p-2 bg-slate-900 rounded border border-slate-800">
                             {isLive ? (
                                 <span>
                                     <strong>Warning:</strong> Live mode requires the Android Bridge App to be running and connected to <code>ws://localhost:8000</code>. Ensure RC is connected.
                                 </span>
                             ) : (
                                 <span>
                                     Running purely in browser memory. Physics and GPS are approximated.
                                 </span>
                             )}
                         </div>
                     </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                 Cancel
             </button>
             <button 
                onClick={handleSave}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-sm flex items-center gap-2 transition-colors shadow-lg"
             >
                 <Save size={16} />
                 Save Configuration
             </button>
        </div>

      </div>
    </div>
  );
};