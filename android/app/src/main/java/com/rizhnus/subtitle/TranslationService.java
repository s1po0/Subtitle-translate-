package com.rizhnus.subtitle;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

/** Keeps the app process and CPU available while the visible translation session is active. */
public class TranslationService extends Service {
    private static final String CHANNEL = "subtitle_translation";
    private PowerManager.WakeLock wakeLock;

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL, "وەرگێڕانی ژێرنووس", NotificationManager.IMPORTANCE_LOW));
        }
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL)
                .setContentTitle("وەرگێڕانی ژێرنووس بەردەوامە")
                .setContentText("بگەڕێوە بۆ ئەپەکە بۆ بینینی ئەنجام")
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentIntent(pending).setOngoing(true).setOnlyAlertOnce(true).build();
        startForeground(1037, notification);
        if (wakeLock == null || !wakeLock.isHeld()) {
            PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "rizhnus:translation");
            wakeLock.acquire(6 * 60 * 60 * 1000L);
        }
        // A killed process cannot continue the WebView job; never pretend to restart it.
        return START_NOT_STICKY;
    }
    @Override public void onTimeout(int startId, int fgsType) { stopSelf(); }
    @Override public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }
    @Override public void onTaskRemoved(Intent rootIntent) {
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
