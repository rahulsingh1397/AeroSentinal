import { IDroneService, Telemetry, DetectedObject, LogMessage, CinematicShotType, FlightMode, Waypoint, Coordinates, DroneConfig, ConnectionStatus } from '../types';

// Simulation constants
const SIMULATION_RATE_MS = 50; // Faster tick for smoother physics
const DRONE_SPEED_MULTIPLIER = 0.00001; // Lat/Lng scaling for speed

class MockDroneService implements IDroneService {
  private listeners: Set<(data: Partial<{ telemetry: Telemetry; objects: DetectedObject[]; logs: LogMessage[]; missionProgress: number; status: ConnectionStatus }>) => void> = new Set();
  private intervalId: number | null = null;
  
  // Default Configuration
  private config: DroneConfig = {
      maxAltitude: 120,
      maxSpeed: 15,
      rthAltitude: 30,
      obstacleAvoidanceEnabled: true,
      geofenceRadius: 500,
      pid: { p: 1.2, i: 0.05, d: 0.3 }
  };

  // Internal simulation state
  private telemetry: Telemetry = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    altitude: 0,
    speedH: 0,
    speedV: 0,
    battery: 98,
    satellites: 12,
    coordinates: { lat: 37.7749, lng: -122.4194 }, // Starting point
    distanceHome: 0,
    flightTime: 0,
    obstacleDistance: 10, // >5m is safe
    gimbalPitch: 0 // 0 is horizon, -90 is down
  };

  private homeLocation: Coordinates = { lat: 37.7749, lng: -122.4194 };
  private objects: DetectedObject[] = [];
  private flightStartTime = Date.now();
  private isArmed = false;
  
  // AI Control States
  private activeShot: CinematicShotType = CinematicShotType.NONE;
  private trackedObjectId: number | null = null;
  private flightMode: FlightMode = FlightMode.MANUAL;

  // Mission State
  private waypoints: Waypoint[] = [];
  private currentWaypointIndex: number = 0;

  constructor() {
    // Auto-start simulation loop on instantiation
    this.startSimulation();
  }

  public connect() {
      // Mock connects immediately
      setTimeout(() => {
          this.notify({ 
              status: ConnectionStatus.CONNECTED,
              logs: [{ id: crypto.randomUUID(), timestamp: Date.now(), level: 'success', message: 'Connected to Simulation Engine.' }]
          });
      }, 500);
  }

  public disconnect() {
      this.notify({ status: ConnectionStatus.DISCONNECTED });
  }

  public subscribe(callback: (data: any) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public updateConfig(newConfig: Partial<DroneConfig>) {
      this.config = { ...this.config, ...newConfig };
      this.emitLog('info', 'System Configuration Updated.');
  }

  public setArmed(armed: boolean) {
    this.isArmed = armed;
    if (armed) {
      this.flightStartTime = Date.now();
      this.telemetry.altitude = 1.5; // takeoff hover
      // Set home location on arm
      this.homeLocation = { ...this.telemetry.coordinates };
      this.telemetry.gimbalPitch = 0;
    } else {
      this.telemetry.altitude = 0;
      this.telemetry.speedH = 0;
      this.telemetry.speedV = 0;
      this.activeShot = CinematicShotType.NONE;
      this.trackedObjectId = null;
    }
  }

  public setFlightMode(mode: FlightMode) {
    this.flightMode = mode;
    // Reset shot if leaving cinema mode
    if (mode !== FlightMode.CINEMA) {
      this.activeShot = CinematicShotType.NONE;
    }
    // Reset tracking if leaving follow mode
    if (mode !== FlightMode.FOLLOW_ME) {
      this.trackedObjectId = null;
    }
    // Reset mission index if starting fresh (optional)
    if (mode === FlightMode.AUTO_MISSION) {
       if (this.waypoints.length === 0) {
           this.emitLog('warn', 'No mission uploaded.');
           this.flightMode = FlightMode.LOITER;
       } else {
           this.emitLog('info', `Starting Mission: ${this.waypoints.length} waypoints.`);
       }
    }
  }

  public setCinematicShot(shot: CinematicShotType) {
    this.activeShot = shot;
    this.flightMode = FlightMode.CINEMA;
    this.emitLog('info', `Starting Cinematic Shot: ${shot}`);
  }

  public setTrackedObject(id: number | null) {
    this.trackedObjectId = id;
    if (id !== null) {
        this.flightMode = FlightMode.FOLLOW_ME;
        this.emitLog('success', `Target Locked. Tracking ID ${id}`);
    } else {
        this.emitLog('info', 'Target Lost/Unlocked.');
    }
  }

  public setWaypoints(waypoints: Waypoint[]) {
      this.waypoints = waypoints;
      this.currentWaypointIndex = 0;
      this.emitLog('info', `Mission Uploaded: ${waypoints.length} waypoints.`);
  }

  public setGimbalPitch(pitch: number) {
      // Clamp between -90 (down) and +20 (up)
      this.telemetry.gimbalPitch = Math.max(-90, Math.min(20, pitch));
  }

  private emitLog(level: 'info'|'warn'|'error'|'success', message: string) {
      this.notify({
          logs: [{
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              level,
              message
          }]
      });
  }

  private calculateDistance(c1: Coordinates, c2: Coordinates) {
      const R = 6371e3; // metres
      const φ1 = c1.lat * Math.PI/180; // φ, λ in radians
      const φ2 = c2.lat * Math.PI/180;
      const Δφ = (c2.lat-c1.lat) * Math.PI/180;
      const Δλ = (c2.lng-c1.lng) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c;
  }

  private calculateBearing(start: Coordinates, dest: Coordinates) {
      const startLat = start.lat * Math.PI / 180;
      const startLng = start.lng * Math.PI / 180;
      const destLat = dest.lat * Math.PI / 180;
      const destLng = dest.lng * Math.PI / 180;

      const y = Math.sin(destLng - startLng) * Math.cos(destLat);
      const x = Math.cos(startLat) * Math.sin(destLat) -
              Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
      const brg = Math.atan2(y, x);
      return (brg * 180 / Math.PI + 360) % 360;
  }

  private startSimulation() {
    if (this.intervalId) return;

    let tick = 0;
    
    this.intervalId = window.setInterval(() => {
      tick++;
      const time = tick * (SIMULATION_RATE_MS / 1000);
      
      // 1. Update Objects (Simulation of computer vision)
      // Main mock target
      const targetX = 0.5 + Math.sin(time * 0.5) * 0.3; 
      const targetY = 0.5 + Math.sin(time * 0.25) * 0.15;
      
      this.objects = [
        {
          id: 1,
          label: 'person',
          confidence: 0.92,
          bbox: [targetX, targetY, 0.1, 0.2],
          tracking: this.trackedObjectId === 1
        }
      ];

      // 2. Physics & Control Loop
      if (this.isArmed) {
        // Battery drain
        this.telemetry.flightTime = Math.floor((Date.now() - this.flightStartTime) / 1000);
        this.telemetry.battery = Math.max(0, 98 - (this.telemetry.flightTime / 60));
        
        // Distance from home
        this.telemetry.distanceHome = this.calculateDistance(this.telemetry.coordinates, this.homeLocation);

        // --- FLIGHT MODES ---

        if (this.flightMode === FlightMode.AUTO_MISSION && this.waypoints.length > 0) {
            // Mission Logic
            const targetWP = this.waypoints[this.currentWaypointIndex];
            if (targetWP) {
                const dist = this.calculateDistance(this.telemetry.coordinates, targetWP);
                
                // Calculate bearing to target
                const bearing = this.calculateBearing(this.telemetry.coordinates, targetWP);
                
                // Yaw towards target (simple easing)
                let diff = bearing - this.telemetry.yaw;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                this.telemetry.yaw += diff * 0.1;

                // Move forward
                // Respect Max Speed
                this.telemetry.speedH = Math.min(dist, this.config.maxSpeed); 
                
                // Altitude control
                const altDiff = targetWP.altitude - this.telemetry.altitude;
                this.telemetry.speedV = altDiff * 0.5;

                // Check if reached
                if (dist < 2.0) {
                    this.emitLog('success', `Reached Waypoint ${this.currentWaypointIndex + 1}`);
                    this.currentWaypointIndex++;
                    if (this.currentWaypointIndex >= this.waypoints.length) {
                        this.emitLog('success', 'Mission Complete. Loitering.');
                        this.flightMode = FlightMode.LOITER;
                    }
                }
            }
        } else if (this.flightMode === FlightMode.RTL) {
            // Return to Launch Logic
            const dist = this.calculateDistance(this.telemetry.coordinates, this.homeLocation);
            if (dist > 2) {
                const bearing = this.calculateBearing(this.telemetry.coordinates, this.homeLocation);
                let diff = bearing - this.telemetry.yaw;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                this.telemetry.yaw += diff * 0.1;
                // Faster return but respect max limit
                this.telemetry.speedH = Math.min(8.0, this.config.maxSpeed); 
                // Climb to RTH altitude
                this.telemetry.altitude += (this.config.rthAltitude - this.telemetry.altitude) * 0.05;
            } else {
                this.telemetry.speedH = 0;
                if (this.telemetry.altitude > 0.5) {
                    this.telemetry.speedV = -1.0; // Land
                } else {
                    this.setArmed(false);
                    this.emitLog('success', 'RTL Complete. Disarmed.');
                }
            }
        } 
        // --- TRACKING LOGIC (PID Simulation) ---
        else if (this.trackedObjectId === 1) {
           const errorX = (targetX + 0.05) - 0.5; 
           const errorY = (targetY + 0.1) - 0.5;
           // Apply PID Gains (Simulated by using config.pid.p)
           this.telemetry.yaw += errorX * (this.config.pid.p * 5); 
           this.telemetry.pitch = -errorY * (this.config.pid.p * 10); 
           this.telemetry.speedH = Math.abs(this.telemetry.pitch) * 0.1; // move if tilting
           
           // Gimbal follow pitch (approximate)
           this.telemetry.gimbalPitch += errorY * -2.0;
           this.telemetry.gimbalPitch = Math.max(-90, Math.min(20, this.telemetry.gimbalPitch));
        } 
        // --- CINEMATIC SHOT LOGIC ---
        else if (this.activeShot !== CinematicShotType.NONE) {
            switch(this.activeShot) {
                case CinematicShotType.ORBIT_LEFT:
                    this.telemetry.yaw -= 1.5; 
                    this.telemetry.speedH = 2.0;
                    this.telemetry.gimbalPitch = -15; // Look down slightly
                    break;
                case CinematicShotType.ORBIT_RIGHT:
                    this.telemetry.yaw += 1.5;
                    this.telemetry.speedH = 2.0;
                    this.telemetry.gimbalPitch = -15;
                    break;
                case CinematicShotType.DRONIE:
                    this.telemetry.speedV = 1.0; 
                    this.telemetry.speedH = -2.0; 
                    this.telemetry.gimbalPitch = -10;
                    break;
                case CinematicShotType.HELIX:
                    this.telemetry.yaw += 2.0;
                    this.telemetry.speedV = 0.5;
                    this.telemetry.gimbalPitch = -30;
                    break;
            }
        } 
        // --- HOVER/IDLE STABILITY ---
        else {
            this.telemetry.pitch = this.telemetry.pitch * 0.9 + (Math.sin(tick * 0.05) * 0.5);
            this.telemetry.roll = Math.sin(tick * 0.03) * 1;
            this.telemetry.speedH = this.telemetry.speedH * 0.95;
            this.telemetry.speedV = this.telemetry.speedV * 0.95;
        }
        
        // Normalize Yaw
        this.telemetry.yaw = (this.telemetry.yaw + 360) % 360;

        // Integrate Position
        const yawRad = this.telemetry.yaw * Math.PI / 180;
        const dLat = (this.telemetry.speedH * Math.cos(yawRad)) * DRONE_SPEED_MULTIPLIER; 
        const dLng = (this.telemetry.speedH * Math.sin(yawRad)) * DRONE_SPEED_MULTIPLIER;

        this.telemetry.coordinates.lat += dLat;
        this.telemetry.coordinates.lng += dLng;
        this.telemetry.altitude += this.telemetry.speedV * 0.05;
        
        // Enforce Max Altitude
        if (this.telemetry.altitude > this.config.maxAltitude) {
            this.telemetry.altitude = this.config.maxAltitude;
            this.telemetry.speedV = 0;
        }
        // Floor altitude
        if (this.telemetry.altitude < 0) this.telemetry.altitude = 0;

        // --- OBSTACLE SENSOR SIMULATION ---
        const obstacleCycle = Math.sin(time * 0.2);
        if (obstacleCycle > 0.8) {
            this.telemetry.obstacleDistance = 1.5 + (Math.random() * 0.5); 
            // If avoidance is enabled, prevent movement or brake hard
            if (this.flightMode !== FlightMode.MANUAL && this.config.obstacleAvoidanceEnabled) {
                 this.telemetry.speedH *= 0.1; // Heavy break
                 this.emitLog('warn', 'Obstacle Detected. Auto-Braking.');
            }
        } else {
            this.telemetry.obstacleDistance = 10;
        }
      }

      this.notify({
        telemetry: { ...this.telemetry },
        objects: [...this.objects]
      });

    }, SIMULATION_RATE_MS);
  }

  private notify(data: any) {
    this.listeners.forEach(l => l(data));
  }
}

export const mockDroneService = new MockDroneService();