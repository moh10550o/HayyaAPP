package com.hayya.masjidtv;

import android.content.Context;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Reads the activation code stamped into this APK copy.
 * The code lives in the APK Signing Block as an extra ID-value pair (ID 0x48594131, "HYA1").
 * That block is outside what APK Signature Scheme v2 signs, so a copy can be stamped per customer
 * without re-signing, and Android still installs it as the same, genuine app.
 */
final class ApkStamp {
    static final int ID = 0x48594131;
    private static String cached;

    static synchronized String read(Context ctx) {
        if (cached != null) return cached;
        cached = "";
        try (RandomAccessFile f = new RandomAccessFile(ctx.getApplicationInfo().sourceDir, "r")) {
            long len = f.length();
            // End of Central Directory: scan back over a possible ZIP comment (max 64 KB)
            int scan = (int) Math.min(len, 65557);
            byte[] tail = new byte[scan];
            f.seek(len - scan); f.readFully(tail);
            int eocd = -1;
            for (int i = scan - 22; i >= 0; i--) {
                if (tail[i] == 0x50 && tail[i + 1] == 0x4b && tail[i + 2] == 0x05 && tail[i + 3] == 0x06) { eocd = i; break; }
            }
            if (eocd < 0) return cached;
            long cdOffset = ByteBuffer.wrap(tail, eocd + 16, 4).order(ByteOrder.LITTLE_ENDIAN).getInt() & 0xffffffffL;
            if (cdOffset < 32) return cached;
            byte[] foot = new byte[24];
            f.seek(cdOffset - 24); f.readFully(foot);
            ByteBuffer fb = ByteBuffer.wrap(foot).order(ByteOrder.LITTLE_ENDIAN);
            long blockSize = fb.getLong(0);
            if (!new String(foot, 8, 16, "US-ASCII").equals("APK Sig Block 42")) return cached;
            long start = cdOffset - blockSize - 8;
            if (start < 0 || blockSize > 16 * 1024 * 1024) return cached;
            byte[] blk = new byte[(int) (blockSize - 24)];
            f.seek(start + 8); f.readFully(blk);
            ByteBuffer b = ByteBuffer.wrap(blk).order(ByteOrder.LITTLE_ENDIAN);
            while (b.remaining() >= 12) {
                long pairLen = b.getLong();
                if (pairLen < 4 || pairLen > b.remaining()) break;
                int id = b.getInt();
                int vlen = (int) (pairLen - 4);
                if (id == ID) { byte[] v = new byte[vlen]; b.get(v); cached = new String(v, "UTF-8").trim(); return cached; }
                b.position(b.position() + vlen);
            }
        } catch (Exception ignored) { }
        return cached;
    }
}
