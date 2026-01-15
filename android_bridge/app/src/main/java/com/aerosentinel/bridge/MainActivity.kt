package com.aerosentinel.bridge

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import dji.v5.common.error.IDJIError
import dji.v5.common.register.DJISDKInitEvent
import dji.v5.manager.SDKManager
import dji.v5.manager.interfaces.SDKManagerCallback
import okhttp3.*
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

    private val telemetryData = JSONObject()

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
        runOnUiThread { statusText.text = getString(R.string.status_msg, msg) }
    }

    private fun connectBackend(url: String) {
        updateStatus(getString(R.string.connecting_to, url))
        val request = Request.Builder().url(url).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                updateStatus("Connected to Backend")
                startTelemetryStream()
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                updateStatus("Failed: ${t.message}")
            }
        })
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
                startTelemetryPolling()
            }

            override fun onRegisterFailure(error: IDJIError) {
                Log.e("DJI", "SDK registration failed: ${error.description()}")
                updateStatus(getString(R.string.sdk_register_failed, error.description()))
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
        updateStatus("Starting telemetry stream...")
        Thread {
            while (true) {
                try {
                    // Poll basic telemetry data
                    // For now, send dummy data - will be replaced with actual SDK calls
                    updateTelemetry("pitch", 0.0)
                    updateTelemetry("roll", 0.0)
                    updateTelemetry("yaw", 0.0)
                    updateTelemetry("altitude", 0.0)
                    updateTelemetry("battery", 100)
                    updateTelemetry("speedH", 0.0)
                    updateTelemetry("speedV", 0.0)
                    updateTelemetry("gimbalPitch", 0.0)
                    
                    val coords = JSONObject().apply {
                        put("lat", 0.0)
                        put("lng", 0.0)
                    }
                    synchronized(telemetryData) { telemetryData.put("coordinates", coords) }
                    
                    Thread.sleep(100)
                } catch (e: Exception) {
                    Log.e("Bridge", "Telemetry polling error", e)
                }
            }
        }.start()
    }

    private fun updateTelemetry(key: String, value: Any) {
        synchronized(telemetryData) { telemetryData.put(key, value) }
    }

    private fun startTelemetryStream() {
        Thread {
            while (webSocket != null) {
                try {
                    val payload = JSONObject()
                    synchronized(telemetryData) {
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
