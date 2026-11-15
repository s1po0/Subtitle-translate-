package com.rizhnus.subtitle;

import static org.junit.Assert.assertTrue;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class BackgroundServiceTest {
    @Test public void foregroundServiceRemainsActiveAfterGoingHome() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            activity.onActivity(a -> ContextCompat.startForegroundService(a, new Intent(a, TranslationService.class)));
            Thread.sleep(1000);
            InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("input keyevent KEYCODE_HOME").close();
            Thread.sleep(2000);
            ActivityManager manager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            boolean running = false;
            for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
                if (service.service.getClassName().equals(TranslationService.class.getName()) && service.foreground) running = true;
            }
            assertTrue("Translation service should stay foreground after Home", running);
        } finally {
            context.stopService(new Intent(context, TranslationService.class));
        }
    }
}
