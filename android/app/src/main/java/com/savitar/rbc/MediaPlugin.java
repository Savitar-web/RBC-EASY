package com.savitar.rbc;
import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name="RbcMedia",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class MediaPlugin extends Plugin {
 private static final java.util.concurrent.ExecutorService IO=java.util.concurrent.Executors.newSingleThreadExecutor();
 private static WeakReference<MediaPlugin> current=new WeakReference<>(null);
 @Override public void load(){current=new WeakReference<>(this);}
 static void state(boolean playing){MediaPlugin plugin=current.get();if(plugin!=null){JSObject data=new JSObject();data.put("playing",playing);plugin.notifyListeners("state",data);}}
 File file(String id){if(id==null||!id.matches("[a-zA-Z0-9-]{1,100}"))throw new IllegalArgumentException("Identificador de audio no válido");File dir=new File(getContext().getFilesDir(),"rbc-audio");dir.mkdirs();return new File(dir,id+".bin");}
 @PluginMethod public void store(PluginCall call){try{File target=file(call.getString("id"));byte[] bytes=Base64.decode(call.getString("chunk",""),Base64.DEFAULT);if(bytes.length>65536)throw new IOException("Fragmento demasiado grande");try(FileOutputStream output=new FileOutputStream(target,!call.getBoolean("first",false))){output.write(bytes);}call.resolve();}catch(Exception error){call.reject("No se pudo guardar el audio",error);}}
 @PluginMethod public void play(PluginCall call){if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"notificationsResult");return;}start(call);}
 @PermissionCallback private void notificationsResult(PluginCall call){start(call);}
 private void start(PluginCall call){try{File source=file(call.getString("id"));if(!source.isFile())throw new IOException("Audio no encontrado");Intent intent=new Intent(getContext(),PlaybackService.class).setAction("PLAY").putExtra("path",source.getAbsolutePath()).putExtra("id",call.getString("id")).putExtra("title",call.getString("title","Ambiente RBC EASY")).putExtra("ducked",call.getBoolean("ducked",false)).putExtra("volume",(float)Math.max(0,Math.min(.4,call.getDouble("volume",.18))));getContext().startForegroundService(intent);call.resolve();}catch(Exception error){call.reject("No se pudo iniciar el audio",error);}}
 @PluginMethod public void pause(PluginCall call){getBridge().executeOnMainThread(()->{if(PlaybackService.instance!=null)PlaybackService.instance.pausePlayback();call.resolve();});}
 @PluginMethod public void volume(PluginCall call){getBridge().executeOnMainThread(()->{PlaybackService player=PlaybackService.instance;if(player!=null)player.setAudioVolume((float)Math.max(0,Math.min(.4,call.getDouble("volume",.18))),call.getBoolean("ducked",false));call.resolve();});}
 @PluginMethod public void status(PluginCall call){JSObject result=new JSObject();PlaybackService player=PlaybackService.instance;result.put("playing",player!=null&&player.isPlaying());call.resolve(result);}
 @PluginMethod public void save(PluginCall call){try{if(!file(call.getString("id")).exists())throw new IOException("Audio no encontrado");Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("audio/mpeg").putExtra(Intent.EXTRA_TITLE,call.getString("name","Biblia.mp3"));startActivityForResult(call,intent,"audioSaved");}catch(Exception error){call.reject("No se pudo abrir Mis archivos",error);}}
 @ActivityCallback private void audioSaved(PluginCall call,ActivityResult result){if(call==null)return;if(result.getResultCode()!=android.app.Activity.RESULT_OK||result.getData()==null){call.reject("Guardado cancelado");return;}IO.execute(()->{try(InputStream input=new FileInputStream(file(call.getString("id")));OutputStream output=getContext().getContentResolver().openOutputStream(result.getData().getData())){if(output==null)throw new IOException("No se pudo abrir el destino");byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1)output.write(buffer,0,n);call.resolve();}catch(Exception error){call.reject("No se pudo guardar el MP3",error);}});}
}
