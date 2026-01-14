# Aerosentinel Android Bridge

This Android application acts as a bridge between the DJI Drone (Mini 3 / MSDK v5) and the Aerosentinel Ground Control Station (PC Backend).

## Prerequisites

*   **Android Studio:** Hedgehog or newer.
*   **Android Device:** Must support DJI MSDK v5 (e.g., Samsung Galaxy S10/S20, Pixel 4/5/6, or DJI RC Pro Enterprise).
*   **DJI Developer Account:** You must register an App Key.

## Setup Instructions

1.  **Open in Android Studio:**
    *   Select `android_bridge` folder as the project root.

2.  **Configure API Key:**
    *   Go to [DJI Developer Portal](https://developer.dji.com/).
    *   Create a new App (Type: MSDK v5).
    *   Copy the **App Key**.
    *   Open `app/src/main/AndroidManifest.xml` and add the metadata tag inside `<application>`:
        ```xml
        <meta-data
            android:name="com.dji.sdk.API_KEY"
            android:value="YOUR_API_KEY_HERE" />
        ```

3.  **Build Dependencies:**
    *   The project uses `com.dji:dji-sdk-v5-aircraft:5.3.0`.
    *   Ensure your Gradle syncs correctly.

4.  **Run on Device:**
    *   Connect your Android phone to the DJI RC (via USB) or use a DJI RC with screen.
    *   Enable **USB Debugging**.
    *   Run the app.

## Usage

1.  Ensure the **Aerosentinel Backend** is running on your PC (`python backend/server.py`).
2.  Ensure your Phone and PC are on the **same Wi-Fi network**.
3.  Launch the Android App.
4.  Enter the **PC IP Address** (e.g., `192.168.1.15`).
5.  Click **Connect**.
6.  Grant all requested permissions (Location, Storage, USB).
7.  Wait for "DJI SDK Registered" status.

## Current Implementation Status

*   **Telemetry:** Sends Pitch, Roll, Yaw, GPS, Battery, and Velocity.
*   **Video:** Receive raw H.264 stream from DJI SDK.
    *   *Note:* The current implementation needs to transcode H.264 to JPEG before sending to the backend, or the backend needs to be updated to decode H.264. Currently, the `VideoDecoder` class is a stub for this logic.

## Architecture

*   **MainActivity.kt:** Handles UI, WebSocket connection, and DJI SDK listeners.
*   **VideoDecoder.kt:** Wrapper around `MediaCodec` to handle the H.264 stream (Work In Progress).
