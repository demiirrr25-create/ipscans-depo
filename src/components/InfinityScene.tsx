"use client";
import { useEffect, useRef } from 'react';

/** Projected 3D topology with bounded O(n) edges and no graphics runtime. */
export function InfinityScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    function initialize() {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const small = matchMedia('(max-width: 767px)');
    let width=1, height=1, frame=0, visible=true, phase=0, previous=0;
    let pointerX=0, pointerY=0, yaw=0, pitch=0, count=960, slowFrames=0, scrollProgress=0;
    const points=Array.from({length:1440},(_,i)=>{
      const t=i/1440*Math.PI*2, ring=i%12/12*Math.PI*2;
      return {x:Math.cos(t)*(1.32+.26*Math.cos(ring)),y:Math.sin(t*2)*.65+Math.sin(ring)*.19,z:Math.sin(t)*.65+Math.cos(ring)*.2};
    });
    const projected=points.map(()=>({x:0,y:0,z:0}));
    function draw(now:number) {
      if (!canvas || !ctx) return;
      if(previous && now-previous<(small.matches?60:32) && !motion.matches){frame=requestAnimationFrame(draw);return;}
      const elapsed=previous ? now-previous : 16; previous=now;
      if (!motion.matches) phase+=Math.min(elapsed,40)*.00014;
      if (elapsed>(small.matches?90:60) && ++slowFrames>24) {count=Math.max(240,count-120);slowFrames=0;}
      yaw+=((motion.matches?0:pointerX*.24)-yaw)*.04;
      pitch+=((motion.matches?0:pointerY*.18)-pitch)*.04;
      ctx.clearRect(0,0,width,height);
      const rotation=phase*.3+yaw+scrollProgress*.45, scale=Math.min(width/3.65,height/2.65)*(1-scrollProgress*.08);
      // Divisor of 1440 keeps every projected edge endpoint valid at all quality levels.
      const stride=count>=960?1:count>=480?2:count>=360?4:6;
      canvas.dataset.density=String(points.length/stride);
      for(let i=0;i<points.length;i+=stride){
        const p=points[i], x=p.x*Math.cos(rotation)+p.z*Math.sin(rotation), z=p.z*Math.cos(rotation)-p.x*Math.sin(rotation);
        const y=p.y*Math.cos(pitch+.24)-z*Math.sin(pitch+.24), perspective=3.5/(3.5+z);
        projected[i].x=width*.5+x*scale*perspective;projected[i].y=height*.5+y*scale*perspective;projected[i].z=z;
      }
      ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.65;ctx.beginPath();
      for(let i=0;i<points.length;i+=stride){
        const a=projected[i],b=projected[(i+12*stride)%points.length];
        ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        if(i%(stride*6)===0){const c=projected[(i+36*stride)%points.length];ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);}
      }
      ctx.stroke();
      for(let i=0;i<points.length;i+=stride){
        const a=projected[i];
        const pulse=(Math.sin(i*.15-phase*12)+1)/2;
        ctx.fillStyle=`rgba(255,255,255,${.22+pulse*.64})`;ctx.beginPath();ctx.arc(a.x,a.y,Math.max(.45,(1.3-a.z*.4)*pulse),0,Math.PI*2);ctx.fill();
      }
      for(let j=0;j<16;j++){
        const index=Math.floor(j*83/stride)*stride,a=projected[index],b=projected[(index+12*stride)%points.length],p=(phase*1.4+j/16)%1;
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p,1.7,0,Math.PI*2);ctx.fill();
      }
      canvas.dataset.ready='true';
      if(visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(draw);
    }
    function start(){cancelAnimationFrame(frame);previous=0;if(visible&&!document.hidden)draw(performance.now());}
    function resize(){
      if(!canvas||!ctx)return;
      const r=canvas.getBoundingClientRect();width=r.width;height=r.height;
      const ratio=Math.min(devicePixelRatio||1,small.matches?1:1.5);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
      count=small.matches||navigator.hardwareConcurrency<=4?360:1440;start();
    }
    const host=canvas.closest('section');
    function scroll(){if(host&&!motion.matches)scrollProgress=Math.max(0,Math.min(1,-host.getBoundingClientRect().top/host.clientHeight));}
    function pointer(event:PointerEvent){if(!host||motion.matches||event.pointerType==='touch')return;const r=host.getBoundingClientRect();pointerX=(event.clientX-r.left)/r.width-.5;pointerY=(event.clientY-r.top)/r.height-.5;}
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();});observer.observe(canvas);
    const size=new ResizeObserver(resize);size.observe(canvas);
    host?.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('visibilitychange',start);motion.addEventListener('change',start);resize();
    window.addEventListener('scroll',scroll,{passive:true});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();size.disconnect();host?.removeEventListener('pointermove',pointer);document.removeEventListener('visibilitychange',start);motion.removeEventListener('change',start);window.removeEventListener('scroll',scroll);};
    }
    // Paint the server-rendered scene and text before starting decorative work.
    let cleanup: (()=>void)|undefined;
    let secondFrame=0;
    const firstFrame=requestAnimationFrame(()=>{secondFrame=requestAnimationFrame(()=>{cleanup=initialize();});});
    return()=>{cancelAnimationFrame(firstFrame);cancelAnimationFrame(secondFrame);cleanup?.();};
  },[]);
  return <div className="infinity-scene" aria-hidden="true"><svg viewBox="0 0 800 520" className="infinity-fallback"><g fill="none" stroke="white" strokeWidth=".6" opacity=".25">{Array.from({length:18},(_,i)=><ellipse key={i} cx="400" cy="260" rx={220+i*3} ry={75+i*3} transform={`rotate(${i*10} 400 260)`}/>)}</g></svg><canvas ref={ref}/><div className="scene-axis scene-axis-x"/><div className="scene-axis scene-axis-y"/><span className="scene-coordinate">∞ / IPSCANS</span></div>;
}
