package com.savitar.rbc;

import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;

@CapacitorPlugin(name = "RbcShortcuts")
public class ShortcutsPlugin extends Plugin {
    private static final java.util.List<String> ROUTES = Arrays.asList("/", "/proyectos", "/biblias", "/Writer", "/calcular", "/balistica", "/conversion", "/modo-ascendido", "/contacto");
    @PluginMethod public void pin(PluginCall call) {
        String route = call.getString("path", "/");
        String name = call.getString("name", "RBC EASY");
        if (!ROUTES.contains(route)) { call.reject("Pantalla no permitida"); return; }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { call.reject("Se requiere Android 8 o posterior para fijar accesos"); return; }
        ShortcutManager manager = getContext().getSystemService(ShortcutManager.class);
        if (manager == null || !manager.isRequestPinShortcutSupported()) { call.reject("El launcher no permite fijar accesos"); return; }
        Intent intent = new Intent(getContext(), MainActivity.class).setAction(Intent.ACTION_VIEW).putExtra("rbcRoute", route);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        ShortcutInfo shortcut = new ShortcutInfo.Builder(getContext(), "rbc:" + route)
            .setShortLabel(name).setLongLabel("RBC · " + name)
            .setIcon(Icon.createWithResource(getContext(), R.mipmap.ic_launcher)).setIntent(intent).build();
        JSObject result = new JSObject();
        result.put("requested", manager.requestPinShortcut(shortcut, null));
        call.resolve(result);
    }
    @PluginMethod public void launchRoute(PluginCall call) {
        String route = getActivity().getIntent().getStringExtra("rbcRoute");
        JSObject result = new JSObject();
        result.put("path", ROUTES.contains(route) ? route : "");
        getActivity().getIntent().removeExtra("rbcRoute");
        call.resolve(result);
    }
    @Override protected void handleOnNewIntent(Intent intent) {
        getActivity().setIntent(intent);
        String route = intent.getStringExtra("rbcRoute");
        if (ROUTES.contains(route)) {
            JSObject data = new JSObject(); data.put("path", route);
            notifyListeners("openRoute", data, true);
        }
    }
}
