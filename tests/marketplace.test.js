import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_COORDS, MARKET_LAYOUT, PRODUCT_SLOTS, PORTALS, PORTAL_RADIUS, buildingWalls, placeWalls, marketWalls, blockedAt, walkable, toWorld, portalAt, validVisit, districtAt} from '../logic.js';
import {SHOPS, MARKET_CONFIG} from '../marketplace-data.js';

// Rebuild the same collision set the 3D district uses: shells, pedestals, counters, median planters.
const shopWalls = MARKET_LAYOUT.flatMap(([x, z, rot], si) => {
  let slot = 0;
  const pedestals = SHOPS[si].products.filter(p => !p.wall).map(p => {const [lx, lz] = PRODUCT_SLOTS[p.slot ?? slot++]; return {minX:lx - .36, maxX:lx + .36, minZ:lz - .36, maxZ:lz + .36}});
  return placeWalls([...pedestals, {minX:2.65, maxX:4.15, minZ:.8, maxZ:1.4}], x, z, rot);
});
const planters = [-50, -62, -74].map(z => ({minX:-.9, maxX:.9, minZ:z - 1.7, maxZ:z + 1.7}));
const plazaWalls = WORLD_COORDS.flatMap(([x, z]) => buildingWalls(x, z));
const walls = [...plazaWalls, ...marketWalls(), ...shopWalls, ...planters];
const clear = (x, z) => walkable(x, z) && !blockedAt(x, z, walls);

test('every storefront faces the boulevard with a clear doorway route to the back displays', () => {
  MARKET_LAYOUT.forEach(([x, z, rot], si) => {
    const [fx] = toWorld(0, 4.5, x, z, rot);
    assert.ok(Math.abs(fx) < Math.abs(x), `${SHOPS[si].name} must face the boulevard`);
    for (let lz = 7; lz >= -2.2; lz -= .1) {const [wx, wz] = toWorld(0, lz, x, z, rot); assert.ok(clear(wx, wz), `${SHOPS[si].name} route blocked at local z=${lz.toFixed(1)}`)}
    for (const [lx, lz] of [[-5, 0], [5, 0], [0, -4.5], [-3.2, 4.5], [3.2, 4.5]]) {const [wx, wz] = toWorld(lx, lz, x, z, rot); assert.equal(blockedAt(wx, wz, walls), true, `${SHOPS[si].name} wall/window must be solid at ${lx},${lz}`)}
  });
});

test('both gateways connect the plaza to the marketplace on foot', () => {
  for (const x of [-8, 8]) for (let z = -18; z >= -60; z -= .1) assert.ok(clear(x, z), `gateway route blocked at ${x},${z.toFixed(1)}`);
  for (let z = -40; z >= -88; z -= .1) for (const x of [-4.5, 4.5]) assert.ok(clear(x, z), `boulevard blocked at ${x},${z.toFixed(1)}`);
  for (let z = -84; z >= -90.5; z -= .1) assert.ok(clear(0, z), 'route to the transit ring must be clear');
  assert.equal(walkable(0, -30), false, 'hedge line between gateways is not walkable');
  assert.equal(districtAt(-60), 'market'); assert.equal(districtAt(10), 'plaza');
});

test('transit portals are reachable and arrivals do not re-trigger', () => {
  for (const p of PORTALS) {
    assert.ok(clear(p.x, p.z), `${p.id} portal must be reachable`);
    assert.ok(clear(p.arrive.x, p.arrive.z), `${p.id} arrival must be walkable`);
    assert.ok(Math.hypot(p.arrive.x - p.x, p.arrive.z - p.z) > PORTAL_RADIUS * 2, 'arrival sits outside the trigger');
    assert.equal(portalAt(p.arrive.x, p.arrive.z), null);
    assert.ok(PORTALS.some(q => q.id === p.to), 'portal destination exists');
  }
});

test('shop data is complete and retailer links stay gated', () => {
  assert.equal(SHOPS.length, MARKET_LAYOUT.length);
  for (const s of SHOPS) {
    assert.ok(s.name && s.host?.length === 3 && s.products.length);
    for (const p of s.products) assert.ok(p.name && p.model && p.details.length, `${s.name} product incomplete`);
    const used = s.products.filter(p => !p.wall).length; assert.ok(used <= PRODUCT_SLOTS.length);
  }
  assert.ok(MARKET_CONFIG.retailers.every(r => r.verified === true && /^https:\/\//.test(r.url) && r.jurisdiction), 'retailer entries must be verified https links with a jurisdiction');
});

test('group visit messages are validated', () => {
  assert.equal(validVisit({district:'market', shop:2}), true);
  assert.equal(validVisit({district:'plaza', shop:-1}), true);
  assert.equal(validVisit({district:'plaza', shop:2}), false);
  assert.equal(validVisit({district:'market', shop:9}), false);
  assert.equal(validVisit({district:'mars', shop:0}), false);
});
