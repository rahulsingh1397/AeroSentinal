package com.aerosentinel.bridge

import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.Toast
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import dji.v5.common.error.IDJIError
import dji.v5.common.register.DJISDKInitEvent
import dji.v5.manager.SDKManager
import dji.v5.manager.interfaces.SDKManagerCallback
import dji.sdk.keyvalue.key.FlightControllerKey
import dji.sdk.keyvalue.key.BatteryKey
import dji.sdk.keyvalue.key.GimbalKey
import dji.sdk.keyvalue.key.KeyTools
import dji.sdk.keyvalue.value.common.LocationCoordinate2D
import dji.sdk.keyvalue.value.common.Attitude
import dji.sdk.keyvalue.value.common.Velocity3D
import dji.v5.manager.KeyManager
import dji.v5.common.callback.CommonCallbacks
import dji.sdk.keyvalue.key.DJIKey
import okio.ByteString.Companion.toByteString
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.Manifest
import android.os.Build
import java.util.ArrayList

class MainActivity : AppCompatActivity() {
    private val REQUEST_PERMISSION_CODE = 12345
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private lateinit var statusText: TextView
    private lateinit var ipInput: EditText
    private lateinit var connectBtn: Button
    private lateinit var connectionIndicator: View
    private lateinit var connectionLabel: TextView
    private lateinit var batteryText: TextView
    private lateinit var altitudeText: TextView
    private lateinit var speedHText: TextView
    private lateinit var speedVText: TextView
    private lateinit var pitchText: TextView
    private lateinit var rollText: TextView
    private lateinit var yawText: TextView
    private lateinit var distanceHomeText: TextView
    private lateinit var obstacleDistanceText: TextView
    private lateinit var gimbalPitchText: TextView
    private lateinit var coordinatesText: TextView
    private lateinit var videoStatusText: TextView

    private val telemetryData = JSONObject()

    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 5
    private val reconnectDelayMs = 3000L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        checkAndRequestPermissions()

        statusText = findViewById(R.id.statusText)
        ipInput = findViewById(R.id.ipInput)
        connectBtn = findViewById(R.id.connectBtn)
        connectionIndicator = findViewById(R.id.connectionIndicator)
        connectionLabel = findViewById(R.id.connectionLabel)
        batteryText = findViewById(R.id.batteryText)
        altitudeText = findViewById(R.id.altitudeText)
        speedHText = findViewById(R.id.speedHText)
        speedVText = findViewById(R.id.speedVText)
        pitchText = findViewById(R.id.pitchText)
        rollText = findViewById(R.id.rollText)
        yawText = findViewById(R.id.yawText)
        distanceHomeText = findViewById(R.id.distanceHomeText)
        obstacleDistanceText = findViewById(R.id.obstacleDistanceText)
        gimbalPitchText = findViewById(R.id.gimbalPitchText)
        coordinatesText = findViewById(R.id.coordinatesText)
        videoStatusText = findViewById(R.id.videoStatusText)

        connectBtn.setOnClickListener {
            val raw = ipInput.text.toString().trim()
            if (raw.isNotBlank()) {
                val url = sanitizeBackendUrl(raw)
                connectBackend(url)
            }
        }

        initDJISDK()
    }

    private fun checkAndRequestPermissions() {
        val permissions = ArrayList<String>()
        permissions.add(Manifest.permission.READ_PHONE_STATE)
        permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(Manifest.permission.BLUETOOTH)
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN)
        }

        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missingPermissions.toTypedArray(), REQUEST_PERMISSION_CODE)
        } else {
            initDJISDK()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                initDJISDK()
            } else {
                Toast.makeText(this, "Permissions required for DJI SDK", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        KeyManager.getInstance().cancelListen(this)
        webSocket?.close(1000, "Activity destroyed")
    }

    private fun updateStatus(msg: String) {
        runOnUiThread { statusText.text = getString(R.string.status_msg, msg) }
    }

    private fun connectBackend(url: String) {
        setConnectionState(ConnectionState.CONNECTING)
        updateStatus(getString(R.string.connecting_to, url))
        val request = Request.Builder().url(url).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                reconnectAttempts = 0
                setConnectionState(ConnectionState.CONNECTED)
                updateStatus("Connected to Backend")
                startTelemetryStream()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                runOnUiThread {
                    val errorMsg = "Connection failed: ${t.localizedMessage ?: "Unknown error"}"
                    updateStatus(errorMsg)
                    Log.e("WebSocket", errorMsg, t)

                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++
                        setConnectionState(ConnectionState.RECONNECTING)
                        Handler(Looper.getMainLooper()).postDelayed({
                            updateStatus("Reconnecting (attempt $reconnectAttempts)...")
                            connectBackend(url)
                        }, reconnectDelayMs)
                    } else {
                        setConnectionState(ConnectionState.DISCONNECTED)
                    }
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                runOnUiThread {
                    try {
                        val root = JSONObject(text)
                        val telemetry = root.optJSONObject("telemetry") ?: root
                        Log.d("WebSocket", "Received telemetry: $telemetry")
                        updateTelemetryUI(telemetry)
                    } catch (e: Exception) {
                        Log.e("WebSocket", "Error parsing telemetry", e)
                        updateStatus("Invalid telemetry format")
                    }
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                updateStatus("Connection closing: $reason")
                setConnectionState(ConnectionState.DISCONNECTED)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                updateStatus("Connection closed")
                setConnectionState(ConnectionState.DISCONNECTED)
            }
        })
    }

    private fun setConnectionState(state: ConnectionState) {
        runOnUiThread {
            when (state) {
                ConnectionState.CONNECTING -> {
                    connectionIndicator.setBackgroundColor(Color.YELLOW)
                    connectionLabel.text = "Connecting"
                }
                ConnectionState.CONNECTED -> {
                    connectionIndicator.setBackgroundColor(Color.GREEN)
                    connectionLabel.text = "Connected"
                }
                ConnectionState.RECONNECTING -> {
                    connectionIndicator.setBackgroundColor(Color.parseColor("#FFA000"))
                    connectionLabel.text = "Reconnecting"
                }
                ConnectionState.DISCONNECTED -> {
                    connectionIndicator.setBackgroundColor(Color.RED)
                    connectionLabel.text = "Disconnected"
                }
            }
        }
    }

    private fun updateTelemetryUI(telemetry: JSONObject) {
        fun d(name: String): Double? = if (telemetry.has(name)) telemetry.optDouble(name) else null
        fun i(name: String): Int? = if (telemetry.has(name)) telemetry.optInt(name) else null

        i("battery")?.let { batteryText.text = "Battery: $it%" }
        d("altitude")?.let { altitudeText.text = "Altitude: ${"%.1f".format(it)} m" }
        d("speedH")?.let { speedHText.text = "Speed H: ${"%.2f".format(it)} m/s" }
        d("speedV")?.let { speedVText.text = "Speed V: ${"%.2f".format(it)} m/s" }
        d("pitch")?.let { pitchText.text = "Pitch: ${"%.1f".format(it)}°" }
        d("roll")?.let { rollText.text = "Roll: ${"%.1f".format(it)}°" }
        d("yaw")?.let { yawText.text = "Yaw: ${"%.1f".format(it)}°" }
        d("distanceHome")?.let { distanceHomeText.text = "Distance Home: ${"%.1f".format(it)} m" }
        d("obstacleDistance")?.let { obstacleDistanceText.text = "Obstacle Distance: ${"%.1f".format(it)} m" }
        d("gimbalPitch")?.let { gimbalPitchText.text = "Gimbal Pitch: ${"%.1f".format(it)}°" }

        telemetry.optJSONObject("coordinates")?.let { coords ->
            val lat = coords.optDouble("lat", Double.NaN)
            val lng = coords.optDouble("lng", Double.NaN)
            if (!lat.isNaN() && !lng.isNaN()) {
                coordinatesText.text = "Coords: ${"%.5f".format(lat)}, ${"%.5f".format(lng)}"
            }
        }
    }

    private enum class ConnectionState { CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED }

    private fun sanitizeBackendUrl(raw: String): String {
        var input = raw.replace("\\s".toRegex(), "")

        fun ensurePath(u: String): String {
            return if (u.endsWith("/ws/drone")) u else u.trimEnd('/') + "/ws/drone"
        }

        if (!input.contains("://")) {
            // No scheme provided; normalize IP/host with optional port.
            // If user typed an extra port (e.g., 192.168.1.10:8000:8000), keep only host:port.
            if (input.count { it == ':' } > 1) {
                val parts = input.split(":")
                if (parts.size >= 2) input = parts[0] + ":" + parts[1]
            }
            // If no port, default to 8000.
            if (!input.contains(":")) {
                input = "$input:8000"
            }
            return "ws://" + ensurePath(input)
        }

        // Scheme provided; coerce http->ws and https->wss.
        input = input
            .replaceFirst("^http://".toRegex(), "ws://")
            .replaceFirst("^https://".toRegex(), "wss://")
        return ensurePath(input)
    }

    private fun initDJISDK() {
        SDKManager.getInstance().init(this, object : SDKManagerCallback {
            override fun onInitProcess(event: DJISDKInitEvent, totalProcess: Int) {
                Log.i("DJI", "SDK init progress=$totalProcess")
                updateStatus(getString(R.string.sdk_init_progress, totalProcess))
            }

            override fun onRegisterSuccess() {
                Log.i("DJI", "DJI SDK registered successfully")
                updateStatus("DJI SDK Registered!")
                Toast.makeText(this@MainActivity, "DJI SDK Registered", Toast.LENGTH_SHORT).show()
                startTelemetryPolling()
                updateVideoStatus("Video: SDK ready (camera streaming not yet implemented)")
            }

            override fun onRegisterFailure(error: IDJIError) {
                Log.e("DJI", "SDK registration failed: ${error.description()}")
                updateStatus(getString(R.string.sdk_register_failed, error.description()))
                Toast.makeText(
                    this@MainActivity,
                    "DJI SDK registration failed: ${error.description()}",
                    Toast.LENGTH_LONG
                ).show()
            }

            override fun onProductConnect(productId: Int) {
                Log.i("DJI", "DJI product connected: $productId")
                updateStatus("Product Connected!")
            }

            override fun onProductDisconnect(productId: Int) {
                Log.i("DJI", "DJI product disconnected: $productId")
                updateStatus("Product Disconnected")
            }

            override fun onProductChanged(productId: Int) {
                Log.i("DJI", "DJI product changed: $productId")
                updateStatus("Product Changed")
            }

            override fun onDatabaseDownloadProgress(current: Long, total: Long) {
                updateStatus(getString(R.string.db_download_progress, current, total))
            }
        })
    }

    private fun startTelemetryPolling() {
        updateStatus("Starting telemetry listener...")
        Log.i("Telemetry", "Setting up telemetry listeners...")
        
        val keyManager = KeyManager.getInstance()
        
        // Initialize default telemetry values so frontend shows something
        initializeDefaultTelemetry()

        // Helper to register listeners safely with logging
        fun <T : Any> listen(key: DJIKey<T>, keyName: String, update: (T) -> Unit) {
            Log.d("Telemetry", "Registering listener for: $keyName")
            keyManager.listen(key, this) { _: T?, newValue: T? ->
                if (newValue != null) {
                    Log.d("Telemetry", "Received $keyName: $newValue")
                    update(newValue)
                } else {
                    Log.w("Telemetry", "$keyName returned null")
                }
            }
            
            // Also try to get current value immediately
            try {
                val currentValue = keyManager.getValue(key)
                if (currentValue != null) {
                    Log.d("Telemetry", "Initial value for $keyName: $currentValue")
                    update(currentValue)
                }
            } catch (e: Exception) {
                Log.w("Telemetry", "Could not get initial value for $keyName: ${e.message}")
            }
        }

        // Attitude (pitch, roll, yaw)
        listen(KeyTools.createKey(FlightControllerKey.KeyAircraftAttitude), "Attitude") { attitude ->
            updateTelemetry("pitch", attitude.pitch)
            updateTelemetry("roll", attitude.roll)
            updateTelemetry("yaw", attitude.yaw)
        }

        // Altitude
        listen(KeyTools.createKey(FlightControllerKey.KeyAltitude), "Altitude") { altitude ->
            updateTelemetry("altitude", altitude)
        }

        // Battery
        listen(KeyTools.createKey(BatteryKey.KeyChargeRemainingInPercent), "Battery") { battery ->
            updateTelemetry("battery", battery)
        }

        // Velocity (Horizontal & Vertical)
        listen(KeyTools.createKey(FlightControllerKey.KeyAircraftVelocity), "Velocity") { velocity ->
            val speedH = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            updateTelemetry("speedH", speedH)
            updateTelemetry("speedV", Math.abs(velocity.z))
        }

        // Gimbal Pitch
        listen(KeyTools.createKey(GimbalKey.KeyGimbalAttitude), "GimbalAttitude") { gimbalAttitude ->
            updateTelemetry("gimbalPitch", gimbalAttitude.pitch)
        }

        // GPS Coordinates
        val locationKey = KeyTools.createKey(FlightControllerKey.KeyAircraftLocation)
        listen(locationKey, "Location") { location ->
            val coords = JSONObject().apply {
                put("lat", location.latitude)
                put("lng", location.longitude)
            }
            synchronized(telemetryData) { telemetryData.put("coordinates", coords) }
            
            // Calculate Distance to Home if Home Location is known
            val homeKey = KeyTools.createKey(FlightControllerKey.KeyHomeLocation)
            val homeLocation = keyManager.getValue(homeKey)
            if (homeLocation != null) {
                 val distance = calculateDistance(homeLocation, location)
                 updateTelemetry("distanceHome", distance)
            }
        }
        
        // Listen for Home Location updates as well
        listen(KeyTools.createKey(FlightControllerKey.KeyHomeLocation), "HomeLocation") { homeLocation ->
             val currentLocation = keyManager.getValue(locationKey)
             if (currentLocation != null) {
                 val distance = calculateDistance(homeLocation, currentLocation)
                 updateTelemetry("distanceHome", distance)
             }
        }

        // Obstacle Distance (placeholder - DJI Mini 3 doesn't have obstacle sensors in all directions)
        updateTelemetry("obstacleDistance", 10.0)
        
        Log.i("Telemetry", "Telemetry listeners registered")
    }
    
    private fun initializeDefaultTelemetry() {
        // Set default values so frontend shows something even before drone data arrives
        synchronized(telemetryData) {
            telemetryData.put("pitch", 0.0)
            telemetryData.put("roll", 0.0)
            telemetryData.put("yaw", 0.0)
            telemetryData.put("altitude", 0.0)
            telemetryData.put("battery", 0)
            telemetryData.put("speedH", 0.0)
            telemetryData.put("speedV", 0.0)
            telemetryData.put("gimbalPitch", 0.0)
            telemetryData.put("satellites", 0)
            telemetryData.put("flightTime", 0)
            telemetryData.put("coordinates", JSONObject().apply {
                put("lat", 0.0)
                put("lng", 0.0)
            })
        }
    }
    
    private fun updateVideoStatus(status: String) {
        runOnUiThread {
            videoStatusText.text = status
        }
    }

    private fun calculateDistance(loc1: LocationCoordinate2D, loc2: LocationCoordinate2D): Double {
        val earthRadius = 6371000.0 // meters
        val lat1Rad = Math.toRadians(loc1.latitude)
        val lat2Rad = Math.toRadians(loc2.latitude)
        val deltaLat = Math.toRadians(loc2.latitude - loc1.latitude)
        val deltaLng = Math.toRadians(loc2.longitude - loc1.longitude)
        
        val a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        
        return earthRadius * c
    }

    private fun updateTelemetry(key: String, value: Any) {
        synchronized(telemetryData) { 
            telemetryData.put(key, value)
            // Trigger UI update immediately on main thread
            runOnUiThread {
                 updateTelemetryUI(telemetryData)
            }
        }
    }

    private fun startTelemetryStream() {
        Thread {
            while (webSocket != null) {
                try {
                    val payload = JSONObject()
                    val jsonString: String
                    synchronized(telemetryData) {
                        if (!telemetryData.has("obstacleDistance")) telemetryData.put("obstacleDistance", 10.0)
                        if (!telemetryData.has("distanceHome")) telemetryData.put("distanceHome", 0.0)
                        payload.put("telemetry", telemetryData)
                        // Serialize inside lock to ensure thread safety
                        jsonString = payload.toString()
                    }
                    webSocket?.send(jsonString)
                    Thread.sleep(100)
                } catch (e: Exception) {
                    Log.e("Bridge", "Telemetry Error", e)
                }
            }
        }.start()
    }
}
