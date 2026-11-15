package com.rizhnus.subtitle;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TranslationBackground")
public class TranslationBackgroundPlugin extends Plugin {
    @PluginMethod public void start(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1037);
            }
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), TranslationService.class));
            call.resolve();
        } catch (Exception error) { call.reject("نەتوانرا وەرگێڕان لە پاشبنەما چالاک بکرێت.", error); }
    }
    @PluginMethod public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), TranslationService.class));
        call.resolve();
    }
}
