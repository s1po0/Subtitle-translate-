package com.rizhnus.subtitle;

import static org.junit.Assert.*;
import android.content.Context;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AudioChunksTest {
    @Test public void decodesAudioOnBothSidesOfTwoMinuteBoundary() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        File fixture=new File(context.getCacheDir(),"fixture.m4a");
        try(InputStream input=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("fixture.m4a");FileOutputStream output=new FileOutputStream(fixture)){
            byte[] b=new byte[8192];int n;while((n=input.read(b))!=-1)output.write(b,0,n);
        }
        try {
            AudioChunks.Result before=AudioChunks.decode(context,Uri.fromFile(fixture),118,120);
            AudioChunks.Result after=AudioChunks.decode(context,Uri.fromFile(fixture),120,122);
            assertEquals(44+2*16000*2,before.wav.length);assertEquals(before.wav.length,after.wav.length);
            assertFalse(before.silent);assertFalse(after.silent);
            ByteBuffer header=ByteBuffer.wrap(after.wav).order(ByteOrder.LITTLE_ENDIAN);
            assertEquals(16000,header.getInt(24));assertEquals(64000,header.getInt(40));
        } finally {fixture.delete();}
    }
}
