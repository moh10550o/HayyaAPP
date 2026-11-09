package com.hayya.masjidtv;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentUris;
import android.content.DialogInterface;
import android.database.Cursor;
import android.graphics.Rect;
import android.provider.Settings;
import android.view.ViewTreeObserver;
import android.view.WindowInsets;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Android TV shell for the Hayya mosque display.
 * The web app is bundled in assets/www and served from https://appassets.androidplatform.net
 * so that localStorage / IndexedDB / fetch behave like a normal website (works fully offline).
 */
public class MainActivity extends Activity {
    static final String ASSET_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    static final int REQ_FILE = 11, REQ_LOC = 12, REQ_MEDIA = 13, REQ_MIC = 14;
    String[] pendingAccept;        // file request waiting for the media permission
    boolean pendingMultiple;
    int lastKb = -1;

    WebView web;
    SharedPreferences prefs;
    ValueCallback<Uri[]> fileCb;
    final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("hayya", MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        applyKeepOn();
        createWebView();
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQ_LOC);
        }
    }

    /* the screen stays lit while the app runs (can be switched off in the settings) */
    void applyKeepOn() {
        if (prefs.getBoolean("keepOn", true)) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    PermissionRequest pendingWebPerm;

    void createWebView() {
        web = new WebView(this);
        setContentView(web);
        hideSystemUi();
        watchKeyboard();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);   // adhan audio plays without a key press
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setBackgroundColor(0xFF000000);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.addJavascriptInterface(new Bridge(), "HayyaNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return serveAsset(r.getUrl());
            }

            /* the display never navigates away from its own pages (links open nothing) */
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl(); String start = prefs.getString("startUrl", "");
                if (u != null && "appassets.androidplatform.net".equals(u.getHost())) return false;
                if (!start.isEmpty() && u != null && u.getHost() != null && u.getHost().equals(Uri.parse(start).getHost())) return false;
                return true;
            }

            @Override
            public boolean onRenderProcessGone(final WebView v, RenderProcessGoneDetail d) {
                // never leave a mosque screen blank: rebuild the WebView
                ui.post(new Runnable() { public void run() { ((android.view.ViewGroup) v.getParent()).removeView(v); v.destroy(); createWebView(); } });
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                cb.invoke(origin, true, true);
            }

            /* microphone for detecting the end of the prayer: only for our own page */
            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                ui.post(new Runnable() { public void run() {
                    boolean ours = req.getOrigin() != null && "appassets.androidplatform.net".equals(req.getOrigin().getHost());
                    boolean audio = false;
                    for (String r : req.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) audio = true;
                    if (!ours || !audio) { req.deny(); return; }
                    if (Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        req.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else { pendingWebPerm = req; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC); }
                } });
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                boolean multi = p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;
                Intent i = p.createIntent();
                if (multi) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                // many TV boxes have no file manager: fall back to a built-in list of the device's pictures / sounds
                if (i.resolveActivity(getPackageManager()) == null) { pickFromMedia(p.getAcceptTypes(), multi); return true; }
                try {
                    startActivityForResult(Intent.createChooser(i, "اختيار ملف"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    pickFromMedia(p.getAcceptTypes(), multi);
                }
                return true;
            }
        });
        String start = prefs.getString("startUrl", "");
        web.loadUrl(start.isEmpty() ? ASSET_URL : start);
    }

    /* Serves the bundled app from https://appassets.androidplatform.net/assets/… (no AndroidX needed):
       a real https origin keeps localStorage / IndexedDB / fetch working like a normal website. */
    static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "application/javascript"); MIME.put("css", "text/css");
        MIME.put("json", "application/json"); MIME.put("svg", "image/svg+xml"); MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg"); MIME.put("webp", "image/webp"); MIME.put("woff2", "font/woff2"); MIME.put("mp3", "audio/mpeg");
    }

    WebResourceResponse serveAsset(Uri u) {
        if (u == null || !"appassets.androidplatform.net".equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || !path.startsWith("/assets/")) return null;
        String rel = path.substring("/assets/".length());
        if (rel.contains("..")) return null;
        try {
            InputStream in = getAssets().open(rel);
            String ext = rel.substring(rel.lastIndexOf('.') + 1).toLowerCase();
            String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
            return new WebResourceResponse(mime, mime.startsWith("text") || mime.endsWith("javascript") || mime.endsWith("json") ? "utf-8" : null, in);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
        }
    }

    /* reports the on-screen keyboard height (CSS px) so the page keeps the typed field above it */
    void watchKeyboard() {
        final View root = getWindow().getDecorView();
        root.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
            public void onGlobalLayout() {
                int kb = 0;
                if (Build.VERSION.SDK_INT >= 30) {
                    WindowInsets in = root.getRootWindowInsets();
                    if (in != null && in.isVisible(WindowInsets.Type.ime())) kb = in.getInsets(WindowInsets.Type.ime()).bottom;
                } else {
                    Rect r = new Rect(); root.getWindowVisibleDisplayFrame(r);
                    int h = root.getHeight(), gap = h - r.bottom;
                    kb = gap > h * 0.15 ? gap : 0;
                }
                if (kb == lastKb || web == null) return;
                lastKb = kb;
                float css = kb / getResources().getDisplayMetrics().density;
                web.evaluateJavascript("window.hayyaKeyboard&&window.hayyaKeyboard(" + Math.round(css) + ")", null);
            }
        });
    }

    /* ---------- permissions ---------- */
    String[] mediaPerms() {
        if (Build.VERSION.SDK_INT >= 33) return new String[]{"android.permission.READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_AUDIO"};
        return new String[]{Manifest.permission.READ_EXTERNAL_STORAGE};
    }

    boolean granted(String[] perms) {
        if (Build.VERSION.SDK_INT < 23) return true;
        for (String x : perms) if (checkSelfPermission(x) != PackageManager.PERMISSION_GRANTED) return false;
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req == REQ_MEDIA && pendingAccept != null) {
            String[] acc = pendingAccept; pendingAccept = null;
            if (granted(mediaPerms())) pickFromMedia(acc, pendingMultiple);
            else { if (fileCb != null) { fileCb.onReceiveValue(null); fileCb = null; } toast("يلزم السماح بالوصول للصور والأصوات لاختيار الملفات"); }
        }
        if (req == REQ_MIC && pendingWebPerm != null) {
            PermissionRequest w = pendingWebPerm; pendingWebPerm = null;
            if (granted(new String[]{Manifest.permission.RECORD_AUDIO})) w.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE}); else w.deny();
        }
        if (web != null) web.evaluateJavascript("window.hayyaPermsChanged&&window.hayyaPermsChanged()", null);
    }

    /* built-in picker: lists the device's pictures or sounds (MediaStore) */
    void pickFromMedia(String[] accept, final boolean multi) {
        String a = accept != null && accept.length > 0 && accept[0] != null ? accept[0] : "";
        if (Build.VERSION.SDK_INT >= 23 && !granted(mediaPerms())) {
            pendingAccept = accept; pendingMultiple = multi;
            requestPermissions(mediaPerms(), REQ_MEDIA);
            return;
        }
        Uri base;
        if (a.startsWith("audio")) base = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        else if (a.startsWith("image")) base = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        else base = MediaStore.Files.getContentUri("external");
        final ArrayList<Uri> uris = new ArrayList<>();
        ArrayList<String> names = new ArrayList<>();
        String where = null;
        if (!a.startsWith("audio") && !a.startsWith("image")) {
            where = MediaStore.MediaColumns.DISPLAY_NAME + " LIKE '%.json' OR " + MediaStore.MediaColumns.DISPLAY_NAME + " LIKE '%.csv'";
        }
        Cursor c = null;
        try {
            c = getContentResolver().query(base, new String[]{MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME},
                    where, null, MediaStore.MediaColumns.DATE_ADDED + " DESC");
            while (c != null && c.moveToNext() && uris.size() < 500) {
                uris.add(ContentUris.withAppendedId(base, c.getLong(0)));
                names.add(c.getString(1));
            }
        } catch (Exception e) {
            toast("تعذّر قراءة ملفات الجهاز: " + e.getMessage());
        } finally { if (c != null) c.close(); }
        if (uris.isEmpty()) {
            toast("لا توجد ملفات مناسبة على الجهاز — انسخها إلى الجهاز أو فلاشة USB ثم حاول مرة أخرى");
            if (fileCb != null) { fileCb.onReceiveValue(null); fileCb = null; }
            return;
        }
        final String[] items = names.toArray(new String[0]);
        final boolean[] checked = new boolean[items.length];
        AlertDialog.Builder b = new AlertDialog.Builder(this).setTitle(a.startsWith("audio") ? "اختر ملف صوت" : a.startsWith("image") ? "اختر الصور" : "اختر الملف");
        DialogInterface.OnCancelListener cancel = new DialogInterface.OnCancelListener() {
            public void onCancel(DialogInterface d) { if (fileCb != null) { fileCb.onReceiveValue(null); fileCb = null; } }
        };
        if (multi) {
            b.setMultiChoiceItems(items, checked, new DialogInterface.OnMultiChoiceClickListener() {
                public void onClick(DialogInterface d, int w, boolean on) { checked[w] = on; }
            }).setPositiveButton("إضافة", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface d, int w) {
                    ArrayList<Uri> out = new ArrayList<>();
                    for (int i = 0; i < checked.length; i++) if (checked[i]) out.add(uris.get(i));
                    if (fileCb != null) { fileCb.onReceiveValue(out.isEmpty() ? null : out.toArray(new Uri[0])); fileCb = null; }
                }
            }).setNegativeButton("إلغاء", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface d, int w) { d.cancel(); }
            });
        } else {
            b.setItems(items, new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface d, int w) {
                    if (fileCb != null) { fileCb.onReceiveValue(new Uri[]{uris.get(w)}); fileCb = null; }
                }
            });
        }
        b.setOnCancelListener(cancel).show();
    }

    void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override
    public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideSystemUi(); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] out = null;
        if (res == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                out = new Uri[n];
                for (int i = 0; i < n; i++) out[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) out = new Uri[]{data.getData()};
        }
        fileCb.onReceiveValue(out);
        fileCb = null;
    }

    /* Back closes the settings panel; on the main screen it is ignored so the display keeps running.
       Menu key toggles settings. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        if (k == KeyEvent.KEYCODE_BACK || k == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP) web.evaluateJavascript("window.hayyaBack&&window.hayyaBack()", null);
            return true;
        }
        if (k == KeyEvent.KEYCODE_MENU || k == KeyEvent.KEYCODE_SETTINGS || k == KeyEvent.KEYCODE_INFO) {
            if (e.getAction() == KeyEvent.ACTION_UP) web.evaluateJavascript("window.hayyaMenu&&window.hayyaMenu()", null);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); web.evaluateJavascript("window.hayyaPermsChanged&&window.hayyaPermsChanged()", null); } }
    @Override protected void onPause() { if (web != null) web.onPause(); super.onPause(); }

    void toast(final String m) { ui.post(new Runnable() { public void run() { Toast.makeText(MainActivity.this, m, Toast.LENGTH_LONG).show(); } }); }

    /* ---------------- JavaScript bridge: window.HayyaNative ---------------- */
    class Bridge {
        @JavascriptInterface
        public String getVersion() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface
        public void restart() {
            ui.post(new Runnable() { public void run() {
                Intent i = new Intent(MainActivity.this, MainActivity.class);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(i);
                Runtime.getRuntime().exit(0);
            } });
        }

        @JavascriptInterface
        public void setStartUrl(final String url) {
            prefs.edit().putString("startUrl", url == null ? "" : url.trim()).apply();
            ui.post(new Runnable() { public void run() { web.loadUrl(url == null || url.trim().isEmpty() ? ASSET_URL : url.trim()); } });
        }

        /** Opens TeamViewer / AnyDesk if installed, otherwise its store page. */
        @JavascriptInterface
        public void openApp(final String pkg) {
            ui.post(new Runnable() { public void run() {
                Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
                if (i == null) i = getPackageManager().getLeanbackLaunchIntentForPackage(pkg);
                try {
                    if (i != null) startActivity(i);
                    else startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg)));
                } catch (ActivityNotFoundException e) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)));
                }
            } });
        }

        /** Saves a backup (data: URL) to the Downloads folder. */
        @JavascriptInterface
        public void saveFile(String name, String dataUrl) {
            try {
                byte[] bytes = Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT);
                OutputStream os;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    os = getContentResolver().openOutputStream(u);
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    os = new FileOutputStream(new File(dir, name));
                }
                os.write(bytes);
                os.close();
                toast("تم حفظ النسخة الاحتياطية في مجلد التنزيلات: " + name);
            } catch (Exception e) {
                toast("تعذّر الحفظ: " + e.getMessage());
            }
        }

        /** Hook for a USB temperature sensor. Return a number in °C, or "" when none is attached.
         *  Implement your sensor's protocol here (e.g. USB HID thermometers via UsbManager). */
        @JavascriptInterface
        public String getTemperature() { return ""; }

        /** {"location":true,"media":false,"mic":false,"overlay":true,"autostart":true,"keepOn":true} */
        @JavascriptInterface
        public String getPermissions() {
            boolean loc = granted(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION});
            boolean mic = granted(new String[]{Manifest.permission.RECORD_AUDIO});
            boolean ov = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(MainActivity.this);
            return "{\"location\":" + loc + ",\"media\":" + granted(mediaPerms()) + ",\"mic\":" + mic + ",\"overlay\":" + ov
                + ",\"autostart\":" + prefs.getBoolean("autostart", true) + ",\"keepOn\":" + prefs.getBoolean("keepOn", true) + "}";
        }

        /** activation code stamped into this APK copy (APK signing block, id 0x48594131 "HYA1"); "" when none */
        @JavascriptInterface
        public String getEmbeddedCode() { return ApkStamp.read(MainActivity.this); }

        /** stable id of this device (survives re-installs) — used so a device gets the free plan only once */
        @JavascriptInterface
        public String getDeviceId() {
            try { String a = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID); return a == null ? "" : a; } catch (Exception e) { return ""; }
        }

        /** start the display when the device powers on */
        @JavascriptInterface
        public void setAutoStart(boolean on) { prefs.edit().putBoolean("autostart", on).apply(); }

        /** keep the screen lit while the app is running */
        @JavascriptInterface
        public void setKeepOn(final boolean on) {
            prefs.edit().putBoolean("keepOn", on).apply();
            ui.post(new Runnable() { public void run() { applyKeepOn(); } });
        }

        /** calls a local controller (relay for the mosque microphone / amplifier): GET only, http(s) on the local network or internet */
        @JavascriptInterface
        public void httpGet(final String url) {
            if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) return;
            new Thread(new Runnable() { public void run() {
                try {
                    java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                    c.setConnectTimeout(4000); c.setReadTimeout(4000); c.getResponseCode(); c.disconnect();
                } catch (Exception ignored) { }
            } }).start();
        }

        @JavascriptInterface
        public void requestPermission(final String kind) {
            ui.post(new Runnable() { public void run() {
                if (Build.VERSION.SDK_INT < 23) return;
                if ("all".equals(kind)) {
                    // every missing runtime permission in one go (Android shows them one after the other)
                    java.util.ArrayList<String> L = new java.util.ArrayList<String>();
                    String[] all = new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.RECORD_AUDIO};
                    for (String x : all) if (checkSelfPermission(x) != PackageManager.PERMISSION_GRANTED) L.add(x);
                    for (String x : mediaPerms()) if (checkSelfPermission(x) != PackageManager.PERMISSION_GRANTED) L.add(x);
                    if (!L.isEmpty()) requestPermissions(L.toArray(new String[0]), REQ_LOC + 900);
                }
                else if ("location".equals(kind)) requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQ_LOC);
                else if ("media".equals(kind)) requestPermissions(mediaPerms(), REQ_MEDIA + 100);
                else if ("mic".equals(kind)) requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC + 100);
                else if ("overlay".equals(kind) && Build.VERSION.SDK_INT >= 23) {
                    // Android 10+: starting by itself after power-on needs "display over other apps"
                    try { startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()))); }
                    catch (Exception e) { try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception e2) { toast("تعذّر فتح الإعدادات"); } }
                }
            } });
        }

        /** Opens a system settings screen: datetime, location, app */
        @JavascriptInterface
        public void openSystem(final String what) {
            ui.post(new Runnable() { public void run() {
                Intent i;
                if ("datetime".equals(what)) i = new Intent(Settings.ACTION_DATE_SETTINGS);
                else if ("location".equals(what)) i = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                else i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                try { startActivity(i); }
                catch (Exception e) {
                    try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch (Exception e2) { toast("تعذّر فتح إعدادات الجهاز"); }
                }
            } });
        }

        @JavascriptInterface
        public void checkUpdate() {
            if (!BuildConfig.SELF_UPDATE) { openApp(getPackageName()); return; }   // Play build: updates come from Google Play
            new Thread(new Runnable() { public void run() {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(BuildConfig.UPDATE_URL).openConnection();
                    c.setConnectTimeout(15000);
                    BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()));
                    StringBuilder sb = new StringBuilder(); String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                    JSONObject j = new JSONObject(sb.toString());
                    if (j.getInt("versionCode") <= BuildConfig.VERSION_CODE) { toast("لديك آخر إصدار"); return; }
                    downloadAndInstall(j.getString("apkUrl"));
                } catch (Exception e) {
                    toast("تعذّر التحقق من التحديث: " + e.getMessage());
                }
            } }).start();
        }
    }

    void downloadAndInstall(String apkUrl) {
        File dir = new File(getExternalFilesDir(null), "updates");
        dir.mkdirs();
        File apk = new File(dir, "update.apk");
        if (apk.exists()) apk.delete();
        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request rq = new DownloadManager.Request(Uri.parse(apkUrl))
                .setTitle("تحديث حَيَّ").setDestinationUri(Uri.fromFile(apk));
        final long id = dm.enqueue(rq);
        toast("جارٍ تنزيل التحديث…");
        BroadcastReceiver done = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent in) {
                if (in.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != id) return;
                unregisterReceiver(this);
                Uri u = UpdateProvider.uriFor(MainActivity.this, apk);
                Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            }
        };
        IntentFilter f = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(done, f, Context.RECEIVER_EXPORTED);
        else registerReceiver(done, f);
    }
}
