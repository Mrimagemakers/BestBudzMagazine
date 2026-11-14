import * as T from 'three';
import {buildHomes,HOMES} from './homes.js?v=textures-7';
import {WORLD_COORDS,buildingWalls,blockedAt} from './logic.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildUltra} from './ultra.js';
import {mountXR} from './xr-controls.js';
import {loadStageOneModels} from './model-assets.js';
import {createHuman} from './characters.js';
import {upgradeResident} from './character-models.js';

// All materials are generated locally: no external texture downloads.
export async function init(host, places, onVisit) {
  const scene = new T.Scene();
  const sky = new T.Color('#738a9a');
  scene.background = sky; scene.fog = new T.FogExp2(sky, .0075);
  const camera = new T.PerspectiveCamera(65, host.clientWidth / host.clientHeight, .06, 180);
  camera.rotation.order = 'YXZ';
  const rig = new T.Group(); rig.add(camera); scene.add(rig);
  const headset = /Quest/i.test(navigator.userAgent);
  const mobileDevice = headset || matchMedia('(max-width: 800px), (pointer: coarse)').matches;
  const renderer = new T.WebGLRenderer({antialias:!mobileDevice, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobileDevice?1:1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.xr.enabled = true;
  renderer.xr.setFramebufferScaleFactor(headset ? .85 : 1);
  renderer.xr.setFoveation(headset ? .8 : .5);
  renderer.shadowMap.enabled = !mobileDevice; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  host.append(renderer.domElement);
  if (!mobileDevice) {
    const environment = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(environment, .08).texture;
    scene.environmentIntensity = .4;
    environment.dispose();
    pmrem.dispose();
  }
  scene.add(new T.HemisphereLight(0xc8e5ff, 0x716252, 1.18));
  const bounce = new T.DirectionalLight(0x86bfc1, mobileDevice ? .27 : .44);
  bounce.position.set(14,11,-19);scene.add(bounce);
  const sun = new T.DirectionalLight(0xffcf9b, 2.4);
  sun.position.set(-33, 29, 20); sun.castShadow = !mobileDevice;
  sun.shadow.mapSize.set(mobileDevice?512:2048,mobileDevice?512:2048);
  Object.assign(sun.shadow.camera, {left:-48,right:48,top:48,bottom:-48,near:1,far:130});
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun);
  const city = new T.Group(); scene.add(city);
  loadStageOneModels(city,mobileDevice);
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
      } else if(kind==='marble') {
        const vein = Math.sin((x+y)*Math.PI*4/size + Math.sin(y*Math.PI*4/size)*1.4);
        h = 88 + 152*Math.pow(Math.max(0,vein),18) + noise*13;
      } else if(kind==='velvet') {
        h = 135 + Math.sin(y*Math.PI/2)*5 + (noise-.5)*24;
      } else h=135+(noise-.5)*35;
      grain(x,y,h);
    }
    const image=g.getImageData(0,0,size,size), data=image.data;
    const baseColor=new T.Color(base);
    baseColor.convertLinearToSRGB();
    const r=baseColor.r*255, gg=baseColor.g*255, b=baseColor.b*255;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const i=y*size+x, o=i*4, v=height[i], factor=kind==='marble' ? .7+v/270 : .68+v/480;
      data[o]=Math.min(255,r*factor); data[o+1]=Math.min(255,gg*factor); data[o+2]=Math.min(255,b*factor);data[o+3]=255;
      if(v<65){data[o]*=.67;data[o+1]*=.67;data[o+2]*=.67;}
    }
    g.putImageData(image,0,0);
    const texture=(canvas,srgb=false)=>{const t=new T.CanvasTexture(canvas);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=Math.min(mobileDevice?2:4,renderer.capabilities.getMaxAnisotropy());return t;};
    const roughness = kind==='marble' ? .33 : kind==='velvet' ? .96 : kind==='wood' ? .67 : .84;
    if(mobileDevice || kind==='marble') {
      const material = new T.MeshStandardMaterial({map:texture(c,true),roughness});
      surfaceCache.set(key,material);
      return material;
    }
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
    const material=new T.MeshStandardMaterial({map:texture(c,true),normalMap:texture(n),normalScale:new T.Vector2(.48,.48),roughnessMap:texture(rough),roughness});
    surfaceCache.set(key,material);return material;
  }
  const loader = new T.TextureLoader();
  async function loadScan(id) {
    const load = (name) => loader.loadAsync(new URL('./assets/'+id+'-'+name+'.jpg',import.meta.url).href)
      .then(texture=>{
        texture.wrapS=texture.wrapT=T.RepeatWrapping;
        texture.anisotropy=Math.min(mobileDevice ? 2 : 4,renderer.capabilities.getMaxAnisotropy());
        if(name==='diffuse')texture.colorSpace=T.SRGBColorSpace;
        return texture;
      },()=>null);
    const [map,normalMap]=await Promise.all([load('diffuse'),mobileDevice ? null : load('nor_gl')]);
    if(!map){normalMap?.dispose();return null}
    return {map,normalMap};
  }
  const [brickScan,floorScan]=await Promise.all([loadScan('painted_brick'),loadScan('plank_flooring_04')]);
  function scanned(scan,tint,tileMeters,roughness,fallback) {
    if(!scan)return fallback();
    const material=new T.MeshStandardMaterial({...scan,color:tint,roughness,normalScale:new T.Vector2(.65,.65)});
    material.userData.tileMeters=tileMeters;
    return material;
  }
  const stone=surface('tile','#868e91'), wood=surface('wood','#6e4c36'), plaster=surface('noise','#a0998b');
  const venueFloor=scanned(floorScan,0xc6ae9c,2,.53,()=>wood);
  const facades = [
    [0x71887c,'#35544b'],[0x63847d,'#264c47'],[0xa88370,'#8d7061'],[0x74717f,'#363443'],
    [0x777983,'#45444c'],[0xab8b7c,'#8d7061'],[0x789484,'#486054']
  ].map(([tint,fallback])=>scanned(brickScan,tint,1.8,.86,()=>surface('brick',fallback)));
  const metal=new T.MeshStandardMaterial({color:0x344940,metalness:.65,roughness:.32});
  const glass=new T.MeshStandardMaterial({color:0xb5d0c8,transparent:true,opacity:.2,metalness:.1,roughness:.12,depthWrite:false});
  const mats = new Map();
  const mat = c => {if(c?.isMaterial)return c;if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.72}));return mats.get(c)};
  function mesh(geo,m,x,y,z,parent=city){const o=new T.Mesh(geo,mat(m));o.position.set(x,y,z);o.castShadow=!o.material.transparent;o.receiveShadow=true;parent.add(o);return o}
  function box(w,h,d,m,x,y,z,parent=city,solid=false){
    const geometry=new T.BoxGeometry(w,h,d);
    const tile=m?.userData?.tileMeters;
    if(tile){
      const uv=geometry.attributes.uv;
      const faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
      faces.forEach(([width,height],face)=>{
        for(let i=face*4;i<face*4+4;i++)uv.setXY(i,uv.getX(i)*width/tile,uv.getY(i)*height/tile);
      });
    }
    const o=mesh(geometry,m,x,y,z,parent);
    if(solid)walls.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
    return o;
  }
  function cyl(r,h,m,x,y,z,parent=city){return mesh(new T.CylinderGeometry(r,r,h,12),m,x,y,z,parent)}
  function sphere(r,m,x,y,z,parent=city){return mesh(new T.SphereGeometry(r,12,8),m,x,y,z,parent)}
  function sign(text,x,y,z,width=5,parent=city){const c=document.createElement('canvas');c.width=1024;c.height=160;const g=c.getContext('2d');g.fillStyle='#173c30';g.fillRect(0,0,1024,160);g.strokeStyle='#b5c78e';g.strokeRect(8,8,1008,144);g.fillStyle='#f8ebcc';g.textAlign='center';g.font='600 62px sans-serif';g.fillText(text,512,98,960);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=mesh(new T.PlaneGeometry(width,width*160/1024),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),x,y,z,parent);o.castShadow=false;return o}
  box(96,.2,100,surface('noise','#6b7952'),0,-.16,0);
  // Outdoor landscaping: instanced grass blades with color variation.
  // Single draw call keeps dense planting affordable on phones and Quest.
  const grassCount=mobileDevice?2800:9000;
  const bladeGeo=new T.ConeGeometry(.045,.36,3);
  bladeGeo.translate(0,.18,0);
  const bladeMat=new T.MeshStandardMaterial({color:0x91a85c,roughness:1,side:T.DoubleSide});
  const blades=new T.InstancedMesh(bladeGeo,bladeMat,grassCount);
  blades.castShadow=false;blades.receiveShadow=false;
  const dummy=new T.Object3D(),grassColor=new T.Color();
  let planted=0,attempts=0;
  while(planted<grassCount&&attempts<grassCount*12){
    attempts++;
    const x=(rand()-.5)*91,z=(rand()-.5)*95;
    if(Math.abs(x)<28&&z>-30&&z<35)continue; // keep roads and venues clear
    dummy.position.set(x,-.03,z);dummy.rotation.set(0,rand()*6.28,(rand()-.5)*.3);
    dummy.scale.set(.7+rand()*.9,.65+rand()*1.6,.7+rand()*.9);
    dummy.updateMatrix();blades.setMatrixAt(planted,dummy.matrix);
    grassColor.setHSL(.23+rand()*.08,.27+rand()*.26,.24+rand()*.23);
    blades.setColorAt(planted,grassColor);planted++;
  }
  blades.count=planted;blades.instanceMatrix.needsUpdate=true;city.add(blades);
  // Layered trees with tapered trunks, branches, and non-uniform leaf clusters.
  const bark=surface('wood','#64513a');
  const leafMats=[0x385e35,0x47783f,0x5a8747,0x718c49].map(c=>new T.MeshStandardMaterial({color:c,roughness:1,flatShading:true}));
  const trunkGeo=new T.CylinderGeometry(.16,.29,3.8,7);
  const branchGeo=new T.CylinderGeometry(.055,.12,1.7,6);
  const canopyGeo=new T.IcosahedronGeometry(1,1);
  const treeParts = [
    {geometry:trunkGeo,material:bark,capacity:40},
    {geometry:branchGeo,material:bark,capacity:200},
    ...leafMats.map((material,i)=>({geometry:canopyGeo,material,capacity:i<2 ? 120 : 80}))
  ].map(({geometry,material,capacity})=>{
    const part=new T.InstancedMesh(geometry,material,capacity);
    part.count=0;
    part.castShadow=!mobileDevice;
    part.receiveShadow=!mobileDevice;
    part.raycast=()=>{};
    city.add(part);
    return part;
  });
  const branchTransform=new T.Object3D();
  function tree(x,z,height=1){
    function part(index,dx,y,dz,sx=1,sy=1,sz=1,rx=0,rz=0){
      branchTransform.position.set(x+dx*height,y*height,z+dz*height);
      branchTransform.scale.set(sx*height,sy*height,sz*height);
      branchTransform.rotation.set(rx,0,rz);
      branchTransform.updateMatrix();
      const batch=treeParts[index];
      batch.setMatrixAt(batch.count++,branchTransform.matrix);
    }
    part(0,0,1.9,0);
    for(let j=0;j<5;j++){
      const angle=j*Math.PI*2/5+rand()*.25,level=2.4+(j%3)*.48;
      part(1,Math.cos(angle)*.45,level,Math.sin(angle)*.45,1,1,1,Math.sin(angle)*.7,-Math.cos(angle)*.7);
    }
    for(let j=0;j<10;j++){
      const angle=j*2.39996,dist=.65+(j%3)*.22;
      part(2+j%leafMats.length,Math.cos(angle)*dist,3.8+(j%4)*.43,Math.sin(angle)*dist,
        .85+rand()*.38,.95+rand()*.5,.85+rand()*.38);
    }
  }
  for(let i=0;i<26;i++){
    const x=i%2===0?-35-rand()*9:35+rand()*9,z=-42+Math.floor(i/2)*7+rand()*2;
    tree(x,z,.75+rand()*.6);
  }
  for(let i=0;i<14;i++){const x=(rand()-.5)*90,z=i%2===0?-39-rand()*7:40+rand()*7;tree(x,z,.7+rand()*.5)}
  for(const part of treeParts)part.instanceMatrix.needsUpdate=true;
  // Architectural trim and street detail to break up flat facade geometry.
  const concrete=surface('tile','#8e9290');
  for(let z=-29;z<35;z+=7){
    box(1.6,.055,1.5,concrete,-26.3,.01,z);
    box(1.6,.055,1.5,concrete,26.3,.01,z);
  }
  const ground=box(53,.08,60,stone,0,-.04,3);ground.userData.floor=true;
  // Narrow stone joints and raised planting beds break up the paved plaza.
  for(let z=-26;z<34;z+=4)box(53,.005,.025,0x868f82,0,.005,z);
  function plant(x,z,scale=1){cyl(.32*scale,.65*scale,0x9e8060,x,.325*scale,z);for(let i=0;i<6;i++){const a=i*Math.PI/3;const leaf=sphere(.35*scale,0x416741,x+Math.sin(a)*.25*scale,.85*scale,z+Math.cos(a)*.25*scale);leaf.scale.set(.5,1.6,.6);leaf.rotation.z=Math.sin(a)*.55}}
  function chair(x,z,angle=0,color=0x527366){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;city.add(g);box(.65,.16,.65,color,0,.5,0,g);box(.65,.65,.12,color,0,.83,-.28,g);for(const a of [-.23,.23])for(const b of [-.23,.23])box(.045,.45,.045,metal,a,.23,b,g);return g}
  function table(x,z){cyl(.65,.09,wood,x,.83,z);cyl(.07,.8,metal,x,.4,z);cyl(.35,.04,metal,x,.02,z);cyl(.08,.14,0xe9dfcc,x+.2,.94,z);plant(x+1.6,z,.5)}
  function shelf(x,z){box(2.5,2,.3,wood,x,1,z,city);for(let row=0;row<3;row++){box(2.6,.08,.65,wood,x,.45+row*.6,z+.18);for(let j=0;j<7;j++)box(.21,.38,.2,[0x956046,0x365d59,0xb7a16d][j%3],x-1+j*.32,.68+row*.6,z+.3)}}
  const npcInfo=[['Jules','Market host','Welcome! Browse the maker displays and magazine shelves. The center doorway stays open.'],['Maya','Lounge host','Make yourself comfortable. You can explore the sofas and share this destination with friends.'],['Ellis','Barista','Welcome to the coffee shop. Grab a seat by the window and enjoy the reading corner.'],['Devin','Stage host','Step inside and explore the stage. Select the music venue for the ambient audio preview.'],['Simone','Cinema host','Welcome to the screening room. Walk down the center aisle to see the screen.'],['Morgan','Editorial guide','This is the editorial studio. Explore the desks, then open the evidence desk from the destination menu.'],['Avery','Library guide','These are educational exhibits. Open the strain library for source links and information limits.']];
  places.forEach((p,i)=>{
    const [x,z]=coords[i];const accent=mat(p[3]), facade=facades[i];walls.push(...buildingWalls(x,z));
    const floor=box(10,.08,9,venueFloor,x,0,z);floor.userData.floor=true;
    box(10.4,4.4,.25,facade,x,2.2,z-4.5,city);
    for(const dx of [-5,5])box(.25,4.4,9,facade,x+dx,2.2,z,city);
    // Front facade leaves a 2.8m open doorway from ground to lintel.
    for(const dx of [-3.2,3.2]){
      box(3.6,1,.25,facade,x+dx,.5,z+4.5,city);
      box(3.6,2.3,.08,glass,x+dx,2.15,z+4.5);
      // Window collision spans full height; glass cannot be walked through.
      box(3.6,.12,.3,metal,x+dx,3.3,z+4.5);
      for(const a of [-1.7,0,1.7])box(.07,2.35,.15,metal,x+dx+a,2.15,z+4.56);
    }
    box(10,1,.3,facade,x,3.9,z+4.5);
    box(10.7,.24,9.7,plaster,x,4.5,z);
    box(10.7,.12,1.3,accent,x,3.5,z+5);
    // Raised cornice, corner pilasters, and contrasting facade base.
    box(11,.16,10.1,concrete,x,4.64,z);
    for(const dx of [-4.85,4.85])box(.25,4.3,.35,concrete,x+dx,2.15,z+4.65);
    for(const dx of [-3.2,3.2])box(3.5,.18,.36,concrete,x+dx,.18,z+4.66);
    box(10.5,.12,.5,metal,x,3.57,z+4.85);
    const title=sign(p[0].toUpperCase(),x,3.92,z+4.7,7);title.userData.place=i;
    sign('OPEN · WALK INSIDE',x,3.25,z+4.68,1.65);
    box(2.6,.015,1,0x405b48,x,.055,z+4.7);
    for(const dx of [-4.1,4.1])plant(x+dx,z+5.6,.85);
    // Emissive ceiling panels supply a warm interior finish without seven costly shadow lights.
    const glow=new T.MeshStandardMaterial({color:0xffedc8,emissive:0xffd39b,emissiveIntensity:.8});
    if(i!==0&&i!==1&&i!==3){box(3,.04,.4,glow,x,4.33,z);box(3,.04,.4,glow,x,4.33,z-2.8);}
    if(i!==0&&i!==1&&i!==3)sign(p[1],x,2.9,z-4.32,6);
    if(i===2){box(3.2,1.05,.85,wood,x-2.8,.55,z-3);box(3.4,.07,1,stone,x-2.8,1.1,z-3);box(.7,.55,.5,metal,x-3.5,1.4,z-3);for(const dx of [-2.7,2.7]){table(x+dx,z);chair(x+dx,z+1.1);chair(x+dx,z-1.1,Math.PI)}}
    if(i===4){box(7,2.5,.08,0x151c1c,x,2.35,z-4.28);sign('BEST BUDZ / SCREENING ROOM',x,2.35,z-4.19,6.7);for(let row=0;row<3;row++)for(const dx of [-3,-2,2,3])seats.push(chair(x+dx,z-1.5+row*1.5,Math.PI,0x68453f))}
    if(i===5){for(const dx of [-3,3]){box(2,.12,1,wood,x+dx,.8,z-1);box(.1,.8,.1,metal,x+dx,.4,z-1);box(.8,.5,.08,metal,x+dx,1.2,z-1.25);chair(x+dx,z+.2)}shelf(x,z-4.1)}
    if(i===6){for(let k=0;k<3;k++){const dx=(k-1)*2.8;box(1,.9,.8,stone,x+dx,.5,z-2);plant(x+dx,z-2,.7);sign(['BLUE DREAM','SOUR DIESEL','GDP'][k],x+dx,.75,z-1.55,1);const plaque=box(1,.2,.02,accent,x+dx,1.45,z-1.6);plaque.userData.place=6}sign('EDUCATIONAL EXHIBITS · BATCH UNVERIFIED',x,2.1,z-4.3,7)}
    createNPC(x+3.4,z+1.8,i,false);
  });
  for(const z of [-24,-5,14,31])for(const x of [-8,8]){cyl(.06,3.7,metal,x,1.85,z);sphere(.18,new T.MeshStandardMaterial({color:0xffe9b5,emissive:0xffcb76,emissiveIntensity:.6}),x,3.7,z);box(1.7,.16,.5,wood,x,.55,z+1);box(.1,.55,.4,metal,x-.6,.25,z+1);box(.1,.55,.4,metal,x+.6,.25,z+1)}
  const updateLighting=buildUltra(city,coords,surface,sign,mobileDevice);
  const animateLighting=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Articulated residents: seven hosts and four walking visitors.
  function createNPC(x,z,index,walking){
    const root=createHuman(index);
    root.position.set(x,0,z);city.add(root);
    const limbs=root.userData.limbs;
    const info=walking?['Visitor '+(index-6),'Neighborhood visitor','Welcome to Best Budz World. All seven venues have open entrances. Look for the OPEN signs.']:npcInfo[index];
    root.traverse(o=>{if(o.isMesh)o.userData.npc=info});
    npcs.push({root,limbs,info,walking,startX:x,startZ:z,phase:index*1.7});
    if(!walking)sign(info[0]+' · '+info[1],x,2.2,z,2.6);
  }
  for(let i=0;i<4;i++)createNPC(i%2?5:-5,-8+i*8,i+7,true);
  // Replace selected procedural NPCs with skinned, textured GLB characters.
  // Deferred so the world remains interactive while models load.
  // Six unique resident slots: source-controlled GLB files can be added without
  // replacing the interaction, dialogue or animation code.
  const characterRoster=[
    {name:'Maya',role:'Lounge Host',model:'maya.glb'},
    {name:'Jules',role:'Market Host',model:'jules.glb'},
    {name:'Ellis',role:'Coffee Shop Owner',model:'ellis.glb'},
    {name:'Devin',role:'Music Producer',model:'devin.glb'},
    {name:'Simone',role:'Cinema Host',model:'simone.glb'},
    {name:'Morgan',role:'Editorial Guide',model:'morgan.glb'}
  ];
  for(const [index,profile] of characterRoster.entries()){
    const resident=npcs[index];
    if(resident)upgradeResident(resident,profile.model,{mobile:mobileDevice,walking:resident.walking});
  }
  // In-world dialogue remains readable in a headset without relying on HTML overlays.
  const dialogueCanvas=document.createElement('canvas');dialogueCanvas.width=1024;dialogueCanvas.height=512;
  const dialogueTexture=new T.CanvasTexture(dialogueCanvas);dialogueTexture.colorSpace=T.SRGBColorSpace;
  const dialogue=new T.Mesh(new T.PlaneGeometry(2.3,1.15),new T.MeshBasicMaterial({map:dialogueTexture,side:T.DoubleSide}));city.add(dialogue);dialogue.visible=false;let dialogueUntil=0;
  function speak(info,position){const g=dialogueCanvas.getContext('2d');g.fillStyle='#132e27';g.fillRect(0,0,1024,512);g.strokeStyle='#d4d9a0';g.lineWidth=8;g.strokeRect(8,8,1008,496);g.fillStyle='#e5dea8';g.font='bold 45px sans-serif';g.fillText(info[0]+' / '+info[1],40,75,950);g.fillStyle='#fff7e5';g.font='37px sans-serif';let line='',y=150;for(const word of info[2].split(' ')){if(g.measureText(line+word).width>925){g.fillText(line,40,y);line='';y+=52}line+=word+' '}g.fillText(line,40,y);g.font='26px sans-serif';g.fillStyle='#b8c6b3';g.fillText('NPC · scripted conversation',40,465);dialogueTexture.needsUpdate=true;dialogue.position.copy(position).add(new T.Vector3(0,2.7,0));dialogue.visible=true;dialogueUntil=performance.now()+14000;document.querySelector('#worldStatus').textContent=info[0]+': '+info[2]}
  const exhibit=new T.Group();scene.add(exhibit);exhibit.visible=false;
  // A visible, life-size AR showcase, placed in front of the user's headset.
  const arStand=new T.Mesh(new T.CylinderGeometry(.63,.7,.075,32),new T.MeshStandardMaterial({color:0x183c37,metalness:.35,roughness:.45}));
  arStand.position.y=-.48;exhibit.add(arStand);
  const arRing=new T.Mesh(new T.TorusGeometry(.61,.025,8,48),new T.MeshBasicMaterial({color:0x72edc2}));
  arRing.rotation.x=Math.PI/2;arRing.position.y=-.43;exhibit.add(arRing);
  for(let i=0;i<3;i++){
    const x=(i-1)*.37;
    box(.25,.28,.2,places[6][3],x,-.23,0,exhibit);
    sign(['BLUE DREAM','SOUR DIESEL','GDP'][i],x,.01,.13,.33,exhibit);
  }
  const arTitle=sign('BEST BUDZ · AR EXHIBIT',0,.54,0,1.85,exhibit);
  const arReticle=new T.Mesh(new T.RingGeometry(.055,.075,32),new T.MeshBasicMaterial({color:0x7af8cf,side:T.DoubleSide,depthTest:false}));
  arReticle.visible=false;scene.add(arReticle);
  const arForward=new T.Vector3(),arHead=new T.Vector3(),arTarget=new T.Vector3();
  function positionARExhibit(){
    const xrCamera=renderer.xr.getCamera();
    xrCamera.getWorldPosition(arHead);
    xrCamera.getWorldDirection(arForward);
    arForward.y=0;
    if(arForward.lengthSq()<.001)arForward.set(0,0,-1);
    arForward.normalize();
    exhibit.position.copy(arHead).addScaledVector(arForward,1.45);
    exhibit.position.y=arHead.y-.24;
    exhibit.rotation.y=Math.atan2(-arForward.x,-arForward.z);
  }
  let lookSensitivity=Number(localStorage.getItem('bb-look-sensitivity')||1),invertLook=localStorage.getItem('bb-invert-look')==='true';
  let yaw=0,pitch=0,drag=false,lastX=0,lastY=0,travel=0,ar=false,aerial=false,snapReady=true;
  // Optimized, distinct third-person avatar with realistic streetwear proportions.
  const avatar=createHuman(4,{outfitColor:localStorage.getItem('bb-avatar-color')||'#64bfa4'});
  rig.add(avatar);avatar.position.set(0,-1.7,0);
  const outfit=avatar.userData.jacketMaterial;
  const avatarLimbs=avatar.userData.limbs;
  let thirdPerson=localStorage.getItem('bb-camera-mode')!=='first';
  function updateCameraMode(){
    const third=thirdPerson&&!renderer.xr.isPresenting&&!aerial;
    avatar.visible=third;
    const targetZ=third?3.7:0,targetY=third?1.1:0;
    camera.position.set(0,targetY,targetZ);
    const btn=document.querySelector('#cameraMode');if(btn)btn.textContent=thirdPerson?'Third-person: ON':'First-person: ON';
  }
  function setCameraMode(mode){thirdPerson=mode==='third';localStorage.setItem('bb-camera-mode',thirdPerson?'third':'first');updateCameraMode()}
  function setAvatarColor(color){if(/^#[0-9a-f]{6}$/i.test(color)){outfit.color.set(color);localStorage.setItem('bb-avatar-color',color)}}
  updateCameraMode();
  const keys=new Set(),held=new Map();
  function street(){if(renderer.xr.isPresenting)return;if(homeMode){homeMode=false;homes.leave();city.visible=true}aerial=false;rig.position.set(0,1.7,30);camera.position.set(0,0,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);updateCameraMode()}
  function reset(){if(renderer.xr.isPresenting)return;if(homeMode){homeMode=false;homes.leave();city.visible=true}aerial=true;rig.position.set(39,36,54);camera.position.set(0,0,0);yaw=.6;pitch=-.5;camera.rotation.set(pitch,yaw,0);updateCameraMode()}
  street();
  function blocked(x,z){return homeMode?Math.abs(x)>5.8||Math.abs(z)>5.8:blockedAt(x,z,walls)}
  function move(dx,dz){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let j=0;j<n;j++){let x=T.MathUtils.clamp(rig.position.x+dx/n,-27,27);if(aerial||!blocked(x,rig.position.z))rig.position.x=x;let z=T.MathUtils.clamp(rig.position.z+dz/n,-26,33);if(aerial||!blocked(rig.position.x,z))rig.position.z=z}}
  function visit(i,inside=false){if(ar)return;if(homeMode){homeMode=false;homes.leave();city.visible=true}const [x,z]=coords[i];aerial=false;rig.position.set(x,renderer.xr.isPresenting?0:1.7,z+(inside?2.9:7));if(!renderer.xr.isPresenting){yaw=0;pitch=0;camera.rotation.set(0,0,0);updateCameraMode()}}
  function enterHome(id){if(ar)return;homeMode=true;city.visible=false;const selected=homes.enter(id);aerial=false;rig.position.set(0,1.7,4.8);camera.position.set(0,0,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);updateCameraMode();return selected}
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  // Select a person/sign, or teleport to visible floor surfaces in VR.
  function selectRay(){const hit=ray.intersectObjects(city.children,true).find(h=>h.object!==dialogue);if(!hit||hit.distance>28)return;const data=hit.object.userData;if(data.npc){speak(data.npc,new T.Vector3(hit.point.x,0,hit.point.z));return}if(data.place!==undefined){onVisit(data.place);return}if(renderer.xr.isPresenting&&data.floor&&!blocked(hit.point.x,hit.point.z)){rig.position.set(hit.point.x,0,hit.point.z)}}
  host.addEventListener('pointerdown',e=>{drag=true;travel=0;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId)});
  host.addEventListener('pointermove',e=>{if(!drag||renderer.xr.isPresenting)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004*lookSensitivity;pitch=T.MathUtils.clamp(pitch-dy*.004*lookSensitivity*(invertLook?-1:1),-1.25,1.25);camera.rotation.set(pitch,yaw,0);lastX=e.clientX;lastY=e.clientY});
  host.addEventListener('pointerup',e=>{drag=false;if(travel>7||renderer.xr.isPresenting)return;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);selectRay()});host.addEventListener('pointercancel',()=>drag=false);
  function talk(){const pos=camera.getWorldPosition(new T.Vector3());const nearest=[...npcs].sort((a,b)=>a.root.position.distanceTo(pos)-b.root.position.distanceTo(pos))[0];if(nearest&&nearest.root.position.distanceTo(pos)<5)speak(nearest.info,nearest.root.position);else document.querySelector('#worldStatus').textContent='Walk closer to a host or visitor, then tap Talk.'}
  document.querySelector('#talk').onclick=talk;
  window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='e'){talk();return}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();held.clear()});
  document.querySelector('#walk').onclick=street;
  for(const button of document.querySelectorAll('[data-walk]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,button.dataset.walk);keys.add(button.dataset.walk)});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{const k=held.get(e.pointerId);held.delete(e.pointerId);if(![...held.values()].includes(k))keys.delete(k)})}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();held.clear();drag=false}});
  let xrMode;
  mountXR(document.querySelector('#xr'),renderer,mode=>{xrMode=mode},message=>{
    document.querySelector('#worldStatus').textContent=message;
  });
  for(let i=0;i<2;i++){const c=renderer.xr.getController(i);rig.add(c);const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-12)]),new T.LineBasicMaterial({color:0xd5ee83}));c.add(line);c.addEventListener('select',()=>{if(ar){positionARExhibit();return}const rotation=new T.Matrix4().extractRotation(c.matrixWorld);ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(rotation);selectRay()})}
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
  renderer.xr.addEventListener('sessionstart',()=>{setImmersiveLayout(true);ar=xrMode==='immersive-ar';renderer.shadowMap.enabled=false;city.visible=!ar;exhibit.visible=ar;aerial=false;if(homeMode){homeMode=false;homes.leave()}rig.position.set(0,0,ar?0:30);rig.rotation.y=0;camera.position.set(0,0,0);camera.rotation.set(0,0,0);if(ar){scene.background=null;scene.fog=null;positionARExhibit();arReticle.visible=true;}});
  renderer.xr.addEventListener('sessionend',()=>{setImmersiveLayout(false);renderer.shadowMap.enabled=!mobileDevice;ar=false;city.visible=true;exhibit.visible=false;arReticle.visible=false;rig.rotation.y=0;scene.background=sky;scene.fog=new T.FogExp2(sky,.0075);street()});
  // Standard-mapping Xbox and PlayStation controllers via the browser Gamepad API.
  // Controllers require a user button press to become visible in some browsers.
  let previousButtons=new Set(),controllerSeen=false;
  const deadzone=v=>Math.abs(v)<.16?0:Math.sign(v)*(Math.abs(v)-.16)/.84;
  function gamepadInput(dt){
    if(renderer.xr.isPresenting||!navigator.getGamepads)return;
    const pad=Array.from(navigator.getGamepads()).find(p=>p&&p.mapping==='standard'&&p.connected);
    if(!pad){previousButtons.clear();controllerSeen=false;return}
    if(!controllerSeen){controllerSeen=true;const el=document.querySelector('#controllerStatus');if(el)el.textContent='Controller connected: '+pad.id.split('(')[0].slice(0,38)}
    const axes=pad.axes||[],lx=deadzone(axes[0]||0),ly=deadzone(axes[1]||0),rx=deadzone(axes[2]||0),ry=deadzone(axes[3]||0);
    // Standard mapping: left stick walk/strafe, right stick free-look.
    yaw-=rx*dt*2.4*lookSensitivity;pitch=T.MathUtils.clamp(pitch-ry*dt*1.7*lookSensitivity*(invertLook?-1:1),-1.25,1.25);
    camera.rotation.set(pitch,yaw,0);
    const speed=pad.buttons[6]?.pressed?6.5:3.8;
    move((Math.sin(yaw)*ly+Math.cos(yaw)*lx)*dt*speed,(Math.cos(yaw)*ly-Math.sin(yaw)*lx)*dt*speed);
    const pressed=new Set();
    pad.buttons.forEach((b,i)=>{if(b.pressed)pressed.add(i)});
    const tap=(i,fn)=>{if(pressed.has(i)&&!previousButtons.has(i))fn()};
    tap(0,()=>{pointer.set(0,0);ray.setFromCamera(pointer,camera);selectRay();talk()}); // A / Cross
    tap(1,()=>{document.querySelector('#panel').hidden=true}); // B / Circle
    tap(2,()=>{document.querySelector('#exploreMenu')?.click()}); // X / Square
    tap(3,()=>{homeMode?street():reset()}); // Y / Triangle
    tap(9,()=>{document.querySelector('#account')?.click()}); // Menu / Options
    tap(8,()=>{document.querySelector('#walk')?.click()}); // View / Share
    previousButtons=pressed;
  }
  const clock=new T.Clock(),direction=new T.Vector3();let time=0;
  document.querySelector('#cameraMode')?.addEventListener('click',()=>setCameraMode(thirdPerson?'first':'third'));
  let frames=0;renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),.05);time+=dt;
    if(!renderer.xr.isPresenting){gamepadInput(dt);let f=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));let s=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));const len=Math.max(1,Math.hypot(f,s));move((Math.sin(yaw)*f+Math.cos(yaw)*s)*dt*3.4/len,(Math.cos(yaw)*f-Math.sin(yaw)*s)*dt*3.4/len)}
    else if(!ar){for(const input of renderer.xr.getSession().inputSources){if(!input.gamepad)continue;const axes=input.gamepad.axes;const ax=axes.length>=4?axes[2]:axes[0]||0,az=axes.length>=4?axes[3]:axes[1]||0;if(input.handedness==='left'){renderer.xr.getCamera().getWorldDirection(direction);direction.y=0;direction.normalize();const f=Math.abs(az)>.18?-az:0,s=Math.abs(ax)>.18?ax:0;move((direction.x*f-direction.z*s)*dt*2.4,(direction.z*f+direction.x*s)*dt*2.4)}if(input.handedness==='right'){if(Math.abs(ax)<.3)snapReady=true;if(Math.abs(ax)>.7&&snapReady){rig.rotation.y-=Math.sign(ax)*Math.PI/6;snapReady=false}}}}
    updateCameraMode();
    if(ar && renderer.xr.isPresenting){
      const xrCamera=renderer.xr.getCamera();xrCamera.getWorldPosition(arHead);xrCamera.getWorldDirection(arForward);
      arReticle.position.copy(arHead).addScaledVector(arForward,1.05);
      arReticle.quaternion.copy(xrCamera.quaternion);
      arRing.rotation.z+=dt*.25;
    }
    const moving=keys.size>0||[...previousButtons].some(i=>i===6);
    avatarLimbs.forEach((limb,i)=>{limb.rotation.x=T.MathUtils.lerp(limb.rotation.x,moving?Math.sin(time*9+(i%2)*Math.PI)*.35:0,.15)});
    for(const n of npcs){if(n.mixer)n.mixer.update(dt);if(n.walking){const t=time*.3+n.phase;n.root.position.z=n.startZ+Math.sin(t)*3;n.root.rotation.y=Math.cos(t)>=0?0:Math.PI;n.limbs.forEach((l,j)=>l.rotation.x=Math.sin(time*5+n.phase)*(j%2?.3:.22)*(j<2?1:-1))}else{n.root.position.y=Math.sin(time*1.4+n.phase)*.012;n.limbs[0].rotation.z=.08+Math.sin(time+n.phase)*.04}}
    if(dialogue.visible){dialogue.lookAt(camera.getWorldPosition(direction));if(performance.now()>dialogueUntil)dialogue.visible=false}
    if(city.visible)updateLighting(rig.position,animateLighting ? time : 0);
    renderer.render(scene,camera);
    if(++frames===2)document.querySelector('#viewport').dataset.rendered='true';
  });
  new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)}).observe(host);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#worldStatus').textContent='3D paused. Reload to restore, or use destination buttons.'});
  return {reset,visit,enter:i=>visit(i,true),enterHome,setCameraMode,setAvatarColor,setLookSettings:(sensitivity,inverted)=>{lookSensitivity=sensitivity;invertLook=inverted}};
}
