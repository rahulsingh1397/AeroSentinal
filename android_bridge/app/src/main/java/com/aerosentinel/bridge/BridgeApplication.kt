package com.aerosentinel.bridge

import android.content.Context
import androidx.multidex.MultiDexApplication

class BridgeApplication : MultiDexApplication() {
    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        com.cySdkyc.clx.Helper.install(this)
    }

    override fun onCreate() {
        super.onCreate()
    }
}
