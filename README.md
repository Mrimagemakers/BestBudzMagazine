# Best Budz World
An adult-oriented immersive editorial world built with Three.js/WebXR. No sales or checkout.

## Run
Serve this directory over localhost (for example `npx serve .`). HTTPS or localhost is required for WebXR. The pinned Three.js modules load from jsDelivr; network access is required.

## Deploy
In Settings → Pages choose **GitHub Actions**. Merge the world branch into main; the Pages workflow uploads the static site. No build step. The expected URL is https://mrimagemakers.github.io/BestBudzMagazine/ (not live until deployment succeeds).

## Optional services
See server/README.md for verified email and remote group presence. Static hosting alone cannot send verification email or enforce identity/age checks. The 21+ gate is a self-attestation stored per browser session, not identity verification. Content files remain publicly accessible on Pages. For legally enforced access, serve all content behind a server-side age/identity provider.

## Experience
Desktop drag to look, WASD/arrows to walk; tap/click buildings or use destination buttons. VR controllers select destinations. AR places a miniature strain-library exhibit in front of the viewer; it does not identify plants or infer chemistry from a camera scan. Source links and unknown batch composition are shown on every strain card. No cultivar-specific medical efficacy claims.

Licensed media must be supplied before cinema screenings or music performances; the included venue uses a locally generated ambient tone only after a deliberate click. Remote group sessions share location and text messages only; no voice/video. Do not submit personal or medical details.

## Validation
`npm test` checks gate date boundaries, verification token consumption, and group input constraints. Manual device QA remains necessary for WebXR hardware.

## Interior and NPC update
All seven venues now have open, walkable doorways, window/wall collisions and furnished interiors. The world starts at eye level. Use WASD, arrow keys or hold the on-screen arrows; drag to look. Destination cards offer **Go inside**. **Street view** returns to the plaza; **Aerial view** gives an overview.

Seven stationary hosts and four walking visitors have scripted conversations. Click/tap a character or approach and press **E / Talk to NPC**. Dialogue is displayed in the 3D world for VR users. VR adds left-thumbstick movement, right-thumbstick snap turns, and trigger selection of visible floors for teleporting. Hardware testing is still required.

Brick, stone, wood and plaster textures are locally generated with bump mapping. The scene adds sunlight shadows, glass, landscaping, furniture and articulated NPCs. These are procedural assets, not scanned photorealistic buildings or humans. `npm test` includes doorway routes, wall/window collision and unobstructed plaza paths.

## Player homes expansion
The next release is tracked in [GitHub issue #2](https://github.com/Mrimagemakers/BestBudzMagazine/issues/2): verified player accounts, custom avatars, five starter homes, WebXR VR/AR interactions, Stoner TV and Turn Up Music integration. The confirmed Turn Up Music website is https://turnupmusic.online; a playable stream or embeddable player must be verified separately. These features are planned and not yet included in this static release.

## Districts update: Budz Marketplace, transit portals, AR tabletop
**Budz Marketplace** is a second district north of the Central Plaza, reached on foot through two gateways behind the Lounge or by stepping into the glowing transit ring. A string-lit boulevard holds five walk-in storefronts (Dispensary Showroom, Accessories, Fashion Boutique, Best Budz Shop, Art Gallery), the Budz Garden pocket park, a host in every shop and three walking regulars.

Every display is an interactive 3D product: tap it to spin it up, see an in-world info card (readable in VR) and open the details panel. The Dispensary Showroom is education only: category guides, label literacy and how to read a lab report (COA). Retailer links appear only after a visitor picks a jurisdiction, and only for entries in `marketplace-data.js` marked `verified: true` with an https URL. Add licensed partners there; the list ships empty. Merch, fashion and art link to `MARKET_CONFIG.shopUrl` once set.

**AR** now places the whole world as a tabletop miniature on a real surface (hit-test, with a fallback in front of the viewer), with Rotate, Size and Exit controls. Only that small HUD is drawn over the camera.

Edit shops and products in `marketplace-data.js`. `npm test` covers storefront doorways, plaza-to-market walking routes, portal arrivals and group-session messages.
