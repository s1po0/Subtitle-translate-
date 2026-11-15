package com.rizhnus.subtitle;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
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
            String value = "";
            for (int attempt = 0; attempt < 20; attempt++) {
                Thread.sleep(1500);
                CountDownLatch ready = new CountDownLatch(1);
                AtomicReference<String> result = new AtomicReference<>();
                activity.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(
                    "(function(){" +
                    "var name=document.querySelector('.dropzone strong');var panel=document.querySelector('.main-panel');" +
                    "if(!name||!panel)return 'not-loaded:'+document.readyState+':'+document.getElementById('root').innerHTML.length;" +
                    "name.textContent='Long_Subtitle_Filename_'.repeat(18)+'.srt';" +
                    "var p=panel.getBoundingClientRect(),n=name.getBoundingClientRect();" +
                    "if(document.documentElement.scrollWidth>window.innerWidth+1)return 'document';if(p.left < -1 || p.right>window.innerWidth+1)return 'panel';if(n.left<p.left-1 || n.right>p.right+1)return 'filename-box';if(name.scrollWidth>name.clientWidth+1)return 'filename-text';return 'ok';" +
                    "})()", response -> { result.set(response);ready.countDown(); }));
                assertTrue("WebView did not respond", ready.await(10, TimeUnit.SECONDS));
                value = result.get();
                if (!value.contains("not-loaded")) break;
            }
            assertEquals("Long file names must not overflow the phone screen", "\"ok\"", value);
        }
    }
    private String javascript(ActivityScenario<MainActivity> activity, String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        activity.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); latch.countDown(); }));
        assertTrue("WebView did not respond", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }

    @Test public void languageChoiceUsesReadableInAppDialog() throws Exception {
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            String ready = "";
            for (int i=0; i<20; i++) {
                Thread.sleep(1500);
                ready = javascript(activity, "(function(){var b=document.querySelector('.language-box .choice-trigger');if(!b)return 'not-loaded';b.click();return 'opened';})()");
                if (ready.contains("opened")) break;
            }
            assertEquals("Language picker should open", "\"opened\"", ready);
            Thread.sleep(1000);
            String result = javascript(activity, "(function(){var d=document.querySelector('.choice-dialog');var items=document.querySelectorAll('.choice-option');if(!d||items.length<2)return 'missing-dialog';var r=d.getBoundingClientRect();if(r.width>innerWidth||r.height>innerHeight)return 'overflow';var color=getComputedStyle(d).backgroundColor;if(color==='rgba(0, 0, 0, 0)'||color==='rgb(255, 255, 255)')return 'unexpected-background:'+color;items[1].click();return 'selected';})()");
            assertEquals("Picker should be visible and selectable on dark theme", "\"selected\"", result);
            Thread.sleep(500);
            result = javascript(activity, "(function(){var b=document.querySelector('.language-box .choice-trigger');return b && b.textContent.indexOf('ئینگلیزی')>=0 && !document.querySelector('.choice-dialog')?'ok':'wrong-selection';})()");
            assertEquals("Selection should update and close the picker", "\"ok\"", result);
        }
    }

}
