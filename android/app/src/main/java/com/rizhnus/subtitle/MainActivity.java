package com.rizhnus.subtitle;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TranslationBackgroundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
