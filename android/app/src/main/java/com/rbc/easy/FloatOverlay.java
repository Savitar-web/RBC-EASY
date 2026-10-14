package com.rbc.easy;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Ventana flotante de sistema para la calculadora en Android. */
public class FloatOverlay {
  public static boolean canDraw(android.content.Context ctx) {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);
  }

  public static void askPermission(android.app.Activity activity) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + activity.getPackageName()));
      activity.startActivity(intent);
    }
  }

  public static void show(android.content.Context ctx, String url) {
    WindowManager wm = (WindowManager) ctx.getSystemService(android.content.Context.WINDOW_SERVICE);
    WebView view = new WebView(ctx);
    view.getSettings().setJavaScriptEnabled(true);
    view.setWebViewClient(new WebViewClient());
    view.loadUrl(url);
    int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      : WindowManager.LayoutParams.TYPE_PHONE;
    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
      900, 1400, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      android.graphics.PixelFormat.TRANSLUCENT
    );
    params.gravity = Gravity.TOP | Gravity.END;
    wm.addView(view, params);
  }
}
