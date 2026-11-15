package com.rizhnus.subtitle;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.net.Uri;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileOutputStream;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="VideoAudio")
public final class VideoAudioPlugin extends Plugin {
    private Uri selected;
    private double duration;
    @Override public void load() { new File(getContext().getCacheDir(),"caption-audio.wav").delete(); }
    @PluginMethod public void clear(PluginCall call) {new File(getContext().getCacheDir(),"caption-audio.wav").delete();call.resolve();}
    @PluginMethod public void pick(PluginCall call) {
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("video/*");
        startActivityForResult(call,intent,"picked");
    }
    @ActivityCallback private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode()!=Activity.RESULT_OK || result.getData()==null || result.getData().getData()==null) {call.reject("فایل هەڵنەبژێردرا.");return;}
        Uri uri=result.getData().getData();
        MediaExtractor extractor=new MediaExtractor();
        try {
            extractor.setDataSource(getContext(),uri,null);
            double length=0;
            for (int i=0;i<extractor.getTrackCount();i++) {
                MediaFormat f=extractor.getTrackFormat(i);String mime=f.getString(MediaFormat.KEY_MIME);
                if(mime!=null&&mime.startsWith("audio/")&&f.containsKey(MediaFormat.KEY_DURATION)) {length=f.getLong(MediaFormat.KEY_DURATION)/1000000d;break;}
            }
            if (length<=0 || length>1801) throw new IllegalArgumentException("درێژی دەنگ دەبێت تا ٣٠ خولەک بێت و پێویستە کاتی دەنگ دیار بێت.");
            String name="video";
            try(Cursor cursor=getContext().getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)) {if(cursor!=null&&cursor.moveToFirst()&&!cursor.isNull(0))name=cursor.getString(0);}
            selected=uri;duration=length;
            JSObject response=new JSObject();response.put("name",name);response.put("duration",duration);call.resolve(response);
        } catch(Exception e) {call.reject("ڤیدیۆ نەخوێندرایەوە یان دەنگی پشتیوانیکراوی تا ٣٠ خولەکی نییە.",e);}
        finally {extractor.release();}
    }
    @PluginMethod public void chunk(PluginCall call) {
        Double start=call.getDouble("start"), end=call.getDouble("end");
        if(selected==null||start==null||end==null||(start.isNaN()||start.isInfinite())||(end.isNaN()||end.isInfinite())||start<0||end<=start||end>duration+0.01||end-start>120.01) {call.reject("بەشی دەنگ نادروستە.");return;}
        try {
            AudioChunks.Result chunk=AudioChunks.decode(getContext(),selected,start,end);
            File file=new File(getContext().getCacheDir(),"caption-audio.wav");
            try(FileOutputStream output=new FileOutputStream(file)) {output.write(chunk.wav);}
            JSObject response=new JSObject();response.put("path",file.getAbsolutePath());response.put("silent",chunk.silent);call.resolve(response);
        }catch(Exception e){call.reject("دەنگی ئەم بەشە نەخوێندرایەوە؛ فۆرماتی ڤیدیۆ یان دەنگ پشتیوانی ناکرێت.",e);}
    }
}
