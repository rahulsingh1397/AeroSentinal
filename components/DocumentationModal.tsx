
import React from 'react';
import { X, Server, Smartphone, Cpu, Radio, Github, Box, Layers, Mic, Eye, AlertTriangle } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
          <div>
             <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <Layers className="text-white" />
                System Architecture & Repository Outline
             </h2>
             <p className="text-sm text-slate-400">Aerosentinel Autonomous Control Suite</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 text-slate-300">
          
          {/* CRITICAL SDK NOTICE */}
          <section className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg animate-in fade-in slide-in-from-top-2">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2 mb-2">
                  <AlertTriangle />
                  CRITICAL: DJI Mini 3 & SDK Compatibility
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                  The <strong>DJI Windows SDK</strong> is deprecated and <strong>DOES NOT</strong> support the Mini 3/Pro/4 series.
                  To control this drone from a PC, you <strong>MUST</strong> use the <strong>Android Mobile SDK (MSDK v5)</strong>.
              </p>
              <p className="text-sm text-slate-300 mt-2 font-bold">
                  Aerosentinel solves this via a "Tethered Bridge":
              </p>
              <ul className="list-disc list-inside text-sm mt-1 pl-4 text-slate-400">
                  <li><strong>Step 1:</strong> Android Phone connects to DJI RC via USB.</li>
                  <li><strong>Step 2:</strong> Android runs custom Bridge App (Kotlin) to stream data via Wi-Fi.</li>
                  <li><strong>Step 3:</strong> This PC runs the Python Backend to process data and host this Dashboard.</li>
              </ul>
          </section>

          {/* 1. Repo Structure */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                <Box className="text-cyan-500" />
                A. Full End-to-End Repository Outline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs border border-slate-800">
<pre className="text-green-400">
/aerosentinel-core
├── /android-bridge       <span className="text-slate-500"># Kotlin app (DJI Mobile SDK v5)</span>
│   ├── MainActivity.kt   <span className="text-slate-500"># Video/Telemetry streamer</span>
│   └── NetworkClient.kt  <span className="text-slate-500"># WebSocket Client → PC</span>
├── /backend              <span className="text-slate-500"># Python PC Server</span>
│   ├── server.py         <span className="text-slate-500"># FastAPI + WebSocket Hub</span>
│   └── requirements.txt  <span className="text-slate-500"># uvicorn, fastapi, opencv</span>
├── /web-dashboard        <span className="text-slate-500"># React (This App)</span>
│   ├── /src/components   <span className="text-slate-500"># HUD, Video, Controls</span>
│   └── /services         <span className="text-slate-500"># WebSocket Clients</span>
└── docker-compose.yml    <span className="text-slate-500"># Orchestration</span>
</pre>
                </div>
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed">
                        The repository is divided into three distinct microservices to ensure modularity and fault tolerance.
                    </p>
                    <ul className="space-y-2 text-sm">
                        <li className="flex gap-2">
                            <span className="text-cyan-500 font-bold">Bridge (Android):</span>
                            <span>Runs on the Android phone connected to the RC. Acts as a dumb relay, forwarding raw data to the PC.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-cyan-500 font-bold">Backend (Python):</span>
                            <span>Running on your PC (Localhost:8000). It accepts the Android stream, runs AI inference (future), and talks to the Dashboard.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-cyan-500 font-bold">Dashboard:</span>
                            <span>Operator interface for high-level commands (e.g., "Follow that car", "Orbit").</span>
                        </li>
                    </ul>
                </div>
            </div>
          </section>

          {/* 2. Modules */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                      <Eye size={18} className="text-purple-400" />
                      B. Object Tracking
                  </h4>
                  <p className="text-xs text-slate-400 mb-2">
                      Uses YOLOv8 + ByteTrack. 
                  </p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-slate-300">
                      <li>Bounding Box Center → PID → Yaw/Pitch Velocity.</li>
                      <li>Kalman Filter handles temporary occlusions.</li>
                      <li><b>Visual:</b> Click object in HUD to lock.</li>
                  </ul>
              </div>

              <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                      <Cpu size={18} className="text-red-400" />
                      C. Obstacle Detection
                  </h4>
                  <p className="text-xs text-slate-400 mb-2">
                      Monocular Depth (MiDaS) or Stereo.
                  </p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-slate-300">
                      <li>Generates disparity map from RGB.</li>
                      <li>Threshold check &lt; 2m triggers E-Brake.</li>
                      <li><b>Visual:</b> Red warning overlay & HUD distance.</li>
                  </ul>
              </div>

              <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                      <Mic size={18} className="text-yellow-400" />
                      E. Voice Assistant
                  </h4>
                  <p className="text-xs text-slate-400 mb-2">
                      Whisper (OpenAI) → Intent Parser.
                  </p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-slate-300">
                      <li>"Orbit Left" → Sets Cinema Mode.</li>
                      <li>"Stop" → Sets Loiter Mode.</li>
                      <li><b>Visual:</b> Mic active indicator & logs.</li>
                  </ul>
              </div>
          </section>

          {/* 3. Architecture Diagram */}
          <section className="bg-slate-950 p-6 rounded-lg border border-slate-800">
             <h3 className="text-lg font-bold text-white mb-6">System Data Flow</h3>
             <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-mono text-center">
                 <div className="flex flex-col items-center gap-2 p-4 bg-slate-900 rounded border border-slate-700 w-full md:w-1/4">
                    <Radio size={32} className="text-orange-500" />
                    <div className="font-bold text-white">DJI Mini 3</div>
                 </div>
                 
                 <div className="h-8 w-0.5 md:h-0.5 md:w-8 bg-slate-600"></div>

                 <div className="flex flex-col items-center gap-2 p-4 bg-slate-900 rounded border border-slate-700 w-full md:w-1/4">
                    <Smartphone size={32} className="text-blue-500" />
                    <div className="font-bold text-white">Android Bridge</div>
                    <div className="text-[10px] text-slate-500">USB → DJI RC<br/>Wi-Fi → PC</div>
                 </div>

                 <div className="h-8 w-0.5 md:h-0.5 md:w-8 bg-slate-600"></div>

                 <div className="flex flex-col items-center gap-2 p-4 bg-slate-900 rounded border border-slate-700 w-full md:w-1/4 shadow-[0_0_15px_rgba(34,211,238,0.1)] border-cyan-500/30">
                    <Cpu size={32} className="text-cyan-500" />
                    <div className="font-bold text-white">PC Server (Python)</div>
                    <div className="text-[10px] text-slate-500">Relay & AI<br/>localhost:8000</div>
                 </div>

                 <div className="h-8 w-0.5 md:h-0.5 md:w-8 bg-slate-600"></div>

                 <div className="flex flex-col items-center gap-2 p-4 bg-slate-900 rounded border border-slate-700 w-full md:w-1/4">
                    <Server size={32} className="text-green-500" />
                    <div className="font-bold text-white">React Cockpit</div>
                 </div>
             </div>
          </section>
        
        </div>
        
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center">
             <div className="text-xs text-slate-500">
                 Documentation Version 1.0.5
             </div>
             <a 
                href="#" 
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-bold"
             >
                <Github size={16} />
                View Repository
             </a>
        </div>
      </div>
    </div>
  );
};
