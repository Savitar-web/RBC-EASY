package com.savitar.rbc;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShortcutsPlugin.class);
        registerPlugin(MediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
