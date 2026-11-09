package com.hayya.masjidtv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Starts the display automatically when the TV box powers on.
 *  On Android 10+ this needs the "display over other apps" permission (direct build),
 *  or set the app as the default launcher (Home) — both covered in the README. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent in) {
        // the user can switch this off in the settings ("start with the device")
        try { if (!ctx.getSharedPreferences("hayya", Context.MODE_PRIVATE).getBoolean("autostart", true)) return; } catch (Exception ignored) { }
        Intent i = new Intent(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { ctx.startActivity(i); } catch (Exception ignored) { }
    }
}
