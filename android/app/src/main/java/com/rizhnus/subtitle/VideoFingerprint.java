package com.rizhnus.subtitle;

import android.content.Context;
import android.net.Uri;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Locale;

/** Stream the whole file so progress is never resumed for a different video. */
final class VideoFingerprint {
    static String sha256(Context context, Uri uri) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream input=context.getContentResolver().openInputStream(uri)) {
            if(input==null)throw new IllegalStateException("Cannot read video");
            byte[] buffer=new byte[65536];int read;while((read=input.read(buffer))!=-1)digest.update(buffer,0,read);
        }
        StringBuilder output=new StringBuilder();for(byte b:digest.digest())output.append(String.format(Locale.ROOT,"%02x",b & 255));
        return output.toString();
    }
}
