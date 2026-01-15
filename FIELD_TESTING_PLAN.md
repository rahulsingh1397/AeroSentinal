# Aerosentinel Field Testing Plan

## Prerequisites
1. **Hardware Setup**
   - DJI Drone with compatible remote controller
   - Android device with USB OTG support
   - Laptop/PC for backend processing
   - Stable WiFi network or mobile hotspot

2. **Software Setup**
   - Android Bridge app installed on Android device
   - Backend running on laptop (Python 3.9+)
   - Frontend running on laptop (Node.js 18+)
   - DJI Assistant 2 installed for firmware updates

## Step 1: Pre-flight Setup
1. Power on drone and remote controller
2. Connect Android device to remote controller via USB
3. Open Android Bridge app
4. Enter backend IP address (laptop's local IP)
5. Click "Connect" - verify status shows "Connected"

## Step 2: Backend Initialization
1. Start backend server:
   ```bash
   cd backend
   python server.py
   ```
2. Verify WebSocket endpoints are active:
   - `/ws` (frontend)
   - `/ws/drone` (Android Bridge)
   - `/video_feed` (MJPEG stream)

## Step 3: Frontend Launch
1. Start frontend development server:
   ```bash
   npm start
   ```
2. Open browser to `http://localhost:3001`
3. Verify connection status shows "Connected"

## Step 4: Functional Testing
1. **Telemetry Verification**
   - Check all values update in real-time:
     - Pitch/Roll/Yaw
     - Altitude/Speed
     - Battery level
     - GPS coordinates
     - Distance from home

2. **Video Stream Testing**
   - Verify live video feed appears in frontend
   - Check for latency (<500ms preferred)
   - Confirm object detection frames appear

3. **Command Testing**
   - Test flight mode changes
   - Verify gimbal control
   - Test virtual stick commands

## Step 5: Post-flight
1. Disconnect Android Bridge
2. Power down drone
3. Review logs in backend console
4. Note any issues encountered

## Troubleshooting
- **No Video Feed**: Check USB connection, restart app
- **Connection Issues**: Verify IP addresses, restart backend
- **High Latency**: Reduce video resolution in DJI Fly app
- **Detection Errors**: Re-train YOLOv8 model if needed
