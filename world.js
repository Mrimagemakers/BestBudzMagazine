import * as T from 'three';
import {buildHomes,HOMES} from './homes.js';
import {WORLD_COORDS,buildingWalls,blockedAt} from './logic.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {ARButton} from 'three/addons/webxr/ARButton.js';

// All materials are generated locally: no external texture downloads.
export async function init(host, places, onVisit) {
  const scene = new T.Scene();
  const sky = new T.Color('#b7ced2');
  scene.background = sky; scene.fog = new T.Fog(sky, 55, 145);
  const camera = new T.PerspectiveCamera(65, host.clientWidth / host.clientHeight, .06, 180);
  camera.rotation.order = 'YXZ';
  const rig = new T.Group(); rig.add(camera); scene.add(rig);
  const renderer = new T.WebGLRenderer({antialias:true, alpha:true});
  const mobileDevice=matchMedia('(max-width: 800px), (pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobileDevice?1:1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = !mobileDevice; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.append(renderer.domElement);
  scene.add(new T.HemisphereLight(0xe7f2ff, 0x76634b, 2.1));
  const sun = new T.DirectionalLight(0xffe3b3, 3.4);
  sun.position.set(-30, 45, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(mobileDevice?512:1024,mobileDevice?512:1024);
  Object.assign(sun.shadow.camera, {left:-48,right:48,top:48,bottom:-48,near:1,far:130});
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun);
  const city = new T.Group(); scene.add(city);
  const homes=buildHomes(scene);let homeMode=false;
  const walls = [], npcs = [], seats = [];
  const coords = WORLD_COORDS;
  let seed = 71;
  const rand = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296};
  // Seeded procedural PBR-style surfaces: diffuse, micro-normal and roughness maps.
  // No external asset dependency; textures remain available offline after load.
  const surfaceCache = new Map();
  function surface(kind, base) {
    const key = kind + ':' + base;
    if(surfaceCache.has(key)) return surfaceCache.get(key);
    const size = mobileDevice?128:256;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    const height = new Uint8ClampedArray(size * size);
    const grain = (x,y,v) => { const ix = ((y+size)%size)*size + ((x+size)%size); height[ix] = Math.max(0,Math.min(255,v)); };
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const noise = rand();
      let h = 120 + (noise-.5)*45;
      if(kind==='brick') {
        const row=Math.floor(y/64), mortar=(y%64<5)||((x+(row%2)*64)%128<5);
        h=mortar?48:150+(noise-.5)*55;
      } else if(kind==='wood') {
        const seam=y%64<3, knot=Math.sin(x*.035+Math.sin(y*.12)*2)*9;
        h=seam?50:135+knot+(noise-.5)*22;
      } else if(kind==='tile') {
        const joint=(y%128<4)||((x+(Math.floor(y/128)%2)*128)%256<4);
        h=joint?52:160+(noise-.5)*18;
      } else h=135+(noise-.5)*35;
      grain(x,y,h);
    }
    const image=g.getImageData(0,0,size,size), data=image.data;
    const baseColor=new T.Color(base);
    const r=baseColor.r*255, gg=baseColor.g*255, b=baseColor.b*255;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const i=y*size+x, o=i*4, v=height[i], factor=.75+v/510;
      data[o]=Math.min(255,r*factor); data[o+1]=Math.min(255,gg*factor); data[o+2]=Math.min(255,b*factor);data[o+3]=255;
      if(v<65){data[o]*=.67;data[o+1]*=.67;data[o+2]*=.67;}
    }
    g.putImageData(image,0,0);
    const n=document.createElement('canvas');n.width=n.height=size;
    const ng=n.getContext('2d'), nd=ng.createImageData(size,size);
    const rough=document.createElement('canvas');rough.width=rough.height=size;
    const rg=rough.getContext('2d'), rd=rg.createImageData(size,size);
    const sample=(x,y)=>height[((y+size)%size)*size+((x+size)%size)];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const o=(y*size+x)*4, dx=(sample(x+1,y)-sample(x-1,y))/255,dy=(sample(x,y+1)-sample(x,y-1))/255;
      const nx=-dx*2.2,ny=-dy*2.2,nz=1,inv=1/Math.hypot(nx,ny,nz);
      nd.data[o]=(nx*inv*.5+.5)*255;nd.data[o+1]=(ny*inv*.5+.5)*255;nd.data[o+2]=(nz*inv*.5+.5)*255;nd.data[o+3]=255;
      const rv=kind==='wood'?165:kind==='tile'?195:kind==='brick'?225:230;
      rd.data[o]=rd.data[o+1]=rd.data[o+2]=Math.min(255,rv+(sample(x,y)-128)*.14);rd.data[o+3]=255;
    }
    ng.putImageData(nd,0,0);rg.putImageData(rd,0,0);
    const texture=(canvas,srgb=false)=>{const t=new T.CanvasTexture(canvas);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=Math.min(mobileDevice?2:4,renderer.capabilities.getMaxAnisotropy());return t;};
    const material=new T.MeshStandardMaterial(mobileDevice?{map:texture(c,true),roughness:.85,metalness:0}:{map:texture(c,true),normalMap:texture(n),normalScale:new T.Vector2(.48,.48),roughnessMap:texture(rough),roughness:1,metalness:0});
    surfaceCache.set(key,material);return material;
  }
  const brick=surface('brick','#9e7962'), stone=surface('tile','#b6b6a5'), wood=surface('wood','#917044'), plaster=surface('noise','#e3d6bd');
  const metal=new T.MeshStandardMaterial({color:0x344940,metalness:.65,roughness:.32});
  const glass=new T.MeshStandardMaterial({color:0xb5d0c8,transparent:true,opacity:.2,metalness:.1,roughness:.12,depthWrite:false});
  const mats = new Map();
  const mat = c => {if(c?.isMaterial)return c;if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.72}));return mats.get(c)};
  function mesh(geo,m,x,y,z,parent=city){const o=new T.Mesh(geo,mat(m));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
  function box(w,h,d,m,x,y,z,parent=city,solid=false){const o=mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);if(solid)walls.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return o}
  function cyl(r,h,m,x,y,z,parent=city){return mesh(new T.CylinderGeometry(r,r,h,12),m,x,y,z,parent)}
  function sphere(r,m,x,y,z,parent=city){return mesh(new T.SphereGeometry(r,12,8),m,x,y,z,parent)}
  function sign(text,x,y,z,width=5,parent=city){const c=document.createElement('canvas');c.width=1024;c.height=160;const g=c.getContext('2d');g.fillStyle='#173c30';g.fillRect(0,0,1024,160);g.strokeStyle='#b5c78e';g.strokeRect(8,8,1008,144);g.fillStyle='#f8ebcc';g.textAlign='center';g.font='500 48px sans-serif';g.fillText(text,512,98,960);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=mesh(new T.PlaneGeometry(width,width*160/1024),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),x,y,z,parent);o.castShadow=false;return o}
  box(96,.2,100,surface('noise','#6b7952'),0,-.16,0);
  const ground=box(53,.08,60,stone,0,-.04,3);ground.userData.floor=true;
  // Narrow stone joints and raised planting beds break up the paved plaza.
  for(let z=-26;z<34;z+=4)box(53,.005,.025,0x868f82,0,.005,z);
  function plant(x,z,scale=1){cyl(.32*scale,.65*scale,0x9e8060,x,.325*scale,z);for(let i=0;i<6;i++){const a=i*Math.PI/3;const leaf=sphere(.35*scale,0x416741,x+Math.sin(a)*.25*scale,.85*scale,z+Math.cos(a)*.25*scale);leaf.scale.set(.5,1.6,.6);leaf.rotation.z=Math.sin(a)*.55}}
  function chair(x,z,angle=0,color=0x527366){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;city.add(g);box(.65,.16,.65,color,0,.5,0,g);box(.65,.65,.12,color,0,.83,-.28,g);for(const a of [-.23,.23])for(const b of [-.23,.23])box(.045,.45,.045,metal,a,.23,b,g);return g}
  function table(x,z){cyl(.65,.09,wood,x,.83,z);cyl(.07,.8,metal,x,.4,z);cyl(.35,.04,metal,x,.02,z);cyl(.08,.14,0xe9dfcc,x+.2,.94,z);plant(x+1.6,z,.5)}
  function sofa(x,z){box(2,.4,.85,0x526e59,x,.36,z);box(2,.6,.2,0x526e59,x,.8,z-.35);for(const a of [-.95,.95])box(.18,.55,.95,0x526e59,x+a,.65,z);for(const a of [-.48,.48])box(.85,.14,.65,0x81907a,x+a,.64,z+.05)}
  function shelf(x,z){box(2.5,2,.3,wood,x,1,z,city);for(let row=0;row<3;row++){box(2.6,.08,.65,wood,x,.45+row*.6,z+.18);for(let j=0;j<7;j++)box(.21,.38,.2,[0x956046,0x365d59,0xb7a16d][j%3],x-1+j*.32,.68+row*.6,z+.3)}}
  const npcInfo=[['Jules','Market host','Welcome! Browse the maker displays and magazine shelves. The center doorway stays open.'],['Maya','Lounge host','Make yourself comfortable. You can explore the sofas and share this destination with friends.'],['Ellis','Barista','Welcome to the coffee shop. Grab a seat by the window and enjoy the reading corner.'],['Devin','Stage host','Step inside and explore the stage. Select the music venue for the ambient audio preview.'],['Simone','Cinema host','Welcome to the screening room. Walk down the center aisle to see the screen.'],['Morgan','Editorial guide','This is the editorial studio. Explore the desks, then open the evidence desk from the destination menu.'],['Avery','Library guide','These are educational exhibits. Open the strain library for source links and information limits.']];
  places.forEach((p,i)=>{
    const [x,z]=coords[i];const accent=mat(p[3]);walls.push(...buildingWalls(x,z));
    const floor=box(10,.08,9,wood,x,0,z);floor.userData.floor=true;
    box(10.4,4.4,.25,i%2?plaster:brick,x,2.2,z-4.5,city);
    for(const dx of [-5,5])box(.25,4.4,9,brick,x+dx,2.2,z,city);
    // Front facade leaves a 2.8m open doorway from ground to lintel.
    for(const dx of [-3.2,3.2]){
      box(3.6,1,.25,brick,x+dx,.5,z+4.5,city);
      box(3.6,2.3,.08,glass,x+dx,2.15,z+4.5);
      // Window collision spans full height; glass cannot be walked through.
      box(3.6,.12,.3,metal,x+dx,3.3,z+4.5);
      for(const a of [-1.7,0,1.7])box(.07,2.35,.15,metal,x+dx+a,2.15,z+4.56);
    }
    box(10,1,.3,plaster,x,3.9,z+4.5);
    box(10.7,.24,9.7,plaster,x,4.5,z);
    box(10.7,.12,1.3,accent,x,3.5,z+5);
    const title=sign(p[0].toUpperCase(),x,3.92,z+4.7,7);title.userData.place=i;
    sign('OPEN · WALK INSIDE',x,2.85,z+4.65,2.5);
    box(2.6,.015,1,0x405b48,x,.055,z+4.7);
    for(const dx of [-4.1,4.1])plant(x+dx,z+5.6,.85);
    // Emissive ceiling panels supply a warm interior finish without seven costly shadow lights.
    const glow=new T.MeshStandardMaterial({color:0xffedc8,emissive:0xffd39b,emissiveIntensity:.8});
    box(3,.04,.4,glow,x,4.33,z);box(3,.04,.4,glow,x,4.33,z-2.8);
    sign(p[1],x,2.9,z-4.32,6);
    if(i===0){shelf(x-2.8,z-4.1);shelf(x+2.8,z-4.1);box(2,.85,1.2,wood,x-3,.46,z);for(let k=0;k<4;k++)box(.3,.2,.4,p[3],x-3.7+k*.45,1,z)}
    if(i===1){sofa(x-2.7,z-2);sofa(x+2.7,z-2);table(x-2.7,z);table(x+2.7,z);box(5,.015,3,0x947a58,x,.06,z-1)}
    if(i===2){box(3.2,1.05,.85,wood,x-2.8,.55,z-3);box(3.4,.07,1,stone,x-2.8,1.1,z-3);box(.7,.55,.5,metal,x-3.5,1.4,z-3);for(const dx of [-2.7,2.7]){table(x+dx,z);chair(x+dx,z+1.1);chair(x+dx,z-1.1,Math.PI)}}
    if(i===3){box(8,.3,2,wood,x,.2,z-3);for(const dx of [-3.3,3.3]){box(.75,1.7,.6,metal,x+dx,1.05,z-3);for(const y of [.6,1.2]){const speaker=cyl(.23,.08,0x111b19,x+dx,y,z-2.67);speaker.rotation.x=Math.PI/2}}cyl(.035,1.7,metal,x,.95,z-2.6);sphere(.09,0x232b2c,x,1.8,z-2.6);box(6,.02,3,0x3f5149,x,.055,z+.6)}
    if(i===4){box(7,2.5,.08,0x151c1c,x,2.35,z-4.28);sign('BEST BUDZ / SCREENING ROOM',x,2.35,z-4.19,6.7);for(let row=0;row<3;row++)for(const dx of [-3,-2,2,3])seats.push(chair(x+dx,z-1.5+row*1.5,Math.PI,0x68453f))}
    if(i===5){for(const dx of [-3,3]){box(2,.12,1,wood,x+dx,.8,z-1);box(.1,.8,.1,metal,x+dx,.4,z-1);box(.8,.5,.08,metal,x+dx,1.2,z-1.25);chair(x+dx,z+.2)}shelf(x,z-4.1)}
    if(i===6){for(let k=0;k<3;k++){const dx=(k-1)*2.8;box(1,.9,.8,stone,x+dx,.5,z-2);plant(x+dx,z-2,.7);sign(['BLUE DREAM','SOUR DIESEL','GDP'][k],x+dx,.75,z-1.55,1);const plaque=box(1,.2,.02,accent,x+dx,1.45,z-1.6);plaque.userData.place=6}sign('EDUCATIONAL EXHIBITS · BATCH UNVERIFIED',x,2.1,z-4.3,7)}
    createNPC(x+3.4,z+1.8,i,false);
  });
  for(let i=0;i<18;i++){
    const x=i%2?32:-32,z=-28+Math.floor(i/2)*7;
    cyl(.23,3.4,wood,x,1.7,z);
    for(let j=0;j<4;j++){const crown=sphere(1.5,0x4f7048,x+(rand()-.5)*1.3,3.7+rand(),z+(rand()-.5)*1.3);crown.scale.y=1.3}
  }
  for(const z of [-24,-5,14,31])for(const x of [-8,8]){cyl(.06,3.7,metal,x,1.85,z);sphere(.18,new T.MeshStandardMaterial({color:0xffe9b5,emissive:0xffcb76,emissiveIntensity:.6}),x,3.7,z);box(1.7,.16,.5,wood,x,.55,z+1);box(.1,.55,.4,metal,x-.6,.25,z+1);box(.1,.55,.4,metal,x+.6,.25,z+1)}
  // Articulated residents: seven hosts and four walking visitors.
  function createNPC(x,z,index,walking){
    const root=new T.Group();root.position.set(x,0,z);city.add(root);
    const skin=[0x8e593b,0xbd8660,0x663e2c,0xd7a478][index%4],cloth=[0x526c5b,0xab744d,0x395b70,0x927083][index%4];
    box(.43,.58,.25,cloth,0,1.17,0,root);sphere(.19,skin,0,1.68,0,root);const hair=sphere(.2,0x29231f,0,1.78,-.025,root);hair.scale.set(1,.65,1);
    for(const dx of [-.065,.065])sphere(.018,0x191b18,dx,1.7,.17,root);
    const limbs=[];for(const side of [-1,1]){
      const arm=new T.Group();arm.position.set(side*.29,1.4,0);root.add(arm);cyl(.065,.48,cloth,0,-.23,0,arm);sphere(.07,skin,0,-.5,0,arm);limbs.push(arm);
      const leg=new T.Group();leg.position.set(side*.115,.91,0);root.add(leg);cyl(.085,.69,0x303d3c,0,-.34,0,leg);box(.17,.13,.3,0x252b28,0,-.77,.06,leg);limbs.push(leg);
    }
    const info=walking?['Visitor '+(index-6),'Neighborhood visitor','Welcome to Best Budz World. All seven venues have open entrances. Look for the OPEN signs.']:npcInfo[index];
    root.traverse(o=>{if(o.isMesh)o.userData.npc=info});
    npcs.push({root,limbs,info,walking,startX:x,startZ:z,phase:index*1.7});
    if(!walking)sign(info[0]+' · '+info[1],x,2.2,z,2.6);
  }
  for(let i=0;i<4;i++)createNPC(i%2?5:-5,-8+i*8,i+7,true);
  // In-world dialogue remains readable in a headset without relying on HTML overlays.
  const dialogueCanvas=document.createElement('canvas');dialogueCanvas.width=1024;dialogueCanvas.height=512;
  const dialogueTexture=new T.CanvasTexture(dialogueCanvas);dialogueTexture.colorSpace=T.SRGBColorSpace;
  const dialogue=new T.Mesh(new T.PlaneGeometry(2.3,1.15),new T.MeshBasicMaterial({map:dialogueTexture,side:T.DoubleSide}));city.add(dialogue);dialogue.visible=false;let dialogueUntil=0;
  function speak(info,position){const g=dialogueCanvas.getContext('2d');g.fillStyle='#132e27';g.fillRect(0,0,1024,512);g.strokeStyle='#d4d9a0';g.lineWidth=8;g.strokeRect(8,8,1008,496);g.fillStyle='#e5dea8';g.font='bold 45px sans-serif';g.fillText(info[0]+' / '+info[1],40,75,950);g.fillStyle='#fff7e5';g.font='37px sans-serif';let line='',y=150;for(const word of info[2].split(' ')){if(g.measureText(line+word).width>925){g.fillText(line,40,y);line='';y+=52}line+=word+' '}g.fillText(line,40,y);g.font='26px sans-serif';g.fillStyle='#b8c6b3';g.fillText('NPC · scripted conversation',40,465);dialogueTexture.needsUpdate=true;dialogue.position.copy(position).add(new T.Vector3(0,2.7,0));dialogue.visible=true;dialogueUntil=performance.now()+14000;document.querySelector('#worldStatus').textContent=info[0]+': '+info[2]}
  const exhibit=new T.Group();scene.add(exhibit);exhibit.visible=false;
  for(let i=0;i<3;i++){box(.25,.2,.15,places[6][3],(i-1)*.35,0,0,exhibit);sign(['Blue Dream','Sour Diesel','GDP'][i],(i-1)*.35,.22,0,.3,exhibit)}
  let yaw=0,pitch=0,drag=false,lastX=0,lastY=0,travel=0,ar=false,aerial=false,snapReady=true;
  const keys=new Set(),held=new Map();
  function street(){if(renderer.xr.isPresenting)return;if(homeMode){homeMode=false;homes.leave();city.visible=true}aerial=false;rig.position.set(0,1.7,30);camera.position.set(0,0,0);yaw=0;pitch=0;camera.rotation.set(0,0,0)}
  function reset(){if(renderer.xr.isPresenting)return;if(homeMode){homeMode=false;homes.leave();city.visible=true}aerial=true;rig.position.set(39,36,54);camera.position.set(0,0,0);yaw=.6;pitch=-.5;camera.rotation.set(pitch,yaw,0)}
  street();
  function blocked(x,z){return homeMode?Math.abs(x)>5.8||Math.abs(z)>5.8:blockedAt(x,z,walls)}
  function move(dx,dz){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let j=0;j<n;j++){let x=T.MathUtils.clamp(rig.position.x+dx/n,-27,27);if(aerial||!blocked(x,rig.position.z))rig.position.x=x;let z=T.MathUtils.clamp(rig.position.z+dz/n,-26,33);if(aerial||!blocked(rig.position.x,z))rig.position.z=z}}
  function visit(i,inside=false){if(ar)return;if(homeMode){homeMode=false;homes.leave();city.visible=true}const [x,z]=coords[i];aerial=false;rig.position.set(x,renderer.xr.isPresenting?0:1.7,z+(inside?2.9:7));if(!renderer.xr.isPresenting){yaw=0;pitch=0;camera.rotation.set(0,0,0)}}
  function enterHome(id){if(ar)return;homeMode=true;city.visible=false;const selected=homes.enter(id);aerial=false;rig.position.set(0,1.7,4.8);camera.position.set(0,0,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);return selected}
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  // Select a person/sign, or teleport to visible floor surfaces in VR.
  function selectRay(){const hit=ray.intersectObjects(city.children,true).find(h=>h.object!==dialogue);if(!hit||hit.distance>28)return;const data=hit.object.userData;if(data.npc){speak(data.npc,new T.Vector3(hit.point.x,0,hit.point.z));return}if(data.place!==undefined){onVisit(data.place);return}if(renderer.xr.isPresenting&&data.floor&&!blocked(hit.point.x,hit.point.z)){rig.position.set(hit.point.x,0,hit.point.z)}}
  host.addEventListener('pointerdown',e=>{drag=true;travel=0;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId)});
  host.addEventListener('pointermove',e=>{if(!drag||renderer.xr.isPresenting)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch-dy*.004,-1.25,1.25);camera.rotation.set(pitch,yaw,0);lastX=e.clientX;lastY=e.clientY});
  host.addEventListener('pointerup',e=>{drag=false;if(travel>7||renderer.xr.isPresenting)return;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);selectRay()});host.addEventListener('pointercancel',()=>drag=false);
  function talk(){const pos=camera.getWorldPosition(new T.Vector3());const nearest=[...npcs].sort((a,b)=>a.root.position.distanceTo(pos)-b.root.position.distanceTo(pos))[0];if(nearest&&nearest.root.position.distanceTo(pos)<5)speak(nearest.info,nearest.root.position);else document.querySelector('#worldStatus').textContent='Walk closer to a host or visitor, then tap Talk.'}
  document.querySelector('#talk').onclick=talk;
  window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='e'){talk();return}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();held.clear()});
  document.querySelector('#walk').onclick=street;
  for(const button of document.querySelectorAll('[data-walk]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,button.dataset.walk);keys.add(button.dataset.walk)});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{const k=held.get(e.pointerId);held.delete(e.pointerId);if(![...held.values()].includes(k))keys.delete(k)})}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();held.clear();drag=false}});
  const xrRoot=document.querySelector('#xr');xrRoot.append(VRButton.createButton(renderer));xrRoot.append(ARButton.createButton(renderer));
  for(let i=0;i<2;i++){const c=renderer.xr.getController(i);rig.add(c);const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-12)]),new T.LineBasicMaterial({color:0xd5ee83}));c.add(line);c.addEventListener('select',()=>{if(ar){return}const rotation=new T.Matrix4().extractRotation(c.matrixWorld);ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(rotation);selectRay()})}
  // Immersive AR must never share the camera view with page banners or panels.
  // Inline important styles also protect against stale mobile stylesheet caches.
  const xrObstructions=['.intro','#worldStatus','#toast','#panel','header','.worldbar','.destinations','footer'];
  const hiddenForXR=new Map();
  function setImmersiveLayout(active){
    document.body.classList.toggle('xr-session-active',active);
    for(const selector of xrObstructions){
      const el=document.querySelector(selector);if(!el)continue;
      if(active){hiddenForXR.set(el,{value:el.style.getPropertyValue('display'),priority:el.style.getPropertyPriority('display')});el.style.setProperty('display','none','important');}
      else if(hiddenForXR.has(el)){const previous=hiddenForXR.get(el);if(previous.value)el.style.setProperty('display',previous.value,previous.priority);else el.style.removeProperty('display');}
    }
    if(!active)hiddenForXR.clear();
  }
  renderer.xr.addEventListener('sessionstart',()=>{setImmersiveLayout(true);ar=renderer.xr.getSession().environmentBlendMode!=='opaque';city.visible=!ar;exhibit.visible=ar;aerial=false;if(homeMode){homeMode=false;homes.leave()}rig.position.set(0,0,ar?0:30);rig.rotation.y=0;camera.position.set(0,0,0);camera.rotation.set(0,0,0);if(ar){scene.background=null;scene.fog=null;exhibit.position.set(0,1.2,-1)}});
  renderer.xr.addEventListener('sessionend',()=>{setImmersiveLayout(false);ar=false;city.visible=true;exhibit.visible=false;rig.rotation.y=0;scene.background=sky;scene.fog=new T.Fog(sky,55,145);street()});
  const clock=new T.Clock(),direction=new T.Vector3();let time=0;
  let frames=0;renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),.05);time+=dt;
    if(!renderer.xr.isPresenting){let f=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));let s=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));const len=Math.max(1,Math.hypot(f,s));move((Math.sin(yaw)*f+Math.cos(yaw)*s)*dt*3.4/len,(Math.cos(yaw)*f-Math.sin(yaw)*s)*dt*3.4/len)}
    else if(!ar){for(const input of renderer.xr.getSession().inputSources){if(!input.gamepad)continue;const axes=input.gamepad.axes;const ax=axes.length>=4?axes[2]:axes[0]||0,az=axes.length>=4?axes[3]:axes[1]||0;if(input.handedness==='left'){renderer.xr.getCamera().getWorldDirection(direction);direction.y=0;direction.normalize();const f=Math.abs(az)>.18?-az:0,s=Math.abs(ax)>.18?ax:0;move((direction.x*f-direction.z*s)*dt*2.4,(direction.z*f+direction.x*s)*dt*2.4)}if(input.handedness==='right'){if(Math.abs(ax)<.3)snapReady=true;if(Math.abs(ax)>.7&&snapReady){rig.rotation.y-=Math.sign(ax)*Math.PI/6;snapReady=false}}}}
    for(const n of npcs){if(n.walking){const t=time*.3+n.phase;n.root.position.z=n.startZ+Math.sin(t)*3;n.root.rotation.y=Math.cos(t)>=0?0:Math.PI;n.limbs.forEach((l,j)=>l.rotation.x=Math.sin(time*5+n.phase)*(j%2?.3:.22)*(j<2?1:-1))}else{n.root.position.y=Math.sin(time*1.4+n.phase)*.012;n.limbs[0].rotation.z=.08+Math.sin(time+n.phase)*.04}}
    if(dialogue.visible){dialogue.lookAt(camera.getWorldPosition(direction));if(performance.now()>dialogueUntil)dialogue.visible=false}
    renderer.render(scene,camera);
    if(++frames===2)document.querySelector('#viewport').dataset.rendered='true';
  });
  new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)}).observe(host);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#worldStatus').textContent='3D paused. Reload to restore, or use destination buttons.'});
  return {reset,visit,enter:i=>visit(i,true),enterHome};
}
