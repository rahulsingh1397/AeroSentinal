# AeroSentinel Testing Guide

## Prerequisites
- DJI RC/drone powered on and paired
- Android phone with USB debugging enabled
- Phone and PC on the same Wi-Fi/LAN network
- Android Studio installed (for building/deploying the app)

## Step-by-Step Testing Process

### 1. Build and Install the Android App
1. Open Android Studio and load the `android_bridge` project
2. Let Gradle sync (wait for "Gradle sync finished" notification)
3. Connect your phone via USB
4. Allow USB debugging when prompted on the phone
5. In Android Studio: **Run** > **Run 'app'** (or click the green play button)
6. Wait for the app to install and launch on your phone

### 2. Start the Backend Server
1. Open a terminal/PowerShell on your PC
2. Navigate to the backend directory:
   ```powershell
   cd e:\Study\Python\aerosentinel-cockpit\backend
   ```
3. Start the server:
   ```powershell
   python server.py
   ```
4. You should see:
   ```
   Loading YOLOv8 model...
   INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

### 3. Connect Phone to DJI RC
1. **Unplug the phone from PC** (USB connection no longer needed)
2. Connect the phone to your DJI RC via USB-C/OTG cable
3. Ensure the phone stays connected to Wi-Fi (same network as PC)

### 4. Connect App to Backend
1. On the phone, open the **Aerosentinel Bridge** app
2. In the IP input field, enter your PC's IP address (e.g., `192.168.1.191`)
   - The app will automatically append `:8000/ws/drone`
3. Tap **Connect**
4. Watch for:
   - Connection indicator turns **green**
   - Status shows: **"Connected to Backend"**
   - Backend terminal shows: **"Drone connected!"**

### 5. Verify Live Telemetry
Once connected, the app should display real-time data from your drone:

- **Battery**: Current battery percentage
- **Altitude**: Height above takeoff point (meters)
- **Speed H**: Horizontal speed (m/s)
- **Speed V**: Vertical speed (m/s)
- **Pitch**: Aircraft pitch angle (degrees)
- **Roll**: Aircraft roll angle (degrees)
- **Yaw**: Aircraft heading (degrees)
- **Distance Home**: Distance from home point (meters)
- **Obstacle Distance**: Proximity to obstacles (meters)
- **Gimbal Pitch**: Gimbal pitch angle (degrees)
- **Coords**: GPS coordinates (latitude, longitude)

### 6. Monitor Backend Logs
In the backend terminal, you should see:
```
Received telemetry: {"telemetry": {"pitch": 2.3, "roll": -1.5, ...}}
```

This confirms telemetry is flowing from phone → backend.

## Troubleshooting

### Connection indicator stays red
- Verify PC and phone are on the same network
- Check PC firewall isn't blocking port 8000
- Ensure backend server is running
- Try entering full URL: `ws://<PC_IP>:8000/ws/drone`

### Telemetry fields show "--" or zeros
- Ensure phone is connected to DJI RC via USB
- Check DJI SDK registration succeeded (status should show "DJI SDK Registered!")
- Power cycle the RC/drone and reconnect
- Check Android logcat for errors: `adb logcat | grep -E "DJI|Bridge"`

### Backend shows "Drone connected!" but no telemetry logs
- Telemetry is being sent but may not be logged unless you're also running a frontend client
- The app is still sending data; check the phone UI to verify values are updating

### App crashes on launch
- Rebuild the app in Android Studio (Clean Project → Rebuild Project)
- Check for missing DJI SDK dependencies in `build.gradle`
- Verify Java 1.8 compatibility settings are correct

## Testing with Simulator (Optional)
If you want to test without a real drone:

1. Keep backend running
2. In a new terminal, run:
   ```powershell
   cd e:\Study\Python\aerosentinel-cockpit\backend
   python test_drone_client.py
   ```
3. This sends dummy telemetry and video frames
4. The app should display the simulated data

## Next Steps
Once telemetry is flowing correctly:
- Test video streaming from drone camera
- Implement object detection visualization
- Add autonomous flight features from Phase2.txt
