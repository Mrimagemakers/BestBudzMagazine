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
