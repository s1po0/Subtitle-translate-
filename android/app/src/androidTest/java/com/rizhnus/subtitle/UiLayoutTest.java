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

    @Test public void userGestureOpensIsolatedAuthPopup() throws Exception {
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            for (int i=0;i<20;i++) {
                Thread.sleep(1000);
                String ready=javascript(activity,"(function(){if(!document.querySelector('.dropzone'))return 'wait';var b=document.createElement('button');b.id='popup-test';b.textContent='test';b.style='position:fixed;z-index:999999;left:30px;top:60px;width:160px;height:100px';b.onclick=function(){window.open('https://puter.com/action/sign-in?embedded_in_popup=true','test','width=600,height=700')};document.body.appendChild(b);return 'ok'})()");
                if(ready.contains("ok"))break;
            }
            org.json.JSONArray coordinates=new org.json.JSONArray(javascript(activity,"(function(){var r=document.getElementById('popup-test').getBoundingClientRect();return [(r.left+r.right)/2,(r.top+r.bottom)/2,innerWidth]})()"));
            AtomicReference<int[]> location=new AtomicReference<>();
            activity.onActivity(a->{int[] xy=new int[3];int[] origin=new int[2];a.getBridge().getWebView().getLocationOnScreen(origin);xy[0]=origin[0];xy[1]=origin[1];xy[2]=a.getBridge().getWebView().getWidth();location.set(xy);});
            int[] xy=location.get();float scale=(float)(xy[2]/coordinates.getDouble(2));float x=xy[0]+(float)coordinates.getDouble(0)*scale,y=xy[1]+(float)coordinates.getDouble(1)*scale;long now=android.os.SystemClock.uptimeMillis();
            android.app.Instrumentation inst=androidx.test.platform.app.InstrumentationRegistry.getInstrumentation();
            inst.sendPointerSync(android.view.MotionEvent.obtain(now,now,android.view.MotionEvent.ACTION_DOWN,x,y,0));
            inst.sendPointerSync(android.view.MotionEvent.obtain(now,now+100,android.view.MotionEvent.ACTION_UP,x,y,0));
            Thread.sleep(2000);
            AtomicReference<Boolean> visible=new AtomicReference<>(false);
            activity.onActivity(a->{visible.set(a.authChromeClient.popupVisible());a.authChromeClient.closePopup();});
            assertTrue("User-initiated popup should open inside app",visible.get());
        }
    }

}
