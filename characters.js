import * as T from 'three';

// Detailed, articulated lightweight characters built with mesh-based garments,
// skin, eyes, hairstyles and accessories. All geometry stays Quest-friendly.
const mat=(color,roughness=.78,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const skinTones=['#82513d','#bd8160','#5f3e32','#d19e79','#a77457','#594338','#dda885','#90644f'];
const jackets=['#5c7564','#af6649','#3e6382','#8d637a','#786b50','#2f6d6b','#9f805b','#55566e'];
const trousers=['#202b36','#30343c','#39443a','#292a31','#423d3d'];
const hairTones=['#171411','#2a211b','#171819','#4b2f22'];

export function createHuman(index=0,options={}){
  const group=new T.Group();group.name='Resident '+(index+1);
  const skin=mat(skinTones[index%skinTones.length],.93);
  const hair=mat(hairTones[index%hairTones.length],.95);
  const jacket=mat(jackets[index%jackets.length],.82);
  const pants=mat(trousers[index%trousers.length],.95);
  const shoes=mat(index%2?'#e1ddd2':'#171b20',.67);
  const trim=mat('#d4b58c',.45,.34);
  const whites=mat('#f4e9dd',.55);
  const pupils=mat('#24201f',.28);
  const make=(geometry,material,parent,x=0,y=0,z=0)=>{
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);
    mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  };
  const sphere=(parent,m,x,y,z,sx,sy,sz,segments=12)=>{
    const mesh=make(new T.SphereGeometry(1,segments,9),m,parent,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;
  };
  const tube=(parent,m,x,y,z,r1,r2,h,segments=10)=>{
    return make(new T.CylinderGeometry(r1,r2,h,segments),m,parent,x,y,z);
  };
  const core=new T.Group();group.add(core);
  // Jacket with rounded shoulders and realistic body proportions.
  sphere(core,jacket,0,1.18,0,.26,.36,.17,16);
  sphere(core,mat('#272f31'),0,1.37,.149,.105,.17,.018);
  sphere(core,skin,0,1.58,0,.075,.115,.075);
  sphere(core,skin,0,1.755,0,.17,.22,.157,18);
  sphere(core,skin,0,1.68,.145,.076,.044,.04); // nose
  sphere(core,mat('#9d594f'),0,1.615,.151,.067,.011,.007); // lips
  for(const side of [-1,1]){
    sphere(core,skin,side*.162,1.76,0,.024,.055,.03);
    sphere(core,whites,side*.068,1.79,.147,.040,.025,.013);
    sphere(core,pupils,side*.068,1.79,.158,.016,.019,.009);
    sphere(core,hair,side*.068,1.823,.142,.045,.009,.009);
    sphere(core,trim,side*.115,1.38,.14,.015,.13,.012);
  }
  if(index%4===0){ // closely sculpted curls
    sphere(core,hair,0,1.92,-.017,.185,.098,.154,16);
    for(let j=0;j<9;j++){const a=j*Math.PI*2/9;sphere(core,hair,Math.cos(a)*.12,1.954,Math.sin(a)*.095,.055,.046,.055)}
  }else if(index%4===1){ // layered shoulder-length hairstyle
    sphere(core,hair,0,1.91,-.04,.18,.095,.15,16);
    for(const side of [-1,1])sphere(core,hair,side*.15,1.69,-.018,.055,.22,.074);
  }else if(index%4===2){ // short fade
    sphere(core,hair,0,1.932,-.02,.171,.06,.146,16);
    sphere(core,hair,0,1.60,.11,.108,.055,.058);
  }else{ // braided / textured ponytail
    sphere(core,hair,0,1.94,-.01,.173,.08,.155,16);
    for(let j=0;j<5;j++)sphere(core,hair,(j-2)*.067,1.99,.01,.024,.07,.04);
    sphere(core,hair,0,1.72,-.17,.079,.19,.077);
  }
  // Seamed jacket, fabric pockets, zipper.
  tube(core,trim,0,1.16,.166,.004,.004,.51,6);
  for(const side of [-1,1]){
    const pocket=sphere(core,trim,side*.13,1.11,.161,.062,.008,.006);
    pocket.rotation.z=side*.15;
    sphere(core,skin,side*.34,1.38,0,.115,.11,.13);
  }
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const shoulder=new T.Group();shoulder.position.set(side*.31,1.38,0);core.add(shoulder);
    sphere(shoulder,jacket,0,-.17,0,.105,.27,.103);
    sphere(shoulder,skin,0,-.44,.004,.076,.09,.079);
    tube(shoulder,trim,0,-.337,0,.095,.095,.014);
    arms.push(shoulder);
    const hip=new T.Group();hip.position.set(side*.12,.93,0);core.add(hip);
    sphere(hip,pants,0,-.28,0,.116,.37,.12);
    sphere(hip,shoes,0,-.71,.055,.125,.095,.20);
    tube(hip,trim,0,-.595,0,.101,.101,.013);
    legs.push(hip);
  }
  // Optional messenger bag differentiates silhouettes.
  if(index%3===0){
    const strap=make(new T.BoxGeometry(.025,.76,.015),mat('#b59568'),core,0,1.25,.184);
    strap.rotation.z=.4;
    sphere(core,mat('#45372b'),.19,.88,.15,.13,.16,.055);
  }
  if(options.outfitColor)jacket.color.set(options.outfitColor);
  group.userData.jacketMaterial=jacket;
  group.userData.limbs=[...arms,...legs];
  group.userData.breatheRoot=core;
  group.userData.skinMaterial=skin;
  return group;
}
