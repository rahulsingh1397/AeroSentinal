package com.aerosentinel.bridge

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import okio.ByteString
import java.util.concurrent.TimeUnit

// Conceptual imports for DJI SDK
// import dji.v5.manager.datacenter.MediaDataCenter
// import dji.v5.manager.interfaces.IVideoStreamManager

class MainActivity : AppCompatActivity() {
    private var webSocket: WebSocket? = null
    
    // WebSocket URL pointing to your PC's backend
    private val wsUrl = "ws://192.168.1.191:8000/ws/drone" 
    
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        connectBackend()
        initDJISDK()
    }

    private fun connectBackend() {
        val request = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                println("Bridge: Connected to GCS Backend")
            }
            
            override fun onMessage(ws: WebSocket, text: String) {
                // Receive commands from PC (Virtual Sticks, etc.)
                println("Command received: $text")
                // handleCommand(text)
            }
            
            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                println("Bridge: Closing")
            }
            
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                println("Bridge: Connection Failed: ${t.message}")
            }
        })
    }

    private fun initDJISDK() {
        // Initialize DJI SDK v5 here.
        // Refer to DJI Mobile SDK v5 Documentation for registration.
        
        // Example Video Stream Listener
        /*
        MediaDataCenter.getInstance().videoStreamManager.addStreamListener { data, offset, length ->
            // 'data' is raw H.264. 
            // Ideally, decode to Bitmap -> Compress to JPEG -> Send.
            // Or if using a specialized backend decoder, send raw.
            
            // Sending raw bytes example:
            // webSocket?.send(ByteString.of(data, offset, length))
        }
        */
    }
}
