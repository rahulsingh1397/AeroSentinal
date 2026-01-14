import asyncio
import websockets
import json
import cv2
import numpy as np
import time

async def test_drone():
    uri = "ws://127.0.0.1:8000/ws/drone"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to Backend!")
            
            x, y = 100, 100
            dx, dy = 5, 5
            
            # Continuous Loop
            try:
                while True:
                    # 1. Send Telemetry (Simulate slight movement)
                    telemetry = {
                        "text": json.dumps({
                            "telemetry": {
                                "pitch": 10.5 + np.sin(time.time()),
                                "roll": -2.3 + np.cos(time.time()),
                                "yaw": 45.0,
                                "altitude": 15.2,
                                "speedH": 5.5,
                                "speedV": 0.2,
                                "battery": 88,
                                "coordinates": { "lat": 37.7749, "lng": -122.4194 },
                                "distanceHome": 120,
                                "obstacleDistance": 15.0,
                                "gimbalPitch": -30
                            }
                        })
                    }
                    await websocket.send(json.dumps(telemetry))

                    # 2. Send Video Frame (Bouncing Ball)
                    img = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.rectangle(img, (0, 0), (640, 480), (50, 50, 50), -1) # Gray BG
                    
                    # Update ball position
                    x += dx
                    y += dy
                    if x <= 20 or x >= 620: dx *= -1
                    if y <= 20 or y >= 460: dy *= -1
                    
                    cv2.circle(img, (x, y), 20, (0, 255, 255), -1)
                    cv2.putText(img, f"TEST STREAM: {time.strftime('%H:%M:%S')}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
                    # Encode to JPEG
                    _, buffer = cv2.imencode('.jpg', img)
                    await websocket.send(buffer.tobytes())
                    
                    # 30 FPS
                    await asyncio.sleep(0.033)
                    
            except KeyboardInterrupt:
                print("Stopping stream...")
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_drone())
