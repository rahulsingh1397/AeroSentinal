package com.aerosentinel.bridge

import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.media.MediaCodec
import android.media.MediaFormat
import android.util.Log
import android.view.Surface
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

class VideoDecoder(private val onFrameDecoded: (ByteArray) -> Unit) {
    private var codec: MediaCodec? = null
    private val TAG = "VideoDecoder"
    private var isConfigured = false
    private var width = 1280 // Default, will update
    private var height = 720

    fun initCodec(width: Int, height: Int) {
        if (isConfigured) return
        this.width = width
        this.height = height

        try {
            val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height)
            // Ensure we get a color format that YuvImage understands (NV21 is ideal, but codec gives what it gives)
            // Typically COLOR_FormatYUV420Flexible is the standard for new Android APIs.
            format.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodec.CodecCapabilities.COLOR_FormatYUV420Flexible)
            
            codec = MediaCodec.createDecoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
            codec?.configure(format, null, null, 0)
            codec?.start()
            isConfigured = true
            Log.d(TAG, "Decoder initialized for ${width}x${height}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to init codec", e)
        }
    }

    fun decode(data: ByteArray, length: Int) {
        if (!isConfigured) {
            // Lazy init if not already done, assuming standard 720p or trying to parse SPS/PPS
            // For now, let's assume 1280x720 from the drone if not set.
            initCodec(1280, 720)
        }

        val codec = this.codec ?: return

        try {
            // 1. Input
            val inputIndex = codec.dequeueInputBuffer(10000)
            if (inputIndex >= 0) {
                val inputBuffer = codec.getInputBuffer(inputIndex)
                inputBuffer?.clear()
                inputBuffer?.put(data, 0, length)
                codec.queueInputBuffer(inputIndex, 0, length, System.nanoTime() / 1000, 0)
            }

            // 2. Output
            val bufferInfo = MediaCodec.BufferInfo()
            var outputIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
            
            while (outputIndex >= 0) {
                val outputBuffer = codec.getOutputBuffer(outputIndex)
                if (outputBuffer != null && bufferInfo.size > 0) {
                    // Convert YUV420 to JPEG
                    // This is CPU intensive. In production, consider doing this on GPU or sending raw H264 if backend supports it.
                    val jpegBytes = nv21ToJpeg(outputBuffer, width, height, bufferInfo)
                    if (jpegBytes != null) {
                        onFrameDecoded(jpegBytes)
                    }
                }
                codec.releaseOutputBuffer(outputIndex, false)
                outputIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Decode error", e)
        }
    }

    private fun nv21ToJpeg(buffer: ByteBuffer, width: Int, height: Int, info: MediaCodec.BufferInfo): ByteArray? {
        // NOTE: This assumes the decoder output is reasonably close to NV21 or YUV420SemiPlanar.
        // Handling strict COLOR_FormatYUV420Flexible structure is complex. 
        // We will do a simplified read here assuming a flat buffer.
        
        try {
            val bytes = ByteArray(info.size)
            buffer.get(bytes)
            
            // Adjust stride if necessary (omitted for brevity, assume packed)
            val yuvImage = YuvImage(bytes, ImageFormat.NV21, width, height, null)
            val out = ByteArrayOutputStream()
            yuvImage.compressToJpeg(Rect(0, 0, width, height), 70, out) // 70% Quality
            return out.toByteArray()
        } catch (e: Exception) {
            // Log.e(TAG, "JPEG Conversion failed", e)
            return null
        }
    }

    fun stop() {
        try {
            codec?.stop()
            codec?.release()
            isConfigured = false
        } catch (e: Exception) {
            Log.e(TAG, "Stop error", e)
        }
    }
}
