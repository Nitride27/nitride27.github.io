// Subpages: the planet you landed on. Its limb rises from the bottom of the screen as you scroll.
// Loaded after three.js + space.js so the page UI (page.js) never waits on them.
(() => {
  const canvas = document.getElementById("stars");
  if (!canvas || !window.THREE || !window.Space) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TYPE = { introduction: "ice", experience: "terran", projects: "lava", skills: "gas", about: "desert", contact: "ocean" }[document.body.dataset.planet] || "ice";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !Space.small, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, Space.small ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  const SUN = new THREE.Vector3(-1, 0.55, -0.35).normalize(); // low sun behind-left: a bright crescent along the limb
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const light = new THREE.DirectionalLight(0xfff6ea, 3.2);
  light.position.copy(SUN);
  scene.add(light);

  const R = 140;
  const planet = Space.makePlanet(TYPE, R, SUN, { hi: true, segments: Space.small ? 96 : 160 });
  // equator under the camera, poles off to the sides (no polar stretch up close);
  // the gas giant stays upright so its rings arch across the sky
  if (TYPE === "gas") planet.rotation.set(0.32, 0, 0.12);
  else planet.rotation.set(0, 0.4, Math.PI / 2 - 0.15);
  scene.add(planet);
  scene.add(Space.makeHeavens(Space.small ? 2500 : 4000));
  const nebula = Space.makeNebula(760);
  nebula.position.set(260, 170, -620);
  nebula.lookAt(0, 0, 0);
  scene.add(nebula);

  const size = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.9 ? 60 : 45;
    camera.updateProjectionMatrix();
  };
  size();
  addEventListener("resize", size);

  // the view leans toward the pointer (or the phone's tilt, where the browser allows it)
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) {
    addEventListener("pointermove", e => { look.tx = e.clientX / innerWidth - 0.5; look.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    addEventListener("deviceorientation", e => { if (e.gamma == null) return; look.tx = Math.max(-0.5, Math.min(0.5, e.gamma / 60)); look.ty = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90)); }, { passive: true });
  }

  // render only when something moved: scroll easing every frame, slow rotation at ~20fps when idle
  let p = -1, lastRot = 0, dirty = true;
  addEventListener("resize", () => (dirty = true));
  const frame = now => {
    requestAnimationFrame(frame);
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const target = Math.min(1, scrollY / max);
    if (Math.abs(target - p) > 1e-4) { p = p < 0 || reduce ? target : p + (target - p) * 0.08; dirty = true; }
    const u = planet.userData;
    if (now - lastRot > (Space.small ? 100 : 50)) { // idle rotation at 20fps (10 on phones); also picks up textures as they stream in
      const step = Math.min(0.2, (now - lastRot) / 1000);
      lastRot = now;
      if (!reduce) {
        u.mesh.rotation.y += step * 0.006;
        if (u.clouds) u.clouds.rotation.y += step * 0.009;
        if (u.moon) u.moon.rotation.y += step * 0.02;
      }
      dirty = true;
    }
    if (Math.abs(look.tx - look.x) + Math.abs(look.ty - look.y) > 1e-3) { look.x += (look.tx - look.x) * 0.06; look.y += (look.ty - look.y) * 0.06; dirty = true; }
    if (!dirty) return;
    dirty = false;
    const drop = camera.aspect < 0.9 ? 46 : 24; // portrait sees more vertically, so start lower
    planet.position.set(0, -R - drop + p * 15, -R * 0.62);
    camera.lookAt(look.x * 14, -3 - p * 1.5 - look.y * 6, -60);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
})();
