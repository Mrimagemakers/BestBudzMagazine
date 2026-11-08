import * as T from 'three';
export const HOMES=[
 {id:'luxury_loft',name:'Luxury Loft',wall:0xd3c8b6,floor:0x8d6b4c,accent:0xd3b16d},
 {id:'rundown_house',name:'Rundown House',wall:0x706b5d,floor:0x554b3f,accent:0x9a765d},
 {id:'beach_house',name:'Coastal Beach House',wall:0xd7e6dc,floor:0xb9a47b,accent:0x5faeb7},
 {id:'gamer_paradise',name:"Gamer's Paradise",wall:0x292943,floor:0x292b38,accent:0x9c5fff},
 {id:'forest_cabin',name:'Cabin in the Woods',wall:0x81674a,floor:0x644b37,accent:0xd7a35d}
];
export function buildHomes(scene){
 const root=new T.Group();root.visible=false;scene.add(root);
 const rooms=HOMES.map((h,i)=>{
  const room=new T.Group();room.visible=false;root.add(room);
  const material=(c,metalness=0)=>new T.MeshStandardMaterial({color:c,roughness:.75,metalness});
  function box(w,ht,d,c,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,ht,d),material(c));m.position.set(x,y,z);m.receiveShadow=true;room.add(m);return m}
  box(13,.15,13,h.floor,0,-.1,0);
  box(13,4,.2,h.wall,0,2,-6.5);box(.2,4,13,h.wall,-6.5,2,0);box(.2,4,13,h.wall,6.5,2,0);
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
  const lamp=new T.PointLight(i===3?0x965fff:0xffe0aa,24,15);lamp.position.set(0,3.4,0);room.add(lamp);
  return room;
 });
 function enter(id){const index=Math.max(0,HOMES.findIndex(h=>h.id===id));root.visible=true;rooms.forEach((r,i)=>r.visible=i===index);return HOMES[index]}
 function leave(){root.visible=false;rooms.forEach(r=>r.visible=false)}
 return {enter,leave,root};
}
