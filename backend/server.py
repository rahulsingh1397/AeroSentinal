import cv2
import numpy as np
import json
import asyncio
import time
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import uvicorn

app = FastAPI()

# Add CORS middleware for video feed access from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
frontend_clients: List[WebSocket] = []
drone_client: Optional[WebSocket] = None
latest_frame_jpeg = None

# Load YOLO Model
print("Loading YOLOv8 model...")
try:
    model = YOLO("yolov8n.pt")
except Exception as e:
    print(f"Warning: YOLO model failed to load: {e}")
    model = None

@app.websocket("/ws")
async def frontend_endpoint(websocket: WebSocket):
    await websocket.accept()
    frontend_clients.append(websocket)
    print(f"Frontend connected. Total: {len(frontend_clients)}")
    try:
        while True:
            # Use wait_for with timeout to prevent blocking indefinitely
            # This allows the connection to stay alive while waiting for commands
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                print(f"Received from frontend: {data}")
                if drone_client:
                    await drone_client.send_text(data)
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                try:
                    await websocket.send_text('{"type":"ping"}')
                except:
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Frontend error: {e}")
    finally:
        if websocket in frontend_clients:
            frontend_clients.remove(websocket)
        print(f"Frontend disconnected. Total: {len(frontend_clients)}")

@app.websocket("/ws/drone")
async def drone_endpoint(websocket: WebSocket):
    global drone_client, latest_frame_jpeg
    await websocket.accept()
    drone_client = websocket
    print("Drone connected!")
    
    try:
        while True:
            message = await websocket.receive()
            
            if message["type"] == "websocket.disconnect":
                print("Drone disconnected (message received)")
                break
            
            if "text" in message:
                # Broadcast Telemetry
                print(f"Received telemetry: {message['text']}")
                for client in frontend_clients:
                    try: 
                        await client.send_text(message["text"])
                        print(f"Forwarded telemetry to frontend client")
                    except: 
                        print("Failed to send telemetry to frontend client")
                        pass
            
            elif "bytes" in message:
                raw_bytes = message["bytes"]
                latest_frame_jpeg = raw_bytes # Store for MJPEG
                
                # Inference
                if model:
                    nparr = np.frombuffer(raw_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img is not None:
                        results = model(img, verbose=False)
                        objects = []
                        for r in results:
                            for box in r.boxes:
                                x, y, w, h = box.xywhn[0].tolist()
                                if box.conf[0] > 0.5:
                                    objects.append({
                                        "id": int(box.cls[0]),
                                        "label": model.names[int(box.cls[0])],
                                        "confidence": float(box.conf[0]),
                                        "bbox": [x - w/2, y - h/2, w, h],
                                        "tracking": False
                                    })
                        if objects:
                            msg = json.dumps({"objects": objects})
                            for client in frontend_clients:
                                try: await client.send_text(msg)
                                except: pass

    except WebSocketDisconnect:
        drone_client = None
        print("Drone disconnected")

@app.get("/video_feed")
def video_feed():
    def iterfile():
        while True:
            if latest_frame_jpeg:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + latest_frame_jpeg + b'\r\n')
                time.sleep(0.033)
            else:
                time.sleep(0.1)
    return StreamingResponse(iterfile(), media_type="multipart/x-mixed-replace;boundary=frame")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
