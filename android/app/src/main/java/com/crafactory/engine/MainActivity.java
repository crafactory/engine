package com.crafactory.engine;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(EngineDevicePlugin.class);
        // Native acceptance attaches only to a debuggable APK, never a release WebView.
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
