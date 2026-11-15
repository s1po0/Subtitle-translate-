package com.rizhnus.subtitle;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TranslationBackgroundPlugin.class);
        registerPlugin(VideoAudioPlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null) {
            getBridge().getWebView().getSettings().setSupportMultipleWindows(true);
            getBridge().getWebView().setWebChromeClient(new AuthChromeClient(getBridge(), this));
        }
    }
}
