package com.rizhnus.subtitle;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    AuthChromeClient authChromeClient;
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TranslationBackgroundPlugin.class);
        registerPlugin(VideoAudioPlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null) {
            // Avoid a white flash while the local app UI is loading.
            getBridge().getWebView().setBackgroundColor(android.graphics.Color.rgb(17, 31, 50));
            getBridge().getWebView().getSettings().setSupportMultipleWindows(true);
            authChromeClient = new AuthChromeClient(getBridge(), this);
            getBridge().getWebView().setWebChromeClient(authChromeClient);
        }
    }
}
