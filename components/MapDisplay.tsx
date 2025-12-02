import React, { useEffect, useRef } from 'react';
import { Coordinates, Waypoint } from '../types';
import { Navigation, Flag, Home } from 'lucide-react';

interface MapDisplayProps {
  droneLocation: Coordinates;
  homeLocation: Coordinates;
  yaw: number;
  waypoints: Waypoint[];
  flightPath?: Coordinates[]; // History of positions
  onMapClick: (lat: number, lng: number) => void;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
  droneLocation,
  homeLocation,
  yaw,
  waypoints,
  flightPath = [],
  onMapClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Resize canvas to parent
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Scale: pixels per degree (approximate for zoom)
    // Zoom in enough to see movement. 0.0001 deg ~ 11 meters.
    // Let's say 100px = 50 meters -> 2px per meter
    const SCALE = 200000; 

    // Clear
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b'; // Slate 800
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offsetX = (droneLocation.lng * SCALE) % gridSize;
    const offsetY = (droneLocation.lat * SCALE * -1) % gridSize; // Invert Y for Lat

    ctx.beginPath();
    for (let x = -gridSize; x < width + gridSize; x += gridSize) {
        ctx.moveTo(x - offsetX, 0);
        ctx.lineTo(x - offsetX, height);
    }
    for (let y = -gridSize; y < height + gridSize; y += gridSize) {
        ctx.moveTo(0, y - offsetY);
        ctx.lineTo(width, y - offsetY);
    }
    ctx.stroke();

    // Helper to transform GPS to Canvas Coords (Drone centered)
    const toCanvas = (lat: number, lng: number) => {
        const dLat = lat - droneLocation.lat;
        const dLng = lng - droneLocation.lng;
        // x is lng, y is lat (inverted)
        return {
            x: centerX + dLng * SCALE,
            y: centerY - dLat * SCALE 
        };
    };

    // Draw Flight Path (Trail)
    if (flightPath.length > 1) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; // Green transparent
        ctx.lineWidth = 2;
        ctx.beginPath();
        const start = toCanvas(flightPath[0].lat, flightPath[0].lng);
        ctx.moveTo(start.x, start.y);
        
        // Draw efficient polyline (skipping points if too close could be an optimization, but redundant for now)
        for(let i = 1; i < flightPath.length; i++) {
            const p = toCanvas(flightPath[i].lat, flightPath[i].lng);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    // Draw Home Point
    const homePos = toCanvas(homeLocation.lat, homeLocation.lng);
    ctx.fillStyle = '#22c55e'; // Green
    ctx.beginPath();
    ctx.arc(homePos.x, homePos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('HOME', homePos.x - 12, homePos.y + 15);

    // Draw Mission Waypoints
    if (waypoints.length > 0) {
        ctx.strokeStyle = '#06b6d4'; // Cyan
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        // Line from Drone to First WP
        const firstWP = toCanvas(waypoints[0].lat, waypoints[0].lng);
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(firstWP.x, firstWP.y);

        // Lines between WPs
        for (let i = 0; i < waypoints.length; i++) {
            const pos = toCanvas(waypoints[i].lat, waypoints[i].lng);
            ctx.lineTo(pos.x, pos.y);
            
            // Draw WP Marker
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
            ctx.fillStyle = '#fff';
            ctx.fillText(`${i + 1}`, pos.x + 6, pos.y + 4);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Drone (Center)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((yaw * Math.PI) / 180);
    
    // Drone Icon (Triangle)
    ctx.fillStyle = '#ef4444'; // Red
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 10);
    ctx.lineTo(0, 6); // notch
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    
    // FOV Cone
    ctx.fillStyle = 'rgba(34, 211, 238, 0.1)'; // Cyan transparent
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 80, -Math.PI/4 - Math.PI/2, Math.PI/4 - Math.PI/2); // Facing "North" relative to drone
    ctx.lineTo(0, 0);
    ctx.fill();
    
    ctx.restore();

    // Draw obstacles (Static simulation)
    const obstaclePos = toCanvas(droneLocation.lat + 0.0002, droneLocation.lng + 0.0002);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(obstaclePos.x - 30, obstaclePos.y - 30, 60, 60);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('NO FLY ZONE', obstaclePos.x - 30, obstaclePos.y - 35);

  }, [droneLocation, homeLocation, yaw, waypoints, flightPath]);

  const handleClick = (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const SCALE = 200000;

      // Inverse transform: Canvas -> Lat/Lng
      const dLng = (x - centerX) / SCALE;
      const dLat = (y - centerY) / SCALE * -1;

      onMapClick(droneLocation.lat + dLat, droneLocation.lng + dLng);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-900 cursor-crosshair group">
      <canvas 
        ref={canvasRef}
        className="block"
        onClick={handleClick}
      />
      
      {/* Map Overlays */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-2 rounded border border-slate-700 text-xs font-mono pointer-events-none">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Navigation size={14} />
              <span>TACTICAL MAP</span>
          </div>
          <div className="text-slate-400">Click to add waypoints</div>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-700 text-xs font-mono flex items-center gap-2">
              <Home size={12} className="text-green-400" />
              <span>HOME: {homeLocation.lat.toFixed(5)}, {homeLocation.lng.toFixed(5)}</span>
          </div>
      </div>
    </div>
  );
};