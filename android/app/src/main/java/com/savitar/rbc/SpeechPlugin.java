package com.savitar.rbc;

import android.content.Intent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.os.Bundle;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;

@CapacitorPlugin(name="RbcSpeech")
public class SpeechPlugin extends Plugin {
 private TextToSpeech engine;
 private boolean ready=false,failed=false;
 private final List<PluginCall> waiting=new ArrayList<>();
 @Override public void load(){getBridge().executeOnMainThread(()->{
  engine=new TextToSpeech(getContext(),status->{ready=status==TextToSpeech.SUCCESS;failed=!ready;
   if(ready)engine.setOnUtteranceProgressListener(new UtteranceProgressListener(){
    public void onStart(String id){event(id,"start",0);}
    public void onDone(String id){event(id,"done",0);}
    public void onError(String id){event(id,"error",0);}
    @Override public void onRangeStart(String id,int start,int end,int frame){event(id,"range",start);}
   });
   for(PluginCall call:new ArrayList<>(waiting)){if(ready)list(call);else call.reject("No hay un motor TTS disponible. Instala uno desde Ajustes o utiliza las voces locales.");}waiting.clear();
  });
 });}
 private void event(String id,String state,int offset){JSObject data=new JSObject();data.put("id",id);data.put("state",state);data.put("offset",offset);notifyListeners("progress",data);}
 private void list(PluginCall call){JSArray result=new JSArray();Set<Voice> voices=engine.getVoices();if(voices!=null)for(Voice voice:voices){JSObject item=new JSObject();item.put("id",voice.getName());item.put("name",voice.getName());item.put("lang",voice.getLocale().toLanguageTag());item.put("local",!voice.isNetworkConnectionRequired());item.put("quality",voice.getQuality());result.put(item);}JSObject data=new JSObject();data.put("voices",result);call.resolve(data);}
 @PluginMethod public void voices(PluginCall call){getBridge().executeOnMainThread(()->{if(ready)list(call);else if(failed){waiting.add(call);failed=false;if(engine!=null)engine.shutdown();load();}else waiting.add(call);});}
 @PluginMethod public void speak(PluginCall call){getBridge().executeOnMainThread(()->{if(!ready){call.reject("El motor de voz aún no está disponible.");return;}String text=call.getString("text","");if(text.isEmpty()||text.length()>2000){call.reject("Fragmento de lectura no válido.");return;}String selected=call.getString("voice","");Set<Voice> voices=engine.getVoices();if(voices!=null)for(Voice voice:voices)if(voice.getName().equals(selected)){engine.setVoice(voice);break;}engine.setSpeechRate((float)Math.max(.5,Math.min(2,call.getDouble("rate",1.0))));Bundle params=new Bundle();int result=engine.speak(text,TextToSpeech.QUEUE_FLUSH,params,call.getString("id","rbc"));if(result==TextToSpeech.ERROR)call.reject("No se pudo iniciar esta voz. Comprueba que sus datos estén descargados.");else call.resolve();});}
 @PluginMethod public void stop(PluginCall call){getBridge().executeOnMainThread(()->{if(engine!=null)engine.stop();call.resolve();});}
 @PluginMethod public void settings(PluginCall call){getBridge().executeOnMainThread(()->{try{Intent intent=new Intent("com.android.settings.TTS_SETTINGS").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);getContext().startActivity(intent);call.resolve();}catch(Exception error){try{getContext().startActivity(new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));call.resolve();}catch(Exception e){call.reject("Abre Ajustes → Accesibilidad → Texto a voz.");}}});}
 @Override protected void handleOnDestroy(){if(engine!=null){engine.stop();engine.shutdown();}waiting.clear();super.handleOnDestroy();}
}
