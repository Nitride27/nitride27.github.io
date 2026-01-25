// ======================
// SCENE SETUP
// ======================
let cameraTargetX = 0;
let cameraShake = 0;
const engineExhausts = [];

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 3, 12);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("space-canvas"),
  alpha: true,
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ======================
// LIGHTING (REALISTIC)
// ======================
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const keyLight = new THREE.DirectionalLight(0xfff2dd, 1.1);
keyLight.position.set(6, 8, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x88aaff, 0.4);
rimLight.position.set(-6, 3, -4);
scene.add(rimLight);

// ======================
// MATERIALS
// ======================
const hullMat = new THREE.MeshStandardMaterial({
  color: 0xcfd6e6,
  metalness: 0.75,
  roughness: 0.28
});

const darkMat = new THREE.MeshStandardMaterial({
  color: 0x6b7280,
  metalness: 0.6,
  roughness: 0.4
});

const glassMat = new THREE.MeshStandardMaterial({
  color: 0x66b3ff,
  metalness: 0.2,
  roughness: 0.05,
  transparent: true,
  opacity: 0.8
});

const engineMat = new THREE.MeshStandardMaterial({
  color: 0xffaa33,
  emissive: 0xff6600,
  emissiveIntensity: 1.4
});

// ======================
// SPACESHIP GROUP
// ======================
const ship = new THREE.Group();
scene.add(ship);

// ======================
// FUSELAGE
// ======================
const fuselage = new THREE.Mesh(
  new THREE.CylinderGeometry(0.6, 0.8, 4, 24),
  hullMat
);
fuselage.rotation.x = Math.PI / 2;
ship.add(fuselage);

// ======================
// NOSE CONE
// ======================
const nose = new THREE.Mesh(
  new THREE.CylinderGeometry(0.6, 0.5, 1),
  hullMat
);
nose.rotation.x = Math.PI / 2;
nose.position.z = -2.5;
ship.add(nose);

// ======================
// COCKPIT
// ======================
const cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 24, 24),
  glassMat
);
cockpit.position.set(0, 0.35, -1.6);
ship.add(cockpit);

// ======================
// WINGS
// ======================
const wingGeo = new THREE.BoxGeometry(3.4, 0.08, 1.1);

const leftWing = new THREE.Mesh(wingGeo, darkMat);
leftWing.position.set(-1.8, 0, 0);
ship.add(leftWing);

const rightWing = leftWing.clone();
rightWing.position.x = 1.8;
ship.add(rightWing);

// ======================
// VERTICAL STABILIZER
// ======================
const fin = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 1.2, 1),
  darkMat
);
fin.position.set(0, 0.5, 1);
ship.add(fin);

// ======================
// ENGINES (DUAL)
// ======================
const engineGlows = [];

function createEngine(x) {
  const engine = new THREE.Group();

  const casing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 1, 20),
    darkMat
  );
  casing.rotation.x = Math.PI / 2;
  casing.position.z =-0.8;
  engine.add(casing);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    engineMat
  );
  glow.position.z = -0.45;
  engine.add(glow);

  engineGlows.push(glow);

  const exhaust = new THREE.Mesh(
  new THREE.ConeGeometry(0.18, 1.2, 10),
  new THREE.MeshStandardMaterial({
    color: 0xffaa33,
    emissive: 0xffaa33,
    transparent: true,
    opacity: 0
  })
);

exhaust.rotation.x = Math.PI/2;
exhaust.position.z = 0.2;
engine.add(exhaust);

// store exhaust for animation
engine.exhaust = exhaust;
engineExhausts.push(exhaust);


  engine.position.set(x, 0, 3);
  return engine;
}


ship.add(createEngine(-0.6));
ship.add(createEngine(0.6));

// ======================
// IDLE MOTION (REALISM)
// ======================
gsap.to(ship.rotation, {
  z: 0.03,
  duration: 2,
  yoyo: true,
  repeat: -1,
  ease: "sine.inOut"
});

// ======================
// RENDER LOOP
// ======================


// ======================
// RESIZE
// ======================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);


});

// ======================
// STARFIELD
// ======================
const starCount = 4000;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
  const i3 = i * 3;
  starPositions[i3]     = (Math.random() - 0.5) * 200; // X
  starPositions[i3 + 1] = (Math.random() - 0.5) * 200; // Y
  starPositions[i3 + 2] = -Math.random() * 400;        // Z (depth)
}

starGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3)
);

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.6,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true
});

const stars = new THREE.Points(starGeometry, starMaterial);

const speedLinesGeo = new THREE.BufferGeometry();
const speedCount = 300;
const speedPos = new Float32Array(speedCount * 3);

for (let i = 0; i < speedCount; i++) {
  speedPos[i * 3] = (Math.random() - 0.5) * 30;
  speedPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
  speedPos[i * 3 + 2] = -Math.random() * 200;
}

speedLinesGeo.setAttribute("position", new THREE.BufferAttribute(speedPos, 3));

const speedLines = new THREE.Points(
  speedLinesGeo,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0
  })
);

// ======================
// ONE PLANET PER SECTION
// ======================

const sectionPlanets = [];
const planetZ = -35;      // depth in space
const planetSpacing = 12; // horizontal spacing

const sectionIds = [
  "introduction",
  "projects",
  "skills",
  "about",
  "contact"
];

const planetConfigs = [
  { color: 0x4cc9f0, roughness: 0.9, size: 2.2 }, // icy
  { color: 0xf72585, roughness: 0.6, size: 2.0 }, // rocky
  { color: 0x7209b7, roughness: 0.4, size: 2.8 }, // gas
  { color: 0x3a0ca3, roughness: 0.85, size: 1.6 }, // moon
  { color: 0x4361ee, roughness: 0.5, size: 2.3 }  // ocean
];




function createPlanetMaterial(cfg) {
  return new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: cfg.roughness,
    metalness: 0.15,
    flatShading: false
  });
}

function addAtmosphere(planet, color) {
  const radius = planet.geometry.parameters.radius;

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.05, 64, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
  );

  planet.add(atmosphere);
}

sectionIds.forEach((id, i) => {
  const cfg = planetConfigs[i];

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.size, 64, 64),
    createPlanetMaterial(cfg)
  );

  // Start planets ahead of ship
  planet.position.set(
    0,
    0,
    -40 - i * 30
  );

  planet.userData.section = id;

  addAtmosphere(planet, cfg.color);

  scene.add(planet);
  sectionPlanets.push(planet);
});

const sectionIndexMap = {};
sectionIds.forEach((id, i) => {
  sectionIndexMap[id] = i;
});

function animate() {
  requestAnimationFrame(animate);

  // subtle star motion
  stars.rotation.y += 0.00025;
  stars.rotation.x += 0.0001;

  // rotate section planets slowly
sectionPlanets.forEach(planet => {
  planet.rotation.y += 0.002;
});


  // camera inertia
  camera.position.x += (cameraTargetX - camera.position.x) * 0.05;

  // micro shake when thrusting
  camera.position.y = 3 + Math.sin(performance.now() * 0.02) * cameraShake;

  const positions = speedLines.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] += 0.5;  // move toward camera
    if (positions[i + 2] > 10) positions[i + 2] = -200; // reset far away
  }
speedLines.geometry.attributes.position.needsUpdate = true;
  // engine cooldown
  engineGlows.forEach(glow => {
    glow.material.emissiveIntensity *= 0.92;
    glow.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);


  engineExhausts.forEach(exhaust => {
    exhaust.material.opacity *= 0.92;          // fades out gradually
    exhaust.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08); // shrink to idle
  });
  });

  renderer.render(scene, camera);
}
animate();
scene.add(stars);
scene.add(speedLines);

scene.fog = new THREE.Fog(0x05080f, 30, 400);
window.sectionPlanets = sectionPlanets;

// ======================
// PLANET CLICK NAVIGATION
// ======================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  // convert mouse to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(sectionPlanets, false);

  if (intersects.length > 0) {
    const planet = intersects[0].object;
    const section = planet.userData.section;

    if (!section) return;

    // Optional: small delay for UX polish
    gsap.to(camera.position, {
      z: camera.position.z - 4,
      duration: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        window.location.href = `${section}.html`;
      }
    });
  }
});

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(sectionPlanets, false);

  document.body.style.cursor = intersects.length > 0 ? "pointer" : "default";
});




