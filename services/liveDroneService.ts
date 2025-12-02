import { IDroneService, Telemetry, DetectedObject, LogMessage, FlightMode, CinematicShotType, Waypoint, DroneConfig, ConnectionStatus } from '../types';

// The Live Service connects to your Python Backend (FastAPI/Flask)
// Default: ws://localhost:8000/ws
const WS_URL = 'ws://localhost:8000/ws';

export class LiveDroneService implements IDroneService {
    private listeners: Set<(data: any) => void> = new Set();
    private socket: WebSocket | null = null;
    private reconnectInterval: number | null = null;

    constructor() {}

    public connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;

        this.notify({ status: ConnectionStatus.CONNECTING });
        
        try {
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log('WebSocket Connected');
                this.notify({ 
                    status: ConnectionStatus.CONNECTED,
                    logs: [{ id: crypto.randomUUID(), timestamp: Date.now(), level: 'success', message: 'Live Bridge Connected.' }]
                });
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    // Expecting payload: { telemetry: {}, objects: [], logs: [] }
                    this.notify(payload);
                } catch (e) {
                    console.error('Failed to parse WS message', e);
                }
            };

            this.socket.onclose = () => {
                this.notify({ 
                    status: ConnectionStatus.DISCONNECTED,
                    logs: [{ id: crypto.randomUUID(), timestamp: Date.now(), level: 'error', message: 'Bridge Disconnected. Retrying...' }]
                });
                this.socket = null;
                this.attemptReconnect();
            };

            this.socket.onerror = (err) => {
                console.error('WS Error', err);
            };

        } catch (e) {
            console.error('WS Connection Failed', e);
            this.attemptReconnect();
        }
    }

    public disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    private attemptReconnect() {
        if (this.reconnectInterval) return;
        this.reconnectInterval = window.setInterval(() => {
            console.log('Attempting reconnect...');
            this.connect();
        }, 3000);
    }

    public subscribe(callback: (data: any) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private send(type: string, payload: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('Cannot send command: Socket not open');
        }
    }

    private notify(data: any) {
        this.listeners.forEach(l => l(data));
    }

    // --- Command Implementations ---

    public updateConfig(config: Partial<DroneConfig>) {
        this.send('SET_CONFIG', config);
    }

    public setArmed(armed: boolean) {
        this.send('SET_ARMED', { armed });
    }

    public setFlightMode(mode: FlightMode) {
        this.send('SET_MODE', { mode });
    }

    public setCinematicShot(shot: CinematicShotType) {
        this.send('SET_SHOT', { shot });
    }

    public setTrackedObject(id: number | null) {
        this.send('SET_TRACK_TARGET', { id });
    }

    public setWaypoints(waypoints: Waypoint[]) {
        this.send('UPLOAD_MISSION', { waypoints });
    }

    public setGimbalPitch(pitch: number) {
        this.send('GIMBAL_PITCH', { pitch });
    }
}

export const liveDroneService = new LiveDroneService();