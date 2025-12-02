
# Aerosentinel Project Handover Guide

## 1. Project Overview
**Aerosentinel** is a web-based Ground Control Station (GCS) designed specifically for the **DJI Mini 3** series.
It allows a user to control the drone from a PC browser, view live telemetry, perform AI object tracking, and execute autonomous missions.

## 2. Architecture (The "Tethered Bridge")
Because the DJI Mini 3 is only supported by the **Android Mobile SDK (MSDK v5)**, we cannot connect the drone directly to the PC.

**Structure:**
1.  **Hardware:** DJI Mini 3 <-> DJI RC <-> **Android Phone (USB)**.
2.  **Bridge App (Missing Piece):** An Android app (Kotlin) runs on the phone. It uses DJI MSDK v5 to read data and streams it via WebSocket.
3.  **Backend (Python):** Runs on the PC (`localhost:8000`). Receives the stream, runs AI (YOLO), and serves the WebSocket API.
4.  **Frontend (React):** The Cockpit UI (`localhost:3000`). Connects to Python Backend.

## 3. Current Implementation Status

### Frontend (React) - **COMPLETE**
*   **Tech:** React 18, TailwindCSS, Lucide Icons.
*   **Features:** 
    *   HUD with Artificial Horizon.
    *   Tactical Map (Canvas-based).
    *   Mission Planner (Waypoints).
    *   Telemetry Charts (SVG).
    *   Voice Assistant & Audio Feedback.
    *   Simulation Mode (Physics engine included in `mockDroneService.ts`).
    *   Live Mode (WebSocket client included in `liveDroneService.ts`).

### Backend (Python) - **BASIC**
*   **Tech:** FastAPI, Uvicorn, WebSockets.
*   **File:** `backend/server.py`.
*   **Status:** Implements the message routing between Frontend and Drone.
*   **Missing:** The actual Computer Vision pipeline (YOLOv8 integration is stubbed).

### Android Bridge - **TODO**
*   **Status:** **NOT STARTED.** This is the critical next step.

## 4. Instructions for the AI Agent

If you are an AI agent reading this, here is your task list to continue development:

### Task A: Implement the Computer Vision Pipeline (Backend)
1.  Open `backend/server.py`.
2.  Modify the `drone_endpoint`.
3.  The Android app will send video frames (base64 or byte stream).
4.  Decode frame -> `cv2.imdecode`.
5.  Run `YOLOv8` inference on the frame.
6.  Inject `objects: [...]` into the JSON payload before broadcasting to Frontend.

### Task B: Create the Android Bridge App
You need to generate the **Kotlin** code for the Android app.
*   **Dependencies:** `com.dji:dji-sdk-v5-aircraft:5.3.0`
*   **Key Classes:**
    *   `DJISDKManager.getInstance().init()`
    *   `KeyManager.getInstance().listen(FlightControllerKey.KeyAttitude)`
    *   `VideoFeeder.getInstance().primaryVideoFeed.addVideoDataListener`
*   **Logic:**
    *   On `onVideoDataListener`: Downscale image, convert to JPG, send via WebSocket to `ws://<PC_IP>:8000/ws/drone`.
    *   On `Telemetry`: Send JSON `{"telemetry": {...}}`.
    *   On `WebSocket Message` (from PC): Parse JSON and call `KeyManager.performAction()` (e.g., Virtual Sticks).

## 5. Data Structures
The Frontend expects JSON in this format from the WebSocket:

```json
{
  "telemetry": {
    "pitch": 0,
    "roll": 0,
    "yaw": 0,
    "altitude": 0,
    "speedH": 0,
    "speedV": 0,
    "battery": 100,
    "coordinates": { "lat": 0, "lng": 0 },
    "distanceHome": 0,
    "obstacleDistance": 10,
    "gimbalPitch": 0
  },
  "objects": [
    {
      "id": 1,
      "label": "person",
      "confidence": 0.9,
      "bbox": [0.1, 0.1, 0.2, 0.3], // Normalized 0-1 (x, y, w, h)
      "tracking": false
    }
  ]
}
```

## 6. Running the Project
1.  **Frontend:** `npm start` or run inside the container.
2.  **Backend:** `cd backend && pip install -r requirements.txt && python server.py`.
3.  **App:** Open browser to `localhost:3000`.
4.  **Toggle:** Open Settings -> Connection -> Switch to "Live Hardware".

Good luck.
