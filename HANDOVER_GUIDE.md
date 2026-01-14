
# Aerosentinel Project Handover Guide

## 1. Project Overview
**Aerosentinel** is a web-based Ground Control Station (GCS) designed specifically for the **DJI Mini 3** series.
It allows a user to control the drone from a PC browser, view live telemetry, perform AI object tracking, and execute autonomous missions.

## 2. Architecture (The "Tethered Bridge")
Because the DJI Mini 3 is only supported by the **Android Mobile SDK (MSDK v5)**, we cannot connect the drone directly to the PC.

**Structure:**
1.  **Hardware:** DJI Mini 3 <-> DJI RC <-> **Android Phone (USB)**.
2.  **Bridge App (Kotlin):** An Android app runs on the phone. It uses DJI MSDK v5 to read data and streams it via WebSocket.
3.  **Backend (Python):** Runs on the PC (`0.0.0.0:8000`). Receives the stream, runs AI (YOLOv8), and serves the WebSocket API.
4.  **Frontend (React):** The Cockpit UI (`localhost:3000`). Connects to Python Backend.

## 3. Current Implementation Status

### Frontend (React) - **COMPLETE**
*   **Tech:** React 18, TailwindCSS, Lucide Icons.
*   **Features:** HUD, Map, Mission Planner, Telemetry Charts, Voice Assistant.
*   **Modes:** Simulation (Mock) & Live (WebSocket).

### Backend (Python) - **COMPLETE**
*   **Tech:** FastAPI, Uvicorn, WebSockets, Ultralytics YOLOv8.
*   **File:** `backend/server.py`.
*   **Features:**
    *   WebSocket Router (`/ws` for frontend, `/ws/drone` for bridge).
    *   YOLOv8 Inference on incoming MJPEG frames.
    *   MJPEG Stream Endpoint (`/video_feed`).
    *   **Simulation:** `backend/test_drone_client.py` simulates a drone sending video/telemetry.

### Android Bridge - **COMPLETE (Alpha)**
*   **Tech:** Kotlin, DJI MSDK v5, OkHttp WebSocket, MediaCodec.
*   **Location:** `android_bridge/`.
*   **Features:**
    *   Connects to DJI Drone via USB.
    *   Connects to PC Backend via WebSocket (IP input in UI).
    *   Streams Telemetry (Attitude, GPS, Battery, Velocity, Gimbal).
    *   Streams Video (Decodes H.264 from drone -> Encodes to JPEG -> Sends to Backend).

## 4. Development & Running

### A. Run the Backend & Frontend (PC)
1.  **Backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    python server.py
    ```
    *   *Note:* Allow firewall access for port 8000.

2.  **Frontend:**
    ```bash
    npm run dev
    ```
    *   Open `http://localhost:3000` (or the port shown in terminal).

### B. Run the Simulation (No Drone)
1.  Ensure Backend is running.
2.  Run the Mock Client:
    ```bash
    python backend/test_drone_client.py
    ```
3.  Open Frontend -> Settings -> Connection -> Toggle **"Live Hardware"**.
4.  You should see a bouncing ball video feed and moving horizon.

### C. Run with Real Drone
1.  **Setup Android App:**
    *   Open `android_bridge` in Android Studio.
    *   Add your DJI API Key to `AndroidManifest.xml`.
    *   Build and Install on a DJI-supported Android phone.
2.  **Connect Hardware:**
    *   Connect Phone to DJI RC Controller via USB.
    *   Turn on Drone & Controller.
3.  **Connect Bridge:**
    *   Ensure Phone and PC are on the **Same Wi-Fi**.
    *   Open App -> Enter PC IP Address (e.g., `192.168.1.10`) -> Click **Connect**.
4.  **Fly:**
    *   The Cockpit HUD should show live video and telemetry.

## 5. Data Structures
The Backend broadcasts JSON to Frontend:

```json
{
  "telemetry": {
    "pitch": 0, "roll": 0, "yaw": 0,
    "altitude": 0, "speedH": 0, "speedV": 0,
    "battery": 100,
    "coordinates": { "lat": 0, "lng": 0 },
    "distanceHome": 0, "obstacleDistance": 10,
    "gimbalPitch": 0
  },
  "objects": [
    {
      "id": 0, "label": "person", "confidence": 0.9,
      "bbox": [0.1, 0.1, 0.2, 0.3]
    }
  ]
}
```
