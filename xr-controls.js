// The page stays embedded until someone deliberately chooses a supported XR mode.
export function mountXR(root, renderer, selectMode, report, xr = navigator.xr) {
  const buttons = [];
  let activeSession;
  let pending = false;

  for (const [mode, label] of [['immersive-vr','VR'], ['immersive-ar','AR']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = true;
    button.textContent = label + ' unavailable';
    root.append(button);
    const control = {button, label, supported: false};
    buttons.push(control);
    if (!xr) continue;

    xr.isSessionSupported(mode).then(supported => {
      control.supported = supported;
      if (supported) button.textContent = 'Enter ' + label;
      refresh();
    }).catch(() => {});

    button.addEventListener('click', async () => {
      if (pending || activeSession || !control.supported) return;
      pending = true;
      refresh();
      let session;
      try {
        const optionalFeatures = ['local-floor', 'bounded-floor', 'layers'];
        const options = {optionalFeatures};
        if (mode === 'immersive-ar') {
          optionalFeatures.push('dom-overlay');
          options.domOverlay = {root: exitOverlay};
        }
        session = await xr.requestSession(mode, options);
        activeSession = session;
        session.addEventListener('end', () => {
          activeSession = null;
          exitOverlay.hidden = true;
          refresh();
        }, {once:true});
        selectMode(mode);
        renderer.xr.setReferenceSpaceType(mode === 'immersive-ar' ? 'local' : 'local-floor');
        await renderer.xr.setSession(session);
        exitOverlay.hidden = !session.domOverlayState;
      } catch {
        if (session) await session.end().catch(() => {});
        report(label + ' could not start on this device.');
      } finally {
        pending = false;
        refresh();
      }
    });
  }

  const exitOverlay = document.createElement('div');
  exitOverlay.id = 'xrExitOverlay';
  exitOverlay.hidden = true;
  const exit = document.createElement('button');
  exit.type = 'button';
  exit.textContent = 'Exit AR';
  exit.addEventListener('click', () => activeSession?.end().catch(() => {}));
  exitOverlay.append(exit);
  document.body.append(exitOverlay);

  function refresh() {
    for (const {button, supported} of buttons) button.disabled = !supported || pending || !!activeSession;
  }
}
