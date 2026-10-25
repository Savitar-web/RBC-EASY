export type FlightInput={speed:number;angle:number;height:number;mass:number;diameter:number;cd:number;rho:number;wind:number;gravity:number};
export type Point={x:number;y:number;t:number;v:number};
export function flight(p:FlightInput):Point[]{
 const a=p.angle*Math.PI/180,k=.5*p.rho*p.cd*Math.PI*(p.diameter/2)**2/p.mass,dt=.005;
 let s=[0,p.height,p.speed*Math.cos(a),p.speed*Math.sin(a)],t=0;
 const result:Point[]=[{x:0,y:p.height,t:0,v:p.speed}];
 const f=(q:number[])=>{const rel=q[2]-p.wind,v=Math.hypot(rel,q[3]);return[q[2],q[3],-k*v*rel,-p.gravity-k*v*q[3]];};
 for(let i=0;i<24000;i++){
  const before=s,ta=t,k1=f(s),k2=f(s.map((n,j)=>n+dt*k1[j]/2)),k3=f(s.map((n,j)=>n+dt*k2[j]/2)),k4=f(s.map((n,j)=>n+dt*k3[j]));
  s=s.map((n,j)=>n+dt*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);t+=dt;
  if(!s.every(Number.isFinite))break;
  if(s[1]<0){const r=before[1]/(before[1]-s[1]);result.push({x:before[0]+r*(s[0]-before[0]),y:0,t:ta+r*dt,v:Math.hypot(before[2]+r*(s[2]-before[2]),before[3]+r*(s[3]-before[3]))});break;}
  if(i%4===0)result.push({x:s[0],y:s[1],t,v:Math.hypot(s[2],s[3])});
 }
 return result;
}
export function crossing(points:Point[],x:number):Point|null{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(a.x<=x&&b.x>=x&&b.x!==a.x){const r=(x-a.x)/(b.x-a.x);return{x,y:a.y+r*(b.y-a.y),t:a.t+r*(b.t-a.t),v:a.v+r*(b.v-a.v)};}}return null;}
