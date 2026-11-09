import * as T from 'three';
export const HOMES=[
 {id:'luxury_loft',name:'Luxury Loft',wall:0xd3c8b6,floor:0x8d6b4c,accent:0xd3b16d},
 {id:'rundown_house',name:'Rundown House',wall:0x706b5d,floor:0x554b3f,accent:0x9a765d},
 {id:'beach_house',name:'Coastal Beach House',wall:0xd7e6dc,floor:0xb9a47b,accent:0x5faeb7},
 {id:'gamer_paradise',name:"Gamer's Paradise",wall:0x292943,floor:0x292b38,accent:0x9c5fff},
 {id:'forest_cabin',name:'Cabin in the Woods',wall:0x81674a,floor:0x644b37,accent:0xd7a35d}
];
// Deterministic procedural textures, no external assets or network dependencies.
const textureCache=new Map();
function patternedMaterial(color,kind){
 const key=color+':'+kind;if(textureCache.has(key))return textureCache.get(key);
 const size=256,c=document.createElement('canvas');c.width=c.height=size;
 const ctx=c.getContext('2d'),base=new T.Color(color);
 ctx.fillStyle='#'+base.getHexString();ctx.fillRect(0,0,size,size);
 let seed=(base.getHex()^kind.length*12347)>>>0;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<1800;i++){const x=random()*size,y=random()*size,alpha=random()*.11;
 ctx.fillStyle=random()>.5?'rgba(255,255,255,'+alpha+')':'rgba(0,0,0,'+alpha+')';
 ctx.fillRect(x,y,1+random()*3,1+random()*3)}
 if(kind==='wood'||kind==='floor'){
  for(let y=0;y<size;y+=32){ctx.strokeStyle='#00000035';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();
   for(let x=(Math.floor(y/32)%2)*64;x<size;x+=128){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke()}}
  for(let i=0;i<65;i++){ctx.strokeStyle='rgba(28,15,8,.10)';ctx.lineWidth=1;const y=random()*size;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(70,y+random()*9,180,y-random()*8,256,y+random()*4);ctx.stroke()}
 }else if(kind==='brick'){
  ctx.strokeStyle='rgba(0,0,0,.32)';ctx.lineWidth=5;
  for(let y=0;y<256;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=(y/40%2)*50;x<256;x+=100){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+40);ctx.stroke()}}
 }else if(kind==='tile'){
  ctx.strokeStyle='rgba(0,0,0,.20)';ctx.lineWidth=3;
  for(let n=0;n<256;n+=64){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,256);ctx.moveTo(0,n);ctx.lineTo(256,n);ctx.stroke()}
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=2;
 const mat=new T.MeshStandardMaterial({map:tex,roughness:kind==='tile'?.45:.83,metalness:0});
 textureCache.set(key,mat);return mat;
}
export function buildHomes(scene){
 const root=new T.Group();root.visible=false;scene.add(root);
 const rooms=HOMES.map((h,i)=>{
  const room=new T.Group();room.visible=false;root.add(room);
  const material=(c,metalness=0,kind='plaster')=>metalness?new T.MeshStandardMaterial({color:c,roughness:.42,metalness}):patternedMaterial(c,kind);
  function box(w,ht,d,c,x,y,z,kind='plaster'){const m=new T.Mesh(new T.BoxGeometry(w,ht,d),material(c,0,kind));m.position.set(x,y,z);m.receiveShadow=true;room.add(m);return m}
  box(13,.15,13,h.floor,0,-.1,0,i===3?'tile':'floor');
  box(13,4,.2,h.wall,0,2,-6.5,i===4?'wood':i===1?'brick':'plaster');box(.2,4,13,h.wall,-6.5,2,0,i===4?'wood':'plaster');box(.2,4,13,h.wall,6.5,2,0,i===4?'wood':'plaster');
  box(13,.18,13,h.wall,0,4.1,0);
  const windowMaterial=new T.MeshStandardMaterial({color:i===2?0x6ebccf:0x86b5c6,transparent:true,opacity:.5,roughness:.15});
  const window=new T.Mesh(new T.PlaneGeometry(5,2.6),windowMaterial);window.position.set(0,2,-6.38);room.add(window);
  for(const x of [-2.5,2.5])box(.12,2.7,.15,h.accent,x,2,-6.32);
  box(3.7,.55,1.25,h.accent,-2,.45,-2);box(3.7,.75,.22,h.accent,-2,1,-2.55);
  box(2,.12,1.2,0x594635,-2,.6,0);box(.15,.6,.15,0x282b2c,-2,.3,0);
  box(2.6,1.55,.12,0x11151b,3,2,-6.25);box(3,.45,.65,h.floor,3,.5,-5.7);
  box(1.5,.9,.65,0x313b3b,3,.7,-3);box(.9,.08,.6,h.accent,3,1.18,-3);
  const radio=box(.65,.4,.4,0x151719,3,1.45,-3);radio.userData.radio=true;
  if(i===3){for(let j=0;j<3;j++){const x=-4+j*2.1;box(1.1,2.3,.7,0x111322,x,1.2,2.8);box(.9,1,.05,0x3edcde,x,1.75,3.2);box(.8,.5,.5,0x6641a2,x,.5,3.2)}}
  if(i===4){box(2.5,1.6,.4,0x49311f,3,1,-6.1);box(1.3,.7,.06,0xffa447,3,1.1,-5.86)}
  if(i===1){for(let j=0;j<5;j++)box(.3,.08,.2,0x413a30,-5+j*1.9,.8,-6.28)}
  if(i===2){box(5,.1,2,0xb7d6c3,0,.05,5.4)}
  // Furnishings: rug, cushions, shelves, planters, window trim and ceiling lights.
  box(4.4,.035,3.2,i===3?0x4e3280:i===2?0xc4d8cf:0x7c6555,-1.2,.01,1.2,'tile');
  for(const x of [-3.35,-1.2])box(.65,.18,.65,i===3?0x8e57f0:0xd1bca0,x,1.1,-2.1,'wood');
  for(let j=0;j<3;j++){box(1.8,.08,.45,0x554437,4.9,1.3+j*.8,1.8,'wood');box(.3,.38,.25,[0x8a5145,0x4b7780,0xc1a46c][j],4.5,1.53+j*.8,1.8,'wood')}
  const planter=box(.65,.65,.65,0x735b44,-5,.35,4,'tile');
  for(let j=0;j<6;j++){const leaf=new T.Mesh(new T.SphereGeometry(.28,8,6),material(0x456f48));leaf.position.set(-5+(j%3-1)*.2,1+(j%2)*.25,4+(j%2)*.2);leaf.scale.set(.55,1.8,.5);room.add(leaf)}
  for(const x of [-2.6,2.6])box(.12,2.75,.12,0x34312e,x,2,-6.27,'wood');
  box(5.3,.1,.12,0x34312e,0,3.37,-6.27,'wood');
  box(5.3,.1,.12,0x34312e,0,.65,-6.27,'wood');
  const lamp=new T.PointLight(i===3?0x965fff:0xffe0aa,24,15);lamp.position.set(0,3.4,0);room.add(lamp);
  return room;
 });
 function enter(id){const index=Math.max(0,HOMES.findIndex(h=>h.id===id));root.visible=true;rooms.forEach((r,i)=>r.visible=i===index);return HOMES[index]}
 function leave(){root.visible=false;rooms.forEach(r=>r.visible=false)}
 return {enter,leave,root};
}
