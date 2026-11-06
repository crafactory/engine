package com.crafactory.engine;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.inputmethodservice.InputMethodService;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.inputmethod.InputConnection;
import android.widget.TextView;

/** Owned acceptance fixture: exercise Android's real InputConnection, not CDP emulation. */
public class CompositionIme extends InputMethodService {
    private static CompositionIme current;

    @Override public void onCreate() { super.onCreate(); current = this; }
    @Override public void onDestroy() {
        if (current == this) current = null;
        super.onDestroy();
    }
    @Override public View onCreateInputView() {
        TextView view = new TextView(this);
        view.setText("Native composition acceptance (debug only)");
        view.setMinHeight((int)(180 * getResources().getDisplayMetrics().density));
        return view;
    }

    /** Shell-only ordered broadcast; the production manifest contains no receiver or IME. */
    public static class Run extends BroadcastReceiver {
        @Override public void onReceive(Context context, Intent intent) {
            if (!"com.crafactory.engine.TEST_COMPOSITION".equals(intent.getAction())) {
                setResultCode(1); return;
            }
            CompositionIme service = current;
            InputConnection connection = service == null ? null : service.getCurrentInputConnection();
            if (connection == null) { setResultCode(1); return; }
            connection.setComposingText("中", 1);
            Handler handler = new Handler(Looper.getMainLooper());
            handler.postDelayed(() -> {
                connection.setComposingText("中文", 1);
                handler.postDelayed(() -> connection.commitText("中文", 1), 120);
            }, 120);
            setResultCode(0);
        }
    }
}
