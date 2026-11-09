import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Each venue gets its own small batches so the renderer can cull whole sets.
export function buildUltra(city, coords, surface, sign, compact) {
  const material = (color, roughness, metalness = 0) =>
    new T.MeshStandardMaterial({color, roughness, metalness});
  const glow = (color, intensity) =>
    new T.MeshStandardMaterial({color, emissive: color, emissiveIntensity: intensity, roughness: .52});
  const brass = material(0xc69751, .36, .68);
  const black = material(0x171b21, .68, .12);
  const walnut = surface('wood', '#553526');
  const marble = surface('marble', '#373e3b');
  const upholstery = surface('velvet', '#14624f');
  const ochre = material(0xad693c, .94);
  const leaves = material(0x3e8050, .83);
  const amber = glow(0xffbd69, 1.5);
  const mint = glow(0x46ffbb, 1.3);
  const pink = glow(0xff45aa, 1.65);
  const blue = glow(0x55a8ff, 1.5);
  const products = [material(0xbb965c,.44), material(0x536c5c,.57), material(0x943e44,.64)];
  const cube = new T.BoxGeometry();
  const rounded = new RoundedBoxGeometry(1,1,1,compact ? 1 : 2,.12);
  const disc = new T.CylinderGeometry(.5,.5,1,compact ? 10 : 18);
  const speakerCone = disc.clone().rotateX(Math.PI/2);
  const leaf = new T.IcosahedronGeometry(.5,0);
  const transform = new T.Object3D();

  function batch(x, z, build) {
    const room = new T.Group();
    room.position.set(x,0,z);
    city.add(room);
    const parts = new Map();
    function add(mat, width, height, depth, x, y, z, geo = cube, roll = 0) {
      const key = geo.id + ':' + mat.id;
      if (!parts.has(key)) parts.set(key,{geo,mat,matrices:[]});
      transform.position.set(x,y,z);
      transform.scale.set(width,height,depth);
      transform.rotation.set(0,0,roll);
      transform.updateMatrix();
      parts.get(key).matrices.push(transform.matrix.clone());
    }
    build(add, room);
    for (const {geo,mat,matrices} of parts.values()) {
      const mesh = new T.InstancedMesh(geo,mat,matrices.length);
      matrices.forEach((matrix,i) => mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      // Trim is visually detailed but never intercepts destination or floor taps.
      mesh.raycast = () => {};
      room.add(mesh);
    }
  }

  coords.forEach(([x,z],i) => batch(x,z,(add,room) => {
    const edge = [mint, amber, amber, pink, blue, amber, mint][i];
    for (const side of [-1,1]) {
      add(brass,.095,3.15,.16,side*1.43,1.58,4.62);
      add(edge,.026,2.96,.025,side*1.43,1.58,4.72);
      add(black,3.5,.23,.2,side*3.25,3.21,4.58);
      add(amber,3.34,.026,.025,side*3.25,3.08,4.71);
    }
    add(edge,9.4,.037,.026,0,4.49,4.95);
    if (i !== 3) for (const side of [-1,1]) {
      add(brass,.03,.49,.03,side*2.45,3.96,-.6);
      add(black,.52,.24,.52,side*2.45,3.62,-.6,disc);
      add(amber,.43,.035,.43,side*2.45,3.49,-.6,disc);
    }

    if (i === 0) {
      // High Fidelity's illuminated shelving and record / display counters.
      add(walnut,9.42,2.7,.15,0,1.39,-4.23);
      for (const side of [-1,1]) {
        for (let row=0; row<4; row++) {
          const y = .42 + row*.58;
          add(walnut,3.82,.09,.56,side*2.58,y,-4);
          add(amber,3.74,.025,.035,side*2.58,y-.05,-3.71);
          for (let n=0; n<(compact ? 6 : 10); n++) {
            add(products[n%3],.22,.23+(n%4)*.06,.24,side*2.58+(n-(compact?2.5:4.5))*.34,y+.2,-3.92);
          }
        }
        add(black,2.35,.77,.72,side*3.17,.41,1.05,rounded);
        add(marble,2.48,.08,.83,side*3.17,.83,1.05);
        add(mint,2.14,.026,.026,side*3.17,.73,1.48);
      }
      sign('RECORDS · CULTURE · MAKERS',0,2.53,-4.11,3.05,room);
    }

    if (i === 1) {
      // The Green Room uses a planted wall, tufted banquettes and marble tables.
      add(walnut,9.42,2.7,.16,0,1.37,-4.26);
      const columns = compact ? 23 : 42;
      for (let n=0; n<columns*5; n++) {
        const px = (n%columns+.5)*9.1/columns-4.55;
        const y = .86+Math.floor(n/columns)*.33;
        add(leaves,.32,.49,.19,px,y+Math.sin(n*23)*.12,-4.06,leaf,Math.sin(n*11));
      }
      for (const side of [-1,1]) {
        const px = side*2.65;
        add(upholstery,3,.44,.93,px,.27,-2.7,rounded);
        add(upholstery,3,.67,.24,px,.81,-3.14,rounded);
        for (let n=0; n<8; n++) add(upholstery,.39,.54,.17,px+(n-3.5)*.345,.81,-2.98,rounded);
        for (const dx of [-1.39,1.39]) add(upholstery,.26,.44,.94,px+dx,.61,-2.68,rounded);
        for (const dx of [-.86,.76]) add(ochre,.37,.39,.18,px+dx,.77,-2.88,rounded,dx*.31);
        add(brass,.12,.53,.12,px,.3,-.86,disc);
        add(marble,1.48,.09,.8,px,.61,-.86,rounded);
        add(brass,1.43,.025,.75,px,.56,-.86,rounded);
      }
      sign('THE GREEN ROOM',0,2.43,-3.94,2.48,room);
    }

    if (i === 3) {
      // The Beat Garden stage lighting uses emissive panels and one animated wash.
      add(black,8.8,.35,2.28,0,.21,-3.11);
      add(pink,8.65,.045,.06,0,.34,-1.94);
      add(black,8.8,2.85,.13,0,1.8,-4.29);
      add(black,8.8,.16,.28,0,3.55,-2.8);
      for (let n=0; n<16; n++) {
        const px=(n-7.5)*.48, h=.32+1.32*Math.sin((n+1)*Math.PI/17);
        add(n%2 ? pink : blue,.078,h,.052,px,1.46+h*.27,-4.17);
      }
      for (const side of [-1,1]) {
        add(black,.83,1.6,.55,side*3.7,1.16,-2.94);
        for (const y of [.85,1.44]) add(walnut,.46,.46,.075,side*3.7,y,-2.61,speakerCone);
        add(blue,.1,.025,4,side*3.74,.065,.75);
      }
      sign('BEAT GARDEN / LIVE',0,2.76,-4.12,3.65,room);
    }

    if (i === 2 || i === 4 || i === 5 || i === 6) {
      for (const side of [-1,1]) {
        add(walnut,.13,2.48,2.1,side*4.79,1.65,-1.9);
        for (let n=0; n<8; n++) add(brass,.035,2.4,.035,side*4.69,1.65,-2.83+n*.266);
        add(edge,.025,.025,2.1,side*4.66,2.89,-1.9);
      }
    }
  }));

  // Side gardens and wayfinding mark the central route without narrowing it.
  for (const x of [-7,7]) batch(x,18,add => {
    for (const z of [-15,-6,5,12]) {
      add(marble,1.15,.44,2.8,0,.23,z,rounded);
      add(walnut,1.19,.07,2.85,0,.47,z,rounded);
      add(mint,.038,.045,2.58,x<0?.59:-.59,.38,z);
      for (let n=0; n<(compact ? 8 : 15); n++) {
        const angle=n*2.399;
        add(leaves,.39,.8,.41,Math.sin(angle)*.36,.63+Math.cos(n)*.15,z+(n%5-2)*.45,leaf,Math.sin(angle)*.65);
      }
    }
  });
  batch(0,25,add => {
    for (const side of [-1,1]) add(black,.18,3.54,.26,side*3.12,1.77,0);
    add(black,6.42,.95,.26,0,3.35,0);
    add(mint,6.34,.035,.022,0,3.79,.15);
  });
  sign('BEST BUDZ WORLD  /  CENTRAL PLAZA',0,3.32,25.17,5.7);

  const wash = new T.PointLight(0xffc894,0,10,2);
  city.add(wash);
  return function updateLighting(position,time) {
    let nearest=-1, distance=65;
    for (let i=0;i<coords.length;i++) {
      const [x,z]=coords[i];
      const d=(x-position.x)**2+(z-position.z)**2;
      if (d<distance) { nearest=i; distance=d; }
    }
    wash.intensity=nearest<0 ? 0 : 28*(1-distance/65);
    if (nearest<0) return;
    const [x,z]=coords[nearest];
    wash.position.set(x,3.05,z-.85);
    if (nearest===3) {
      wash.color.setHSL(.76+Math.sin(time*.65)*.12,.91,.64);
      wash.position.x+=Math.sin(time*.9)*2;
    } else {
      wash.color.set(nearest===0 ? 0xffbe7c : 0xffd2a3);
    }
  };
}
