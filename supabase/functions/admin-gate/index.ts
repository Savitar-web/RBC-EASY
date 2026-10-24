// The service-role key is supplied by Supabase to this server function, never to the browser.
const base=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{headers:cors});if(request.method!=='POST')return reply(405,{error:'Método no permitido'});
 try{
 const token=request.headers.get('authorization')||'';let user:{id:string;email?:string}|null=null;
 if(token.startsWith('Bearer ')){const response=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:token},signal:AbortSignal.timeout(8000)});if(response.ok)user=await response.json();}
 let admin=false;if(user){const response=await fetch(base+'/rest/v1/rpc/rbc_is_admin',{method:'POST',headers:{apikey:anon,Authorization:token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(8000)});admin=response.ok&&(await response.json())===true;}
 if(admin)return reply(200,{allowed:true});
 let username:string|null=null;if(user){const response=await fetch(base+'/rest/v1/profiles?select=username&id=eq.'+encodeURIComponent(user.id),{headers:{apikey:service,Authorization:'Bearer '+service},signal:AbortSignal.timeout(8000)});if(response.ok)username=(await response.json())[0]?.username||null;}
 // Only platform-provided network metadata is used. No external location lookup.
 const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'').trim();
 const data={p_user:user?.id||null,p_username:username,p_email:user?.email||null,p_ip:ip&&/^[0-9a-fA-F:.]+$/.test(ip)?ip:null,p_country:request.headers.get('cf-ipcountry')||null,p_region:request.headers.get('cf-region')||null,p_city:request.headers.get('cf-ipcity')||null,p_device:request.headers.get('user-agent')||null};
 const stored=await fetch(base+'/rest/v1/rpc/rbc_record_admin_denial',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});
 if(!stored.ok){console.error('Admin audit unavailable',stored.status);return reply(503,{allowed:false,error:'Acceso restringido'});}
 const permitted=await stored.json();return reply(permitted?403:429,{allowed:false,error:'Acceso restringido'});
 }catch{console.error('Admin gate unavailable');return reply(503,{allowed:false,error:'Acceso restringido'});}
});
