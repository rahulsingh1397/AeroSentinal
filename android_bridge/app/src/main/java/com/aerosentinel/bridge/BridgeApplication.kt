package com.aerosentinel.bridge

import android.app.Application
import android.content.Context

class BridgeApplication : Application() {
    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        com.secneo.sdk.Helper.install(this)
    }
}
