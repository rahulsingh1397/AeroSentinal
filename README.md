# 🚁 Aerosentinel Cockpit

<div align="center">

![Aerosentinel](https://img.shields.io/badge/Aerosentinel-Ground_Control_Station-00CED1?style=for-the-badge&logo=drone&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.95.0-009688?style=flat-square&logo=fastapi)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00?style=flat-square)
![DJI](https://img.shields.io/badge/DJI-Mini_3_Series-000000?style=flat-square&logo=dji)

**Advanced AI-powered Ground Control Station for DJI Mini 3 drones**

*Computer Vision Object Tracking • Autonomous Mission Planning • Real-time Tactical HUD*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Aerosentinel** is a web-based Ground Control Station (GCS) designed specifically for the **DJI Mini 3** series drones. It enables PC-based drone control through a browser interface, featuring:
- Live telemetry visualization
- AI-powered object tracking using YOLOv8
- Autonomous mission execution
- Real-time video streaming via Android Bridge
- Comprehensive field testing capabilities

### Current Implementation Status
✅ **Frontend**: Complete React-based interface with telemetry dashboard
✅ **Backend**: FastAPI server with WebSocket endpoints and YOLOv8 integration
✅ **Android Bridge**: Kotlin app connecting DJI MSDK v5 to backend via WebSocket
✅ **Documentation**: Complete handover guide and field testing plan

### Why Aerosentinel?

- **No Official PC SDK**: DJI Mini 3 only supports Mobile SDK (MSDK v5), not Windows SDK
- **Tethered Bridge Solution**: Uses an Android phone as a bridge between drone and PC
- **Full-Featured GCS**: Professional-grade interface with simulation mode for testing

---

## ✨ Key Features

### Android Bridge
- **DJI MSDK v5 Integration**: Full telemetry capture (attitude, GPS, battery, velocity)
- **Video Streaming**: H.264 decoding to JPEG via MediaCodec
- **WebSocket Connection**: Real-time data transmission to backend
- **Configurable IP**: Easy backend server address configuration

### Backend Services
- **Dual WebSocket Endpoints**: `/ws` (frontend) and `/ws/drone` (Android Bridge)
- **YOLOv8 Inference**: Real-time object detection on video frames
- **MJPEG Stream**: `/video_feed` endpoint for browser viewing
- **Mock Client**: `test_drone_client.py` for hardware-free testing

### Frontend Dashboard
- **Live Telemetry Display**: All key drone metrics
- **Object Tracking UI**: Visualizes detected objects
- **Command Interface**: Flight mode, gimbal, and mission controls
- **Connection Management**: Automatic WebSocket reconnection

---

## ✨ Features

### 🎮 Cockpit Interface
- **Real-time HUD** - Artificial horizon, altitude, speed, battery indicators
- **Tactical Map** - Canvas-based map with drone position and flight path
- **Mission Planner** - Waypoint-based autonomous mission creation
- **Telemetry Charts** - Live SVG graphs for altitude, speed, and battery

### 🤖 AI Capabilities
- **YOLOv8 Object Detection** - Real-time object detection on video feed
- **Smart Track Mode** - AI-powered object following
- **Bounding Box Overlays** - Visual detection indicators on video

### 🔊 Audio & Voice
- **Voice Assistant** - Audio feedback for mode changes and warnings
- **Obstacle Alerts** - Audible warnings for proximity detection
- **Text-to-Speech** - System status announcements

### 🎬 Cinematography
- **Shot Library** - Pre-programmed cinematic shots (Orbit, Dronie, Rocket, etc.)
- **Gimbal Control** - Pitch control with visual feedback
- **Payload Trigger** - Camera shutter control

### 🧪 Simulation Mode
- **Physics Engine** - Built-in drone physics simulation
- **Mock Telemetry** - Realistic data generation for UI testing
- **No Hardware Required** - Full UI testing without drone connection

---

## 🏗 Architecture

Aerosentinel uses a **"Tethered Bridge"** architecture to overcome DJI SDK limitations:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   DJI Mini 3    │────▶│     DJI RC      │────▶│  Android Phone  │────▶│   PC Backend    │
│     (Drone)     │     │  (Controller)   │     │  (Bridge App)   │     │   (Python)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                       │                         │
                                                       │ WebSocket               │ WebSocket
                                                       │ ws://<PC_IP>:8000       │ ws://localhost:8000
                                                       │ /ws/drone               │ /ws
                                                       ▼                         ▼
                                                ┌─────────────────┐     ┌─────────────────┐
                                                │  Video Frames   │     │ React Frontend  │
                                                │  + Telemetry    │     │   (Cockpit UI)  │
                                                └─────────────────┘     └─────────────────┘
```

### Components

| Component | Technology | Port | Description |
|-----------|------------|------|-------------|
| **Frontend** | React 19, Vite, TailwindCSS | 3000 | Cockpit UI with HUD, maps, controls |
| **Backend** | Python, FastAPI, YOLOv8 | 8000 | WebSocket server, AI processing |
| **Android Bridge** | Kotlin, DJI MSDK v5 | - | Streams video/telemetry from drone |

---

## 📦 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18+ | Frontend runtime |
| **Python** | 3.11 | Backend runtime (3.12 has numpy issues) |
| **Android Studio** | Latest | Android Bridge development |
| **Git** | Latest | Version control |

### Optional (for Live Mode)

- **DJI Mini 3 / Mini 3 Pro** drone
- **DJI RC** controller
- **Android Phone** with USB debugging enabled
- **USB Cable** for phone-to-controller connection

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/rahulsingh1397/AeroSentinal.git
cd AeroSentinal
```

### 2. Frontend Setup

```bash
# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment (use Python 3.11)
py -3.11 -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
```

Backend will be available at `http://localhost:8000`

### 4. Android Bridge Setup (Optional - for Live Mode)

```bash
# Open in Android Studio
# File -> Open -> Select 'android_bridge' folder

# Wait for Gradle sync to complete

# Connect Android device with USB debugging enabled

# Run the app (Shift+F10)
```

---

## 🎮 Usage

### Simulation Mode (Default)

1. Start the frontend: `npm run dev`
2. Open browser to `http://localhost:3000`
3. The system defaults to **Simulation Mode**
4. Click **"ARM"** to start the physics engine
5. Use controls to test features:
   - **Manual** - Direct control
   - **Smart Track** - AI tracking mode
   - **Waypoint** - Mission planning
   - **RTH** - Return to home

### Live Hardware Mode

1. Start the backend: `python server.py` (in backend folder)
2. Start the frontend: `npm run dev`
3. Open browser to `http://localhost:3000`
4. Click **Settings** (gear icon) → Toggle **"Live Hardware"**
5. Deploy Android Bridge app to phone
6. Connect phone to DJI RC via USB
7. Backend terminal should show: `Drone client connected`

---

## 📁 Project Structure

```
aerosentinel-cockpit/
├── 📂 android_bridge/          # Android Bridge App (Kotlin)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/.../MainActivity.kt
│   │   │   ├── res/layout/activity_main.xml
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradle.properties
│
├── 📂 backend/                 # Python Backend
│   ├── server.py               # FastAPI WebSocket server
│   └── requirements.txt        # Python dependencies
│
├── 📂 components/              # React UI Components
│   ├── VideoFeed.tsx           # Video display with AI overlays
│   ├── MapDisplay.tsx          # Tactical map
│   ├── ControlPanel.tsx        # Flight controls
│   ├── LogConsole.tsx          # System logs
│   ├── TelemetryCharts.tsx     # Data visualization
│   ├── DocumentationModal.tsx  # Help modal
│   ├── SettingsModal.tsx       # Configuration
│   └── HUD/
│       └── AttitudeIndicator.tsx
│
├── 📂 services/                # Frontend Services
│   ├── mockDroneService.ts     # Simulation engine
│   ├── liveDroneService.ts     # WebSocket client
│   └── audioService.ts         # Voice/audio feedback
│
├── App.tsx                     # Main React component
├── types.ts                    # TypeScript definitions
├── index.html                  # HTML entry point
├── index.tsx                   # React entry point
├── package.json                # Node.js dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── HANDOVER_GUIDE.md           # Development guide
└── README.md                   # This file
```

---

## 📡 API Reference

### WebSocket Endpoints

#### Frontend Connection
```
ws://localhost:8000/ws
```

#### Drone Bridge Connection
```
ws://<PC_IP>:8000/ws/drone
```

### Message Format (Drone → Backend → Frontend)

```json
{
  "telemetry": {
    "pitch": 0,
    "roll": 0,
    "yaw": 0,
    "altitude": 50.5,
    "speedH": 5.2,
    "speedV": 0.0,
    "battery": 85,
    "coordinates": { "lat": 37.7749, "lng": -122.4194 },
    "distanceHome": 120.5,
    "obstacleDistance": 10.0,
    "gimbalPitch": -15
  },
  "objects": [
    {
      "id": 1,
      "label": "person",
      "confidence": 0.92,
      "bbox": [0.1, 0.2, 0.15, 0.3],
      "tracking": true
    }
  ]
}
```

### Command Format (Frontend → Backend → Drone)

```json
{
  "command": "virtual_stick",
  "data": {
    "pitch": 0.5,
    "roll": 0.0,
    "yaw": 0.0,
    "throttle": 0.2
  }
}
```

### Video Feed Endpoint

```
GET http://localhost:8000/video_feed
Content-Type: multipart/x-mixed-replace; boundary=frame
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_BACKEND_URL=ws://localhost:8000/ws
VITE_VIDEO_URL=http://localhost:8000/video_feed
```

### Android Bridge Configuration

Edit `android_bridge/app/src/main/java/.../MainActivity.kt`:

```kotlin
// Replace with your PC's local IP address
private val wsUrl = "ws://192.168.1.XXX:8000/ws/drone"
```

Find your PC's IP:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'cv2'` | Use Python 3.11, not 3.12. Create a virtual environment. |
| `numpy` installation fails | Python 3.12 incompatible. Use `py -3.11 -m venv .venv` |
| Frontend shows "DISCONNECTED" | Ensure backend is running on port 8000 |
| Android Studio "Sync Project" missing | Use `Ctrl+Shift+A` → "Sync Project with Gradle Files" |
| YOLO model loading warning | Update `ultralytics` to 8.2.0+ |
| Tailwind CDN warning in console | Safe to ignore in development |

### Backend Not Starting

```bash
# Ensure virtual environment is activated
.venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend Build Errors

```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test in both Simulation and Live modes
- Update documentation for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **DJI** - Mobile SDK v5
- **Ultralytics** - YOLOv8
- **FastAPI** - Python web framework
- **React** - UI library
- **TailwindCSS** - Styling
- **Lucide** - Icons

---

<div align="center">

**Built with ❤️ for drone enthusiasts**

[Report Bug](https://github.com/rahulsingh1397/AeroSentinal/issues) · [Request Feature](https://github.com/rahulsingh1397/AeroSentinal/issues)

</div>
