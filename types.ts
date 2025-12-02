export enum FlightMode {
  MANUAL = 'MANUAL',
  STABILIZE = 'STABILIZE',
  ALT_HOLD = 'ALT_HOLD',
  LOITER = 'LOITER',
  RTL = 'RTL', // Return to Launch
  FOLLOW_ME = 'FOLLOW_ME',
  ORBIT = 'ORBIT',
  AUTO_MISSION = 'AUTO_MISSION',
  CINEMA = 'CINEMA'
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  WEAK_SIGNAL = 'WEAK_SIGNAL'
}

export enum CinematicShotType {
  NONE = 'NONE',
  ORBIT_LEFT = 'ORBIT_LEFT',
  ORBIT_RIGHT = 'ORBIT_RIGHT',
  DRONIE = 'DRONIE',
  HELIX = 'HELIX',
  ROCKET = 'ROCKET'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  index: number;
}

export interface DroneConfig {
  maxAltitude: number; // meters
  maxSpeed: number; // m/s
  rthAltitude: number; // meters
  obstacleAvoidanceEnabled: boolean;
  geofenceRadius: number; // meters
  pid: {
    p: number;
    i: number;
    d: number;
  }
}

export interface Telemetry {
  pitch: number; // degrees
  roll: number; // degrees
  yaw: number; // degrees
  altitude: number; // meters
  speedH: number; // horizontal speed m/s
  speedV: number; // vertical speed m/s
  battery: number; // percentage 0-100
  satellites: number;
  coordinates: Coordinates;
  distanceHome: number;
  flightTime: number; // seconds
  obstacleDistance: number; // meters (simulated depth sensor)
  gimbalPitch: number; // degrees -90 to +20
}

export interface DetectedObject {
  id: number;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] normalized 0-1
  tracking: boolean;
}

export interface LogMessage {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface SystemState {
  status: ConnectionStatus;
  mode: FlightMode;
  recording: boolean;
  armed: boolean;
  obstacleWarning: boolean;
}

// Interface to ensure Real and Mock services behave identically
export interface IDroneService {
    subscribe: (callback: (data: any) => void) => () => void;
    updateConfig: (config: Partial<DroneConfig>) => void;
    setArmed: (armed: boolean) => void;
    setFlightMode: (mode: FlightMode) => void;
    setCinematicShot: (shot: CinematicShotType) => void;
    setTrackedObject: (id: number | null) => void;
    setWaypoints: (waypoints: Waypoint[]) => void;
    setGimbalPitch: (pitch: number) => void;
    connect: () => void;
    disconnect: () => void;
}