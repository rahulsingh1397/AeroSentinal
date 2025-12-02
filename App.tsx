import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wifi, 
  Battery, 
  Signal, 
  MapPin, 
  Info,
  Layers,
  Play,
  Trash,
  BarChart3,
  Terminal
} from 'lucide-react';
import { mockDroneService } from './services/mockDroneService';
import { liveDroneService } from './services/liveDroneService';
import { audioService } from './services/audioService';
import { Telemetry, DetectedObject, LogMessage, FlightMode, ConnectionStatus, CinematicShotType, Waypoint, DroneConfig, Coordinates, IDroneService } from './types';
import { VideoFeed } from './components/VideoFeed';
import { MapDisplay } from './components/MapDisplay';
import { AttitudeIndicator } from './components/HUD/AttitudeIndicator';
import { ControlPanel } from './components/ControlPanel';
import { LogConsole } from './components/LogConsole';
import { TelemetryCharts } from './components/TelemetryCharts';
import { DocumentationModal } from './components/DocumentationModal';
import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  // Service Toggle State
  const [useLiveService, setUseLiveService] = useState(false);
  
  // Memoize the active service based on toggle
  const activeService: IDroneService = useMemo(() => {
      return useLiveService ? liveDroneService : mockDroneService;
  }, [useLiveService]);

  // State
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [flightMode, setFlightMode] = useState<FlightMode>(FlightMode.MANUAL);
  const [activeShot, setActiveShot] = useState<CinematicShotType>(CinematicShotType.NONE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isArmed, setIsArmed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // History State for Visualization
  const [telemetryHistory, setTelemetryHistory] = useState<{timestamp: number, altitude: number, speed: number, battery: number}[]>([]);
  const [flightPath, setFlightPath] = useState<Coordinates[]>([]);

  // Modals & Panels
  const [showDocs, setShowDocs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bottomTab, setBottomTab] = useState<'LOGS'|'GRAPHS'>('GRAPHS');

  const [obstacleWarning, setObstacleWarning] = useState(false);
  
  // Mission / Map State
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [viewMode, setViewMode] = useState<'VIDEO' | 'MAP'>('VIDEO'); // Main view

  // --- Service Subscription ---
  useEffect(() => {
    // Initial Connect
    activeService.connect();
    audioService.speak("Aerosentinel System Online");

    let lastPathUpdate = 0;

    const unsubscribe = activeService.subscribe((data) => {
       if (data.status) setConnectionStatus(data.status);

       if (data.telemetry) {
           const t = data.telemetry;
           setTelemetry(t);
           const obsWarning = t.obstacleDistance < 2.0;
           setObstacleWarning(obsWarning);
           
           // Audio Warning for Obstacles
           if (obsWarning && !obstacleWarning) {
               audioService.playWarningTone();
               audioService.speak("Obstacle Detected", "high");
           }
           
           // Buffer Telemetry for Charts (Max 100 points)
           setTelemetryHistory(prev => {
              const now = Date.now();
              // Downsample: only add if > 500ms elapsed since last point
              if (prev.length > 0 && now - prev[prev.length-1].timestamp < 500) return prev;
              
              const newPoint = { 
                  timestamp: now, 
                  altitude: t.altitude, 
                  speed: t.speedH, 
                  battery: t.battery 
              };
              const newData = [...prev, newPoint];
              if (newData.length > 100) newData.shift();
              return newData;
           });

           // Buffer Path for Map
           const now = Date.now();
           if (now - lastPathUpdate > 2000) { // Every 2 seconds to save memory/render time
               setFlightPath(prev => [...prev, { lat: t.coordinates.lat, lng: t.coordinates.lng }]);
               lastPathUpdate = now;
           }
       }
       if (data.objects) setObjects(data.objects);
       if (data.logs) setLogs(prev => [...prev, ...data.logs]);
    });

    return () => {
      activeService.disconnect();
      unsubscribe();
    }
  }, [activeService]);

  // --- Audio Feedback for State Changes ---
  useEffect(() => {
      if (isArmed) audioService.speak("Motors Armed. Caution.");
      else audioService.speak("Motors Disarmed.");
  }, [isArmed]);

  useEffect(() => {
      // Format mode for speech (e.g., "AUTO_MISSION" -> "Auto Mission")
      const readable = flightMode.replace('_', ' ').toLowerCase();
      audioService.speak(`${readable} mode active`);
  }, [flightMode]);


  const handleArmToggle = () => {
      const newState = !isArmed;
      setIsArmed(newState);
      activeService.setArmed(newState);
      setLogs(prev => [...prev, { 
          id: crypto.randomUUID(), 
          timestamp: Date.now(), 
          level: newState ? 'warn' : 'info', 
          message: newState ? 'Motors ARMED. Takeoff Ready.' : 'Motors DISARMED.' 
      }]);
      if (newState) {
          setFlightMode(FlightMode.STABILIZE);
          setFlightPath([]); // Reset path on new flight
          setTelemetryHistory([]);
      } else {
          setFlightMode(FlightMode.MANUAL);
      }
  };

  const handleModeChange = useCallback((mode: FlightMode) => {
      setFlightMode(mode);
      activeService.setFlightMode(mode);
      if (mode !== FlightMode.CINEMA) setActiveShot(CinematicShotType.NONE);
  }, [activeService]);

  const handleShotSelect = (shot: CinematicShotType) => {
      setActiveShot(shot);
      activeService.setCinematicShot(shot);
      audioService.speak(`Initiating ${shot.toLowerCase().replace('_', ' ')} shot`);
  };

  const handleObjectSelect = (id: number | null) => {
      activeService.setTrackedObject(id);
      if (id === null && flightMode === FlightMode.FOLLOW_ME) {
          handleModeChange(FlightMode.STABILIZE);
      } else if (id !== null) {
          audioService.speak("Target Locked");
      }
  };

  const handleGimbalPitch = (pitch: number) => {
      activeService.setGimbalPitch(pitch);
  }

  const handleMapClick = (lat: number, lng: number) => {
      const newWp: Waypoint = {
          id: crypto.randomUUID(),
          lat,
          lng,
          altitude: 20, // Default mission altitude
          index: waypoints.length
      };
      const updated = [...waypoints, newWp];
      setWaypoints(updated);
      activeService.setWaypoints(updated); 
  };

  const clearMission = () => {
      setWaypoints([]);
      activeService.setWaypoints([]);
      setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'info', message: 'Mission Cleared.' }]);
      audioService.speak("Mission Cleared");
  };

  const startMission = () => {
      if (waypoints.length === 0) {
          setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'warn', message: 'Cannot start: No waypoints set.' }]);
          audioService.speak("Error. No Waypoints.");
          return;
      }
      if (!isArmed) {
        setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'warn', message: 'Cannot start: Arm drone first.' }]);
        audioService.speak("Error. Arm Motors First.");
        return;
      }
      handleModeChange(FlightMode.AUTO_MISSION);
      setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'success', message: 'Mission Started. Executing Waypoints.' }]);
  };

  const handleConfigSave = (config: DroneConfig) => {
      activeService.updateConfig(config);
      setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'info', message: 'Flight Parameters Updated' }]);
      audioService.speak("Configuration Saved");
  };

  const handleVoiceToggle = () => {
      if (!isArmed && connectionStatus !== ConnectionStatus.CONNECTED) return;
      
      setIsListening(true);
      setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'info', message: 'Listening for command...' }]);
      
      setTimeout(() => {
          setIsListening(false);
          // Voice Intent Parsing Mock
          const commands = [
              { text: "Orbit Left", action: () => handleShotSelect(CinematicShotType.ORBIT_LEFT) },
              { text: "Follow Me", action: () => {
                  const nearest = objects[0];
                  if (nearest) {
                      activeService.setTrackedObject(nearest.id);
                      handleModeChange(FlightMode.FOLLOW_ME);
                  } else {
                      setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'warn', message: 'Voice: No target found to follow.' }]);
                  }
              }},
              { text: "Stop", action: () => handleModeChange(FlightMode.LOITER) },
              { text: "Return Home", action: () => handleModeChange(FlightMode.RTL) },
              { text: "Start Mission", action: () => startMission() }
          ];

          const cmd = commands[Math.floor(Math.random() * commands.length)];
          cmd.action();
          
          setLogs(prev => [...prev, { 
              id: crypto.randomUUID(), 
              timestamp: Date.now(), 
              level: 'success', 
              message: `Voice Command Recognized: "${cmd.text}"` 
          }]);
      }, 1500);
  };

  const handleEmergencyStop = () => {
      activeService.setArmed(false);
      setIsArmed(false);
      handleModeChange(FlightMode.MANUAL);
      setLogs(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), level: 'error', message: 'EMERGENCY STOP TRIGGERED. MOTORS KILLED.' }]);
      audioService.speak("Emergency Stop. Motors Killed.", "high");
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Ignore if typing in an input
          if ((e.target as HTMLElement).tagName === 'INPUT') return;

          let actionName = '';
          
          switch(e.code) {
              case 'Space':
                  e.preventDefault();
                  handleModeChange(FlightMode.LOITER);
                  audioService.speak("Brake");
                  actionName = 'BRAKE / HOVER';
                  break;
              case 'KeyM':
                  setViewMode(prev => prev === 'VIDEO' ? 'MAP' : 'VIDEO');
                  actionName = 'TOGGLE MAP';
                  break;
              case 'KeyH':
                  handleModeChange(FlightMode.RTL);
                  audioService.speak("Return to Home");
                  actionName = 'RTH';
                  break;
              case 'KeyA':
                  // Safety: Only allow disarm via key, not arm
                  if (isArmed) {
                     // handleArmToggle(); // Too dangerous for single key? Let's stick to UI for arming.
                  }
                  break;
              case 'ArrowUp':
                  if (telemetry) activeService.setGimbalPitch(telemetry.gimbalPitch + 5);
                  break;
              case 'ArrowDown':
                  if (telemetry) activeService.setGimbalPitch(telemetry.gimbalPitch - 5);
                  break;
          }

          if (actionName) {
              // Dispatch event for visualizer
              window.dispatchEvent(new CustomEvent('shortcut-triggered', { detail: { key: e.code === 'Space' ? 'SPACE' : e.key.toUpperCase(), action: actionName } }));
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArmed, telemetry, handleModeChange, activeService]);


  // Default coordinates if telemetry not ready
  const safeCoords = telemetry?.coordinates || { lat: 37.7749, lng: -122.4194 };
  const safeHome = { lat: 37.7749, lng: -122.4194 }; 

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden select-none">
      
      {/* 1. Top Header Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center text-slate-900 font-bold">AS</div>
             <h1 className="font-bold text-lg tracking-wider text-white">AEROSENTINEL <span className="text-cyan-500 text-xs font-mono ml-1">V1.2</span></h1>
           </div>
           
           <div className="h-6 w-px bg-slate-700 mx-2"></div>
           
           <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`flex items-center gap-1 ${connectionStatus === ConnectionStatus.CONNECTED ? 'text-green-400' : 'text-red-400'}`}>
                <Wifi size={14} />
                {connectionStatus}
              </span>
              {useLiveService && (
                 <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50 text-[10px] font-bold animate-pulse">
                    LIVE DATA
                 </span>
              )}
           </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-sm">
           <div className={`flex items-center gap-2 ${telemetry && telemetry.battery < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
              <Battery size={20} className="rotate-90" />
              <span className="font-bold">{telemetry?.battery.toFixed(0)}%</span>
           </div>
           
           <div className="h-6 w-px bg-slate-700"></div>

           <button 
             onClick={() => setShowDocs(true)}
             className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
           >
              <Info size={20} />
           </button>
           
           <button 
             className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded font-bold text-xs tracking-wider transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500"
             onClick={handleEmergencyStop}
           >
             E-STOP
           </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left: Main Viewport */}
        <div className="flex-1 relative flex flex-col p-2 gap-2 bg-slate-950 min-w-0">
           
           {/* HUD Top Bar */}
           <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded border border-slate-800 backdrop-blur-sm z-20 mx-2 mt-2 absolute top-2 left-2 right-2 max-w-[calc(100%-1rem)] pointer-events-none">
              <div className="flex gap-6 text-sm font-mono font-bold pointer-events-auto">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">ALTITUDE</span>
                    <span className="text-cyan-400">{telemetry?.altitude.toFixed(1)} <span className="text-[10px] text-slate-500">m</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">H. SPEED</span>
                    <span className="text-white">{telemetry?.speedH.toFixed(1)} <span className="text-[10px] text-slate-500">m/s</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">DISTANCE</span>
                    <span className="text-white">{telemetry?.distanceHome.toFixed(0)} <span className="text-[10px] text-slate-500">m</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">WP COUNT</span>
                    <span className="text-yellow-400">{waypoints.length}</span>
                 </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <MapPin size={14} />
                  {telemetry?.coordinates.lat.toFixed(5)}, {telemetry?.coordinates.lng.toFixed(5)}
              </div>
           </div>

           {/* Viewport Content (PiP Logic) */}
           <div className="flex-1 relative min-h-0 rounded-lg overflow-hidden border border-slate-800 bg-black">
              
              {/* Main View */}
              <div className="absolute inset-0 z-0">
                  {viewMode === 'VIDEO' ? (
                      <VideoFeed 
                        objects={objects} 
                        isConnected={connectionStatus === ConnectionStatus.CONNECTED}
                        flightMode={flightMode}
                        obstacleWarning={obstacleWarning}
                        activeShot={activeShot}
                        onObjectSelect={handleObjectSelect}
                        gimbalPitch={telemetry?.gimbalPitch}
                        onGimbalPitchChange={handleGimbalPitch}
                        streamUrl={useLiveService ? "http://localhost:8000/video_feed" : undefined}
                      />
                  ) : (
                      <MapDisplay 
                        droneLocation={safeCoords}
                        homeLocation={safeHome}
                        yaw={telemetry?.yaw || 0}
                        waypoints={waypoints}
                        flightPath={flightPath}
                        onMapClick={handleMapClick}
                      />
                  )}
              </div>

              {/* Secondary View (PiP) */}
              <div 
                 className="absolute bottom-4 right-4 w-64 h-48 z-20 rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl cursor-pointer hover:border-cyan-400 transition-colors bg-slate-900"
                 onClick={() => setViewMode(viewMode === 'VIDEO' ? 'MAP' : 'VIDEO')}
              >
                  {viewMode === 'VIDEO' ? (
                      <MapDisplay 
                        droneLocation={safeCoords}
                        homeLocation={safeHome}
                        yaw={telemetry?.yaw || 0}
                        waypoints={waypoints}
                        flightPath={flightPath}
                        onMapClick={() => {}} // Disable clicks in small view
                      />
                  ) : (
                      <VideoFeed 
                        objects={objects} 
                        isConnected={connectionStatus === ConnectionStatus.CONNECTED}
                        flightMode={flightMode}
                        obstacleWarning={obstacleWarning}
                        activeShot={activeShot}
                        onObjectSelect={() => {}}
                        gimbalPitch={telemetry?.gimbalPitch}
                        streamUrl={useLiveService ? "http://localhost:8000/video_feed" : undefined}
                      />
                  )}
                  
                  {/* Swap Icon Overlay */}
                  <div className="absolute top-2 right-2 bg-black/50 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Layers size={14} />
                  </div>
              </div>

              {/* Mission Controls Overlay (Only visible in Map Mode) */}
              {viewMode === 'MAP' && (
                  <div className="absolute top-20 right-4 z-10 flex flex-col gap-2">
                       <button 
                         onClick={startMission}
                         className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
                         title="Execute Mission"
                        >
                           <Play size={24} fill="white" />
                       </button>
                       <button 
                         onClick={clearMission}
                         className="bg-slate-700 hover:bg-red-500 text-white p-3 rounded-full shadow-lg transition-colors"
                         title="Clear Waypoints"
                        >
                           <Trash size={20} />
                       </button>
                  </div>
              )}

              {/* Attitude Indicator Overlay (Always visible over Video) */}
              {viewMode === 'VIDEO' && (
                <div className="absolute bottom-4 left-4 z-10 opacity-80 scale-75 origin-bottom-left hover:opacity-100 transition-opacity pointer-events-none">
                    <AttitudeIndicator pitch={telemetry?.pitch || 0} roll={telemetry?.roll || 0} />
                </div>
              )}
           </div>

           {/* Bottom Panel (Tabs) */}
           <div className="h-48 shrink-0 rounded-lg overflow-hidden border border-slate-800 shadow-lg flex flex-col bg-slate-900">
              <div className="flex border-b border-slate-700 bg-slate-800">
                  <button 
                    onClick={() => setBottomTab('GRAPHS')}
                    className={`px-4 py-2 text-xs font-bold flex items-center gap-2 ${bottomTab === 'GRAPHS' ? 'bg-slate-700 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                     <BarChart3 size={14} />
                     TELEMETRY DATA
                  </button>
                  <button 
                    onClick={() => setBottomTab('LOGS')}
                    className={`px-4 py-2 text-xs font-bold flex items-center gap-2 ${bottomTab === 'LOGS' ? 'bg-slate-700 text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                     <Terminal size={14} />
                     SYSTEM LOGS
                  </button>
              </div>
              
              <div className="flex-1 relative">
                  {bottomTab === 'GRAPHS' ? (
                      <TelemetryCharts data={telemetryHistory} />
                  ) : (
                      <LogConsole logs={logs} />
                  )}
              </div>
           </div>
        </div>

        {/* Right: Sidebar Controls */}
        <div className="w-80 shrink-0 h-full z-20">
           <ControlPanel 
              flightMode={flightMode} 
              setFlightMode={handleModeChange}
              status={connectionStatus}
              armed={isArmed}
              toggleArm={handleArmToggle}
              onVoiceToggle={handleVoiceToggle}
              isListening={isListening}
              activeShot={activeShot}
              onShotSelect={handleShotSelect}
              onOpenSettings={() => setShowSettings(true)}
              onToggleAudio={(enabled) => { setAudioEnabled(enabled); audioService.setEnabled(enabled); }}
              audioEnabled={audioEnabled}
           />
        </div>

      </main>

      {/* Modals */}
      <DocumentationModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
      <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
          onSave={handleConfigSave}
          isLive={useLiveService}
          onToggleLive={setUseLiveService} 
      />
    </div>
  );
};

export default App;