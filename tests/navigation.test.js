import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_COORDS,buildingWalls,blockedAt} from '../logic.js';
const walls=WORLD_COORDS.flatMap(([x,z])=>buildingWalls(x,z));
test('all seven venues have a continuous walk-in and walk-out doorway route',()=>{
  for(const [x,z] of WORLD_COORDS){
    for(let dz=7;dz>=-3;dz-=.1)assert.equal(blockedAt(x,z+dz,walls),false,`Doorway route blocked at ${x},${z+dz}`);
    for(const dx of [-5,5])assert.equal(blockedAt(x+dx,z,walls),true,'Side wall must be solid');
    assert.equal(blockedAt(x,z-4.5,walls),true,'Back wall must be solid');
    for(const dx of [-3.2,3.2])assert.equal(blockedAt(x+dx,z+4.5,walls),true,'Window must be solid');
    assert.equal(blockedAt(x+1.3,z+4.5,walls),true,'Player radius must protect doorway jamb');
  }
});
test('main plaza route and NPC visitor paths remain unobstructed',()=>{
  for(let z=-8;z<33;z+=.1)for(const x of [-5,0,5])assert.equal(blockedAt(x,z,walls),false);
});
