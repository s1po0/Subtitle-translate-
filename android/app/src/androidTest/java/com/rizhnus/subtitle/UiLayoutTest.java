package com.rizhnus.subtitle;

import static org.junit.Assert.assertEquals;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class UiLayoutTest {
    @Test public void longFilenameStaysInsideMobileViewport() throws Exception {
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            Thread.sleep(8000); // Allow the bundled React app and WebView to initialize.
            CountDownLatch resultReady = new CountDownLatch(1);
            AtomicReference<String> result = new AtomicReference<>();
            activity.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(
                "(function(){" +
                "var name=document.querySelector('.dropzone strong');var panel=document.querySelector('.main-panel');" +
                "if(!name||!panel)return false;name.textContent='Long_Subtitle_Filename_'.repeat(18)+'.srt';" +
                "var p=panel.getBoundingClientRect(),n=name.getBoundingClientRect();" +
                "if(document.documentElement.scrollWidth>window.innerWidth+1)return 'document';if(p.left < -1 || p.right>window.innerWidth+1)return 'panel';if(n.left<p.left-1 || n.right>p.right+1)return 'filename-box';if(name.scrollWidth>name.clientWidth+1)return 'filename-text';return 'ok';" +
                "})()", value -> { result.set(value);resultReady.countDown(); }));
            assertEquals("WebView did not respond", true, resultReady.await(10, TimeUnit.SECONDS));
            assertEquals("Long file names must not overflow the phone screen", "\"ok\"", result.get());
        }
    }
}
