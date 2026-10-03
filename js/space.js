// Shared 3D space kit: planets, Milky Way sky, nebula, stars, asteroids.
// Textures are pre-baked by tools/bake-textures.mjs into images/tex/*.webp.
window.Space = (() => {
  const small = Math.min(screen.width, screen.height) < 700; // phones get the lighter texture set
  const loader = new THREE.TextureLoader();

  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const radial = stops => canvasTex(64, 64, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    stops.forEach(([o, c]) => grd.addColorStop(o, c));
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
  const softDot = radial([[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,.8)"], [1, "rgba(255,255,255,0)"]]);

  // resolves to a texture, or null if the file is missing (the base colour stays in place)
  const tex = (name, { srgb = true, aniso = 4 } = {}) => new Promise(res => loader.load(`images/tex/${name}.webp`, t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    res(t);
  }, undefined, () => res(null)));

  const fadeIn = (mat, ms = 1200) => {
    const t0 = performance.now();
    const step = now => { mat.opacity = Math.min(1, (now - t0) / ms); if (mat.opacity < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  // limb glow that only shows on the sunlit side, like photos taken from orbit
  const atmosphere = (r, color, sunDir, thickness) => new THREE.Mesh(
    new THREE.SphereGeometry(r * thickness, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(color) }, k: { value: 1 }, sun: { value: sunDir.clone().normalize() } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
          vW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 c; uniform float k; uniform vec3 sun; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main(){ float f = pow(max(0., -dot(vN, vV)) * 1.6, 2.2);
          float lit = smoothstep(-0.35, 0.6, dot(vW, sun));
          float a = f * k * (0.12 + lit) * 1.25;
          gl_FragColor = vec4(c * a, a); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    }));

  const TYPES = {
    ice: { glow: 0x5fb4ff, base: 0x3f86c8, bump: 1.6 },
    terran: { glow: 0x4a90ff, base: 0x0c4a9a, clouds: "a", water: true },
    lava: { glow: 0xff6a2a, base: 0x2a1c16, glowMap: true, bump: 1.6 },
    gas: { glow: 0xffc27a, base: 0xc87a3c, rings: true },
    desert: { glow: 0xff8a5c, base: 0xb4461c, moon: true, bump: 1.6 },
    ocean: { glow: 0xb47bff, base: 0x4a1d96, clouds: "b", water: true },
    moon: { base: 0x77777a, bump: 3 },
  };

  // A planet group: shows its base colour at once, then swaps in the baked maps as they arrive.
  // hi = use the 2048px maps (the close-up horizon on subpages)
  const makePlanet = (type, r, sunDir, { hi = false, segments = 64 } = {}) => {
    const cfg = TYPES[type], group = new THREE.Group(), sfx = hi && !small ? "@2x" : "";
    const mat = new THREE.MeshStandardMaterial({ color: cfg.base, roughness: 0.9, metalness: 0, envMapIntensity: 0.12 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, segments, Math.round(segments * 0.75)), mat);
    group.add(mesh);
    const tasks = [];

    tasks.push(tex(type + (type === "moon" ? "" : sfx)).then(t => { if (t) { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; } }));
    if (cfg.water) tasks.push(tex(`${type}-aux`, { srgb: false }).then(t => { if (t) { mat.roughnessMap = t; mat.roughness = 1; mat.needsUpdate = true; } }));
    else if (cfg.bump) tasks.push(tex(`${type}-aux`, { srgb: false }).then(t => { if (t) { mat.bumpMap = t; mat.bumpScale = cfg.bump; mat.needsUpdate = true; } }));
    if (cfg.glowMap) tasks.push(tex("lava-glow" + sfx).then(t => {
      if (t) { mat.emissiveMap = t; mat.emissive.set(0xffffff); mat.emissiveIntensity = 0.7; mat.needsUpdate = true; }
    }));
    if (cfg.clouds) {
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(r * 1.012, segments, Math.round(segments * 0.75)),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0, depthWrite: false, roughness: 1 }));
      group.add(clouds);
      group.userData.clouds = clouds;
      tasks.push(tex(`clouds-${cfg.clouds}${sfx}`).then(t => { if (t) { clouds.material.map = t; clouds.material.needsUpdate = true; fadeIn(clouds.material); } }));
    }
    if (cfg.rings) {
      const inner = r * 1.35, outer = r * 2.3;
      const rg = new THREE.RingGeometry(inner, outer, 160, 1);
      const uv = rg.attributes.uv, ps = rg.attributes.position;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (Math.hypot(ps.getX(k), ps.getY(k)) - inner) / (outer - inner), 0.5);
      const ringTex = canvasTex(1024, 2, (g, w, h) => {
        for (let x = 0; x < w; x++) {
          const t = x / w, band = 0.5 + 0.5 * Math.sin(t * 90) * Math.sin(t * 23 + 1) + 0.15 * Math.sin(t * 400);
          const a = Math.max(0, (0.25 + 0.65 * band) * Math.sin(t * Math.PI) * (t > 0.6 && t < 0.65 ? 0.06 : 1));
          g.fillStyle = `rgba(${235 - t * 40},${190 - t * 40},${120 - t * 50},${a})`; g.fillRect(x, 0, 1, h);
        }
      });
      const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
      ring.rotation.x = -Math.PI / 2.35;
      ring.rotation.y = 0.25;
      group.add(ring);
    }
    if (cfg.moon) {
      const pivot = new THREE.Group();
      const moon = makePlanet("moon", r * 0.22, sunDir, { segments: 32 });
      moon.position.set(r * 2.1, r * 0.3, 0);
      pivot.add(moon);
      pivot.rotation.z = 0.3;
      group.add(pivot);
      group.userData.moon = pivot;
    }
    if (cfg.glow) {
      const atmo = atmosphere(r, cfg.glow, sunDir, type === "gas" ? 1.08 : 1.06);
      group.add(atmo);
      group.userData.atmo = atmo;
    }
    group.userData.mesh = mesh;
    group.userData.ready = Promise.all(tasks);
    return group;
  };

  // stars: half crowd toward the galactic band; blue-white, white, yellow and orange like the real sky
  const makeStars = (count, spread, size) => {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), v = new THREE.Vector3();
    const G = 0.62, n = new THREE.Vector3(0, Math.cos(G), -Math.sin(G));
    for (let i = 0; i < count; i++) {
      v.randomDirection();
      if (Math.random() < 0.5) v.addScaledVector(n, -v.dot(n) * (0.8 + Math.random() * 0.2)).normalize();
      v.multiplyScalar(spread * (0.7 + Math.random() * 0.3));
      pos.set([v.x, v.y, v.z], i * 3);
      const b = 0.25 + Math.pow(Math.random(), 4) * 0.75, t = Math.random();
      const tint = t < 0.28 ? [0.6, 0.75, 1] : t < 0.6 ? [1, 1, 1] : t < 0.8 ? [1, 0.9, 0.7] : [1, 0.66, 0.42];
      col.set([b * tint[0], b * tint[1], b * tint[2]], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({
      size, map: softDot, vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
    }));
  };

  const makeSky = (radius = 950) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, transparent: true, opacity: 0 });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
    sky.renderOrder = -1; // draw first so rings and glows (no depth write) stay on top
    tex(small ? "sky-sm" : "sky", { aniso: 8 }).then(t => { if (t) { mat.map = t; mat.needsUpdate = true; fadeIn(mat, 1500); } });
    return sky;
  };

  // sky dome + stars share one orientation so the star crowding lines up with the baked band;
  // the band crosses the forward view rising to the right, galactic core ahead-right
  const makeHeavens = (stars = 4000) => {
    const g = new THREE.Group();
    g.add(makeSky(), makeStars(stars, 900, 2.6));
    const G = 0.62, tilt = THREE.MathUtils.degToRad(28);
    const nLocal = new THREE.Vector3(0, Math.cos(G), -Math.sin(G));
    const nWorld = new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0);
    const q1 = new THREE.Quaternion().setFromUnitVectors(nLocal, nWorld);
    const core = new THREE.Vector3(0.9, 0.436 * Math.sin(G), 0.436 * Math.cos(G)).normalize().applyQuaternion(q1);
    const want = new THREE.Vector3(0.45, 0.45 * Math.tan(tilt), -1).normalize();
    want.addScaledVector(nWorld, -want.dot(nWorld)).normalize();
    g.quaternion.premultiply(q1).premultiply(new THREE.Quaternion().setFromUnitVectors(core, want));
    return g;
  };

  // additive backdrop plane; black pixels add nothing, so it blends into the sky without edges
  const makeNebula = (size = 720) => {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.renderOrder = -1;
    tex("nebula").then(t => { if (t) { mat.map = t; mat.needsUpdate = true; fadeIn(mat, 1500); } });
    return mesh;
  };

  // tumbling rocks; returns the mesh and a tick(dt) to spin them
  const makeAsteroids = (count, place) => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 1 + Math.sin(v.x * 3.1 + v.y * 1.7) * 0.18 + Math.sin(v.y * 5.3 + v.z * 2.9) * 0.1 + Math.sin(v.z * 7.7) * 0.06;
      p.setXYZ(i, v.x * d, v.y * d * 0.8, v.z * d);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: 0.95, flatShading: true }), count);
    const items = Array.from({ length: count }, (_, i) => ({
      pos: place(i), rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
      spin: new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0), s: 0.15 + Math.pow(Math.random(), 3) * 1.6,
    }));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const tick = dt => {
      items.forEach((it, i) => {
        it.rot.x += it.spin.x * dt; it.rot.y += it.spin.y * dt;
        m.compose(it.pos, q.setFromEuler(it.rot), sc.setScalar(it.s));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    tick(0);
    return { mesh, tick };
  };

  return { small, canvasTex, radial, softDot, makePlanet, makeStars, makeHeavens, makeNebula, makeAsteroids };
})();
