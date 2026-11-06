package com.crafactory.engine;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** UI form factor only; no device identifiers or new permissions. */
@CapacitorPlugin(name = "EngineDevice")
public class EngineDevicePlugin extends Plugin {
    @PluginMethod
    public void info(PluginCall call) {
        JSObject result = new JSObject();
        result.put("tablet", getContext().getResources().getConfiguration().smallestScreenWidthDp >= 600);
        call.resolve(result);
    }
}
