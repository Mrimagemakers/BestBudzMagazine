export function isAdult(value,now=new Date()){if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const date=new Date(y,m-1,d);if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d)return false;let age=now.getFullYear()-y;if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d))age--;return age>=21&&age<130}
export function validRoom(value){return typeof value==='string'&&/^[a-zA-Z0-9-]{3,40}$/.test(value)}
export function consumeToken(tokens,token,now=Date.now()){const record=tokens.get(token);tokens.delete(token);return record&&record.expires>now?record.email:null}

export const WORLD_COORDS = [[-16,-16],[0,-16],[16,-16],[-16,3],[16,3],[-16,22],[16,22]];
export function buildingWalls(x,z){
  return [
    {minX:x-5.2,maxX:x+5.2,minZ:z-4.625,maxZ:z-4.375},
    ...[-5,5].map(dx=>({minX:x+dx-.125,maxX:x+dx+.125,minZ:z-4.5,maxZ:z+4.5})),
    ...[-3.2,3.2].map(dx=>({minX:x+dx-1.8,maxX:x+dx+1.8,minZ:z+4.35,maxZ:z+4.65}))
  ];
}
export function blockedAt(x,z,walls,radius=.24){return walls.some(w=>x>w.minX-radius&&x<w.maxX+radius&&z>w.minZ-radius&&z<w.maxZ+radius)}

// ---------------------------------------------------------------------------
// District layout: Central Plaza (south) connects to the Budz Marketplace
// (north) through two walkable gateway corridors that pass between venues.
// ---------------------------------------------------------------------------
export const WALK_REGIONS = [
  {name:'plaza', minX:-27, maxX:27, minZ:-26, maxZ:33},
  {name:'gate-west', minX:-10.2, maxX:-5.8, minZ:-37, maxZ:-25.5},
  {name:'gate-east', minX:5.8, maxX:10.2, minZ:-37, maxZ:-25.5},
  {name:'market', minX:-25, maxX:25, minZ:-95, maxZ:-36.5}
];
export function walkable(x,z){return WALK_REGIONS.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ)}
export function districtAt(z){return z<-33?'market':'plaza'}

// Marketplace storefronts: [x, z, rotationY]. Local fronts face +z; west row
// turns +90° to face the boulevard (east), east row turns -90° (west).
export const MARKET_LAYOUT = [
  [-14,-52, Math.PI/2],  // 0 Dispensary showroom
  [ 14,-52,-Math.PI/2],  // 1 Accessories
  [-14,-66, Math.PI/2],  // 2 Fashion boutique
  [ 14,-66,-Math.PI/2],  // 3 Best Budz merch
  [-14,-80, Math.PI/2]   // 4 Art gallery
];
const r6 = v => Math.round(v*1e6)/1e6;
export function toWorld(lx,lz,x,z,rot){const c=r6(Math.cos(rot)),s=r6(Math.sin(rot));return [x+lx*c+lz*s, z-lx*s+lz*c]}
export function placeWalls(local,x,z,rot){
  return local.map(w=>{
    const pts=[[w.minX,w.minZ],[w.maxX,w.minZ],[w.minX,w.maxZ],[w.maxX,w.maxZ]].map(([a,b])=>toWorld(a,b,x,z,rot));
    const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
    return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
  });
}
export function marketWalls(){return MARKET_LAYOUT.flatMap(([x,z,rot])=>placeWalls(buildingWalls(0,0),x,z,rot))}

// Transit portals: step into the ring (or select it) to travel. Arrival points
// sit outside the trigger radius so travellers are not bounced straight back.
export const PORTAL_RADIUS = .8;
export const PORTALS = [
  {id:'plaza',  label:'Central Plaza',    x:-7, z:22,  to:'market', arrive:{x:-7, z:24.4, yaw:0}},
  {id:'market', label:'Budz Marketplace', x:0,  z:-91, to:'plaza',  arrive:{x:0,  z:-88.6, yaw:Math.PI}}
];
export function portalAt(x,z){return PORTALS.find(p=>Math.hypot(x-p.x,z-p.z)<PORTAL_RADIUS)||null}
// Pedestal slots inside a storefront (local coords, door at +z). The centre
// aisle (x≈0) stays clear so the doorway route always reaches the back wall.
export const PRODUCT_SLOTS = [[-3.3,-3],[-1.1,-3],[1.1,-3],[3.3,-3],[-3.9,-.6],[3.9,-.6],[-3.9,1.4]];
// Group-session location messages for districts (shop -1 = out on the street).
export function validVisit(m){return !!m&&(m.district==='plaza'||m.district==='market')&&Number.isInteger(m.shop)&&m.shop>=-1&&m.shop<MARKET_LAYOUT.length&&(m.district==='market'||m.shop===-1)}
