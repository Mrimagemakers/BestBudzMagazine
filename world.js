import * as T from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {ARButton} from 'three/addons/webxr/ARButton.js';
export async function init(host,places,onVisit){
const scene=new T.Scene();scene.background=new T.Color('#14251e');scene.fog=new T.Fog('#14251e',32,90);
const camera=new T.PerspectiveCamera(50,host.clientWidth/host.clientHeight,.1,150);
const rig=new T.Group();rig.add(camera);scene.add(rig);
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);renderer.xr.enabled=true;host.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xf6edcf,0x233629,3));const sun=new T.DirectionalLight(0xffddb4,4);sun.position.set(10,25,10);scene.add(sun);
const city=new T.Group();scene.add(city);const targets=[];
function box(w,h,d,color,x,y,z,parent=city){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.8}));o.position.set(x,y,z);parent.add(o);return o}
box(45,.4,35,0x314d3c,0,-.3,0);box(6,.04,32,0x9caa86,0,0,0);box(40,.04,4,0x9caa86,0,.01,2);
const coords=[[-11,-7],[0,-10],[10,-6],[-13,4],[12,5],[-7,11],[5,12]];
function label(text,x,y,z,parent=city){const c=document.createElement('canvas');c.width=768;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#14251e';ctx.fillRect(0,0,768,160);ctx.fillStyle='#e4efb7';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,95);const tex=new T.CanvasTexture(c);const mesh=new T.Mesh(new T.PlaneGeometry(5.5,1.15),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));mesh.position.set(x,y,z);parent.add(mesh);return mesh}
places.forEach((p,i)=>{const [x,z]=coords[i],h=i===3?5:3.5;const group=new T.Group();city.add(group);const b=box(7,h,5,p[3],x,h/2,z,group);b.userData.place=i;targets.push(b);box(7.6,.35,5.6,0xe3ddbb,x,h+.1,z,group);for(let j=-1;j<=1;j++){box(1.5,1.7,.12,0x223c32,x+j*2,h/2,z+2.55,group)}box(1.2,2.5,.2,0xd7e9a0,x,1.25,z+2.62,group);const sign=label(p[0].toUpperCase(),x,h+1,z+2.8,group);sign.userData.place=i;targets.push(sign);if(i===3){for(let j=0;j<5;j++)box(.4,1+j*.3,.4,0xc4c18b,x-2+j, h+1,z,group)}});
for(let i=0;i<22;i++){const angle=i*2.4,x=Math.cos(angle)*21,z=Math.sin(angle)*16;box(.25,1.5,.25,0x68563d,x,.7,z);const crown=new T.Mesh(new T.IcosahedronGeometry(1.4,0),new T.MeshStandardMaterial({color:0x739269}));crown.position.set(x,2,z);city.add(crown)}
const exhibit=new T.Group();scene.add(exhibit);exhibit.visible=false;
places.slice(4).forEach((p,i)=>{box(.25,.2,.12,p[3],(i-1)*.3,0,0,exhibit);label(['Blue Dream','Sour Diesel','Granddaddy Purple'][i],(i-1)*.3,.18,0,exhibit).scale.setScalar(.045)});
let yaw=.35,pitch=-.35,drag=false,lastX=0,lastY=0,travel=0,ar=false;
function reset(){rig.position.set(22,20,29);camera.position.set(0,0,0);yaw=.55;pitch=-.43;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)}
reset();const ray=new T.Raycaster(),pointer=new T.Vector2();
host.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;travel=0;host.setPointerCapture(e.pointerId)});
host.addEventListener('pointermove',e=>{if(!drag||renderer.xr.isPresenting)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.005;pitch=T.MathUtils.clamp(pitch-dy*.005,-1.2,1.2);camera.rotation.set(pitch,yaw,0);lastX=e.clientX;lastY=e.clientY});
host.addEventListener('pointerup',e=>{drag=false;if(travel>6)return;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(targets)[0];if(hit)onVisit(hit.object.userData.place)});
host.addEventListener('pointercancel',()=>drag=false);
const keys=new Set();window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys.add(e.key)}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
document.querySelector('#walk').onclick=()=>{if(renderer.xr.isPresenting)return;rig.position.set(0,1.7,18);camera.position.set(0,0,0);yaw=0;pitch=0;camera.rotation.set(0,0,0)};
const held=new Map();
function releaseWalk(e){const key=held.get(e.pointerId);held.delete(e.pointerId);if(key&&![...held.values()].includes(key))keys.delete(key)}
document.querySelectorAll('[data-walk]').forEach(button=>{
button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,button.dataset.walk);keys.add(button.dataset.walk)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,releaseWalk);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();held.clear();drag=false}});
const xrRoot=document.querySelector('#xr');xrRoot.append(VRButton.createButton(renderer));xrRoot.append(ARButton.createButton(renderer,{optionalFeatures:['dom-overlay'],domOverlay:{root:document.querySelector('#app')}}));
for(let i=0;i<2;i++){const controller=renderer.xr.getController(i);rig.add(controller);const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-15)]),new T.LineBasicMaterial({color:0xd5ee83}));controller.add(line);controller.addEventListener('select',()=>{if(ar){onVisit(6);return}const rotation=new T.Matrix4().extractRotation(controller.matrixWorld);ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(rotation);const hit=ray.intersectObjects(targets)[0];if(hit){const n=hit.object.userData.place;const [x,z]=coords[n];rig.position.set(x,0,z+7);onVisit(n)}})}
renderer.xr.addEventListener('sessionstart',()=>{const s=renderer.xr.getSession();ar=s.environmentBlendMode!=='opaque';city.visible=!ar;exhibit.visible=ar;if(ar){scene.background=null;scene.fog=null;rig.position.set(0,0,0);exhibit.position.set(0,1.2,-1)}else{rig.position.set(0,0,18)}camera.position.set(0,1.6,0)});
renderer.xr.addEventListener('sessionend',()=>{ar=false;city.visible=true;exhibit.visible=false;scene.background=new T.Color('#14251e');scene.fog=new T.Fog('#14251e',32,90);reset()});
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(!renderer.xr.isPresenting){const forward=Number(keys.has('s')||keys.has('ArrowDown'))-Number(keys.has('w')||keys.has('ArrowUp'));const side=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));rig.position.x+=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*dt*9;rig.position.z+=(Math.cos(yaw)*forward+Math.sin(yaw)*side)*dt*9;rig.position.x=T.MathUtils.clamp(rig.position.x,-35,35);rig.position.z=T.MathUtils.clamp(rig.position.z,-30,40)}renderer.render(scene,camera)});
new ResizeObserver(()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)}).observe(host);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#worldStatus').textContent='3D paused. Reload to restore, or use destination buttons.'});
return {reset,visit(i){if(!renderer.xr.isPresenting){const [x,z]=coords[i];rig.position.set(x,7,z+14);yaw=0;pitch=-.28;camera.rotation.set(pitch,yaw,0)}}}
}
