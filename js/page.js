// Shared behaviour for every page. Each block is guarded so pages only pay for what they contain.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = fn => { try { return fn(); } catch { return null; } };

  const PLANETS = {
    "introduction.html": "Introduction", "experience.html": "Experience", "projects.html": "Projects",
    "skills.html": "Skills", "about.html": "About", "contact.html": "Contact", "index.html": "Orbit",
  };
  const COLORS = { Introduction: "#9cc9dc", Experience: "#7fa9dd", Projects: "#e08a5c", Skills: "#d6b289", About: "#d48e68", Contact: "#b392f0", Orbit: "#a9b4c2" };
  const file = p => p.split("/").pop() || "index.html";
  const here = file(location.pathname);
  const isIndex = document.body.classList.contains("index-page");

  // ---------- chrome ----------
  let veil = $(".transition-veil");
  if (!veil) { veil = document.createElement("div"); veil.className = "transition-veil"; document.body.prepend(veil); }
  veil.setAttribute("aria-hidden", "true");
  // a lander touching down on the planet (arrival) or lifting off it (departure), drawn in CSS
  veil.innerHTML = '<div class="veil-scene"><div class="vs-planet"></div><div class="vs-dust"></div>' +
    '<div class="vs-ship"><i class="vs-flame"></i><svg viewBox="0 0 40 56" aria-hidden="true">' +
    '<path class="vs-hull" d="M20 2C28 10 31 20 31 32H9C9 20 12 10 20 2Z"/><circle class="vs-port" cx="20" cy="20" r="4.5"/>' +
    '<path class="vs-fin" d="M9 26 2 40h7M31 26l7 14h-7"/><path class="vs-leg" d="M12 32 6 50M28 32l6 18M3 50h6M31 50h6M16 32h8v4h-8z"/>' +
    '</svg></div></div><div class="veil-hud"><span class="v1"></span><b></b><span class="v2"></span><div class="bar"><i></i></div></div>';
  const vTop = $(".v1", veil), vName = $("b", veil), vAlt = $(".v2", veil), vBar = $(".bar i", veil);

  if (!isIndex) {
    document.body.insertAdjacentHTML("beforeend",
      '<div class="progress" aria-hidden="true"></div>' +
      `<div class="hud" aria-hidden="true">Surface ${PLANETS[here] || ""}<br>Altitude <b class="hud-alt">1,200</b> km</div>` +
      '<a class="orbit-badge" href="index.html" aria-label="Return to orbit (home)">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="ob" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs>' +
      '<text><textPath href="#ob">Return to orbit · Return to orbit · </textPath></text></svg><span aria-hidden="true">↑</span></a>');
  }

  $$("nav a[href]").forEach(a => {
    if (file(a.getAttribute("href")) !== here || isIndex) return;
    a.setAttribute("aria-current", "page");
    const bar = a.parentElement; // keep the active link visible in the scrollable mobile nav
    if (bar.scrollWidth > bar.clientWidth) bar.scrollLeft = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
  });
  // phones: the link row becomes a full-screen menu (kept outside the blurred bar so it can cover the page)
  const bar = $(".topbar");
  if (bar) {
    const mbtn = document.createElement("button"), menu = document.createElement("nav");
    mbtn.type = "button"; mbtn.className = "menu-btn"; mbtn.setAttribute("aria-expanded", "false"); mbtn.setAttribute("aria-controls", "planet-menu");
    mbtn.innerHTML = "<i></i><i></i><span>Menu</span>";
    menu.id = "planet-menu"; menu.className = "planet-menu"; menu.setAttribute("aria-label", "Planets");
    const originals = $$(".links a", bar);
    menu.innerHTML = originals.map((a, i) => {
      const name = a.textContent.trim();
      return `<a href="${a.getAttribute("href")}" style="--c:${COLORS[name] || "#aaa"}"${a.getAttribute("aria-current") ? ' aria-current="page"' : ""}><small>0${i + 1}</small>${name}</a>`;
    }).join("");
    document.body.appendChild(menu);
    bar.appendChild(mbtn);
    const setMenu = open => { document.body.classList.toggle("menu-open", open); mbtn.setAttribute("aria-expanded", String(open)); window.lenis?.[open ? "stop" : "start"](); };
    mbtn.addEventListener("click", () => { const open = !document.body.classList.contains("menu-open"); setMenu(open); window.sfx?.play(open ? "open" : "close"); });
    // hand the click to the real link so the home page still flies and subpages still launch
    $$("a", menu).forEach((a, i) => a.addEventListener("click", e => { e.preventDefault(); setMenu(false); originals[i].click(); }));
    addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  }
  const onScrollState = () => document.body.classList.toggle("scrolled", scrollY > 60);
  addEventListener("scroll", onScrollState, { passive: true });
  onScrollState();

  // ---------- audio: on until muted, remembered across pages ----------
  const audio = new Audio();
  audio.preload = "none"; // 2.9 MB: fetched on the first play, not on every page load
  audio.src = "audio/Interstellar.mp3";
  audio.loop = true;
  audio.volume = 0.4;
  window.shipAudio = audio;
  const btn = document.createElement("button");
  btn.className = "audio-btn";
  btn.type = "button";
  btn.innerHTML = '<span class="bars"><i></i><i></i><i></i></span>';
  ($(".topbar") || document.body).appendChild(btn);

  let muted = store(() => localStorage.getItem("audio-muted")) === "1";
  const t0 = parseFloat(store(() => sessionStorage.getItem("audio-time")) || "0");
  if (t0) audio.currentTime = t0;
  // Browsers block sound until the visitor clicks, taps or presses a key (scrolling doesn't count),
  // so the button shows what is really happening and a prompt invites that first gesture.
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className = "sound-prompt";
  prompt.innerHTML = '<span class="bars"><i></i><i></i><i></i></span>Tap for sound';
  document.body.appendChild(prompt);
  const sync = () => {
    const playing = !audio.paused;
    btn.classList.toggle("muted", muted || !playing);
    btn.setAttribute("aria-label", muted || !playing ? "Play music" : "Mute music");
    btn.setAttribute("aria-pressed", String(playing));
    prompt.classList.toggle("show", !muted && !playing && document.body.classList.contains("is-ready"));
  };
  const tryPlay = () => audio.play().catch(() => {}).finally(sync);
  const setMuted = m => {
    muted = m;
    store(() => localStorage.setItem("audio-muted", m ? "1" : "0"));
    m ? audio.pause() : tryPlay();
    sync();
  };
  btn.addEventListener("click", e => { e.stopPropagation(); setMuted(!(muted || audio.paused)); });
  prompt.addEventListener("click", e => { e.stopPropagation(); setMuted(false); });
  ["play", "pause"].forEach(ev => audio.addEventListener(ev, sync));
  if (!muted && t0) tryPlay(); // it was playing on the last page; otherwise wait for a click or key
  const GESTURES = ["pointerdown", "keydown", "touchend"];
  const unlock = () => {
    if (muted) return;
    audio.play().then(() => GESTURES.forEach(e => removeEventListener(e, unlock, true)), () => {});
  };
  GESTURES.forEach(e => addEventListener(e, unlock, true));
  // wake the effects too. Browsers differ on which events count as a gesture (Firefox wants a full click,
  // touch only counts on touchend), so listen to all of them; once the context is running this is a no-op
  ["pointerdown", "pointerup", "click", "keydown", "keyup", "touchend"].forEach(e => addEventListener(e, () => wake(), true));
  setTimeout(sync, 1500); // after the arrival veil lifts
  const saveTime = () => store(() => sessionStorage.setItem("audio-time", audio.currentTime));
  addEventListener("pagehide", saveTime);

  // ---------- sound effects: synthesised on one shared context (no files); independent of the music button ----------
  let actx = null, master = null, noiseBuf = null, eng = null;
  // the context is only created and resumed inside a click, tap or key press, so the browser never blocks it
  const wake = () => {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 1;
      master.connect(actx.destination);
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === "suspended" && !document.hidden) actx.resume().catch(() => {});
  };
  const ac = () => (actx?.state === "running" ? actx : null); // before the first gesture: drop the sound rather than queue a burst
  const env = (c, t, vol, attack, dur) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    return g;
  };
  const tone = (freq, dur, { type = "sine", vol = 0.1, to, delay = 0, attack = 0.008 } = {}) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(env(c, t, vol, attack, dur));
    o.start(t); o.stop(t + dur + 0.05);
  };
  const hiss = (dur, { from = 180, to = 2600, vol = 0.25, q = 0.9, attack = 0.3, delay = 0 } = {}) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter();
    src.buffer = noiseBuf;
    f.type = "bandpass"; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
    src.connect(f).connect(env(c, t, vol, attack, dur));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  };
  const haptic = matchMedia("(hover: none)").matches && "vibrate" in navigator;
  // landing: a retro burn that brakes in pulses as it drops. It starts on the page you leave; the arrival page adds
  // the descent and the touchdown thud when the browser lets it make sound before a click (see autoplay below)
  const landing = () => {
    if (!ac()) return;
    hiss(1.6, { from: 1800, to: 140, vol: 0.32, q: 0.5, attack: 0.08 });
    tone(140, 1.6, { vol: 0.2, to: 45, attack: 0.1 });
    [0.45, 0.75, 1.0, 1.2].forEach(d => hiss(0.16, { from: 900, to: 400, vol: 0.18, q: 1.5, attack: 0.02, delay: d }));
    // Firefox (the browser with getAutoplayPolicy) won't let the next page make a sound before it's clicked,
    // so touch down here, just before the page changes
    if (navigator.getAutoplayPolicy) { tone(95, 0.5, { vol: 0.42, to: 32, delay: 1.45 }); hiss(0.5, { from: 500, to: 80, vol: 0.25, attack: 0.01, delay: 1.45 }); }
  };
  // launch: ignition, then the roar climbing away
  const launch = () => {
    if (!ac()) return;
    tone(40, 1.4, { vol: 0.3, to: 120, attack: 0.3 });
    hiss(1.4, { from: 120, to: 2600, vol: 0.34, q: 0.45, attack: 0.35 });
  };
  const buzz = ms => haptic && navigator.userActivation?.hasBeenActive && navigator.vibrate(ms);
  const SOUNDS = {
    tick: () => tone(2400, 0.035, { type: "square", vol: 0.04 }),
    press: () => tone(900, 0.1, { type: "triangle", vol: 0.16, to: 520 }),
    blip: () => tone(1100 + Math.random() * 500, 0.05, { type: "square", vol: 0.05 }),
    hover: () => swoosh(0.45, 0.12),
    coin: () => { tone(1568, 0.12, { type: "triangle", vol: 0.1 }); tone(2093, 0.25, { type: "triangle", vol: 0.09, delay: 0.06 }); },
    landing: () => landing(),
    launch: () => { launch(); buzz(20); },
    queue: () => [880, 1175, 1480].forEach((f, i) => tone(f, 0.6, { vol: 0.09, delay: i * 0.07 })),
    crowd: () => { hiss(2.6, { from: 500, to: 1100, vol: 0.3, q: 0.4, attack: 0.5 }); hiss(2.2, { from: 1500, to: 2600, vol: 0.12, q: 0.6, attack: 0.4, delay: 0.1 }); },
    powerup: () => { tone(110, 1, { type: "sawtooth", vol: 0.07, to: 880, attack: 0.8 }); hiss(1, { from: 200, to: 5000, vol: 0.2, attack: 0.9 }); },
    chime: () => { tone(660, 0.5, { vol: 0.12 }); tone(990, 0.7, { vol: 0.09, delay: 0.09 }); buzz(8); },
    ok: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: "triangle", vol: 0.12, delay: i * 0.08 })); buzz([15, 40, 15]); },
    whoosh: () => swoosh(1, 0.4),
    swoosh: () => swoosh(1.3, 0.45),
    descend: () => { hiss(1.3, { from: 2200, to: 150, vol: 0.3, q: 0.5, attack: 0.1 }); tone(130, 1.3, { vol: 0.2, to: 45, attack: 0.1 }); [0.35, 0.65, 0.9].forEach(d => hiss(0.16, { from: 900, to: 400, vol: 0.18, q: 1.5, attack: 0.02, delay: d })); },
    warp: () => { hiss(1.9, { from: 120, to: 4200, vol: 0.3, attack: 1.1 }); tone(55, 1.9, { type: "sawtooth", vol: 0.04, to: 220, attack: 1 }); },
    roll: () => hiss(1.1, { from: 300, to: 1400, vol: 0.16, q: 2, attack: 0.5 }),
    thud: () => { tone(110, 0.4, { vol: 0.28, to: 38 }); hiss(0.45, { from: 400, to: 90, vol: 0.18, attack: 0.01 }); buzz(30); },
    boom: () => { hiss(1.2, { from: 900, to: 50, vol: 0.4, attack: 0.01, q: 0.6 }); tone(80, 0.9, { vol: 0.3, to: 28 }); buzz([60, 30, 90]); },
    open: () => hiss(0.35, { from: 600, to: 2400, vol: 0.08, q: 3, attack: 0.05 }),
    close: () => hiss(0.3, { from: 2400, to: 600, vol: 0.07, q: 3, attack: 0.05 }),
  };
  // engine: a starship drive. Two deep sines, a hair apart so they throb slowly against each other, are frequency
  // modulated by their octave; as the throttle opens the modulation deepens, so the drone grows richer and brighter
  // rather than climbing in pitch like a car. A dark roar of thrust swells under it. Call it every frame with 0..1
  const engine = level => {
    if (!eng) {
      const c = ac(); if (!c) return;
      const mod = c.createOscillator(), depth = c.createGain(), lp = c.createBiquadFilter(), g = c.createGain();
      mod.type = "sine"; depth.gain.value = 0;
      mod.connect(depth);
      const cars = [1, 1.009].map(k => { const o = c.createOscillator(); o.type = "sine"; depth.connect(o.frequency); o.connect(lp); o.start(); return [o, k]; });
      lp.type = "lowpass"; lp.Q.value = 0.7;
      const roar = c.createBufferSource(), roarF = c.createBiquadFilter(), roarG = c.createGain();
      roar.buffer = noiseBuf; roar.loop = true; roarF.type = "bandpass"; roarF.Q.value = 0.6; roarG.gain.value = 0;
      roar.connect(roarF).connect(roarG).connect(g); roar.start();
      lp.connect(g); g.gain.value = 0; g.connect(master); mod.start();
      eng = { mod, depth, cars, lp, roarF, roarG, g };
    }
    const l = Math.max(0, Math.min(1, level));
    if (Math.abs(l - (eng.l ?? -1)) < 0.01) return; // called every frame; only reschedule when the throttle moves
    eng.l = l;
    const t = actx.currentTime, k = 0.25, f = 42 + l * 26;
    eng.g.gain.setTargetAtTime(l > 0.02 ? 0.045 + l * 0.42 : 0, t, k);
    eng.cars.forEach(([o, m]) => o.frequency.setTargetAtTime(f * m, t, k));
    eng.mod.frequency.setTargetAtTime(f * 2, t, k);
    eng.depth.gain.setTargetAtTime(f * (0.5 + l * 2.6), t, k);
    eng.lp.frequency.setTargetAtTime(260 + l * 1400, t, k);
    eng.roarF.frequency.setTargetAtTime(260 + l * 1600, t, k);
    eng.roarG.gain.setTargetAtTime(l * 0.3, t, k);
  };
  // swoosh: a wide band of air that sweeps up and back down while it pans across, like something passing close by
  const swoosh = (dur = 1.2, vol = 0.4) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), lo = c.createBiquadFilter();
    src.buffer = noiseBuf;
    f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.45); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    lo.type = "lowpass"; lo.frequency.value = 5000;
    let out = src.connect(f).connect(lo);
    if (c.createStereoPanner) {
      const pan = c.createStereoPanner();
      pan.pan.setValueAtTime(-0.9, t); pan.pan.linearRampToValueAtTime(0.9, t + dur);
      out = out.connect(pan);
    }
    out.connect(env(c, t, vol, dur * 0.4, dur));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  };
  // a plucked string (Karplus-Strong): a burst of noise fed through a short, slowly damped delay line
  const pluck = (freq, vol = 0.35) => {
    const c = ac(); if (!c) return;
    const len = Math.round(c.sampleRate * 1.6), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    const n = Math.round(c.sampleRate / freq), line = Float32Array.from({ length: n }, () => Math.random() * 2 - 1);
    for (let i = 0, k = 0; i < len; i++, k = (k + 1) % n) { const next = line[(k + 1) % n]; d[i] = line[k]; line[k] = (line[k] + next) * 0.4985; }
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = vol;
    src.connect(g).connect(master);
    src.start();
  };
  // A sound fired by a click or tap (landing on a planet, say) may arrive while the context is still unlocking from
  // that same gesture; wait for it rather than drop the sound. Sounds with no gesture behind them are just skipped
  const play = name => {
    if (reduce && name === "warp") return;
    if (actx?.state === "running") return SOUNDS[name]?.();
    if (!navigator.userActivation?.isActive) return;
    wake();
    actx?.resume().then(() => SOUNDS[name]?.(), () => {});
  };
  // A fresh page with no click yet. Chrome lets it make sound if you clicked on the previous page of this site, and
  // Firefox does for sites allowed to autoplay; elsewhere this stays silent rather than queueing a burst for later
  const autoplay = name => {
    if (reduce || navigator.getAutoplayPolicy?.("audiocontext") === "disallowed") return;
    wake();
    if (actx?.state === "running") return SOUNDS[name]?.();
    // a context the browser allows still takes a moment to start; one it blocks never resolves until a click,
    // and by then this sound is stale, so give it a short window and drop it otherwise
    const t0 = performance.now();
    actx?.resume().then(() => performance.now() - t0 < 400 && SOUNDS[name]?.(), () => {});
  };
  window.sfx = { play, autoplay, engine, pluck };
  // silent while the tab is hidden
  const quiet = () => actx && (document.hidden ? actx.suspend() : actx.resume()).catch(() => {});
  document.addEventListener("visibilitychange", quiet);
  // UI feedback: a soft press on buttons and links, a tick when a pointer finds one
  addEventListener("pointerdown", e => e.target.closest?.("a, button, [role=button], .ascii") && SOUNDS.press(), true);
  addEventListener("pointerover", e => {
    if (e.pointerType !== "mouse") return;
    const el = e.target.closest?.("a, button");
    if (el && !el.contains(e.relatedTarget)) SOUNDS.tick();
  }, true);
  // phones: ask for motion access once (iOS), so the scenes can lean with the phone's tilt
  addEventListener("touchend", () => { try { DeviceOrientationEvent?.requestPermission?.().catch(() => {}); } catch {} }, { once: true });

  // ---------- home: pre-flight boot screen, driven by the 3D scene's real loading progress ----------
  const boot = $(".boot");
  if (boot) {
    const ring = $(".bar", boot), pct = $(".boot-pct", boot), log = $(".boot-log", boot);
    const repeat = store(() => sessionStorage.getItem("booted")) === "1";
    const t0 = performance.now(), MIN = reduce ? 0 : repeat ? 500 : 1500; // long enough to read the first time
    let shown = 0, target = 0, finished = false;
    const C = 2 * Math.PI * 54;
    ring.style.strokeDasharray = C;
    const paint = () => {
      shown += (target - shown) * 0.12;
      if (target - shown < 0.002) shown = target;
      ring.style.strokeDashoffset = C * (1 - shown);
      pct.textContent = Math.round(shown * 100);
      if (shown < 1 || !finished) requestAnimationFrame(paint);
    };
    const line = (txt, ok = true) => {
      const li = document.createElement("li");
      li.innerHTML = `<span></span><em>${ok ? "OK" : "··"}</em>`;
      li.firstChild.textContent = txt;
      log.appendChild(li);
      window.sfx?.play("blip");
      while (log.children.length > 6) log.firstChild.remove();
    };
    line("Hull integrity");
    line("Ion drive · warm");
    window.bootProgress = (p, label) => { target = Math.max(target, Math.min(1, p)); if (label) line(label); };
    window.bootDone = () => {
      if (finished) return;
      finished = true;
      target = 1;
      line("All systems go");
      setTimeout(() => {
        store(() => sessionStorage.setItem("booted", "1"));
        document.body.classList.add("booted");
        dispatchEvent(new Event("boot-done"));
        setTimeout(() => boot.remove(), 1200);
      }, Math.max(250, MIN - (performance.now() - t0)));
    };
    requestAnimationFrame(paint);
    setTimeout(() => window.bootDone(), 8000); // never trap anyone behind the loader (no WebGL, slow CDN)
    $(".begin")?.addEventListener("click", () => $(".land-btn")?.click()); // first stop: Introduction
  }

  // ---------- arrival + departure ----------
  const countAlt = (from, to, ms, done) => {
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - p, 3);
      vAlt.textContent = "Altitude " + Math.round(from + (to - from) * e).toLocaleString() + " km";
      vBar.style.setProperty("--p", e);
      p < 1 ? requestAnimationFrame(step) : done && done();
    };
    requestAnimationFrame(step);
  };
  const ready = () => document.body.classList.add("is-ready");
  if (PLANETS[here] && !isIndex && !reduce) {
    vTop.textContent = "Entering atmosphere";
    vName.textContent = PLANETS[here];
    veil.dataset.mode = "land";
    // the first landing of a visit plays in full; later hops between planets are quicker
    const quick = store(() => sessionStorage.getItem("landed")) === "1";
    store(() => sessionStorage.setItem("landed", "1"));
    const dur = quick ? 950 : 1500;
    veil.style.setProperty("--vd", dur + 100 + "ms");
    window.sfx.autoplay("descend");
    countAlt(12000, 0, dur, () => { vTop.textContent = "Touchdown"; window.sfx.autoplay("thud"); setTimeout(ready, quick ? 220 : 380); });
  } else requestAnimationFrame(ready);
  addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("is-leaving"); });

  window.leaveTo = href => {
    saveTime();
    const name = PLANETS[file(new URL(href, location.href).pathname)] || "";
    vTop.textContent = name === "Orbit" ? "Returning to" : isIndex ? "Descending to" : "Launching to";
    vName.textContent = name === "Orbit" ? "Orbit" : name;
    vAlt.textContent = "";
    vBar.style.setProperty("--p", 0);
    if (isIndex) veil.style.setProperty("--planet", COLORS[name] || ""); // descend onto the destination; otherwise lift off this one
    veil.dataset.mode = isIndex ? "approach" : "launch";
    void veil.offsetWidth; // restart the CSS animation if the mode didn't change
    document.body.classList.add("is-leaving");
    if (!reduce && !isIndex) window.sfx.play("launch"); // the home page starts its landing sound when you click, so the touchdown lands before the page changes
    if (reduce) return (location.href = href);
    countAlt(isIndex ? 40000 : 0, 12000, 900, () => (location.href = href)); // descending from orbit counts down into the arrival readout
  };
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (e.defaultPrevented || !a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith(".html") || url.pathname === location.pathname) return;
    e.preventDefault();
    leaveTo(url.href);
  });

  // ---------- small utilities ----------
  const toast = msg => {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 2200);
  };
  const copy = text => navigator.clipboard?.writeText(text).then(() => { toast("Copied " + text); window.sfx.play("chime"); }, () => toast(text));
  $$("[data-copy]").forEach(el => el.addEventListener("click", () => copy(el.dataset.copy)));

  $$(".filters button").forEach(b => b.addEventListener("click", () => {
    $$(".filters button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    const f = b.dataset.filter;
    $$(".proj-grid li").forEach(li => li.classList.toggle("is-hidden", f !== "all" && !li.dataset.cat.split(" ").includes(f)));
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }));

  // showcase: on desktop the copy and one image frame stay pinned and scrolling swaps the project inside them;
  // on phones the images run as a list and whichever is centred is the active one
  const figs = $$(".showcase-media figure");
  if (figs.length) {
    const arts = $$(".showcase-copy article"), dashes = $$(".dashes i"), count = $(".showcase-count b"), track = $(".showcase-media");
    let active = -1;
    const setActive = i => {
      if (i === active) return;
      if (active >= 0) window.sfx.play("blip");
      active = i;
      [figs, arts, dashes].forEach(list => list.forEach((el, k) => el.classList.toggle("on", k === i)));
      if (count) count.textContent = String(i + 1).padStart(2, "0");
    };
    const pinned = matchMedia("(min-width: 901px)");
    const onScroll = () => {
      if (!pinned.matches) return;
      const r = track.getBoundingClientRect(), p = -r.top / Math.max(1, r.height - innerHeight);
      setActive(Math.max(0, Math.min(figs.length - 1, Math.floor(p * figs.length))));
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting && !pinned.matches) setActive(figs.indexOf(en.target));
    }), { rootMargin: "-45% 0px -45% 0px" });
    figs.forEach(f => io.observe(f));
  }

  // ---------- captain's log terminal (press ` to open) ----------
  const LOG = [
    "2019  Plus Two at St. Xavier's College, Maitighar.",
    "2021  Started Computer Engineering at ACEM, Kalanki.",
    "2023  Built a Tekken-style fighting game in Pygame.",
    "2024  Flood susceptibility mapping of Kathmandu Valley. CNN reached 95%.",
    "2025  Landfill suitability mapping. Custom U-Net reached 96.97%, mean IoU 0.92.",
    "2026  Built aquahundred.com.np as a freelancer.",
    "2026  June: joined Octacore Solutions as a full-stack intern.",
    "2026  24 August: went full-time at Octacore.",
  ];
  const term = document.createElement("div");
  term.className = "term";
  term.setAttribute("role", "dialog");
  term.setAttribute("aria-label", "Captain's log terminal");
  term.innerHTML = '<header><span>Captain\'s log</span><button type="button">Close (esc)</button></header>' +
    '<div class="out" aria-live="polite"></div><form><span>›</span><input aria-label="Command" autocomplete="off" spellcheck="false"></form>';
  document.body.appendChild(term);
  const out = $(".out", term), input = $("input", term);
  const print = (txt, cls) => { const d = document.createElement("div"); if (cls) d.className = cls; d.textContent = txt; out.appendChild(d); out.scrollTop = out.scrollHeight; };
  const planetFile = n => Object.keys(PLANETS).find(k => PLANETS[k].toLowerCase() === n || k.startsWith(n));
  const COMMANDS = {
    help: () => "help, whoami, log, ls, goto <planet>, resume, email, github, linkedin, music, clear, exit",
    whoami: () => "Samridha Shrestha. Software engineer at Octacore Solutions, Kathmandu. AI/ML at heart.",
    log: () => LOG.join("\n"),
    ls: () => Object.values(PLANETS).filter(p => p !== "Orbit").map(p => p.toLowerCase()).join("  "),
    goto: arg => { const f = arg && planetFile(arg.toLowerCase()); if (!f) return "Unknown planet. Try ls."; setTimeout(() => leaveTo(f), 300); return "Plotting course to " + PLANETS[f] + "..."; },
    resume: () => { open("Files/Resume_2026.pdf", "_blank"); return "Opening resume."; },
    email: () => { copy("samridhashrestha10@gmail.com"); return "samridhashrestha10@gmail.com (copied)"; },
    github: () => { open("https://github.com/Nitride27", "_blank"); return "github.com/Nitride27"; },
    linkedin: () => { open("https://www.linkedin.com/in/samridha-shrestha-55415820a/", "_blank"); return "Opening LinkedIn."; },
    music: () => { setMuted(!muted); return muted ? "Music off." : "Music on."; },
    sudo: () => "Permission denied. Only the captain has root.",
    clear: () => { out.textContent = ""; return ""; },
    exit: () => { toggleTerm(false); return ""; },
  };
  COMMANDS.cd = COMMANDS.goto;
  const history = [];
  let hIdx = 0;
  $("form", term).addEventListener("submit", e => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = "";
    if (!raw) return;
    history.push(raw); hIdx = history.length;
    print("› " + raw, "cmd");
    const [cmd, ...rest] = raw.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    const res = fn ? fn(rest.join(" ")) : `command not found: ${cmd}. Type help.`;
    if (res) print(res);
  });
  input.addEventListener("keydown", e => {
    window.sfx.play(e.key === "Enter" ? "press" : "blip");
    if (e.key === "ArrowUp" && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
    if (e.key === "ArrowDown") { input.value = history[++hIdx] || ""; hIdx = Math.min(hIdx, history.length); e.preventDefault(); }
  });
  const toggleTerm = (open = !term.classList.contains("open")) => {
    if (open !== term.classList.contains("open")) window.sfx.play(open ? "open" : "close");
    term.classList.toggle("open", open);
    if (open) {
      if (!out.textContent) print("Captain's log, stardate " + new Date().toISOString().slice(0, 10) + ". Type help.");
      setTimeout(() => input.focus(), 50);
    } else input.blur();
  };
  $("header button", term).addEventListener("click", () => toggleTerm(false));
  addEventListener("keydown", e => {
    if (e.key === "`" || e.key === "~") { e.preventDefault(); toggleTerm(); }
    else if (e.key === "Escape" && term.classList.contains("open")) toggleTerm(false);
  });
  $$("[data-terminal]").forEach(el => el.addEventListener("click", () => toggleTerm(true)));

  // ---------- ASCII landing site in the footer; click it to fly the lander yourself ----------
  // Levels: each touchdown moves the pad somewhere new, makes it narrower, and adds wind and gravity.
  const ascii = $(".ascii");
  let startLander = () => {};
  if (ascii) {
    const ROWS = 20, SURF = 16, W = 7, TOP = 2; // W = lander width in columns; TOP = launch row, below the HUD
    const LANDER = ["  ╭─╮  ", " ╭┤o├╮ ", " ╰┬─┬╯ ", " ╱   ╲ "];
    const RINGED = ["   ▄██▄   ", "══▐████▌══", "   ▀██▀   "];
    const EIGHTHS = " ▁▂▃▄▅▆▇█";
    // tuned with a simulated sloppy player (600ms reactions, misjudged speed): ~100% at level 1, ~40% by level 5
    const G = 0.0028, THRUST = 0.0075, SIDE = 0.005, SAFE_V = 0.12, SAFE_H = 0.15; // rows or cols per 50ms step
    let cols = 0, heights = [], near = [], far = [], stars = [], comet = null, dust = [];
    let padX = 0, padHalf = 9, level = 1, score = 0;
    const best = () => +(store(() => localStorage.getItem("lander-best")) || 0);
    // near terrain as float rows (smaller = higher) with a level pad at padX; far range sits behind it
    const terrain = () => {
      near = Array.from({ length: cols }, (_, x) => {
        const off = Math.abs(x - padX) - padHalf;
        if (off < 0) return SURF;
        const h = Math.sin(x * 0.11 + level) * 1.4 + Math.sin(x * 0.037 + 1 + level * 0.7) * 1.8 + Math.sin(x * 0.29) * 0.5;
        return SURF - Math.max(-1, Math.min(4.2, h + 1.2 + level * 0.15)) * Math.min(1, off / 5); // ease out of the pad
      });
      heights = near.map(Math.round);
    };
    const measure = () => {
      const probe = document.createElement("span");
      probe.textContent = "█".repeat(20);
      ascii.appendChild(probe);
      const cw = probe.getBoundingClientRect().width / 20 || 7.2;
      probe.remove();
      cols = Math.max(40, Math.ceil(ascii.clientWidth / cw));
      if (!game) padX = cols / 2;
      far = Array.from({ length: cols }, (_, x) => SURF - 3.2 - Math.abs(Math.sin(x * 0.045 + 2)) * 3 - Math.sin(x * 0.17) * 0.6);
      stars = Array.from({ length: Math.round(cols / 6) }, () => [Math.random() * cols | 0, Math.random() * (SURF - 6) | 0, Math.random()]);
      terrain();
    };
    // game: null while parked; otherwise the lander's state
    let game = null, keys = {}, held = false;
    const esc = c => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);
    const draw = t => {
      const grid = Array.from({ length: ROWS }, () => Array.from({ length: cols }, () => [" ", ""]));
      const put = (y, x, ch, cls) => { if (grid[y] && x >= 0 && x < cols && ch !== " ") grid[y][x] = [ch, cls]; };
      const text = (y, str, x = 1, cls = "t") => [...str].forEach((ch, k) => grid[y] && x + k < cols && x + k >= 0 && (grid[y][x + k] = [ch, cls]));
      const centre = (y, str, cls) => text(y, str, Math.max(1, Math.round(cols / 2 - str.length / 2)), cls);
      stars.forEach(([x, y, p], i) => {
        const tw = Math.sin(t * 0.002 + i * 1.7);
        if (tw > -0.3) put(y, x, tw > 0.92 ? "+" : p > 0.85 ? "•" : "·", tw > 0.92 ? "b" : "s");
      });
      const px = Math.round(cols * 0.78);
      RINGED.forEach((row, r) => [...row].forEach((ch, k) => put(3 + r, px + k, ch, ch === "═" || ch === "▐" || ch === "▌" ? "r" : "q")));
      if (!comet && Math.random() < 0.01) comet = { x: Math.random() * cols * 0.6, y: Math.random() * 3 | 0, v: 1.6 };
      if (comet) { comet.x += comet.v; text(comet.y, "──·", Math.round(comet.x), "c"); if (comet.x > cols) comet = null; }
      // terrain: eighth blocks give the ridgeline sub-row detail
      const layer = (hs, top, fill) => hs.forEach((h, x) => {
        const row = Math.floor(h), cover = 1 - (h - row);
        for (let y = Math.max(0, row); y < ROWS; y++) put(y, x, y === row ? EIGHTHS[Math.max(1, Math.round(cover * 8))] : fill(y - row, x), top);
      });
      layer(far, "f", () => "░");
      layer(near, "n", (d, x) => (d < 2 ? "█" : d < 3 ? "▓" : (x * 3 + d) % 7 ? "▓" : "▒"));
      const p0 = Math.round(padX - padHalf), p1 = Math.round(padX + padHalf) - 1;
      for (let x = p0; x <= p1; x++) put(SURF, x, x === p0 || x === p1 ? (Math.sin(t * 0.006) > 0 ? "◆" : "◇") : "▀", "p");
      const lx = game ? Math.round(game.x) : Math.round(padX - 3), ly = game ? Math.round(game.y) : SURF - LANDER.length;
      if (!(game && game.over === "crash")) {
        LANDER.forEach((line, r) => [...line].forEach((ch, k) => put(ly + r, lx + k, ch, "l")));
        if (game && game.firing && !game.over) { text(ly + 4, "▼", lx + 3, "fl"); if (Math.random() > 0.4) text(ly + 5, "░", lx + 3, "fl"); }
        if (game && !game.over) {
          // live speed beside the lander: green while a touchdown would be safe, red when it would not
          const fast = game.vy >= SAFE_V, slide = Math.abs(game.vx) >= SAFE_H;
          text(ly + 1, `${fast ? "▼" : "↓"}${(game.vy * 20).toFixed(1)}`, lx + W + 1, fast ? "w" : "ok");
          if (slide) text(ly + 2, game.vx < 0 ? "◀ drift" : "drift ▶", lx + W + 1, "w");
          const p = Math.round(padX), gap = Math.abs(lx + 3.5 - padX);
          if (gap > padHalf) text(SURF - 2, "▼", p, "ok"), text(SURF - 3, "LAND", p - 1, "ok");
          if (fast && SURF - (game.y + LANDER.length) < 4 && Math.sin(t * 0.03) > 0) centre(5, "TOO FAST, BURN!", "w");
        }
        if (game && !game.over && keys.left) put(ly + 1, lx + W, "≈", "fl");
        if (game && !game.over && keys.right) put(ly + 1, lx - 1, "≈", "fl");
      } else text(Math.min(ly + 3, SURF - 1), "▒ ╱▓╲ ░", lx, "w"); // wreckage
      dust = dust.filter(d => (d.life -= 1) > 0);
      dust.forEach(d => { d.x += d.vx; put(SURF - 1, Math.round(d.x), d.life > 6 ? "°" : "·", "p"); });
      if (!game) {
        if (Math.sin(t * 0.004) > 0) put(SURF - LANDER.length - 1, lx + 3, "*", "fl"); // beacon
        if (best()) centre(0, `best score ${best()}`);
      } else {
        const wind = Math.abs(game.wind) > 1e-4 ? `${game.wind < 0 ? "←" : "→"}${Math.abs(game.wind * 1000).toFixed(1)}` : "calm";
        const fuel = String(Math.max(0, game.fuel | 0)).padStart(3);
        text(0, cols >= 96
          ? `LVL ${level}  SCORE ${score}  BEST ${best()}   FUEL ${fuel}  WIND ${wind}   land under ${(SAFE_V * 20).toFixed(1)} · ↑/space thrust  ←→ steer`
          : `L${level} S${score} F${fuel} W${wind} safe<${(SAFE_V * 20).toFixed(1)}`);
        // fuel gauge
        const gw = Math.min(20, cols - 4), on = Math.round(gw * Math.max(0, game.fuel) / game.tank);
        text(1, "▕" + "█".repeat(on) + "░".repeat(gw - on) + "▏", 1, game.fuel < game.tank * 0.2 ? "w" : "t");
        if (game.over === "land") centre(3, game.msg);
        if (game.over === "crash") { centre(3, game.msg, "w"); centre(4, "click the art or Try again"); }
      }
      // one span per run of the same layer keeps the DOM small
      ascii.innerHTML = grid.map(row => {
        let out = "", cls = null, run = "";
        row.forEach(([ch, c]) => { if (c !== cls) { if (run) out += cls ? `<i class="a-${cls}">${run}</i>` : run; run = ""; cls = c; } run += esc(ch); });
        return out + (cls ? `<i class="a-${cls}">${run}</i>` : run);
      }).join("\n");
      ascii.classList.toggle("playing", !!game);
      ui.hidden = !game;
      ascii.nextElementSibling.classList.toggle("on", !!game && !game.over);
      play.hidden = !canStart();
      play.textContent = game?.over === "crash" ? "↻ Try again" : "▶ Fly the lander";
    };
    const step = () => {
      const g = game;
      if (!g || g.over) return;
      g.firing = (keys.up || held) && g.fuel > 0;
      g.vy += g.g - (g.firing ? THRUST : 0);
      if (g.fuel > 0 && keys.left) g.vx -= SIDE;
      if (g.fuel > 0 && keys.right) g.vx += SIDE;
      g.vx += g.wind;
      g.fuel -= (g.firing ? 1 : 0) + (keys.left || keys.right ? 0.4 : 0);
      g.x = Math.max(0, Math.min(cols - W, g.x + g.vx));
      g.y = Math.max(TOP, g.y + g.vy);
      const lx = Math.round(g.x), ground = Math.min(...heights.slice(lx, lx + W));
      if (g.y + LANDER.length < ground) return;
      g.y = ground - LANDER.length;
      const onPad = Math.abs(g.x + W / 2 - padX) <= padHalf; // lander's centre over the pad
      const soft = g.vy < SAFE_V && Math.abs(g.vx) < SAFE_H;
      for (let i = 0; i < 6; i++) dust.push({ x: lx + 3, vx: (i - 2.5) * 0.5, life: 10 });
      if (onPad && soft) {
        const pts = Math.round((100 + Math.max(0, g.fuel) * 3 + (SAFE_V - g.vy) * 1500) * level);
        score += pts;
        g.over = "land";
        window.sfx.play("ok");
        g.msg = `TOUCHDOWN +${pts}. Level ${level + 1} incoming...`;
        collect("lander");
        setTimeout(() => game && game.over === "land" && nextLevel(), 1800);
      } else {
        g.over = "crash";
        window.sfx.play("boom");
        g.msg = !onPad ? "CRASHED off the pad." : g.vy >= SAFE_V ? "CRASHED: too fast. Burn earlier." : "CRASHED: sliding sideways.";
        if (score > best()) { store(() => localStorage.setItem("lander-best", score)); toast(`New best: ${score}`); }
        g.msg += ` Score ${score}.`;
      }
    };
    const launch = () => {
      const tank = Math.max(110, 190 - level * 12);
      game = {
        // start within reach of the pad; the drift you must correct grows each level
        x: Math.max(1, Math.min(cols - W - 1, padX - W / 2 + (Math.random() < 0.5 ? -1 : 1) * Math.random() * Math.min(cols * 0.33, (level - 1) * 8))),
        y: TOP, vx: 0, vy: 0, fuel: tank, tank, over: null,
        g: G * (1 + (level - 1) * 0.06), wind: level > 1 ? (Math.random() - 0.5) * 0.0006 * Math.min(level, 6) : 0,
      };
    };
    const nextLevel = () => {
      level++;
      padHalf = Math.max(5, 10 - level);
      padX = padHalf + 3 + Math.random() * (cols - 2 * padHalf - 6);
      terrain();
      launch();
    };
    startLander = () => {
      level = 1; score = 0; padHalf = 9; padX = cols / 2;
      terrain();
      launch();
      wake();
      held = false;
      ascii.nextElementSibling.classList.add("on"); // show the phone pad first so the page is its final height
      window.lenis?.resize();
      const y = ascii.getBoundingClientRect().top + scrollY - Math.max(16, (innerHeight - ascii.offsetHeight - 110) / 2);
      window.lenis ? window.lenis.scrollTo(y, { duration: 0.8 }) : scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    };
    // on-screen controls: exit, and ◀ ▲ ▶ for phones
    const ui = document.createElement("div");
    ui.className = "lander-ui";
    ui.hidden = true;
    ui.innerHTML = '<button type="button" class="play-exit lander-exit"><span aria-hidden="true">✕</span> Exit</button>' +
      '<div class="lander-pad"><button type="button" data-k="left" aria-label="Steer left">◀</button><button type="button" data-k="up" aria-label="Thrust">▲</button><button type="button" data-k="right" aria-label="Steer right">▶</button></div>';
    ascii.before(ui);
    // phones: the pad sits under the art (in the page flow) so it never covers the game
    const pad = $(".lander-pad", ui);
    ascii.after(pad);
    $(".lander-exit", ui).addEventListener("click", () => { window.sfx.engine(0); game = null; keys = {}; padX = cols / 2; padHalf = 9; terrain(); ui.hidden = true; draw(performance.now()); });
    $$("button", pad).forEach(b => {
      const k = b.dataset.k, on = e => { e.preventDefault(); keys[k] = true; }, off = () => (keys[k] = false);
      b.addEventListener("pointerdown", on);
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, off));
      b.addEventListener("contextmenu", e => e.preventDefault());
    });
    // start on press, not click: the art is re-rendered every frame, so the node under the cursor at
    // mousedown is usually gone by mouseup and the browser never fires "click"
    const canStart = () => !game || game.over === "crash";
    const play = document.createElement("button");
    play.type = "button"; play.className = "lander-play";
    play.addEventListener("click", () => canStart() && startLander());
    ascii.before(play);
    ascii.addEventListener("pointerdown", e => {
      if (canStart()) { e.preventDefault(); startLander(); return; }
      held = true;
    });
    addEventListener("pointerup", () => (held = false));
    const KEYS = { ArrowUp: "up", " ": "up", w: "up", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
    addEventListener("keydown", e => { if (game && !game.over && KEYS[e.key] && !e.target.closest?.("input,textarea")) { keys[KEYS[e.key]] = true; e.preventDefault(); } });
    addEventListener("keyup", e => { if (KEYS[e.key]) keys[KEYS[e.key]] = false; });
    ascii.setAttribute("title", "Click to fly the lander");
    measure();
    addEventListener("resize", measure);
    // only spend frames while the footer is on screen or a flight is in progress
    let visible = false, last = 0, lastStep = 0, raf = 0;
    const loop = now => {
      raf = 0;
      if (game && now - lastStep > 50) {
        step(); lastStep = now;
        window.sfx.engine(game.over || game.fuel <= 0 ? 0 : (game.firing ? 0.75 : 0) + (keys.left || keys.right ? 0.3 : 0));
      }
      if (visible && (game ? now - last > 50 : now - last > 120)) { draw(now); last = now; }
      if ((visible && !reduce) || (game && !game.over) || game?.over === "land") raf = requestAnimationFrame(loop);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(ascii);
    draw(0);
  }

  // ---------- skills: hover or focus a skill to see which projects used it ----------
  const usedPanel = $(".used-in");
  if (usedPanel) {
    const LINKS = [
      ["Landfill", "projects.html"], ["Flood", "projects.html"], ["World Cup", "https://github.com/Nitride27/worldcup2026_prediction"],
      ["Fighting", "https://github.com/Nitride27/Fighting-game"], ["Black hole", "https://github.com/Nitride27/Blackhole-Simulation"],
      ["Octacore", "experience.html"], ["CargoFlow", "https://github.com/Nitride27/cargo-website"],
      ["Éclat", "https://github.com/Nitride27/beautyinstitute-website"], ["aquahundred", "https://aquahundred.com.np"], ["Aqua Hundred", "https://aquahundred.com.np"],
      ["StayT", "https://apps.samridhashrestha.com.np/stayt/"], ["GTA VI", "https://apps.samridhashrestha.com.np/gta6guide/"],
      ["Anime Studio", "https://apps.samridhashrestha.com.np/animestudio/"], ["Contact management", "https://github.com/Nitride27/Contact_management_system"],
      ["This portfolio", "index.html"], ["Every project", "https://github.com/Nitride27"], ["JARVIS", "https://github.com/Nitride27/Jarvis"],
    ];
    const title = $(".used-title", usedPanel), list = $(".used-list", usedPanel), cat = $(".used-cat", usedPanel);
    const count = $(".used-count", usedPanel), meter = $$(".used-meter i", usedPanel), chips = $(".used-related .chips", usedPanel);
    // each skill's family comes from the row it sits in; orbit chips borrow it by name
    const family = {}, byName = {};
    $$(".skill-row").forEach(row => $$("li", row).forEach(li => { family[li.textContent] = $("h3", row).textContent; byName[li.textContent] = li; }));
    const used = el => (el.dataset.used ? el.dataset.used.split("|") : []);
    const show = el => {
      const name = el.textContent, fam = family[name] || "", items = used(el);
      $$("[data-used]").forEach(x => x.classList.toggle("on", x.textContent === name));
      title.textContent = name;
      cat.textContent = fam;
      count.textContent = items.length === 1 ? "1 project" : items.length + " projects";
      meter.forEach((m, i) => m.classList.toggle("on", i < items.length));
      list.innerHTML = "";
      items.forEach(u => {
        const li = document.createElement("li"), hit = LINKS.find(([k]) => u.includes(k));
        if (hit) { const a = document.createElement("a"); a.href = hit[1]; a.textContent = u; if (hit[1].startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; } li.appendChild(a); }
        else li.textContent = u;
        list.appendChild(li);
      });
      chips.innerHTML = "";
      Object.keys(family).filter(k => family[k] === fam && k !== name && byName[k].dataset.used).forEach(k => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = k;
        b.addEventListener("click", () => show(byName[k]));
        chips.appendChild(b);
      });
      usedPanel.classList.remove("swap"); void usedPanel.offsetWidth; usedPanel.classList.add("swap");
    };
    $$("[data-used]").forEach(el => {
      el.tabIndex = 0;
      ["pointerenter", "focus", "click"].forEach(ev => el.addEventListener(ev, () => show(el)));
    });
    show(byName.PyTorch || $("[data-used]"));

    // family filter: dims the orbit chips and rows outside the chosen family
    const fams = [...new Set(Object.values(family))], bar = $(".skill-filters"), map = $(".orbit-map");
    ["All", ...fams.filter(f => Object.keys(family).some(k => family[k] === f && byName[k].dataset.used))].forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = f.replace(/ and .*/, ""); b.setAttribute("aria-pressed", String(!i));
      b.addEventListener("click", () => {
        $$("button", bar).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        $$(".ring > button").forEach(x => x.classList.toggle("dim", !!i && family[x.textContent] !== f));
        $$(".skill-row").forEach(r => r.classList.toggle("dim", !!i && $("h3", r).textContent !== f));
        map.classList.toggle("filtered", !!i);
      });
      bar.appendChild(b);
    });

    // distinct linked projects (aquahundred and Aqua Hundred share a URL, so count URLs)
    const projects = new Set($$("[data-used]").flatMap(used).map(u => LINKS.find(([k]) => u.includes(k))).filter(h => h && h[0] !== "Every project").map(h => h[0] === "Landfill" || h[0] === "Flood" || h[0] === "Octacore" ? h[0] : h[1]));
    const stat = { skills: Object.keys(family).length, families: fams.length, projects: projects.size };
    $$("[data-stat]").forEach(el => { el.dataset.count = el.textContent = stat[el.dataset.stat]; });
  }

  // ---------- project thumbnails that do something ----------
  const touch = matchMedia("(hover: none)").matches;
  const seen = (el, on, off) => new IntersectionObserver(([en]) => (en.isIntersecting ? on() : off && off()), { threshold: 0.35 }).observe(el);
  // phones have no hover, so site captures scroll on their own while on screen
  if (touch) $$(".proj-thumb.scroll, .scroller").forEach(t => seen(t, () => t.classList.add("auto"), () => t.classList.remove("auto")));
  $$(".proj-thumb.chart").forEach(c => seen(c, () => c.classList.add("on")));
  // the C++ session types itself out
  $$("[data-transcript]").forEach(pre => {
    const full = pre.textContent;
    let timer = null;
    const play = () => {
      if (timer) return;
      let n = 0;
      pre.textContent = "";
      timer = setInterval(() => {
        n += 3;
        pre.textContent = full.slice(0, n);
        pre.scrollTop = pre.scrollHeight;
        if (n >= full.length) { clearInterval(timer); timer = null; }
      }, 30);
    };
    pre.textContent = reduce ? full : full.split("\n").slice(0, 8).join("\n");
    if (reduce) return;
    pre.closest("li").addEventListener("pointerenter", play);
    if (touch) seen(pre, play);
  });
  // the black hole sim, ported from bhs.py: same mass, radius and 30 particles, scaled to the card
  $$("[data-blackhole]").forEach(box => {
    const cv = $("canvas", box), g = cv.getContext("2d");
    let ps = [], raf = 0, W = 0, H = 0, k = 1;
    const reset = p => { p[0] = Math.random() * W; p[1] = Math.random() * H; p[2] = (Math.random() * 4 - 2) * k; p[3] = (Math.random() * 4 - 2) * k; return p; };
    const start = () => {
      if (raf || reduce) return;
      const r = box.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
      W = r.width; H = r.height; k = W / 800;
      cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
      ps = Array.from({ length: 30 }, () => reset([0, 0, 0, 0]));
      box.classList.add("run");
      const cx = W / 2, cy = H / 2, R = 50 * k, M = 3000 * k * k * k;
      const tick = () => {
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, W, H); // short trails
        g.fillStyle = "#000"; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
        g.strokeStyle = "#ffa500"; g.lineWidth = 2;
        for (let i = R + 20 * k; i < R + 40 * k; i += 4 * k) { g.beginPath(); g.arc(cx, cy, i, 0, 7); g.stroke(); }
        g.fillStyle = "#fff";
        ps.forEach(p => {
          const dx = cx - p[0], dy = cy - p[1], dist = Math.hypot(dx, dy);
          if (dist < R) reset(p);
          else { const f = M / (dist * dist), a = Math.atan2(dy, dx); p[2] += f * Math.cos(a); p[3] += f * Math.sin(a); }
          p[0] += p[2]; p[1] += p[3];
          g.beginPath(); g.arc(p[0], p[1], 10 * k, 0, 7); g.fill();
        });
        raf = requestAnimationFrame(tick);
      };
      tick();
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; box.classList.remove("run"); };
    const li = box.closest("li");
    li.addEventListener("pointerenter", start);
    li.addEventListener("pointerleave", stop);
    if (touch) seen(box, start, stop);
  });

  // ---------- projects: a magnifying lens over the research maps ----------
  $$("[data-lens]").forEach(fig => {
    const img = $("img", fig), lens = document.createElement("i"), Z = 2.6;
    lens.className = "lens";
    fig.appendChild(lens);
    fig.addEventListener("pointermove", e => {
      const r = fig.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      lens.style.left = x + "px";
      lens.style.top = y + "px";
      lens.style.backgroundImage = `url(${img.currentSrc || img.src})`;
      // the image is object-fit: cover, so map the cursor into the cropped image box
      const ir = img.naturalWidth / img.naturalHeight || r.width / r.height;
      const w = Math.max(r.width, r.height * ir), h = w / ir, ox = (r.width - w) / 2, oy = (r.height - h) / 2;
      lens.style.backgroundSize = `${w * Z}px ${h * Z}px`;
      lens.style.backgroundPosition = `${90 - (x - ox) * Z}px ${90 - (y - oy) * Z}px`;
    });
  });

  // ---------- contact: live Kathmandu time + a message composer that opens the mail app ----------
  const clock = $("[data-ktm-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 1000);
  }
  const composer = $(".composer");
  if (composer) composer.addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(composer), name = f.get("name").trim(), msg = f.get("message").trim();
    if (!name || !msg) return toast("Add your name and a message first");
    const subject = encodeURIComponent(`Hello from ${name}`), body = encodeURIComponent(msg + (f.get("reply") ? `\n\nReply to: ${f.get("reply")}` : ""));
    location.href = `mailto:samridhashrestha10@gmail.com?subject=${subject}&body=${body}`;
    toast("Opening your mail app…");
  });

  // ---------- last hit: a minion lane on Summoner's Rift. Blue and red waves meet and fight; you only get the gold
  // if your hit kills. Click the lane to move, click a red minion to attack it, Q for a skillshot. Stand too far
  // forward and their minions and turret turn on you. Levels and items raise your damage. 90 seconds, graded. ----------
  let playing = false;
  const startGame = () => {
    if (playing) return;
    playing = true;
    window.lenis?.stop();
    const touchUI = matchMedia("(hover: none)").matches;
    const cv = document.createElement("canvas"), hud = document.createElement("div"), exit = document.createElement("button"), qBtn = document.createElement("button");
    cv.className = "play-canvas lh-canvas"; hud.className = "play-hud";
    exit.className = "play-exit"; exit.type = "button"; exit.innerHTML = "<span aria-hidden=\"true\">✕</span> Exit game";
    qBtn.className = "lh-q"; qBtn.type = "button"; qBtn.innerHTML = "Q<small>Mystic shot</small>"; qBtn.setAttribute("aria-label", "Cast Q, a skillshot down the lane");
    document.body.append(cv, hud, exit, qBtn);
    const g = cv.getContext("2d"), dpr = Math.min(devicePixelRatio, 2);
    let W = 0, H = 0;
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    const GOLD = "#c8aa6e", TEAL = "#0ac8b9", BLUE = "#3d8bff", RED = "#d8443a";
    const AA_CD = 0.85, Q_CD = 5, ROUND = 90, RANGE = 280, SPEED = 210;
    const KIND = {
      melee: { hp: 200, dmg: 15, range: 30, rate: 1.1, r: 14, gold: 21 },
      caster: { hp: 130, dmg: 20, range: 150, rate: 1.5, r: 11, gold: 14 },
      cannon: { hp: 420, dmg: 34, range: 190, rate: 2.0, r: 19, gold: 60 },
    };
    const ITEMS = [[350, "Long Sword", 10], [875, "Pickaxe", 25], [1300, "B. F. Sword", 40]];
    const bestKey = "lasthit-best", best = () => +(store(() => localStorage.getItem(bestKey)) || 0);
    const laneY = () => H * 0.56, base = () => ({ x: Math.max(60, W * 0.1), y: laneY() + 40 });
    let units, shots, fx, coins, banners, me, cs, gold, missed, streak, bestStreak, wave, nextWave, time, over, qReady, shake, aim, items, turrets, raf;
    const reset = () => {
      units = []; shots = []; fx = []; coins = []; banners = [];
      cs = gold = missed = streak = bestStreak = wave = 0; nextWave = 2.2; time = 0; over = false; qReady = 0; shake = 0; items = 0;
      const b = base();
      me = { team: "blue", champ: true, x: b.x + 60, y: b.y, tx: b.x + 60, ty: b.y, r: 17, hp: 520, max: 520, ad: 58, lvl: 1, xp: 0, aa: 0, order: null, dead: 0, flash: 0, hurt: 0 };
      turrets = [{ team: "blue", x: W * 0.035, y: laneY() - 40, cd: 0, range: 240 }, { team: "red", x: W * 0.965, y: laneY() - 40, cd: 0, range: 240 }];
      aim = { x: W * 0.7, y: laneY() };
      banner("Welcome to Summoner's Rift", 2);
    };
    const banner = (txt, dur = 1.8, col = "#f0e6d2") => banners.push({ txt, col, life: dur, max: dur });
    const pop = (x, y, txt, col, size = 15) => fx.push({ x, y, txt, col, size, life: 1 });
    const spawn = team => {
      const kinds = ["melee", "melee", "melee", "caster", "caster", "caster"];
      if (wave % 3 === 0) kinds.splice(3, 0, "cannon");
      kinds.forEach((k, i) => {
        const K = KIND[k], dir = team === "blue" ? 1 : -1;
        units.push({ team, k, ...K, max: K.hp, cd: Math.random() * 0.5, x: (team === "blue" ? W * 0.07 : W * 0.93) - dir * i * 26,
          y: laneY() + ((i % 3) - 1) * 40 + (Math.random() - 0.5) * 10, flash: 0, lunge: 0 });
      });
    };
    const alive = team => units.filter(u => u.team === team && !u.dead);
    const foesOf = u => (u.team === "red" ? [...alive("blue"), ...(me.dead ? [] : [me])] : alive("red"));
    const slain = () => {
      me.dead = 6; me.order = null; streak = 0; shake = 0.5;
      banner("You have been slain", 2.2, RED);
      window.sfx.play("boom");
    };
    const levelUp = () => {
      me.lvl++; me.ad += 5; me.max += 40; me.hp = Math.min(me.max, me.hp + 80);
      pop(me.x, me.y - 46, "LEVEL " + me.lvl, GOLD, 15);
      fx.push({ ring: true, x: me.x, y: me.y, life: 0.8 });
      window.sfx.play("chime");
    };
    const die = (u, byYou) => {
      if (u.dead) return;
      u.dead = true;
      for (let i = 0; i < 10; i++) fx.push({ x: u.x, y: u.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.7, dot: u.team === "red" ? "#ff8a7a" : "#8ab8ff" });
      if (u.team !== "red" || over) return;
      // experience for anything that dies near you, gold only for your own last hits
      if (!me.dead && Math.hypot(u.x - me.x, u.y - me.y) < 420 && me.lvl < 11 && ++me.xp % 5 === 0) levelUp();
      if (byYou) {
        cs++; gold += u.gold; streak++; bestStreak = Math.max(bestStreak, streak);
        pop(u.x, u.y - u.r - 16, "+" + u.gold, GOLD, u.k === "cannon" ? 22 : 16);
        for (let i = 0; i < (u.k === "cannon" ? 8 : 4); i++) coins.push({ x: u.x, y: u.y, t: -i * 0.05 });
        if (u.k === "cannon") shake = 0.35;
        if (streak >= 3) pop(u.x, u.y - u.r - 36, streak + " in a row", TEAL, 13);
        window.sfx.play("coin");
        while (items < ITEMS.length && gold >= ITEMS[items][0]) {
          const [, name, ad] = ITEMS[items++];
          me.ad += ad;
          banner(`Bought ${name} · +${ad} attack damage`, 2, GOLD);
        }
      } else {
        missed++; streak = 0;
        pop(u.x, u.y - u.r - 16, "missed", "#8a8f98", 13);
      }
    };
    const hit = (u, dmg, byYou) => {
      if (u === me) {
        if (me.dead || over) return;
        me.hp -= dmg; me.flash = 0.12; me.hurt = 3;
        if (me.hp <= 0) slain();
        return;
      }
      if (u.dead) return;
      u.hp -= dmg; u.flash = 0.12;
      if (u.hp <= 0) die(u, byYou);
    };
    const minionAt = (x, y) => alive("red").map(u => [u, Math.hypot(u.x - x, u.y - y)]).filter(([u, d]) => d < u.r + 22).sort((a, b) => a[1] - b[1])[0]?.[0];
    // click: a red minion = attack it (walking into range first); anywhere else in the lane = move there
    const command = (x, y) => {
      if (over) return reset();
      if (me.dead) return;
      const u = minionAt(x, y);
      if (u) { me.order = u; return; }
      me.order = null;
      me.tx = Math.max(20, Math.min(W - 20, x)); me.ty = Math.max(laneY() - 85, Math.min(laneY() + 85, y));
      fx.push({ move: true, x: me.tx, y: me.ty, life: 0.5 });
    };
    const castQ = () => {
      if (over || me.dead || time < qReady) return;
      qReady = time + Q_CD;
      let tx = aim.x, ty = aim.y;
      if (touchUI) { const weak = alive("red").sort((a, b) => a.hp - b.hp)[0]; if (weak) { tx = weak.x; ty = weak.y; } }
      const d = Math.hypot(tx - me.x, ty - me.y) || 1;
      shots.push({ x: me.x, y: me.y, vx: (tx - me.x) / d, vy: (ty - me.y) / d, speed: 1300, dmg: Math.round(70 + me.ad * 0.6), mine: true, q: true, col: GOLD, r: 8, left: RANGE * 1.5 });
      window.sfx.play("whoosh");
    };
    cv.addEventListener("pointerdown", e => command(e.clientX, e.clientY));
    cv.addEventListener("pointermove", e => { aim = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener("contextmenu", e => { e.preventDefault(); command(e.clientX, e.clientY); }); // right-click to move, as in the game
    qBtn.addEventListener("click", castQ);
    const quit = () => {
      cancelAnimationFrame(raf); cv.remove(); hud.remove(); exit.remove(); qBtn.remove(); playing = false; window.lenis?.start();
      removeEventListener("keydown", onKey); removeEventListener("resize", size);
    };
    const onKey = e => { if (e.key === "Escape") quit(); if (e.key === "q" || e.key === "Q") castQ(); };
    exit.addEventListener("click", quit);
    addEventListener("keydown", onKey);
    reset();

    const drawRift = () => {
      const y = laneY();
      g.fillStyle = "#06120d"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#0c2018";
      for (let i = 0; i < 18; i++) { const x = (i / 17) * W; g.beginPath(); g.ellipse(x, y - 150 + Math.sin(i * 2.3) * 12, 70, 36, 0, 0, Math.PI * 2); g.ellipse(x + 40, y + 170 + Math.cos(i * 1.7) * 12, 70, 34, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#24342b"; g.fillRect(0, y - 105, W, 210);
      g.fillStyle = "#2c3e33"; g.fillRect(0, y - 88, W, 176);
      g.strokeStyle = "rgba(255,255,255,.03)"; g.lineWidth = 2;
      for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, y - 88); g.lineTo(x + 30, y + 88); g.stroke(); }
      turrets.forEach(tw => {
        const col = tw.team === "blue" ? BLUE : RED;
        if (tw.team === "red" && !me.dead && Math.hypot(me.x - tw.x, me.y - tw.y - 40) < tw.range + 60) { // only when you're close enough to be shot
          g.strokeStyle = "rgba(216,68,58,.5)"; g.lineWidth = 2; g.beginPath(); g.arc(tw.x, tw.y + 40, tw.range, 0, Math.PI * 2); g.stroke();
        }
        g.fillStyle = "#1a1f26"; g.fillRect(tw.x - 16, tw.y - 30, 32, 70);
        g.fillStyle = col; g.beginPath(); g.arc(tw.x, tw.y - 38, 12, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.25 + Math.sin(time * 3) * 0.1; g.beginPath(); g.arc(tw.x, tw.y - 38, 22, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      });
    };
    const bar = (x, y, w, frac, col) => { g.fillStyle = "#000"; g.fillRect(x - 1, y - 1, w + 2, 7); g.fillStyle = col; g.fillRect(x, y, w * Math.max(0, frac), 5); };
    const drawUnit = u => {
      const col = u.team === "blue" ? BLUE : RED;
      g.save(); g.translate(u.x + (u.lunge || 0) * 7 * (u.team === "blue" ? 1 : -1), u.y);
      g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(0, u.r * 0.9, u.r, u.r * 0.35, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = u.flash > 0 ? "#fff" : col; g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2;
      g.beginPath();
      if (u.k === "cannon") { g.rect(-u.r, -u.r * 0.75, u.r * 2, u.r * 1.5); g.moveTo(u.team === "blue" ? u.r : -u.r, -4); g.lineTo(u.team === "blue" ? u.r + 10 : -u.r - 10, -4); }
      else if (u.k === "caster") { g.moveTo(0, -u.r); g.lineTo(u.r, 0); g.lineTo(0, u.r); g.lineTo(-u.r, 0); g.closePath(); }
      else g.arc(0, 0, u.r, 0, Math.PI * 2);
      g.fill(); g.stroke();
      g.restore();
      const w = u.r * 2.8, bx = u.x - w / 2, by = u.y - u.r - 13, killable = u.team === "red" && u.hp <= me.ad;
      bar(bx, by, w, u.hp / u.max, killable ? "#fff" : col);
      if (u.team === "red") { g.fillStyle = GOLD; g.fillRect(bx + w * Math.min(1, me.ad / u.max), by - 2, 1.5, 9); }
      if (killable) { g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.5; g.beginPath(); g.arc(u.x, u.y, u.r + 6 + Math.sin(time * 12) * 1.5, 0, Math.PI * 2); g.stroke(); }
      if (me.order === u) { g.strokeStyle = TEAL; g.lineWidth = 2; g.beginPath(); g.arc(u.x, u.y, u.r + 10, 0, Math.PI * 2); g.stroke(); }
    };
    // your champion: a hooded mage with a glowing orb, a health bar and a level badge
    const drawChamp = () => {
      if (me.dead) {
        const b = base();
        g.fillStyle = "rgba(216,68,58,.8)"; g.font = "700 14px system-ui, sans-serif"; g.textAlign = "center";
        g.fillText(`Respawning in ${Math.ceil(me.dead)}`, b.x + 60, b.y);
        return;
      }
      const bob = Math.sin(time * 4) * 1.5;
      g.save(); g.translate(me.x, me.y + bob);
      g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(0, 18 - bob, 16, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = me.flash > 0 ? "#fff" : "#0a1428"; g.strokeStyle = GOLD; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -22); g.lineTo(14, 16); g.lineTo(-14, 16); g.closePath(); g.fill(); g.stroke(); // cloak
      g.fillStyle = "#e0b48a"; g.beginPath(); g.arc(0, -8, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = TEAL; g.shadowColor = TEAL; g.shadowBlur = 14; g.beginPath(); g.arc(13, -6, 4.5, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      g.restore();
      const aa = Math.max(0, me.aa - time) / AA_CD;
      g.strokeStyle = TEAL; g.lineWidth = 2.5; g.beginPath(); g.arc(me.x, me.y, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - aa)); g.stroke();
      bar(me.x - 26, me.y - 40, 52, me.hp / me.max, me.hp / me.max < 0.3 ? RED : "#3fbf3f");
      g.fillStyle = "#0a1428"; g.strokeStyle = GOLD; g.lineWidth = 1.5; g.beginPath(); g.arc(me.x - 34, me.y - 37, 8, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = "#f0e6d2"; g.font = "700 9px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(me.lvl, me.x - 34, me.y - 36.5); g.textBaseline = "alphabetic";
    };

    let last = performance.now();
    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!over) time += dt;
      const left = Math.max(0, ROUND - time);
      if (!over && left === 0) {
        over = true;
        store(() => localStorage.setItem(bestKey, Math.max(best(), cs)));
        if (cs >= 15) collect("blaster"); // fragment id kept from the old asteroid game so saved progress still counts
        window.sfx.play(cs >= 15 ? "ok" : "close");
      }
      if (!over && time >= nextWave) { wave++; spawn("blue"); spawn("red"); nextWave = time + Math.max(9, 13 - wave * 0.4); if (wave === 1) banner("Minions have spawned", 1.8); }
      // you: respawn, regenerate out of combat, walk to orders, attack your target when it's in range
      if (me.dead) { me.dead -= dt; if (me.dead <= 0) { const b = base(); Object.assign(me, { dead: 0, hp: me.max, x: b.x, y: b.y, tx: b.x + 60, ty: b.y }); } }
      else if (!over) {
        me.flash = Math.max(0, me.flash - dt); me.hurt = Math.max(0, me.hurt - dt);
        if (!me.hurt) me.hp = Math.min(me.max, me.hp + 14 * dt);
        if (me.order && me.order.dead) me.order = null;
        let gx = me.tx, gy = me.ty;
        if (me.order) {
          const d = Math.hypot(me.order.x - me.x, me.order.y - me.y);
          if (d <= RANGE) {
            gx = me.x; gy = me.y;
            if (time >= me.aa) { me.aa = time + AA_CD; shots.push({ x: me.x + 13, y: me.y - 6, to: me.order, speed: 950, dmg: me.ad, mine: true, col: TEAL, r: 5 }); window.sfx.play("blip"); me.order = null; }
          } else { gx = me.order.x; gy = me.order.y; }
          me.tx = gx; me.ty = gy;
        }
        const d = Math.hypot(gx - me.x, gy - me.y);
        if (d > 2) { const st = Math.min(d, SPEED * dt); me.x += ((gx - me.x) / d) * st; me.y += ((gy - me.y) / d) * st; }
      }
      // minions: walk until something hostile is in range, then trade hits. Red ones will hit you if you're the closest target
      units.forEach(u => {
        if (u.dead) return;
        u.flash = Math.max(0, u.flash - dt); u.lunge = Math.max(0, u.lunge - dt * 6);
        let foe = null, fd = Infinity;
        foesOf(u).forEach(o => { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < fd) { fd = d; foe = o; } });
        if (foe && fd <= u.range + u.r + foe.r) {
          u.cd -= dt;
          if (u.cd <= 0 && !over) {
            u.cd = u.rate * (0.9 + Math.random() * 0.2);
            if (u.k === "melee") { hit(foe, u.dmg * (0.85 + Math.random() * 0.3), false); u.lunge = 1; }
            else shots.push({ x: u.x, y: u.y, to: foe, speed: 520, dmg: u.dmg, mine: false, col: u.team === "blue" ? "#8ab8ff" : "#ff9a8a", r: u.k === "cannon" ? 5 : 3 });
          }
        } else if (!over) {
          const chase = foe && fd < 260 && !foe.champ;
          const tx = chase ? foe.x : u.team === "blue" ? W + 60 : -60, ty = chase ? foe.y : u.y;
          const d = Math.hypot(tx - u.x, ty - u.y) || 1;
          u.x += ((tx - u.x) / d) * 150 * dt; u.y += ((ty - u.y) / d) * 50 * dt;
        }
      });
      // turrets: hit the nearest enemy in range, minions first; they hurt
      turrets.forEach(tw => {
        tw.cd -= dt;
        if (tw.cd > 0 || over) return;
        const pool = tw.team === "red" ? alive("blue") : alive("red");
        let tgt = pool.filter(u => Math.hypot(u.x - tw.x, u.y - tw.y - 40) < tw.range).sort((a, b) => Math.hypot(a.x - tw.x, a.y - tw.y) - Math.hypot(b.x - tw.x, b.y - tw.y))[0];
        if (!tgt && tw.team === "red" && !me.dead && Math.hypot(me.x - tw.x, me.y - tw.y - 40) < tw.range) tgt = me;
        if (!tgt) return;
        tw.cd = 1.2;
        shots.push({ x: tw.x, y: tw.y - 38, to: tgt, speed: 700, dmg: tgt === me ? 110 : 70, mine: false, col: tw.team === "blue" ? "#bcd6ff" : "#ffb4a8", r: 6 });
      });
      for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
        const a = units[i], b = units[j];
        if (a.dead || b.dead || a.team !== b.team) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r + 6;
        if (d >= min) continue;
        const k = (min - d) / 2, ux = dx / d, uy = dy / d || (i % 2 ? 1 : -1);
        a.x -= ux * k * 0.4; b.x += ux * k * 0.4; a.y -= uy * k; b.y += uy * k;
      }
      units.forEach(u => { u.y = Math.max(laneY() - 80, Math.min(laneY() + 80, u.y)); });
      units = units.filter(u => !u.dead && u.x > -80 && u.x < W + 80);
      shots.forEach(s => {
        if (s.q) {
          const step = s.speed * dt;
          s.x += s.vx * step; s.y += s.vy * step; s.left -= step;
          const h = alive("red").find(u => Math.hypot(u.x - s.x, u.y - s.y) < u.r + s.r);
          if (h) { hit(h, s.dmg, true); s.done = true; pop(h.x, h.y - h.r - 30, String(s.dmg), GOLD, 13); }
          if (s.left <= 0) s.done = true;
          return;
        }
        if (s.to.dead || (s.to === me && me.dead)) { s.done = true; return; }
        const dx = s.to.x - s.x, dy = s.to.y - s.y, d = Math.hypot(dx, dy), step = s.speed * dt;
        if (d <= step) { s.done = true; hit(s.to, s.dmg, s.mine); return; }
        s.x += (dx / d) * step; s.y += (dy / d) * step;
      });
      shots = shots.filter(s => !s.done);

      shake = Math.max(0, shake - dt);
      g.save();
      if (shake) g.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
      drawRift();
      [...units, me].filter(u => !u.dead || u === me).sort((a, b) => a.y - b.y).forEach(u => (u === me ? drawChamp() : drawUnit(u)));
      shots.forEach(s => {
        g.fillStyle = s.col; g.shadowColor = s.col; g.shadowBlur = s.mine ? 14 : 4;
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
        if (s.q) { g.globalAlpha = 0.4; g.beginPath(); g.arc(s.x - s.vx * 14, s.y - s.vy * 14, s.r * 0.7, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      });
      g.shadowBlur = 0;
      if (!over && !me.dead && time >= qReady && !touchUI) {
        const d = Math.hypot(aim.x - me.x, aim.y - me.y) || 1, L = RANGE * 1.5;
        g.strokeStyle = "rgba(200,170,110,.16)"; g.lineWidth = 16; g.lineCap = "round";
        g.beginPath(); g.moveTo(me.x, me.y); g.lineTo(me.x + ((aim.x - me.x) / d) * L, me.y + ((aim.y - me.y) / d) * L); g.stroke(); g.lineCap = "butt";
      }
      if (!me.dead && !touchUI) { g.strokeStyle = "rgba(10,200,185,.07)"; g.lineWidth = 1; g.beginPath(); g.arc(me.x, me.y, RANGE, 0, Math.PI * 2); g.stroke(); }
      fx.forEach(f => {
        f.life -= dt * (f.dot ? 1.6 : f.move ? 2 : 1);
        g.globalAlpha = Math.max(0, f.life);
        if (f.dot) { f.x += f.vx * dt; f.y += f.vy * dt; g.fillStyle = f.dot; g.fillRect(f.x, f.y, 3, 3); }
        else if (f.move) { g.strokeStyle = "#3fbf3f"; g.lineWidth = 2; g.beginPath(); g.ellipse(f.x, f.y, 14 * f.life + 4, 6 * f.life + 2, 0, 0, Math.PI * 2); g.stroke(); }
        else if (f.ring) { g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 30 + (1 - f.life) * 60, 0, Math.PI * 2); g.stroke(); }
        else { f.y -= 34 * dt; g.fillStyle = f.col; g.font = `700 ${f.size}px system-ui, sans-serif`; g.textAlign = "center"; g.fillText(f.txt, f.x, f.y); }
      });
      g.globalAlpha = 1;
      fx = fx.filter(f => f.life > 0);
      coins.forEach(k => {
        k.t += dt;
        if (k.t < 0) return;
        const p = Math.min(1, k.t / 0.6), e = p * p, tx = W / 2 - 60, ty = 100;
        const x = k.x + (tx - k.x) * e, y = k.y + (ty - k.y) * e - Math.sin(p * Math.PI) * 60;
        g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#785a28"; g.lineWidth = 1; g.stroke();
        if (p >= 1) k.done = true;
      });
      coins = coins.filter(k => !k.done);
      // announcer banners, one at a time
      const b = banners[0];
      if (b) {
        b.life -= dt;
        const a = Math.min(1, b.life * 2, (b.max - b.life) * 4);
        g.globalAlpha = Math.max(0, a);
        g.fillStyle = "rgba(1,10,19,.75)"; g.fillRect(W / 2 - 220, laneY() - 170, 440, 44);
        g.strokeStyle = GOLD; g.lineWidth = 1; g.strokeRect(W / 2 - 220, laneY() - 170, 440, 44);
        g.fillStyle = b.col; g.font = "600 18px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(b.txt, W / 2, laneY() - 148); g.textBaseline = "alphabetic"; g.globalAlpha = 1;
        if (b.life <= 0) banners.shift();
      }
      g.restore();

      const qLeft = Math.max(0, qReady - time);
      qBtn.classList.toggle("cd", qLeft > 0 || me.dead);
      qBtn.style.setProperty("--cd", qLeft / Q_CD);
      const total = cs + missed, pct = total ? Math.round((cs / total) * 100) : 0;
      const grade = pct >= 90 ? "S" : pct >= 75 ? "A" : pct >= 55 ? "B" : pct >= 35 ? "C" : "D";
      const mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, "0");
      hud.innerHTML = over
        ? `<b>${grade}</b> ${cs} CS · ${pct}% of the wave · ${gold} gold · level ${me.lvl} · best streak ${bestStreak} · best ${Math.max(best(), cs)}<span>Click to queue again</span>`
        : `<b>${cs}</b> CS · ${gold} gold · ${pct}% · Lv ${me.lvl} · AD ${me.ad} · ${mm}:${ss} · best ${best()}<span>${touchUI ? "Tap the lane to move, tap a red minion to attack, tap Q" : "Click the lane to move, click a red minion to attack, Q to cast"} · strike when its bar turns white</span>`;
    };
    raf = requestAnimationFrame(frame);
  };

  // ---------- star fragments: one hidden on each planet page, plus two earned by playing ----------
  const FRAGS = ["introduction", "experience", "projects", "skills", "about", "contact", "blaster", "lander"];
  const found = () => new Set(JSON.parse(store(() => localStorage.getItem("fragments")) || "[]"));
  const fragLine = $(".hud") && document.createElement("span");
  const showFrags = () => { if (fragLine) fragLine.innerHTML = `<br>Fragments <b>${found().size}</b> / ${FRAGS.length}`; };
  if (fragLine) { $(".hud").appendChild(fragLine); showFrags(); }
  const collect = id => {
    const have = found();
    if (have.has(id)) return;
    have.add(id);
    store(() => localStorage.setItem("fragments", JSON.stringify([...have])));
    showFrags();
    window.sfx.play("ok");
    toast(have.size === FRAGS.length ? "All fragments found! Type badge in the captain's log." : `Star fragment found · ${have.size} / ${FRAGS.length}`);
  };
  const pageId = here.replace(".html", "");
  if (FRAGS.includes(pageId) && !found().has(pageId)) {
    // tucked somewhere different on each page, but always in the same spot for that page
    const seed = [...pageId].reduce((a, c) => a + c.charCodeAt(0), 0);
    const frag = document.createElement("button");
    frag.type = "button";
    frag.className = "fragment";
    frag.setAttribute("aria-label", "Hidden star fragment");
    frag.style.top = 35 + (seed * 7) % 45 + "%";
    frag.style.left = 6 + (seed * 13) % 88 + "%";
    frag.addEventListener("click", e => { e.stopPropagation(); frag.classList.add("got"); collect(pageId); setTimeout(() => frag.remove(), 700); });
    ($("main") || document.body).appendChild(frag);
  }

  // ---------- captain's log: games and fragments ----------
  Object.assign(COMMANDS, {
    play: () => { toggleTerm(false); setTimeout(startGame, 200); return "Queueing for Summoner's Rift..."; },
    land: () => { if (!ascii) return "No landing site on this page."; toggleTerm(false); setTimeout(startLander, 300); return "Lander released. Use ↑ or space to burn."; },
    fragments: () => { const h = found(); return `${h.size} / ${FRAGS.length} found. Missing: ${FRAGS.filter(f => !h.has(f)).join(", ") || "none"}.`; },
    badge: () => found().size === FRAGS.length
      ? "  .-^-.\n /  *  \\   CAPTAIN'S BADGE\n|  SAM  |  All eight fragments recovered.\n \\_____/   Thanks for exploring the ship."
      : `Locked. ${found().size} / ${FRAGS.length} fragments.`,
  });
  const helpTxt = COMMANDS.help;
  COMMANDS.help = () => helpTxt() + ", play, land, fragments, badge";

  // ---------- about: flight log timeline ----------
  const flight = $(".flight");
  if (flight) {
    const stops = $$(".flight-track button", flight), fill = $(".flight-fill", flight);
    const card = { when: $(".flight-when", flight), title: $(".flight-title", flight), text: $(".flight-text", flight), box: $(".flight-card", flight) };
    let cur = 0;
    const pick = i => {
      cur = (i + stops.length) % stops.length;
      const b = stops[cur];
      stops.forEach((x, k) => { x.classList.toggle("on", k === cur); x.classList.toggle("past", k < cur); x.setAttribute("aria-pressed", String(k === cur)); });
      fill.style.width = (cur / (stops.length - 1)) * 100 + "%";
      card.when.textContent = b.dataset.when; card.title.textContent = b.dataset.title; card.text.textContent = b.dataset.text;
      card.box.classList.remove("swap"); void card.box.offsetWidth; card.box.classList.add("swap");
      const track = b.parentElement;
      if (track.scrollWidth > track.clientWidth) track.scrollTo({ left: b.offsetLeft - track.clientWidth / 2 + b.offsetWidth / 2, behavior: reduce ? "auto" : "smooth" });
    };
    stops.forEach((b, i) => b.addEventListener("click", () => pick(i)));
    flight.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { pick(cur + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { pick(cur - 1); e.preventDefault(); }
    });
    pick(stops.length - 1);
  }

  // ---------- site preview: hover a site link and it opens live in a floating browser window ----------
  // data-preview="" embeds the site; data-preview="<image>" shows a scrollable full-page capture (for sites that refuse to be framed)
  const previews = $$("[data-preview]");
  if (previews.length && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const pop = document.createElement("div");
    pop.className = "site-pop";
    pop.innerHTML = '<div class="browser-bar"><i></i><i></i><i></i><b></b><a target="_blank" rel="noopener">Open ↗</a></div>' +
      '<div class="site-pop-body"><span class="site-pop-load">Establishing link</span></div>';
    document.body.appendChild(pop);
    const body = $(".site-pop-body", pop), host = $(".browser-bar b", pop), openA = $(".browser-bar a", pop);
    let url = null, showT, hideT;
    const size = () => {
      const w = Math.min(680, innerWidth * 0.46), h = Math.min(innerHeight * 0.62, w * 0.66);
      pop.style.setProperty("--w", w + "px"); pop.style.setProperty("--h", h + "px"); pop.style.setProperty("--s", w / 1280);
      return [w, h + 36];
    };
    const show = (a, e) => {
      clearTimeout(hideT);
      if (url !== a.href) {
        url = a.href;
        host.textContent = new URL(url).host;
        openA.href = url;
        $("iframe, .site-pop-shot", body)?.remove();
        pop.classList.remove("loaded");
        if (a.dataset.preview) {
          const d = document.createElement("div"); // a full-page capture you scroll yourself with the wheel
          d.className = "site-pop-shot";
          d.setAttribute("data-lenis-prevent", "");
          d.innerHTML = `<img src="${a.dataset.preview}" alt="">`;
          body.appendChild(d);
          pop.classList.add("loaded");
        } else {
          const f = document.createElement("iframe");
          f.title = "Live preview of " + host.textContent;
          f.referrerPolicy = "no-referrer";
          f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
          f.addEventListener("load", () => pop.classList.add("loaded"));
          f.src = url;
          body.appendChild(f);
        }
      }
      // beside the pointer, flipped to whichever side has room
      const [w, h] = size(), x = e.clientX + 24 + w < innerWidth - 12 ? e.clientX + 24 : Math.max(12, e.clientX - 24 - w);
      const y = Math.max(84, Math.min(innerHeight - h - 12, e.clientY - h / 2)); // clear of the top bar
      pop.style.left = x + "px"; pop.style.top = y + "px";
      pop.style.transformOrigin = `${e.clientX < x ? 0 : 100}% 50%`;
      if (!pop.classList.contains("show")) window.sfx.play("open");
      pop.classList.add("show");
    };
    const hide = () => { clearTimeout(showT); hideT = setTimeout(() => pop.classList.remove("show"), 260); };
    previews.forEach(a => {
      a.addEventListener("pointerenter", e => { clearTimeout(hideT); clearTimeout(showT); showT = setTimeout(() => show(a, e), pop.classList.contains("show") ? 0 : 280); });
      a.addEventListener("pointerleave", hide);
    });
    pop.addEventListener("pointerenter", () => clearTimeout(hideT));
    pop.addEventListener("pointerleave", hide);
    addEventListener("keydown", e => e.key === "Escape" && pop.classList.remove("show"));
    addEventListener("scroll", () => { if (!pop.matches(":hover")) pop.classList.remove("show"); }, { passive: true });
  }

  // ---------- about: each off-duty card opens its own little scene in a full-screen overlay ----------
  // overlay(cls, label, html) -> { fx, close, onClose }; closes on Escape, a click on the backdrop, or any [data-close]
  const overlay = (cls, label, html) => {
    if ($(".duty-fx:not(.out)")) return null; // one scene at a time; one that is fading out does not count
    const fx = document.createElement("div");
    fx.className = "duty-fx " + cls;
    fx.setAttribute("role", "dialog");
    fx.setAttribute("aria-label", label);
    fx.innerHTML = html;
    document.body.appendChild(fx);
    window.lenis?.stop();
    const cleanups = [];
    const close = () => {
      if (fx.classList.contains("out")) return;
      fx.classList.add("out");
      window.sfx.play("close");
      window.lenis?.start();
      removeEventListener("keydown", esc);
      cleanups.forEach(f => f());
      setTimeout(() => fx.remove(), 450);
    };
    const esc = e => e.key === "Escape" && close();
    addEventListener("keydown", esc);
    fx.addEventListener("click", e => { if (e.target === fx || e.target.closest("[data-close]")) close(); });
    return { fx, close, onClose: f => cleanups.push(f) };
  };

  // each card's hover emblem doubles as the crest at the top of its scene
  const emblem = d => `<span class="fx-emblem" aria-hidden="true">${$(`[data-duty="${d}"] .emblem`)?.innerHTML || ""}</span>`;

  // anime: speed lines, an impact frame, ゴゴゴ, petals and a title card
  const animeFx = () => {
    const go = Array.from({ length: 7 }, (_, i) => `<i class="af-go" style="--x:${8 + Math.random() * 84}%;--y:${10 + Math.random() * 75}%;--d:${(i * 0.09).toFixed(2)}s;--r:${(Math.random() * 30 - 15).toFixed(0)}deg">ゴ</i>`).join("");
    const petals = Array.from({ length: 22 }, () => `<i class="af-petal" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 4).toFixed(2)}s;--t:${(5 + Math.random() * 5).toFixed(1)}s;--s:${(0.6 + Math.random() * 0.8).toFixed(2)}"></i>`).join("");
    const o = overlay("anime-fx", "Anime Studio", '<i class="af-lines"></i><i class="af-flash"></i>' + go + petals +
      '<div class="af-card"><small>第27話 · Episode 27</small><b>Anime Studio</b><span class="af-jp">アニメ・スタジオ</span>' +
      '<p>The anime habit turned into a living Wear OS watch face. Coming soon to Google Play.</p>' +
      '<div class="af-acts"><a class="btn solid arrow" href="https://apps.samridhashrestha.com.np/animestudio/" target="_blank" rel="noopener">See Anime Studio</a>' +
      '<button class="btn" type="button" data-close>To be continued →</button></div></div>');
    if (!o) return;
    window.sfx.play("powerup");
    setTimeout(() => window.sfx.play("boom"), reduce ? 0 : 850);
    setTimeout(() => $(".af-card .btn", o.fx)?.focus({ preventScroll: true }), reduce ? 0 : 1200);
  };

  // music: a guitar neck. Drag across the strings to strum, tap one to pluck, or pick a chord
  const guitarFx = () => {
    const OPEN = [82.41, 110, 146.83, 196, 246.94, 329.63]; // E2 A2 D3 G3 B3 E4, low to high
    const CHORDS = { Em: [0, 2, 2, 0, 0, 0], G: [3, 2, 0, 0, 0, 3], C: [-1, 3, 2, 0, 1, 0], D: [-1, -1, 0, 2, 3, 2], Am: [-1, 0, 2, 2, 1, 0] };
    const o = overlay("guitar-fx", "Guitar", '<div class="gt">' + emblem("music") +
      '<small>Standard tuning · E A D G B E</small><b>Play something</b>' +
      '<div class="gt-neck" data-lenis-prevent>' + '<i class="gt-fret"></i>'.repeat(5) + '<i class="gt-dot"></i>' +
      OPEN.map((_, k) => `<i class="gt-str" style="--k:${k}"></i>`).reverse().join("") + "</div>" + // high E on top, as you look down at it
      '<div class="gt-chords">' + Object.keys(CHORDS).map(c => `<button type="button" class="btn" data-chord="${c}">${c}</button>`).join("") + "</div>" +
      `<p class="gt-hint">${matchMedia("(hover: none)").matches ? "Swipe down the strings to strum, or tap one to pluck." : "Drag across the strings to strum. Keys 1 to 5 play the chords."}</p>` + '<button class="btn" type="button" data-close>Put it down</button></div>');
    if (!o) return;
    const neck = $(".gt-neck", o.fx), wires = $$(".gt-str", o.fx).reverse(), chordBtns = $$("[data-chord]", o.fx);
    let chord = "Em", last = null;
    const note = k => CHORDS[chord][k] < 0 ? null : OPEN[k] * Math.pow(2, CHORDS[chord][k] / 12);
    const ring = k => {
      const f = note(k);
      if (!f) return;
      window.sfx.pluck(f, 0.3);
      wires[k].classList.remove("hum"); void wires[k].offsetWidth; wires[k].classList.add("hum");
    };
    const pick = name => {
      chord = name;
      chordBtns.forEach(b => b.classList.toggle("on", b.dataset.chord === name));
      [0, 1, 2, 3, 4, 5].forEach((k, i) => setTimeout(() => ring(k), i * 28)); // a quick downstroke
    };
    chordBtns.forEach(b => b.addEventListener("click", () => pick(b.dataset.chord)));
    chordBtns[0].classList.add("on");
    // the strings are horizontal; whichever band the pointer is in is the string under it (high E at the top)
    const stringAt = e => {
      const r = neck.getBoundingClientRect(), k = 5 - Math.floor(((e.clientY - r.top) / r.height) * 6);
      return k >= 0 && k <= 5 ? k : null;
    };
    neck.addEventListener("pointerdown", e => {
      try { neck.setPointerCapture(e.pointerId); } catch {} // keeps the strum going if the finger slides off the neck
      last = stringAt(e);
      if (last !== null) ring(last);
    });
    neck.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" && !e.buttons) return;
      const k = stringAt(e);
      if (k === null || last === null || k === last) { last = k; return; }
      const step = k > last ? 1 : -1;
      for (let j = last + step; j !== k + step; j += step) ring(j);
      last = k;
    });
    neck.addEventListener("pointerleave", () => (last = null));
    const keys = e => { const c = Object.keys(CHORDS)[+e.key - 1]; if (c) pick(c); };
    addEventListener("keydown", keys);
    o.onClose(() => removeEventListener("keydown", keys));
    pick("Em");
  };

  // gaming: the queue pops, like it does on Summoner's Rift. Accept and you load into the last-hit game
  const leagueFx = () => {
    const C = 2 * Math.PI * 46;
    const o = overlay("league-fx", "Match found", '<div class="lol">' + emblem("game") +
      '<small>Summoner\'s Rift · 5v5 · Ranked Solo/Duo</small><b>Match found</b>' +
      `<div class="lol-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle class="lol-t" cx="50" cy="50" r="46" style="stroke-dasharray:${C};stroke-dashoffset:0"/></svg><span>10</span></div>` +
      '<button class="lol-accept" type="button">Accept!</button><button class="lol-decline" type="button" data-close>Decline</button>' +
      '<p class="lol-msg" aria-live="polite"></p></div>');
    if (!o) return;
    window.sfx.play("queue");
    const ring = $(".lol-t", o.fx), num = $(".lol-ring span", o.fx), msg = $(".lol-msg", o.fx), t0 = performance.now();
    let done = false;
    const tick = now => {
      if (done || !o.fx.isConnected) return;
      const left = Math.max(0, 10 - (now - t0) / 1000);
      ring.style.strokeDashoffset = C * (1 - left / 10);
      num.textContent = Math.ceil(left);
      if (left <= 0) { done = true; msg.textContent = "You missed the queue. Dodge penalty applied."; setTimeout(o.close, 1600); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    $(".lol-accept", o.fx).addEventListener("click", () => {
      if (done) return;
      done = true;
      o.fx.classList.add("accepted");
      window.sfx.play("ok");
      msg.textContent = "Welcome to Summoner's Rift.";
      setTimeout(() => { o.close(); setTimeout(startGame, 300); }, 1700);
    });
  };

  // sports: a penalty shootout at Old Trafford. Aim anywhere in the goal, hold to build power (too much and it
  // flies over), release to shoot. Then go in goal and pick where to dive. Five each, then sudden death.
  const unitedFx = () => {
    const o = overlay("united-fx", "Penalty shootout", '<div class="pk">' + emblem("sports") +
      '<small>Old Trafford · Theatre of Dreams</small><b>Penalty shootout</b>' +
      '<div class="pk-board"><span>MUN</span><i class="pk-marks"></i><strong>0 – 0</strong><i class="pk-marks"></i><span>OPP</span></div>' +
      '<canvas class="pk-cv" aria-label="Penalty shootout. Aim with the pointer, hold to power up, release to shoot."></canvas>' +
      '<p class="pk-msg" aria-live="polite"></p>' +
      '<button class="btn" type="button" data-close>Back to the dressing room</button></div>');
    if (!o) return;
    const cv = $(".pk-cv", o.fx), g = cv.getContext("2d"), dpr = Math.min(devicePixelRatio, 2), VW = 720, VH = 450;
    cv.width = VW * dpr; cv.height = VH * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const msg = $(".pk-msg", o.fx), [usMarks, themMarks] = $$(".pk-marks", o.fx), score = $(".pk-board strong", o.fx);
    const GOAL = { l: 190, r: 530, top: 172, line: 300 }, SPOT = { x: 360, y: 412 };
    // the Stretford End, painted once: cantilever roof and floodlights, two tiers of faces in red and white
    // either side of the red fascia. Flags, camera flashes and the celebration jump are drawn over it each frame
    const stand = document.createElement("canvas");
    stand.width = VW * dpr; stand.height = 112 * dpr;
    {
      const s2 = stand.getContext("2d");
      s2.scale(dpr, dpr);
      s2.fillStyle = "#0d0e12"; s2.fillRect(0, 0, VW, 112);
      [[90, 4], [630, 4]].forEach(([x, y]) => { const gr = s2.createRadialGradient(x, y, 0, x, y, 70); gr.addColorStop(0, "rgba(255,255,240,.55)"); gr.addColorStop(1, "rgba(255,255,240,0)"); s2.fillStyle = gr; s2.fillRect(x - 70, 0, 140, 60); });
      s2.fillStyle = "#24262d"; s2.fillRect(0, 0, VW, 11);
      s2.strokeStyle = "rgba(255,255,255,.55)"; s2.lineWidth = 1; s2.beginPath();
      for (let x = 0; x <= VW; x += 24) { s2.moveTo(x, 11); s2.lineTo(x + 12, 3); s2.lineTo(x + 24, 11); }
      s2.moveTo(0, 11); s2.lineTo(VW, 11); s2.stroke();
      const SKIN = ["#f1c7a0", "#e0b48a", "#c68a5a", "#8d5a3a"], SHIRT = ["#da291c", "#da291c", "#da291c", "#fff", "#111", "#fbe122"];
      const tier = (y0, y1) => {
        s2.fillStyle = "#7d130d"; s2.fillRect(0, y0, VW, y1 - y0);
        for (let y = y0 + 3; y < y1 - 2; y += 6.4) for (let x = 2 + ((y * 7) % 5); x < VW; x += 5.6) {
          if (Math.random() < 0.04) continue; // the odd empty seat
          s2.fillStyle = SHIRT[Math.random() * SHIRT.length | 0]; s2.fillRect(x - 2.2, y + 1.4, 4.4, 3);
          s2.fillStyle = SKIN[Math.random() * SKIN.length | 0]; s2.beginPath(); s2.arc(x, y, 1.8, 0, Math.PI * 2); s2.fill();
        }
      };
      tier(13, 56); tier(70, 110);
      s2.fillStyle = "#c8102e"; s2.fillRect(0, 56, VW, 14);
      s2.fillStyle = "#fff"; s2.font = "800 11px system-ui, sans-serif"; s2.textAlign = "center"; s2.textBaseline = "middle";
      s2.fillText("S T R E T F O R D   E N D", VW / 2, 63.5);
      s2.font = "700 8px system-ui, sans-serif"; s2.fillText("MANCHESTER UNITED", 110, 63.5); s2.fillText("MANCHESTER UNITED", VW - 110, 63.5);
    }
    const FLAGS = [[60, 30, "#da291c"], [170, 88, "#fff"], [270, 24, "#111"], [450, 92, "#fbe122"], [560, 34, "#fff"], [665, 86, "#da291c"]];
    let flashes = [], jump = 0, ledW = 0;
    let us = [], them = [], phase = "aim", t = 0, aim = { x: 360, y: 230 }, charging = false, power = 0, shot = null, keeper = null, dive = null, confetti = [], raf;

    const say = txt => { msg.textContent = txt; };
    const marks = list => Array.from({ length: Math.max(5, list.length) }, (_, i) => `<i class="${list[i] === undefined ? "" : list[i] ? "in" : "out"}"></i>`).join("");
    const board = () => {
      usMarks.innerHTML = marks(us); themMarks.innerHTML = marks(them);
      score.textContent = `${us.filter(Boolean).length} – ${them.filter(Boolean).length}`;
    };
    // is it decided? regulation is five each; after that, sudden death once both have kicked
    const verdict = () => {
      const a = us.filter(Boolean).length, b = them.filter(Boolean).length;
      if (us.length <= 5 && them.length <= 5) {
        if (a + (5 - us.length) < b) return "lose";
        if (b + (5 - them.length) < a) return "win";
        return null;
      }
      return us.length === them.length && a !== b ? (a > b ? "win" : "lose") : null;
    };
    const next = () => {
      board();
      const v = verdict();
      if (v) {
        phase = "end";
        if (v === "win") {
          say("UNITED WIN! Glory Glory Man United! Tap the pitch to go again.");
          jump = 4;
          window.sfx.play("crowd"); window.sfx.play("ok");
          for (let i = 0; i < 160; i++) confetti.push({ x: Math.random() * VW, y: -Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120, c: ["#da291c", "#fff", "#fbe122", "#111"][i % 4], r: Math.random() * 6 });
        } else { say("Heartbreak at Old Trafford. Tap the pitch to go again."); window.sfx.play("close"); }
        return;
      }
      if (us.length === them.length) { phase = "aim"; keeper = { x: 360, y: GOAL.line, tx: 360, ty: GOAL.line, kit: "#3d6fd8" }; say(us.length >= 5 ? "Sudden death. Your kick." : "Your kick. Aim, hold to power up, release to shoot."); }
      else {
        phase = "save"; t = 0; dive = null;
        keeper = { x: 360, y: GOAL.line, tx: 360, ty: GOAL.line, kit: "#2fbf5b" };
        say("You're in goal. Tap where you'll dive before they strike.");
      }
    };
    const restart = () => { us = []; them = []; confetti = []; shot = null; next(); };

    // pointer → canvas space
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * VH }; };
    cv.addEventListener("pointermove", e => { if (phase === "aim") { const p = pt(e); aim = { x: Math.max(150, Math.min(570, p.x)), y: Math.max(120, Math.min(312, p.y)) }; } });
    cv.addEventListener("pointerdown", e => {
      try { cv.setPointerCapture(e.pointerId); } catch {}
      const p = pt(e);
      if (phase === "end") return restart();
      if (phase === "aim") { aim = { x: Math.max(150, Math.min(570, p.x)), y: Math.max(120, Math.min(312, p.y)) }; charging = true; power = 0; t = 0; }
      if (phase === "save" && !dive) { dive = { x: Math.max(GOAL.l, Math.min(GOAL.r, p.x)), y: Math.max(GOAL.top + 10, Math.min(GOAL.line, p.y)) }; say("Set. Hold your nerve..."); }
    });
    cv.addEventListener("pointerup", () => { if (phase === "aim" && charging) strike(); });

    // our kick: power lifts the ball and adds spray; the keeper reads it sometimes
    const strike = () => {
      charging = false;
      const p = power, spray = 10 + (p > 0.85 ? 26 : 0);
      const target = { x: aim.x + (Math.random() - 0.5) * spray * 2, y: aim.y - Math.max(0, p - 0.72) * 190 + (Math.random() - 0.5) * spray };
      const T = 0.78 - p * 0.36, reads = Math.random() < 0.42;
      const kx = reads ? target.x + (Math.random() - 0.5) * 80 : 210 + Math.random() * 300;
      keeper.tx = Math.max(GOAL.l + 10, Math.min(GOAL.r - 10, kx));
      keeper.ty = Math.max(GOAL.top + 30, Math.min(GOAL.line, reads ? target.y + 30 : 200 + Math.random() * 100));
      keeper.start = 0.12; keeper.reach = 58 + (p < 0.35 ? 34 : 0) - (p > 0.8 ? 14 : 0);
      shot = { from: { ...SPOT }, to: target, T, k: 0, mine: true, lift: 30 + p * 40 };
      phase = "flight"; t = 0;
      window.sfx.play("press");
    };
    // their kick, after a short run-up: you're the keeper, already committed to your dive point
    const theirStrike = () => {
      const corner = Math.random() < 0.65;
      const target = corner
        ? { x: Math.random() < 0.5 ? GOAL.l + 22 + Math.random() * 60 : GOAL.r - 22 - Math.random() * 60, y: GOAL.top + 20 + Math.random() * 100 }
        : { x: 270 + Math.random() * 180, y: GOAL.top + 40 + Math.random() * 80 };
      if (Math.random() < 0.1) target.y = GOAL.top - 30 - Math.random() * 40; // skied it
      const d = dive || { x: 360, y: GOAL.line - 30 };
      keeper.tx = d.x; keeper.ty = Math.max(GOAL.top + 30, d.y + 30); keeper.start = 0; keeper.reach = dive ? 66 : 40;
      shot = { from: { ...SPOT }, to: target, T: 0.5 + Math.random() * 0.15, k: 0, mine: false, lift: 50 };
      phase = "flight"; t = 0;
      window.sfx.play("press");
    };
    const keeperAt = time => {
      const p = Math.max(0, Math.min(1, (time - (keeper.start || 0)) / 0.42)), e = 1 - Math.pow(1 - p, 3);
      return { x: 360 + (keeper.tx - 360) * e, y: GOAL.line + (keeper.ty - GOAL.line) * e, p: e };
    };
    const resolve = () => {
      const s = shot, b = s.to, kp = keeperAt(s.T);
      const wide = b.x < GOAL.l + 6 || b.x > GOAL.r - 6, over = b.y < GOAL.top + 6;
      const saved = !wide && !over && Math.hypot(kp.x - b.x, (kp.y - 34) - b.y) < keeper.reach;
      const scored = !wide && !over && !saved;
      s.result = scored ? "goal" : saved ? "saved" : "miss";
      (s.mine ? us : them).push(scored);
      if (s.mine) {
        if (scored) { say("GOAL! Glory Glory Man United!"); window.sfx.play("crowd"); window.sfx.play("coin"); jump = 1.8; }
        else say(saved ? "Saved! He guessed right." : over ? "Over the bar. Too much power." : "Wide. So close.");
        if (!scored) window.sfx.play(saved ? "thud" : "close");
      } else {
        if (scored) { say("They score. Your kick next."); window.sfx.play("close"); }
        else { jump = 1.4; say(saved ? "WHAT A SAVE!" : "They've missed it!"); window.sfx.play(saved ? "thud" : "crowd"); if (saved) window.sfx.play("crowd"); }
      }
      phase = "result"; t = 0;
    };

    const draw = dt => {
      // the Stretford End: bounces when United score, flags wave, phones flash
      jump = Math.max(0, jump - dt);
      const hop = jump ? -Math.abs(Math.sin(performance.now() / 90)) * 3 : 0;
      g.drawImage(stand, 0, hop, VW, 112);
      FLAGS.forEach(([x, y, col], i) => {
        const w = performance.now() / 260 + i;
        g.strokeStyle = "#ddd"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 14 + hop); g.lineTo(x, y - 10 + hop); g.stroke();
        g.fillStyle = col; g.beginPath(); g.moveTo(x, y - 10 + hop);
        for (let k = 0; k <= 4; k++) g.lineTo(x + k * 5, y - 10 + hop + Math.sin(w + k * 0.9) * 2.5);
        for (let k = 4; k >= 0; k--) g.lineTo(x + k * 5, y - 2 + hop + Math.sin(w + k * 0.9) * 2.5);
        g.closePath(); g.fill();
      });
      if (Math.random() < (jump ? 0.6 : 0.08)) flashes.push({ x: Math.random() * VW, y: 14 + Math.random() * 94, life: 1 });
      flashes.forEach(f => { f.life -= dt * 5; g.globalAlpha = Math.max(0, f.life); g.fillStyle = "#fff"; g.beginPath(); g.arc(f.x, f.y, 1.6, 0, Math.PI * 2); g.fill(); });
      g.globalAlpha = 1;
      flashes = flashes.filter(f => f.life > 0);
      // LED board
      g.fillStyle = "#120303"; g.fillRect(0, 112, VW, 22);
      g.fillStyle = "#ff3b2f"; g.font = "600 13px ui-monospace, monospace"; g.textAlign = "left";
      const led = "GLORY GLORY MAN UNITED  ·  RED DEVILS  ·  THEATRE OF DREAMS  ·  ", lw = ledW || (ledW = g.measureText(led).width), off = -((performance.now() / 22) % lw);
      for (let x = off; x < VW; x += lw) g.fillText(led, x, 128);
      // pitch
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#237a30" : "#1f6b2a"; g.fillRect(0, 134 + i * 40, VW, 40); }
      g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(40, GOAL.line); g.lineTo(VW - 40, GOAL.line); g.moveTo(110, GOAL.line); g.lineTo(60, 440); g.moveTo(VW - 110, GOAL.line); g.lineTo(VW - 60, 440); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(SPOT.x, SPOT.y + 8, 5, 2.5, 0, 0, Math.PI * 2); g.fill();
      // net, bulging where a goal went in
      const bulge = shot && shot.result === "goal" ? shot.to : null, bt = phase === "result" ? Math.max(0, 1 - t / 1.2) : 0;
      g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 1;
      const push = (x, y) => { if (!bulge) return [x, y]; const d = Math.hypot(x - bulge.x, y - bulge.y), k = Math.max(0, 1 - d / 90) * 14 * bt; return [x + (x - bulge.x) / (d || 1) * k * 0.3, y - k * 0.6]; };
      for (let x = GOAL.l; x <= GOAL.r; x += 14) { g.beginPath(); for (let y = GOAL.top; y <= GOAL.line; y += 8) { const [a, b] = push(x, y); y === GOAL.top ? g.moveTo(a, b) : g.lineTo(a, b); } g.stroke(); }
      for (let y = GOAL.top; y <= GOAL.line; y += 14) { g.beginPath(); for (let x = GOAL.l; x <= GOAL.r; x += 8) { const [a, b] = push(x, y); x === GOAL.l ? g.moveTo(a, b) : g.lineTo(a, b); } g.stroke(); }
      g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = "round";
      g.beginPath(); g.moveTo(GOAL.l, GOAL.line); g.lineTo(GOAL.l, GOAL.top); g.lineTo(GOAL.r, GOAL.top); g.lineTo(GOAL.r, GOAL.line); g.stroke(); g.lineCap = "butt";
      // keeper
      const kp = phase === "flight" || phase === "result" ? keeperAt(phase === "flight" ? t : shot.T) : { x: 360 + Math.sin(performance.now() / 300) * 14, y: GOAL.line, p: 0 };
      const lean = (keeper.tx - 360) / 170 * kp.p;
      g.save(); g.translate(kp.x, kp.y); g.rotate(lean * 1.25);
      g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#111"; g.fillRect(-12, -30, 10, 30); g.fillRect(2, -30, 10, 30);
      g.fillStyle = keeper.kit; g.fillRect(-16, -66, 32, 38);
      g.lineWidth = 9; g.lineCap = "round"; g.strokeStyle = keeper.kit;
      g.beginPath(); g.moveTo(-14, -60); g.lineTo(-30, -84 + kp.p * 10); g.moveTo(14, -60); g.lineTo(30, -84 + kp.p * 10); g.stroke(); g.lineCap = "butt";
      g.fillStyle = "#f2f2f2"; g.beginPath(); g.arc(-31, -86 + kp.p * 10, 6, 0, Math.PI * 2); g.arc(31, -86 + kp.p * 10, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e0b48a"; g.beginPath(); g.arc(0, -76, 10, 0, Math.PI * 2); g.fill();
      g.restore();
      // the referee on the line, whistle ready
      g.save(); g.translate(600, GOAL.line + 4);
      g.fillStyle = "#111"; g.fillRect(-5, -22, 4, 22); g.fillRect(1, -22, 4, 22); g.fillRect(-8, -48, 16, 28);
      g.fillStyle = "#e0b48a"; g.beginPath(); g.arc(0, -54, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fbe122"; g.fillRect(-8, -44, 16, 3);
      g.restore();
      // the taker: United's number 7 in red, or their number 9 in navy, stepping in on the run-up
      const ours = phase === "aim" || phase === "end" || (shot && shot.mine && phase !== "save");
      const runup = phase === "save" ? Math.min(1, t / 1.6) : 1, struck = phase === "flight" || phase === "result";
      g.save(); g.translate(SPOT.x - 34 - (1 - runup) * 70 + (struck ? 14 : 0), 446 + (1 - runup) * 20);
      g.fillStyle = ours ? "#fff" : "#1c2c5b"; g.fillRect(-9, -26, 8, 24); g.fillRect(2, -26, 8, 24);
      g.fillStyle = ours ? "#da291c" : "#1c2c5b"; g.fillRect(-13, -64, 26, 40);
      if (!ours) { g.fillStyle = "#87b6e8"; g.fillRect(-13, -64, 26, 6); }
      g.fillStyle = "#fff"; g.font = "800 18px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(ours ? "7" : "9", 0, -38);
      g.fillStyle = ours ? "#3a2516" : "#c68a5a"; g.beginPath(); g.arc(0, -72, 9, 0, Math.PI * 2); g.fill();
      g.restore();
      // ball: arcs toward its target, shrinking with distance
      let bx = SPOT.x, by = SPOT.y, bs = 1;
      if (shot && (phase === "flight" || phase === "result")) {
        const k = phase === "flight" ? Math.min(1, t / shot.T) : 1, e = 1 - Math.pow(1 - k, 2);
        let tx = shot.to.x, ty = shot.to.y;
        if (phase === "result" && shot.result === "saved") { const r = Math.min(1, t / 0.6); tx += (shot.to.x < 360 ? -1 : 1) * 120 * r; ty += 140 * r - 200 * r * (1 - r); }
        if (phase === "result" && shot.result === "miss") { const r = Math.min(1, t / 0.6); tx += (shot.to.x - 360) * 0.4 * r; ty -= 60 * r; }
        bx = shot.from.x + (tx - shot.from.x) * e; by = shot.from.y + (ty - shot.from.y) * e - Math.sin(Math.PI * k) * shot.lift; bs = 1 - 0.45 * e;
      }
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(bx, Math.max(by, GOAL.line) + 10 * bs, 11 * bs, 3.5 * bs, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(bx, by, 12 * bs, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#222"; g.beginPath(); g.arc(bx + 2 * bs, by - 1 * bs, 4 * bs, 0, Math.PI * 2); g.fill();
      // aim reticle and power meter
      if (phase === "aim") {
        g.strokeStyle = "#fbe122"; g.lineWidth = 2;
        g.beginPath(); g.arc(aim.x, aim.y, 14, 0, Math.PI * 2); g.moveTo(aim.x - 22, aim.y); g.lineTo(aim.x - 8, aim.y); g.moveTo(aim.x + 8, aim.y); g.lineTo(aim.x + 22, aim.y); g.moveTo(aim.x, aim.y - 22); g.lineTo(aim.x, aim.y - 8); g.moveTo(aim.x, aim.y + 8); g.lineTo(aim.x, aim.y + 22); g.stroke();
        const mx = 640, my = 300, mh = 120;
        const grad = g.createLinearGradient(0, my + mh, 0, my); grad.addColorStop(0, "#3fbf3f"); grad.addColorStop(0.7, "#fbe122"); grad.addColorStop(1, "#da291c");
        g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(mx - 3, my - 3, 22, mh + 6);
        g.fillStyle = grad; g.fillRect(mx, my + mh * (1 - power), 16, mh * power);
        g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.beginPath(); g.moveTo(mx - 4, my + mh * 0.28); g.lineTo(mx + 20, my + mh * 0.28); g.stroke();
        g.fillStyle = "#fff"; g.font = "600 10px ui-monospace, monospace"; g.textAlign = "center"; g.fillText("POWER", mx + 8, my + mh + 16);
      }
      if (phase === "save") {
        const left = Math.max(0, 1.6 - t);
        g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(SPOT.x - 70, 330, 140, 30);
        g.fillStyle = "#fff"; g.font = "700 15px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(dive ? "Diving..." : `Run-up ${left.toFixed(1)}s`, SPOT.x, 350);
        if (dive) { g.strokeStyle = "#2fbf5b"; g.lineWidth = 2; g.beginPath(); g.arc(dive.x, dive.y, 16, 0, Math.PI * 2); g.stroke(); }
      }
      confetti.forEach(c => { c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 6; g.fillStyle = c.c; g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillRect(-3, -5, 6, 10); g.restore(); });
      confetti = confetti.filter(c => c.y < VH + 20);
    };
    let last = performance.now();
    const loop = now => {
      if (!o.fx.isConnected) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      if (phase === "aim" && charging) power = Math.min(1, power + dt / 1.1);
      if (phase === "save" && t >= 1.6) theirStrike();
      if (phase === "flight" && t >= shot.T) resolve();
      if (phase === "result" && t >= 1.5) next();
      draw(dt);
    };
    o.onClose(() => cancelAnimationFrame(raf));
    keeper = { x: 360, y: GOAL.line, tx: 360, ty: GOAL.line, kit: "#3d6fd8" };
    board();
    say("Your kick. Aim, hold to power up, release to shoot.");
    raf = requestAnimationFrame(loop);
  };

  // ---------- about: off-duty cards do something ----------
  $$("[data-duty]").forEach(card => card.addEventListener("click", () => {
    ({ music: guitarFx, game: leagueFx, sports: unitedFx, anime: animeFx })[card.dataset.duty]?.();
  }));

  // ---------- intro: role line types itself out ----------
  const typer = $(".typer");
  if (typer) {
    const words = typer.dataset.words.split("|");
    if (reduce) typer.textContent = words[0];
    else {
      let w = 0, n = 0, del = false;
      const tick = () => {
        const word = words[w];
        n += del ? -1 : 1;
        typer.textContent = word.slice(0, n);
        if (!del && n === word.length) { del = true; return setTimeout(tick, 1800); }
        if (del && n === 0) { del = false; w = (w + 1) % words.length; }
        setTimeout(tick, del ? 35 : 70);
      };
      setTimeout(tick, 1600);
    }
  }

  // ---------- pointer toys: trailing reticle, magnetic buttons, tilting media, glow on panels, click sparks ----------
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·";
  const scramble = (el, ms = 450) => {
    if (el._scr) return;
    const final = el.textContent, t0 = performance.now();
    el._scr = true;
    const run = now => {
      const shown = Math.floor(((now - t0) / ms) * final.length);
      if (shown >= final.length) { el.textContent = final; el._scr = false; return; }
      el.textContent = [...final].map((ch, i) => (ch === " " || i < shown ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  };
  if (!reduce) {
    $$(".topbar .links a, .btn:not(.land-btn), .next small").forEach(el => el.addEventListener("pointerenter", () => scramble(el)));
    addEventListener("pointerdown", e => {
      if (e.target.closest("input, textarea, canvas")) return;
      for (let i = 0; i < 10; i++) {
        const s = document.createElement("i"), a = (Math.PI * 2 * i) / 10 + Math.random() * 0.5, d = 22 + Math.random() * 30;
        s.className = "spark";
        s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px`;
        document.body.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      }
    });
  }
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    const ret = document.createElement("div");
    ret.className = "reticle";
    ret.setAttribute("aria-hidden", "true");
    document.body.appendChild(ret);
    let rx = -100, ry = -100, cx = -100, cy = -100;
    addEventListener("pointermove", e => {
      cx = e.clientX; cy = e.clientY;
      ret.classList.add("on");
      ret.classList.toggle("hot", !!e.target.closest("a, button, [data-used], input, textarea, [data-tilt]"));
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => ret.classList.remove("on"));
    addEventListener("pointerdown", () => ret.classList.add("down"));
    addEventListener("pointerup", () => ret.classList.remove("down"));
    let chasing = false;
    const follow = () => {
      rx += (cx - rx) * 0.2; ry += (cy - ry) * 0.2;
      ret.style.transform = `translate(${rx}px, ${ry}px)`;
      chasing = Math.abs(cx - rx) + Math.abs(cy - ry) > 0.3; // idle cursor = no frames
      if (chasing) requestAnimationFrame(follow);
    };
    addEventListener("pointermove", () => { if (!chasing) { chasing = true; requestAnimationFrame(follow); } }, { passive: true });

    $$(".btn, .audio-btn, .filters button, .term-open, .orbit-badge span").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.22}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`;
      });
      el.addEventListener("pointerleave", () => (el.style.translate = ""));
    });

    // media tilts toward the cursor; panels get a spotlight that follows it
    const track = (el, tilt) => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--gx", x * 100 + "%");
        el.style.setProperty("--gy", y * 100 + "%");
        if (tilt) el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg)`;
      });
      el.addEventListener("pointerleave", () => { if (tilt) el.style.transform = ""; });
    };
    $$("[data-tilt], .portrait, .stack-card > .media, .showcase-media figure:not([data-lens])").forEach(el => { el.classList.add("tilt"); track(el, true); });
    $$(".panel").forEach(el => { el.classList.add("glow"); track(el, false); });
  }

  if (!hasGsap || reduce) return; // everything below is motion only
  gsap.registerPlugin(ScrollTrigger);

  if (typeof Lenis !== "undefined") {
    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  }

  if (!isIndex) {
    // dim the 3D scene once you scroll past the header, so long text stays readable over a bright planet
    const shade = document.createElement("div");
    shade.className = "scene-shade";
    document.body.prepend(shade);
    gsap.to(shade, { opacity: 1, ease: "none", scrollTrigger: { start: () => innerHeight * 0.35, end: () => innerHeight * 1.1, scrub: true } });
    const alt = $(".hud-alt");
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: s => (alt.textContent = Math.round(1200 * (1 - s.progress)).toLocaleString()) });
    gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  }

  // headlines rise word by word
  const splitWords = (el, wordClass) => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(" ");
          const s = document.createElement("span");
          if (wordClass) { s.className = wordClass; s.textContent = part; }
          else { s.className = "split-line"; s.innerHTML = '<span class="split-char"></span>'; s.firstChild.textContent = part; }
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
    walk(el);
  };
  $$("[data-split]").forEach(el => {
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    splitWords(el);
    $$(".split-line", el).forEach(s => s.setAttribute("aria-hidden", "true"));
    const chars = $$(".split-char", el);
    if (boot) { // home: hold the headline until the boot screen clears
      gsap.set(chars, { yPercent: 110 });
      addEventListener("boot-done", () => gsap.to(chars, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.06, delay: 0.35 }), { once: true });
      return;
    }
    gsap.from(chars, {
      yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.06, delay: 0.95,
      scrollTrigger: { trigger: el, start: "top 92%" },
    });
  });
  $$("[data-scrub-words]").forEach(el => {
    splitWords(el, "word");
    gsap.to($$(".word", el), { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 50%", scrub: true } });
  });

  gsap.set("[data-reveal]", { y: 40, opacity: 0 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 90%",
    onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: true }),
  });

  $$("[data-speed]").forEach(el => gsap.fromTo(el, { yPercent: -parseFloat(el.dataset.speed) * 8 }, {
    yPercent: parseFloat(el.dataset.speed) * 8, ease: "none",
    scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
  }));

  $$("[data-count]").forEach(el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), o = { v: 0 };
    const node = el.firstChild;
    gsap.to(o, { v: end, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" }, onUpdate: () => (node.nodeValue = o.v.toFixed(dec)) });
  });

  // stacking cards: each card settles back as the next one slides over it
  const cards = matchMedia("(max-width: 760px)").matches ? [] : $$(".stack-card"); // phones: plain scrolling cards
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.fromTo(card, { scale: 1, filter: "brightness(1)" }, {
      scale: 0.94, filter: "brightness(0.4)", ease: "none",
      scrollTrigger: { trigger: next, start: "top 85%", end: "top 15%", scrub: true },
    });
  });

  // marquees speed up with scroll velocity and follow its direction
  $$(".marquee-track").forEach((tr, i) => {
    tr.innerHTML += tr.innerHTML;
    const dir = i % 2 ? 1 : -1;
    const loop = gsap.fromTo(tr, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 45, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      trigger: tr, start: "top bottom", end: "bottom top",
      onUpdate: self => {
        gsap.to(loop, { timeScale: (self.direction || 1) * (1 + Math.min(Math.abs(self.getVelocity()) / 160, 7)), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: self.direction || 1, duration: 1.2, delay: 0.2 });
      },
    });
  });

  // HUD labels decode into place like a terminal readout
  $$(".label:not(.hud-num)").forEach(el => {
    const final = el.textContent;
    ScrollTrigger.create({
      trigger: el, start: "top 92%", once: true,
      onEnter: () => {
        // time-based so it finishes in ~600ms even when the browser throttles frames
        const t0 = performance.now();
        const run = now => {
          const shown = Math.floor(((now - t0) / 600) * final.length);
          if (shown >= final.length) return (el.textContent = final);
          el.textContent = [...final].map((ch, i) => (ch === " " || i < shown ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
          requestAnimationFrame(run);
        };
        run(t0);
        setTimeout(() => (el.textContent = final), 900);
      },
    });
  });

  // images wipe open from the bottom as they arrive
  $$("[data-clip]").forEach(el => gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
    clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.out",
    scrollTrigger: { trigger: el, start: "top 88%" },
  }));
  $$("[data-clip] img").forEach(img => gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: img, start: "top 88%" } }));

  // list rows draw in from the left, one after another
  ScrollTrigger.batch(".rows li, .skill-row", {
    start: "top 92%",
    onEnter: els => gsap.fromTo(els, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.out", stagger: 0.07, overwrite: true }),
  });

  // project cards rise in, one after another
  gsap.set(".proj-grid li", { y: 40, opacity: 0 });
  ScrollTrigger.batch(".proj-grid li", {
    start: "top 92%",
    onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.06, overwrite: true }),
  });

  // giant planet name drifting sideways behind each header
  $$(".drift").forEach(el => gsap.fromTo(el, { xPercent: 8 }, {
    xPercent: -28, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top top", end: "bottom top", scrub: true },
  }));

  // the next-planet link grows into view
  $$(".next span").forEach(el => gsap.fromTo(el, { scale: 0.7, opacity: 0.2 }, {
    scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 55%", scrub: true },
  }));

  // skill orbit opens up as you scroll into it
  if ($(".orbit-map")) gsap.fromTo(".orbit-map", { scale: 0.6, opacity: 0 }, {
    scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: ".orbit-wrap", start: "top 95%", end: "top 45%", scrub: true },
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
