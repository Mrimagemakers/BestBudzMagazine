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
