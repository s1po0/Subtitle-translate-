package com.rizhnus.subtitle;

import android.content.Context;
import android.media.AudioFormat;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.net.Uri;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/** Bounded memory extraction: seek and decode one 120-second mono PCM WAV at a time. */
final class AudioChunks {
    static final class Result { final byte[] wav; final boolean silent; Result(byte[] wav, boolean silent){this.wav=wav;this.silent=silent;} }
    static Result decode(Context context, Uri uri, double start, double end) throws Exception {
        final int targetRate=16000, targetFrames=(int)Math.ceil((end-start)*targetRate);
        byte[] wav=new byte[44+targetFrames*2]; ByteBuffer out=ByteBuffer.wrap(wav).order(ByteOrder.LITTLE_ENDIAN);
        out.put(new byte[]{'R','I','F','F'}).putInt(wav.length-8).put(new byte[]{'W','A','V','E','f','m','t',' '}).putInt(16).putShort((short)1).putShort((short)1).putInt(targetRate).putInt(targetRate*2).putShort((short)2).putShort((short)16).put(new byte[]{'d','a','t','a'}).putInt(targetFrames*2);
        MediaExtractor ex=new MediaExtractor();MediaCodec codec=null;boolean started=false;
        try {
            ex.setDataSource(context,uri,null);MediaFormat format=null;
            for(int i=0;i<ex.getTrackCount();i++){MediaFormat f=ex.getTrackFormat(i);String m=f.getString(MediaFormat.KEY_MIME);if(m!=null&&m.startsWith("audio/")){format=f;ex.selectTrack(i);break;}}
            if(format==null)throw new IllegalArgumentException("No audio track");
            String mime=format.getString(MediaFormat.KEY_MIME);codec=MediaCodec.createDecoderByType(mime);codec.configure(format,null,null,0);codec.start();started=true;
            ex.seekTo((long)(start*1000000),MediaExtractor.SEEK_TO_PREVIOUS_SYNC);
            MediaCodec.BufferInfo info=new MediaCodec.BufferInfo();boolean inputDone=false,outputDone=false;int rate=format.getInteger(MediaFormat.KEY_SAMPLE_RATE),channels=format.getInteger(MediaFormat.KEY_CHANNEL_COUNT),encoding=AudioFormat.ENCODING_PCM_16BIT;long lastProgress=System.currentTimeMillis();boolean nonzero=false;int copied=0;
            while(!outputDone){
                if(System.currentTimeMillis()-lastProgress>30000)throw new IllegalStateException("Decoder stalled");
                if(!inputDone){int index=codec.dequeueInputBuffer(10000);if(index>=0){ByteBuffer b=codec.getInputBuffer(index);if(b==null)throw new IllegalStateException("Missing input buffer");b.clear();int size=ex.readSampleData(b,0);long pts=ex.getSampleTime();if(size<0||pts>=(long)((end+1)*1000000)){codec.queueInputBuffer(index,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);inputDone=true;}else{codec.queueInputBuffer(index,0,size,pts,0);ex.advance();}lastProgress=System.currentTimeMillis();}}
                int index=codec.dequeueOutputBuffer(info,10000);
                if(index==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){MediaFormat f=codec.getOutputFormat();rate=f.getInteger(MediaFormat.KEY_SAMPLE_RATE);channels=f.getInteger(MediaFormat.KEY_CHANNEL_COUNT);encoding=f.containsKey(MediaFormat.KEY_PCM_ENCODING)?f.getInteger(MediaFormat.KEY_PCM_ENCODING):AudioFormat.ENCODING_PCM_16BIT;if(encoding!=AudioFormat.ENCODING_PCM_16BIT||channels<1||channels>8||rate<8000||rate>192000)throw new IllegalStateException("Unsupported decoder PCM format");lastProgress=System.currentTimeMillis();}
                else if(index>=0){ByteBuffer b=codec.getOutputBuffer(index);if(b==null)throw new IllegalStateException("Missing output buffer");b.order(ByteOrder.LITTLE_ENDIAN);int frames=info.size/(2*channels);double base=info.presentationTimeUs/1000000d;
                    // Each output sample is located by its presentation timestamp, avoiding gaps or drift at chunk boundaries.
                    int first=Math.max(0,(int)Math.ceil((base-start)*targetRate-0.00001));int last=Math.min(targetFrames,(int)Math.ceil((base+(double)frames/rate-start)*targetRate-0.00001));
                    for(int j=first;j<last;j++){int source=(int)Math.floor((start+(double)j/targetRate-base)*rate+0.00001);if(source<0||source>=frames)continue;int sum=0;for(int ch=0;ch<channels;ch++)sum+=b.getShort(info.offset+(source*channels+ch)*2);short sample=(short)(sum/channels);out.putShort(44+j*2,sample);if(Math.abs((int)sample)>2)nonzero=true;copied++;}
                    outputDone=(info.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;codec.releaseOutputBuffer(index,false);lastProgress=System.currentTimeMillis();
                }
            }
            if(copied==0)throw new IllegalStateException("No decoded samples");
            return new Result(wav,!nonzero);
        }finally{if(codec!=null){if(started)codec.stop();codec.release();}ex.release();}
    }
}
