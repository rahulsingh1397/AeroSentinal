package com.aerosentinel.bridge

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import dji.v5.common.callback.CommonCallbacks
import dji.v5.common.error.IDJIError
import dji.v5.manager.SDKManager
import dji.v5.manager.datacenter.MediaDataCenter
import dji.v5.manager.key.BatteryKey
import dji.v5.manager.key.FlightControllerKey
import dji.v5.manager.key.GimbalKey
import dji.v5.manager.key.KeyManager
import okhttp3.*
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private lateinit var statusText: TextView
    private lateinit var ipInput: EditText
    private lateinit var connectBtn: Button

    // Telemetry State
    private val telemetryData = JSONObject()
    private val mainHandler = Handler(Looper.getMainLooper())

    // Video Decoder
    private val videoDecoder = VideoDecoder { jpegBytes ->
        // Send JPEG bytes via WebSocket
        webSocket?.send(ByteString.of(jpegBytes, 0, jpegBytes.size))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        ipInput = findViewById(R.id.ipInput)
        connectBtn = findViewById(R.id.connectBtn)

        connectBtn.setOnClickListener {
            val ip = ipInput.text.toString()
            if (ip.isNotBlank()) {
                connectBackend("ws://$ip:8000/ws/drone")
            }
        }

        initDJISDK()
    }

    private fun updateStatus(msg: String) {
        runOnUiThread { statusText.text = "Status: $msg" }
    }

    private fun connectBackend(url: String) {
        updateStatus("Connecting to $url...")
        val request = Request.Builder().url(url).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                updateStatus("Connected to Backend")
                startTelemetryStream()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                Log.d("Bridge", "Received: $text")
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                updateStatus("Closed: $reason")
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                updateStatus("Failed: ${t.message}")
            }
        })
    }

    private fun initDJISDK() {
        SDKManager.getInstance().init(this, object : CommonCallbacks.SDKCommonCallback {
            override fun onRegisterSuccess() {
                updateStatus("DJI SDK Registered!")
                setupListeners()
            }

            override fun onRegisterFailure(error: IDJIError) {
                updateStatus("SDK Register Failed: ${error.description()}")
            }
        })
    }

    private fun setupListeners() {
        // 1. Attitude
        KeyManager.getInstance().listen(FlightControllerKey.create(FlightControllerKey.ATTITUDE), this) { _, newValue ->
            newValue?.let {
                updateTelemetry("pitch", it.pitch)
                updateTelemetry("roll", it.roll)
                updateTelemetry("yaw", it.yaw)
            }
        }

        // 2. GPS / Location
        KeyManager.getInstance().listen(FlightControllerKey.create(FlightControllerKey.AIRCRAFT_LOCATION_3D), this) { _, newValue ->
            newValue?.let {
                updateTelemetry("altitude", it.altitude)
                val coords = JSONObject()
                coords.put("lat", it.latitude)
                coords.put("lng", it.longitude)
                synchronized(telemetryData) {
                    telemetryData.put("coordinates", coords)
                }
            }
        }

        // 3. Battery
        KeyManager.getInstance().listen(BatteryKey.create(BatteryKey.CHARGE_REMAINING_IN_PERCENT), this) { _, newValue ->
            newValue?.let { updateTelemetry("battery", it) }
        }

        // 4. Velocity
        KeyManager.getInstance().listen(FlightControllerKey.create(FlightControllerKey.VELOCITY), this) { _, newValue ->
            newValue?.let {
                val speedH = Math.sqrt((it.x * it.x + it.y * it.y).toDouble())
                updateTelemetry("speedH", speedH)
                updateTelemetry("speedV", it.z)
            }
        }
        
        // 5. Gimbal
        KeyManager.getInstance().listen(GimbalKey.create(GimbalKey.ATTITUDE_IN_DEGREES), this) { _, newValue ->
             newValue?.let { updateTelemetry("gimbalPitch", it.pitch) }
        }

        // 6. Video Stream (Raw H.264)
        MediaDataCenter.getInstance().videoStreamManager.addStreamListener { data, offset, length ->
            // Feed raw H.264 to decoder
            videoDecoder.decode(data, length)
        }
    }

    private fun updateTelemetry(key: String, value: Any) {
        synchronized(telemetryData) {
            telemetryData.put(key, value)
        }
    }

    private fun startTelemetryStream() {
        // Send JSON every 100ms
        Thread {
            while (webSocket != null) {
                try {
                    val payload = JSONObject()
                    synchronized(telemetryData) {
                        // Default values if missing
                        if (!telemetryData.has("obstacleDistance")) telemetryData.put("obstacleDistance", 10.0)
                        if (!telemetryData.has("distanceHome")) telemetryData.put("distanceHome", 0.0)
                        
                        payload.put("telemetry", telemetryData)
                    }
                    webSocket?.send(payload.toString())
                    Thread.sleep(100)
                } catch (e: Exception) {
                    Log.e("Bridge", "Telemetry Error", e)
                }
            }
        }.start()
    }
}
