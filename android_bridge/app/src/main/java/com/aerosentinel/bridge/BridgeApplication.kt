package com.aerosentinel.bridge

import android.content.Context
import androidx.multidex.MultiDexApplication

class BridgeApplication : MultiDexApplication() {
    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
    }

    override fun onCreate() {
        super.onCreate()
        com.secneo.sdk.Helper.install(this)
    }
}
