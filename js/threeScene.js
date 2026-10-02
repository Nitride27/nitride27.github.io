// Home page: fly a ship past six procedurally textured planets; click one to land.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ogMode = new URLSearchParams(location.search).has("og"); // clean frame for the social preview image
  const $ = s => document.querySelector(s);
  if (ogMode) document.body.classList.add("og-mode");

  const PLANETS = [
    { id: "introduction", name: "Introduction", blurb: "Who I am and what I'm working on.", r: 3.2, type: "ice", accent: "#9cc9dc" },
    { id: "experience", name: "Experience", blurb: "Octacore internship and freelance client work.", r: 3.6, type: "terran", accent: "#7fa9dd" },
    { id: "projects", name: "Projects", blurb: "Deep learning research, RAG systems and shipped products.", r: 3.0, type: "lava", accent: "#e08a5c" },
    { id: "skills", name: "Skills", blurb: "Languages, frameworks and AI tooling.", r: 4.6, type: "gas", accent: "#d6b289" },
    { id: "about", name: "About", blurb: "Education, certificates and life off the ship.", r: 3.0, type: "desert", accent: "#d48e68" },
    { id: "contact", name: "Contact", blurb: "Email, phone, GitHub and LinkedIn.", r: 3.8, type: "ocean", accent: "#6f9ae0" },
  ];
  const N = PLANETS.length;
  const SPACING = 80;   // distance between planets along the flight path
  const ARRIVE = 26;    // how far ahead the current planet sits when docked

  // ======================
  // RENDERER / SCENE
  // ======================
  const canvas = $("#space-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: ogMode });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 45, 190);

  const rig = new THREE.Group(); // camera + ship travel together
  scene.add(rig);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
  rig.add(camera);

  const { softDot, canvasTex, radial } = Space;
  const SUN_DIR = new THREE.Vector3(-8, 2.5, -1).normalize(); // off-screen left, so planets show a terminator

  // ======================
  // LIGHTING + ENV MAP
  // ======================
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const sun = new THREE.DirectionalLight(0xfff6ea, 2.8);
  sun.position.copy(SUN_DIR);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc8d2e0, 0.15);
  rim.position.set(8, -2, -10);
  scene.add(rim);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    map: canvasTex(256, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#d8dadd"); grd.addColorStop(0.45, "#2a2c30"); grd.addColorStop(0.55, "#0c0c0e"); grd.addColorStop(1, "#1a1a1c");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff"; g.fillRect(w * 0.15, h * 0.12, w * 0.12, h * 0.08);
    }),
  })));
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  // ======================
  // SPACESHIP
  // ======================
  const ship = new THREE.Group();
  rig.add(ship);

  const hull = new THREE.MeshStandardMaterial({ color: 0xe9ebee, metalness: 0.35, roughness: 0.4, envMapIntensity: 0.9 });
  const livery = new THREE.MeshStandardMaterial({ color: 0xe0571f, metalness: 0.2, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.6, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xc9962e, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 }); // gold-foil visor

  const profile = [[0, 2.8], [0.1, 2.55], [0.26, 2.05], [0.4, 1.3], [0.5, 0.3], [0.52, -0.8], [0.47, -1.7], [0.38, -2.05], [0, -2.05]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), hull);
  body.rotation.x = -Math.PI / 2; // nose toward -Z
  body.scale.set(1, 1, 0.72);
  ship.add(body);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.51, 0.18, 40, 1, true), livery);
  band.rotation.x = -Math.PI / 2;
  band.scale.set(1, 1, 0.72);
  band.position.z = -0.1;
  ship.add(band);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), glass);
  canopy.scale.set(0.28, 0.22, 0.85);
  canopy.position.set(0, 0.28, -0.9);
  ship.add(canopy);

  const wing = sign => {
    const s = new THREE.Shape();
    [[0.3, -0.7], [2.7, 0.85], [2.85, 1.35], [0.3, 1.55]].forEach(([x, z], i) => (i ? s.lineTo : s.moveTo).call(s, sign * x, z));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2 });
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, hull);
    m.position.y = -0.02;
    m.rotation.z = sign * 0.07;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.014, 0.12), livery);
    seam.position.set(sign * 1.5, 0.05, 0.55);
    seam.rotation.y = -sign * Math.atan2(1.55, 2.4);
    m.add(seam);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xff4d4d : 0x7dffb0 }));
    light.position.set(sign * 2.8, 0, 1.1);
    m.add(light);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: light.material.color, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(0.4);
    light.add(halo);
    m.userData.halo = halo;
    return m;
  };
  const wings = [wing(-1), wing(1)];
  wings.forEach(w => ship.add(w));

  const fin = sign => {
    const s = new THREE.Shape();
    [[0, 0], [1.1, 0], [1.3, 0.7], [0.95, 0.75]].forEach(([u, v], i) => (i ? s.lineTo : s.moveTo).call(s, u, v));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
    g.translate(0, 0, -0.025);
    g.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(g, livery);
    m.position.set(sign * 0.28, 0.22, 0.45);
    m.rotation.z = -sign * 0.38;
    return m;
  };
  ship.add(fin(-1), fin(1));

  const exhaustTex = canvasTex(4, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(0.65, "rgba(255,255,255,.45)"); grd.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, false);
  const engines = [];
  [-0.55, 0.55].forEach(x => {
    const e = new THREE.Group();
    e.position.set(x, -0.05, 1.3);
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.4, 24), hull);
    nacelle.rotation.x = Math.PI / 2;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.25, 24, 1, true), dark);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 0.8;
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0xdff1ff }));
    core.position.z = 0.71;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: 0x5aa8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.z = 0.85;
    const flame = (r, len, color) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, 20, 1, true),
        new THREE.MeshBasicMaterial({ color, alphaMap: exhaustTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.geometry.translate(0, len / 2, 0); // base at nozzle, tip trails behind
      m.rotation.x = Math.PI / 2;
      m.position.z = 0.75;
      return m;
    };
    const outer = flame(0.2, 2.2, 0x3d8bff), inner = flame(0.1, 1.4, 0xcfe8ff); // ion-drive blue
    e.add(nacelle, nozzle, core, glow, outer, inner);
    ship.add(e);
    engines.push({ glow, outer, inner });
  });

  // ======================
  // STARS + SUN + WARP STREAKS
  // ======================
  // sky: Milky Way dome + stars ride with the rig so they never run out
  rig.add(Space.makeHeavens(Space.small ? 2500 : 4000));
  const starsNear = Space.makeStars(400, 500, 3.4);
  rig.add(starsNear);

  const STREAKS = 220;
  const streakPos = new Float32Array(STREAKS * 6);
  const streakSeed = Array.from({ length: STREAKS }, () => ({ x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 24, z: -Math.random() * 120 }));
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
  const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, fog: false }));
  rig.add(streaks);

  // ======================
  // PLANETS
  // ======================
  const startIndex = Math.round(Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))) * (N - 1));
  const planets = [];
  // build nearest-first so the worker queue paints whatever is on screen first
  PLANETS.map((_, i) => i).sort((a, b) => Math.abs(a - startIndex) - Math.abs(b - startIndex)).forEach(i => {
    const g = Space.makePlanet(PLANETS[i].type, PLANETS[i].r, SUN_DIR, { segments: 56 });
    g.rotation.z = (i % 2 ? -1 : 1) * 0.25;
    g.userData.mesh.userData.index = i;
    g.userData.hover = 0;
    scene.add(g);
    planets[i] = g;
  });
  const pickables = planets.map(g => g.userData.mesh);
  const paintReady = Promise.all(planets.map(g => g.userData.ready));

  // asteroid field scattered along the route, kept clear of the flight line
  const rocks = Space.makeAsteroids(Space.small ? 40 : 70, i => {
    const side = i % 2 ? 1 : -1;
    return new THREE.Vector3(side * (9 + Math.random() * 30), (Math.random() - 0.5) * 22, 10 - Math.random() * (N * SPACING + 40));
  });
  scene.add(rocks.mesh);

  // ======================
  // LAYOUT (desktop vs portrait phones)
  // ======================
  let L;
  const layout = () => {
    const portrait = innerWidth / innerHeight < 0.9;
    L = portrait
      ? { px: 0.4, py: -7, shipX: 0, shipY: -1.75, shipScale: 0.42, fov: 66 }
      : { px: 6.2, py: 0.2, shipX: -0.6, shipY: -1.35, shipScale: 0.58, fov: 50 };
    camera.fov = L.fov;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    ship.scale.setScalar(L.shipScale);
  };
  layout();
  addEventListener("resize", layout);

  // ======================
  // SCROLL → TRAVEL
  // ======================
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  let target = 0, travel = 0, velocity = 0, current = -1, landing = false;
  const onScroll = () => { target = Math.min(1, Math.max(0, scrollY / Math.max(1, maxScroll()))) * (N - 1); };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  travel = target;

  const goTo = i => {
    const y = (i / (N - 1)) * maxScroll();
    window.lenis ? window.lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };
  let snapT;
  addEventListener("scroll", () => {
    clearTimeout(snapT);
    snapT = setTimeout(() => { const i = Math.round(target); if (Math.abs(target - i) > 0.02 && !landing) goTo(i); }, 220);
  }, { passive: true });

  // ======================
  // HUD
  // ======================
  const hud = { num: $(".hud-num"), name: $(".hud-name"), blurb: $(".hud-blurb"), land: $(".land-btn"), panel: $(".planet-panel"), dist: $(".hud-dist") };
  const dots = [...document.querySelectorAll(".dots button")];
  dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));
  document.querySelectorAll("[data-goto]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); goTo(+a.dataset.goto); }));
  const setCurrent = i => {
    if (i === current) return;
    current = i;
    const p = PLANETS[i];
    document.body.style.setProperty("--planet", p.accent);
    const apply = () => {
      hud.num.textContent = String(i + 1).padStart(2, "0") + " / 06";
      hud.name.textContent = p.name;
      hud.blurb.textContent = p.blurb;
      hud.land.textContent = "Land on " + p.name;
    };
    if (typeof gsap !== "undefined" && !reduce) {
      gsap.timeline().to(hud.panel, { opacity: 0, y: 10, duration: 0.2, onComplete: apply }).to(hud.panel, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" });
    } else apply();
    dots.forEach((d, k) => d.setAttribute("aria-current", k === i ? "true" : "false"));
    document.querySelectorAll("[data-goto]").forEach(a => a.classList.toggle("on", +a.dataset.goto === i));
    $(".welcome").classList.toggle("is-gone", i !== 0);
  };
  hud.land.addEventListener("click", () => land(current));

  addEventListener("keydown", e => {
    if (e.target.closest("input,textarea")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(Math.min(N - 1, current + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.max(0, current - 1)); }
    if (e.key === "Enter" && document.activeElement === document.body) land(current);
  });

  // ======================
  // HOVER + CLICK TO LAND
  // ======================
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), mouseSmooth = new THREE.Vector2();
  const tip = $(".planet-tip");
  let hovered = null;
  addEventListener("pointermove", e => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    hovered = hit ? hit.object.userData.index : null;
    document.body.style.cursor = hovered !== null ? "pointer" : "";
    tip.classList.toggle("show", hovered !== null);
    if (hovered !== null) {
      tip.textContent = "Land on " + PLANETS[hovered].name;
      tip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
    }
  });
  canvas.addEventListener("click", () => { if (hovered !== null) land(hovered); });

  const land = i => {
    if (landing) return;
    landing = true;
    const g = planets[i], p = PLANETS[i];
    tip.classList.remove("show");
    const href = p.id + ".html";
    const go = () => (window.leaveTo ? leaveTo(href) : (location.href = href));
    if (reduce || typeof gsap === "undefined") return go();
    const wp = g.position.clone();
    gsap.timeline()
      .to(ship.position, { z: -6, y: L.shipY + 0.4, duration: 1.2, ease: "power2.in" }, 0)
      .to(ship.rotation, { x: -0.25, duration: 1.2, ease: "power2.in" }, 0)
      .to(rig.position, { x: wp.x, y: wp.y, z: wp.z + p.r * 2.4, duration: 1.4, ease: "power3.inOut" }, 0)
      .add(go, 0.75);
  };
  addEventListener("pageshow", e => { if (e.persisted) location.reload(); });

  // ======================
  // RENDER LOOP
  // ======================
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const frame = () => {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

    const prev = travel;
    if (!landing) travel += (target - travel) * (reduce ? 1 : 1 - Math.pow(0.0015, dt));
    velocity += ((travel - prev) / Math.max(dt, 1e-3) - velocity) * 0.15;
    const speed = Math.min(Math.abs(velocity), 2.5);
    if (!landing) rig.position.set(0, 0, -travel * SPACING);
    setCurrent(Math.round(travel));
    if (hud.dist) hud.dist.textContent = Math.round(Math.abs(travel - Math.round(travel)) * SPACING * 1000).toLocaleString();

    // docked planet sits ahead-right; upcoming ones rise into place; passing ones swing wide of the camera
    planets.forEach((g, i) => {
      const baseZ = -i * SPACING - ARRIVE;
      const rel = baseZ - rig.position.z;
      const push = Math.max(0, rel + ARRIVE);
      const far = Math.max(0, -rel - ARRIVE);
      g.position.set(L.px + push * 0.7 * (L.px >= 1 ? 1 : (i % 2 ? -1 : 1)) - far * 0.03, L.py + push * 0.15 + far * 0.22, baseZ);
      const u = g.userData;
      u.mesh.rotation.y += dt * 0.04;
      if (u.clouds) u.clouds.rotation.y += dt * 0.055;
      if (u.moon) u.moon.rotation.y += dt * 0.3;
      const h = u.hover += (((hovered === i || landing) ? 1 : 0) - u.hover) * 0.1;
      g.scale.setScalar(1 + h * 0.04);
      if (u.atmo) u.atmo.material.uniforms.k.value = (0.8 + h * 0.6) * Math.max(0, 1 - Math.abs(rel) / 170);
    });

    mouseSmooth.lerp(mouse, 0.05);
    const idle = reduce ? 0 : 1;
    if (!landing) {
      ship.position.set(L.shipX + mouseSmooth.x * 0.5, L.shipY + Math.sin(t * 1.3) * 0.08 * idle + mouseSmooth.y * 0.25, -1);
      ship.rotation.set(-0.08 + mouseSmooth.y * 0.12, -mouseSmooth.x * 0.18, Math.sin(t * 0.9) * 0.04 * idle - mouseSmooth.x * 0.25 - velocity * 0.05);
    }
    camera.position.set(mouseSmooth.x * 0.6, 1.4 + mouseSmooth.y * 0.3 + Math.sin(t * 40) * speed * 0.015, 7);
    camera.lookAt(tmp.set(rig.position.x + mouseSmooth.x * 0.8, rig.position.y + 0.4, rig.position.z - 30));

    const thrust = landing ? 1.6 : 0.3 + speed * 0.6;
    engines.forEach(e => {
      const f = 1 + Math.sin(t * 50 + e.glow.id) * 0.06 * idle;
      e.outer.scale.set(f, 0.6 + thrust * 1.1, f);
      e.inner.scale.set(f, 0.6 + thrust * 0.9, f);
      e.outer.material.opacity = 0.45 + thrust * 0.25;
      e.glow.scale.setScalar((0.5 + thrust * 0.45) * f);
    });
    const blink = Math.sin(t * 3) > 0.85 ? 1 : 0.15;
    wings.forEach(w => (w.userData.halo.material.opacity = blink));

    const len = 0.2 + speed * 6;
    streaks.material.opacity = Math.min(0.6, speed * 0.45);
    streakSeed.forEach((s, k) => {
      s.z += speed * 60 * dt + dt * 2;
      if (s.z > 10) { s.z = -120; s.x = (Math.random() - 0.5) * 40; s.y = (Math.random() - 0.5) * 24; }
      streakPos.set([s.x, s.y, s.z, s.x, s.y, s.z - len], k * 6);
    });
    streakGeo.attributes.position.needsUpdate = true;

    starsNear.rotation.z = t * 0.003;
    rocks.tick(dt);
    renderer.render(scene, camera);
  };
  frame();
  paintReady.then(() => document.body.classList.add("scene-ready"));
})();
