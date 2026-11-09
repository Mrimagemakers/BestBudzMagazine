// Budz Marketplace district: a walkable boulevard north of the Central Plaza
// with five storefronts, a pocket park, gateways and transit portals.
// Every model and texture is generated procedurally; nothing is downloaded.
import {SHOPS} from './marketplace-data.js';
import {MARKET_LAYOUT, PRODUCT_SLOTS, PORTALS, buildingWalls, placeWalls, toWorld} from './logic.js';

export function buildMarketplace(k) {
  const {T, city, box, cyl, sphere, mesh, mat, walls, wood, stone, plaster, brick, metal, glass} = k;
  const products = [], portals = [], spinners = [];
  let seed = 404;
  const rand = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296};

  // ---------- canvas helpers ----------
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function panel(w, h, tex, x, y, z, parent, opts = {}) {
    const m = opts.lit ? new T.MeshStandardMaterial({map:tex, roughness:.6, side:T.DoubleSide})
                       : new T.MeshBasicMaterial({map:tex, side:T.DoubleSide, transparent:!!opts.transparent});
    const o = mesh(new T.PlaneGeometry(w, h), m, x, y, z, parent); o.castShadow = false; return o;
  }
  function label(text, {w = 3, bg = '#14261f', fg = '#f6efd9', edge = '#d5ee83', font = 600, ratio = 6, neon = false} = {}) {
    return canvasTex(1024, Math.round(1024 / ratio), (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      if (edge) {g.strokeStyle = edge; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20)}
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `${font} ${Math.round(H * .42)}px "DM Sans", sans-serif`;
      if (neon) {g.shadowColor = fg; g.shadowBlur = 24}
      g.fillText(text, W / 2, H / 2 + 2, W - 60);
    });
  }
  function leaf(g, cx, cy, size, color) {
    // Seven-leaflet silhouette.
    g.save(); g.translate(cx, cy); g.fillStyle = color;
    [[-80,.42],[-52,.66],[-25,.88],[0,1],[25,.88],[52,.66],[80,.42]].forEach(([deg, len]) => {
      g.save(); g.rotate(deg * Math.PI / 180); g.beginPath();
      g.ellipse(0, -size * len / 2, size * .085, size * len / 2, 0, 0, Math.PI * 2); g.fill(); g.restore();
    });
    g.fillRect(-size * .02, 0, size * .04, size * .3); g.restore();
  }
  function logoTex(bg = '#14261f', fg = '#d5ee83') {
    return canvasTex(512, 512, (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H); leaf(g, W / 2, H * .55, H * .55, fg + '33');
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${H * .38}px "Playfair Display", Georgia, serif`; g.fillText('BB', W / 2, H * .5);
    });
  }
  function coverTex(issue = '01') {
    return canvasTex(512, 680, (g, W, H) => {
      const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#1d4a37'); grd.addColorStop(1, '#0e1814');
      g.fillStyle = grd; g.fillRect(0, 0, W, H); leaf(g, W * .62, H * .66, H * .55, '#d5ee8355');
      g.fillStyle = '#d5ee83'; g.font = '700 74px "Playfair Display", Georgia, serif'; g.fillText('BEST', 34, 100); g.fillText('BUDZ', 34, 172);
      g.fillStyle = '#f6efd9'; g.font = '500 22px "DM Sans", sans-serif';
      g.fillText('CULTURE · MUSIC · FILM · POLITICS', 36, 214); g.fillText('ISSUE ' + issue + ' · THE IMMERSIVE ISSUE', 36, H - 40);
    });
  }
  function artTex(s) {
    let a = s * 9301 + 49297; const r = () => {a = (a * 9301 + 49297) % 233280; return a / 233280};
    const pal = [['#1b3b32','#d5ee83','#e4a25f','#f4ecd8'],['#2a1f3d','#9c8db6','#f0c36b','#e9e1f4'],['#3b1f1a','#d48f74','#8fbf6a','#f6e7d2']][s % 3];
    return canvasTex(640, 800, (g, W, H) => {
      g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {g.globalAlpha = .25 + r() * .5; g.fillStyle = pal[1 + (i % 3)]; g.beginPath(); g.arc(r() * W, r() * H, 30 + r() * 160, 0, Math.PI * 2); g.fill()}
      g.globalAlpha = .9; g.strokeStyle = pal[3]; g.lineWidth = 6;
      for (let i = 0; i < 5; i++) {g.beginPath(); for (let x = 0; x <= W; x += 16) g.lineTo(x, H * (.2 + i * .15) + Math.sin(x / 50 + i + s) * 24); g.stroke()}
      g.globalAlpha = 1; leaf(g, W * (.3 + r() * .4), H * .62, H * .35, pal[1]);
    });
  }

  // ---------- product models (local, base at y=0, ~0.5 m) ----------
  const amber = new T.MeshStandardMaterial({color:0x9a5a17, transparent:true, opacity:.75, roughness:.15});
  const green = 0x5e8a3f, lime = 0xd5ee83, dark = 0x18241e;
  function model(p, shopIdx, prodIdx) {
    const g = new T.Group();
    const b = (w, h, d, c, x, y, z) => box(w, h, d, c, x, y, z, g);
    const c = (r, h, m, x, y, z) => cyl(r, h, m, x, y, z, g);
    const s = (r, m, x, y, z) => sphere(r, m, x, y, z, g);
    switch (p.model) {
      case 'jar': {c(.17, .34, glass, 0, .17, 0); c(.18, .05, metal, 0, .365, 0); for (let i = 0; i < 7; i++) {const o = s(.06 + rand() * .03, green, (rand() - .5) * .18, .07 + rand() * .2, (rand() - .5) * .18); o.scale.y = 1.4} break}
      case 'preroll': {for (let i = 0; i < 3; i++) {const o = mesh(new T.ConeGeometry(.035, .32, 10), 0xf1ead9, (i - 1) * .1, .16, 0, g); o.rotation.x = Math.PI}; b(.34, .06, .14, dark, 0, .03, 0); break}
      case 'edible': {b(.3, .2, .08, 0x23332b, 0, .1, 0); panel(.28, .07, label('CHILD-RESISTANT · 21+', {bg:'#f0c74a', fg:'#1b1b1b', edge:null, ratio:4}), 0, .16, .041, g); panel(.26, .09, logoTex('#23332b'), 0, .07, .041, g); break}
      case 'tincture': {c(.07, .2, amber, 0, .1, 0); c(.035, .06, dark, 0, .23, 0); s(.035, dark, 0, .28, 0); break}
      case 'topical': {const j = c(.13, .09, 0xeee6d3, -.08, .045, 0); c(.135, .03, lime, -.08, .1, 0); const t = c(.04, .26, 0xeee6d3, .14, .13, 0); t.scale.z = .5; j.castShadow = true; break}
      case 'vape': {c(.022, .18, dark, 0, .09, 0); c(.02, .08, amber, 0, .22, 0); c(.012, .02, metal, 0, .27, 0); break}
      case 'coa': {b(.34, .44, .02, 0xb8946a, 0, .22, 0); panel(.3, .36, canvasTex(300, 360, (x, W, H) => {x.fillStyle = '#fbf8ef'; x.fillRect(0, 0, W, H); x.fillStyle = '#14261f'; x.font = '700 30px sans-serif'; x.fillText('COA', 18, 42); x.font = '15px sans-serif'; ['Lot #  ··········', 'Tested ··········', 'THC  ··  %', 'CBD  ··  %', 'Pesticides  PASS', 'Metals  PASS', 'Microbials  PASS', 'Solvents  PASS'].forEach((t, i) => x.fillText(t, 18, 84 + i * 32))}), 0, .22, .012, g, {lit:true}); break}
      case 'stashjar': {c(.15, .26, 0x1f2a26, 0, .13, 0); c(.16, .06, metal, 0, .29, 0); panel(.18, .08, label('SMELL-PROOF', {ratio:3, edge:null}), 0, .14, .152, g); break}
      case 'grinder': {for (let i = 0; i < 4; i++) c(.12, .055, i % 2 ? 0x8fa79a : 0x5f7569, 0, .03 + i * .058, 0); break}
      case 'tray': {b(.46, .02, .32, 0x2f5a46, 0, .01, 0); for (const [w, d, x, z] of [[.46, .02, 0, .16], [.46, .02, 0, -.16], [.02, .32, .23, 0], [.02, .32, -.23, 0]]) b(w, .04, d, 0x2f5a46, x, .03, z); const l = panel(.14, .14, logoTex('#2f5a46'), 0, .022, 0, g); l.rotation.x = -Math.PI / 2; break}
      case 'stashbox': {b(.36, .16, .24, wood, 0, .08, 0); b(.37, .03, .25, 0x4b3420, 0, .175, 0); b(.07, .05, .02, metal, 0, .1, .125); break}
      case 'humidity': {for (let i = 0; i < 3; i++) {const o = b(.16, .2, .015, 0xe8e2cf, (i - 1) * .06, .1, (i - 1) * .02); o.rotation.y = (i - 1) * .2} break}
      case 'tee': case 'hoodie': {
        const col = p.color; c(.012, .5, metal, 0, .25, 0);
        b(.36, .4, .1, col, 0, .62, 0); for (const sd of [-1, 1]) {const a = b(.12, p.model === 'hoodie' ? .34 : .14, .09, col, sd * .23, p.model === 'hoodie' ? .58 : .73, 0); a.rotation.z = sd * .25}
        if (p.model === 'hoodie') {const h = s(.13, col, 0, .86, -.03); h.scale.set(1, .9, .8)}
        panel(.16, .16, logoTex('#00000000', p.model === 'tee' ? '#1d4a37' : '#d5ee83'), 0, .66, .052, g, {transparent:true}); break}
      case 'cap': {c(.012, .3, metal, 0, .15, 0); const d = mesh(new T.SphereGeometry(.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), p.color, 0, .3, 0, g); d.scale.y = .8; const br = c(.13, .015, p.color, 0, .3, .12); br.scale.x = .9; panel(.1, .05, label('Budz', {ratio:2, bg:'#18241e', edge:null, fg:'#d5ee83', font:'italic 700'}), 0, .37, .125, g); break}
      case 'joggers': {c(.012, .3, metal, 0, .15, 0); b(.3, .06, .14, p.color, 0, .62, 0); for (const sd of [-1, 1]) {const l = c(.07, .44, p.color, sd * .08, .38, 0); l.rotation.z = sd * .05} break}
      case 'sneaker': {b(.36, .05, .14, 0xf8f4ea, 0, .025, 0); const u = s(.11, p.color, -.02, .09, 0); u.scale.set(1.5, .7, .62); b(.1, .12, .12, p.color, -.12, .1, 0); b(.36, .015, .145, lime, 0, .055, 0); break}
      case 'magazine': {for (let i = 0; i < 4; i++) {const m = b(.3, .012, .4, 0xe9e2cf, (rand() - .5) * .03, .006 + i * .013, (rand() - .5) * .03); m.rotation.y = (rand() - .5) * .2} const cov = panel(.3, .4, coverTex(), 0, .06, 0, g, {lit:true}); cov.rotation.x = -Math.PI / 2 + .0001; const st = panel(.3, .4, coverTex('01'), 0, .25, -.05, g, {lit:true}); st.rotation.x = -.25; break}
      case 'mug': {const m = c(.08, .18, 0xf3ecdc, 0, .09, 0); m.castShadow = true; const h = mesh(new T.TorusGeometry(.05, .014, 8, 16), 0xf3ecdc, .09, .1, 0, g); h.rotation.y = Math.PI / 2; panel(.08, .08, logoTex('#f3ecdc', '#1d4a37'), 0, .1, .081, g); break}
      case 'tote': {b(.34, .38, .03, 0xe7dcc2, 0, .19, 0); const h = mesh(new T.TorusGeometry(.08, .012, 6, 16, Math.PI), 0xe7dcc2, 0, .38, 0, g); panel(.2, .2, logoTex('#e7dcc2', '#1d4a37'), 0, .2, .017, g); break}
      case 'poster': {b(.42, .56, .03, dark, 0, .3, 0); panel(.38, .5, coverTex(), 0, .3, .017, g, {lit:true}); break}
      case 'stickers': {for (let i = 0; i < 6; i++) {const d = mesh(new T.CircleGeometry(.05, 16), new T.MeshBasicMaterial({map:i % 2 ? logoTex() : logoTex('#d5ee83', '#14261f'), side:T.DoubleSide}), (i % 3 - 1) * .11, .01, (i < 3 ? -1 : 1) * .06, g); d.rotation.x = -Math.PI / 2} break}
      case 'art': {b(1.5, 1.9, .06, 0x2b2118, 0, 0, 0); panel(1.36, 1.72, artTex(p.seed), 0, 0, .035, g, {lit:true}); break}
      case 'sculpture': {const k1 = mesh(new T.TorusKnotGeometry(.18, .055, 96, 12, 2, 3), new T.MeshStandardMaterial({color:0xc9a36a, metalness:.8, roughness:.25}), 0, .32, 0, g); k1.castShadow = true; break}
      default: s(.12, lime, 0, .12, 0);
    }
    g.traverse(o => {if (o.isMesh) o.userData.product = [shopIdx, prodIdx]});
    return g;
  }

  // ---------- ground, edges and gateways ----------
  box(130, .2, 80, k.surface('noise', '#61714b'), 0, -.18, -70);
  const pave = box(50, .08, 62, stone, 0, -.04, -65.5); pave.userData.floor = true;
  for (const [x0, x1] of [[-10.2, -5.8], [5.8, 10.2]]) {const lane = box(x1 - x0, .08, 11, stone, (x0 + x1) / 2, -.035, -31.5); lane.userData.floor = true}
  // Hedges outline the walkable area; walkability itself is enforced in logic.js.
  const hedge = 0x3f6340;
  for (const [x0, x1] of [[-27, -10.4], [-5.6, 5.6], [10.4, 27]]) box(x1 - x0, .9, .8, hedge, (x0 + x1) / 2, .45, -34);
  for (const sd of [-1, 1]) {box(.8, .9, 60, hedge, sd * 25.7, .45, -66); box(.8, .9, 11, hedge, sd * 10.7, .45, -31.5); box(.8, .9, 11, hedge, sd * 5.3, .45, -31.5)}
  box(52, .9, .8, hedge, 0, .45, -95.7);
  for (const gx of [-8, 8]) {
    for (const dx of [-2.45, 2.45]) {box(.5, 4.6, .5, brick, gx + dx, 2.3, -26.5); sphere(.22, new T.MeshStandardMaterial({color:0xffe9b5, emissive:0xffcb76, emissiveIntensity:.8}), gx + dx, 4.8, -26.5)}
    box(5.4, .4, .5, 0x14261f, gx, 4.4, -26.5);
    panel(5, .55, label('BUDZ MARKETPLACE  →', {ratio:9, neon:true}), gx, 4.4, -26.24, city);
  }
  // Grand arch over the boulevard entrance.
  for (const dx of [-12.5, 12.5]) box(.9, 7, .9, brick, dx, 3.5, -38);
  box(26, 1.3, .9, 0x14261f, 0, 6.9, -38);
  panel(24, 1.15, label('BUDZ MARKETPLACE', {ratio:20, neon:true, font:700}), 0, 6.9, -37.53, city);
  panel(24, 1.15, label('← CENTRAL PLAZA', {ratio:20, neon:true}), 0, 6.9, -38.47, city).rotation.y = Math.PI;

  // ---------- boulevard: median planters, lamps, string lights, trees ----------
  for (const z of [-50, -62, -74]) {
    box(1.8, .5, 3.4, stone, 0, .25, z); for (let i = 0; i < 3; i++) k.plant(0, z - 1 + i, .8);
    walls.push({minX:-.9, maxX:.9, minZ:z - 1.7, maxZ:z + 1.7});
  }
  const bulbMat = new T.MeshStandardMaterial({color:0xfff0c4, emissive:0xffcf7a, emissiveIntensity:1.4});
  for (const z of [-44, -59, -73, -87]) {
    for (const x of [-8, 8]) {cyl(.06, 4.4, metal, x, 2.2, z); sphere(.18, bulbMat, x, 4.45, z)}
    const pts = []; for (let i = 0; i <= 16; i++) {const t = i / 16; pts.push(new T.Vector3(-8 + t * 16, 4.3 - Math.sin(t * Math.PI) * .6, z))}
    city.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({color:0x2a2a22})));
    for (let i = 1; i < 16; i += 2) sphere(.06, bulbMat, pts[i].x, pts[i].y - .08, z);
  }
  for (let z = -42; z >= -92; z -= 7) for (const x of [-23.5, 23.5]) {
    cyl(.23, 3.4, wood, x, 1.7, z); for (let j = 0; j < 4; j++) {const cr = sphere(1.4, 0x4f7048, x + (rand() - .5) * 1.2, 3.7 + rand(), z + (rand() - .5) * 1.2); cr.scale.y = 1.3}
    walls.push({minX:x - .3, maxX:x + .3, minZ:z - .3, maxZ:z + .3});
  }

  // ---------- pocket park: Budz Garden ----------
  const lawn = box(13, .06, 12, 0x5f8a4a, 16.5, .02, -80); lawn.userData.floor = true;
  panel(5, .8, label('BUDZ GARDEN · PUBLIC PARK', {ratio:6}), 10.4, 2.6, -80, city).rotation.y = -Math.PI / 2;
  for (const dz of [-2.4, 2.4]) cyl(.06, 2.2, metal, 10.45, 1.1, -80 + dz);
  for (const [x, z, r] of [[12.5, -84, 0], [20.5, -84, 0], [21.5, -78, -Math.PI / 2]]) {
    const bg = new T.Group(); bg.position.set(x, 0, z); bg.rotation.y = r; city.add(bg);
    box(1.9, .12, .55, wood, 0, .48, 0, bg); box(1.9, .5, .08, wood, 0, .8, -.26, bg); for (const a of [-.8, .8]) box(.08, .45, .5, metal, a, .22, 0, bg);
  }
  // Leaf sculpture centrepiece.
  const leafShape = new T.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.55, 1.2, 0, 2.6); leafShape.quadraticCurveTo(-.55, 1.2, 0, 0);
  const leafGeo = new T.ExtrudeGeometry(leafShape, {depth:.08, bevelEnabled:false});
  const leafMat = new T.MeshStandardMaterial({color:0x8fbf6a, metalness:.55, roughness:.3});
  const sculpt = new T.Group(); sculpt.position.set(16.5, .6, -80); city.add(sculpt);
  cyl(.7, .6, stone, 0, -.3, 0, sculpt);
  [-75, -48, -22, 0, 22, 48, 75].forEach((d, i) => {const l = mesh(leafGeo, leafMat, 0, 0, 0, sculpt); const sc = [.45, .68, .9, 1, .9, .68, .45][i]; l.scale.set(sc, sc, 1); l.rotation.z = -d * Math.PI / 180});
  spinners.push({o:sculpt, speed:.15});
  walls.push({minX:15.6, maxX:17.4, minZ:-80.9, maxZ:-79.1});
  for (const [x, z] of [[11, -75.5], [22.5, -85.5]]) {cyl(.23, 3.2, wood, x, 1.6, z); for (let j = 0; j < 3; j++) sphere(1.2, 0x55784a, x + (rand() - .5), 3.5 + rand() * .6, z + (rand() - .5)); walls.push({minX:x - .3, maxX:x + .3, minZ:z - .3, maxZ:z + .3})}

  // ---------- storefronts ----------
  SHOPS.forEach((shop, si) => {
    const [x, z, rot] = MARKET_LAYOUT[si];
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; city.add(g);
    walls.push(...placeWalls(buildingWalls(0, 0), x, z, rot));
    const accent = mat(shop.accent), gallery = shop.id === 'gallery';
    const floor = box(10, .08, 9, gallery ? stone : wood, 0, 0, 0, g); floor.userData.floor = true;
    const wallMat = gallery ? k.surface('noise', '#efe9dc') : si % 2 ? plaster : brick;
    box(10.4, 4.4, .25, wallMat, 0, 2.2, -4.5, g);
    for (const dx of [-5, 5]) box(.25, 4.4, 9, wallMat, dx, 2.2, 0, g);
    for (const dx of [-3.2, 3.2]) {
      box(3.6, 1, .25, brick, dx, .5, 4.5, g); box(3.6, 2.3, .08, glass, dx, 2.15, 4.5, g);
      box(3.6, .12, .3, metal, dx, 3.3, 4.5, g); for (const a of [-1.7, 0, 1.7]) box(.07, 2.35, .15, metal, dx + a, 2.15, 4.56, g);
    }
    box(10, 1, .3, plaster, 0, 3.9, 4.5, g); box(10.7, .24, 9.7, plaster, 0, 4.5, 0, g);
    box(10.7, .12, 1.3, accent, 0, 3.5, 5, g);
    box(10.7, .05, .05, new T.MeshStandardMaterial({color:shop.accent, emissive:shop.accent, emissiveIntensity:1.2}), 0, 3.43, 5.66, g);
    const title = panel(7, 1.1, label(shop.name.toUpperCase(), {ratio:6.4, neon:true, edge:'#' + shop.accent.toString(16).padStart(6, '0')}), 0, 3.92, 4.68, g);
    title.traverse(o => o.userData.shop = si);
    panel(2.5, .4, label('OPEN · WALK INSIDE', {ratio:6}), 0, 2.85, 4.65, g);
    panel(5.5, .55, label(shop.tagline, {ratio:10, edge:null}), 0, 2.9, -4.33, g);
    const glow = new T.MeshStandardMaterial({color:0xffedc8, emissive:0xffd39b, emissiveIntensity:.9});
    for (const gz of [1.5, -1.5]) box(3, .04, .4, glow, 0, 4.33, gz, g);
    for (const dx of [-4.1, 4.1]) {const [px, pz] = toWorld(dx, 5.6, x, z, rot); k.plant(px, pz, .8)}
    // Service counter and host.
    box(1.5, .95, .6, wood, 3.4, .48, 1.1, g); box(1.6, .06, .7, stone, 3.4, .98, 1.1, g);
    walls.push(...placeWalls([{minX:2.65, maxX:4.15, minZ:.8, maxZ:1.4}], x, z, rot));
    const [hx, hz] = toWorld(3.3, 2.3, x, z, rot); k.createNPC(hx, hz, 20 + si, false, shop.host, rot);

    // Shop-specific dressing.
    if (shop.id === 'dispensary') {
      const s1 = panel(3.2, 1.6, canvasTex(800, 400, (c, W, H) => {c.fillStyle = '#14261f'; c.fillRect(0, 0, W, H); c.fillStyle = '#d5ee83'; c.font = '700 40px sans-serif'; c.fillText('READ THE LABEL', 30, 62); c.fillStyle = '#f6efd9'; c.font = '26px sans-serif'; ['✓ Cannabinoid content per serving & package', '✓ Lot / batch number & testing lab', '✓ Packaged or harvest date', '✓ Universal THC symbol & warnings', '✓ Licensed producer & retailer'].forEach((t, i) => c.fillText(t, 30, 120 + i * 52))}), -4.86, 2.55, 1.6, g);
      s1.rotation.y = Math.PI / 2;
      panel(3, .5, label('EDUCATION ONLY · NO SALES ON-SITE · 21+', {ratio:10, bg:'#f0c74a', fg:'#1b1b1b', edge:null}), 0, 3.55, -4.33, g);
    }
    if (shop.id === 'fashion') {
      box(.06, .06, 4, metal, 4.4, 1.8, -1.6, g); for (const dz of [-3.5, .3]) box(.05, 1.8, .05, metal, 4.4, .9, dz, g);
      for (let i = 0; i < 9; i++) {const tee = box(.05, .7, .5, [0x2f5a46, 0xf2ead6, 0xd48f74, 0x18241e][i % 4], 4.38, 1.35, -3.3 + i * .42, g); tee.rotation.y = .1}
      walls.push(...placeWalls([{minX:4.1, maxX:4.75, minZ:-3.7, maxZ:.5}], x, z, rot));
      const mirror = box(1.2, 2.2, .05, new T.MeshStandardMaterial({color:0xcfe0dc, metalness:1, roughness:.05}), -4.84, 1.3, 2.6, g); mirror.rotation.y = Math.PI / 2;
    }
    if (shop.id === 'merch') {
      box(.4, 2, 3.4, wood, -4.7, 1, 1.4, g); for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {const cv = panel(.38, .5, coverTex(String(row * 4 + i + 1).padStart(2, '0')), -4.48, .55 + row * .62, -.1 + i * .82, g, {lit:true}); cv.rotation.y = Math.PI / 2}
      walls.push(...placeWalls([{minX:-4.95, maxX:-4.45, minZ:-.3, maxZ:3.1}], x, z, rot));
    }
    if (shop.id === 'accessories') {
      box(.4, 2, 3.4, wood, -4.7, 1, 1.4, g); for (let row = 0; row < 3; row++) {box(.5, .05, 3.4, wood, -4.65, .5 + row * .6, 1.4, g); for (let i = 0; i < 5; i++) cyl(.08, .18, [0x1f2a26, 0x8fa79a, 0xc9a36a][(row + i) % 3], -4.6, .62 + row * .6, -.1 + i * .7, g)}
      walls.push(...placeWalls([{minX:-4.95, maxX:-4.4, minZ:-.3, maxZ:3.1}], x, z, rot));
    }
    if (gallery) {
      for (const gx of [-2.6, 0, 2.6]) box(.08, .05, .4, glow, gx, 4.3, -3.6, g);
      box(2, .45, .6, wood, -3.6, .3, 2.2, g);
      walls.push(...placeWalls([{minX:-4.6, maxX:-2.6, minZ:1.9, maxZ:2.5}], x, z, rot));
    }

    // Interactive product displays.
    let slot = 0;
    shop.products.forEach((p, pi) => {
      const item = model(p, si, pi);
      let entry;
      if (p.wall) {
        item.position.set(p.wall[0], 2.05, p.wall[1] + .05); g.add(item);
        entry = {group:item, spin:false};
      } else {
        const [lx, lz] = PRODUCT_SLOTS[p.slot ?? slot++];
        const ped = cyl(.34, 1, stone, lx, .5, lz, g); cyl(.36, .05, accent, lx, 1.02, lz, g);
        ped.traverse(o => o.userData.product = [si, pi]);
        const tag = panel(.62, .13, label(p.name, {ratio:4.8, edge:null}), lx, .78, lz + .345, g); tag.userData.product = [si, pi];
        item.position.set(lx, 1.05, lz); g.add(item);
        const scale = ['tee', 'hoodie', 'joggers'].includes(p.model) ? .85 : 1.35; item.scale.setScalar(scale);
        walls.push(...placeWalls([{minX:lx - .36, maxX:lx + .36, minZ:lz - .36, maxZ:lz + .36}], x, z, rot));
        entry = {group:item, spin:true};
      }
      const halo = mesh(new T.RingGeometry(.4, .46, 32), new T.MeshBasicMaterial({color:lime, side:T.DoubleSide, transparent:true, opacity:.9}), 0, 0, 0, g);
      halo.visible = false; halo.castShadow = false;
      if (p.wall) {halo.position.set(p.wall[0], .9, p.wall[1] + .3); halo.scale.setScalar(2.4); halo.rotation.x = 0}
      else {halo.position.set(item.position.x, 1.04, item.position.z); halo.rotation.x = -Math.PI / 2}
      products.push(Object.assign(entry, {shop:si, index:pi, data:p, halo, baseScale:item.scale.x, baseY:item.position.y, shopGroup:g}));
    });
  });

  // ---------- transit portals ----------
  function portal(p) {
    const g = new T.Group(); g.position.set(p.x, 0, p.z); city.add(g);
    cyl(1.3, .15, stone, 0, .07, 0, g);
    const ring = mesh(new T.TorusGeometry(1.15, .09, 12, 48), new T.MeshStandardMaterial({color:lime, emissive:lime, emissiveIntensity:1.6}), 0, 1.45, 0, g);
    const swirl = canvasTex(256, 256, (c, W) => {const grd = c.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W / 2); grd.addColorStop(0, '#f6ffd8ee'); grd.addColorStop(.5, '#8fbf6a99'); grd.addColorStop(1, '#1d4a3700'); c.fillStyle = grd; c.fillRect(0, 0, W, W); c.strokeStyle = '#ffffff55'; c.lineWidth = 5; for (let i = 0; i < 5; i++) {c.beginPath(); c.arc(W / 2, W / 2, 24 + i * 20, i, i + 2.4); c.stroke()}});
    const disc = mesh(new T.CircleGeometry(1.08, 40), new T.MeshBasicMaterial({map:swirl, transparent:true, side:T.DoubleSide, depthWrite:false}), 0, 1.45, 0, g);
    disc.castShadow = false;
    const dest = PORTALS.find(q => q.id === p.to);
    const s = panel(2.6, .42, label('TRANSIT → ' + dest.label.toUpperCase(), {ratio:6.2, neon:true}), 0, 2.95, 0, g);
    g.traverse(o => {if (o.isMesh) o.userData.portal = p.id});
    portals.push({g, ring, disc, data:p});
  }
  PORTALS.forEach(portal);

  return {
    products, portals,
    update(dt, time) {
      for (const s of spinners) s.o.rotation.y += dt * s.speed;
      for (const p of portals) {p.disc.rotation.z -= dt * 1.4; p.ring.material.emissiveIntensity = 1.3 + Math.sin(time * 3) * .4}
      for (const p of products) {
        if (p.spin) p.group.rotation.y += dt * (p.focused ? 1.2 : .45);
        const target = p.focused ? p.baseScale * 1.25 : p.baseScale;
        p.group.scale.setScalar(p.group.scale.x + (target - p.group.scale.x) * Math.min(1, dt * 6));
        if (p.spin) p.group.position.y = p.baseY + (p.focused ? .12 + Math.sin(time * 2) * .04 : 0);
        p.halo.visible = !!p.focused;
      }
    }
  };
}
