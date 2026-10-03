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
  GESTURES.forEach(e => addEventListener(e, () => wake(), true)); // wake the effects too (touch only counts on touchend)
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
  const buzz = ms => haptic && navigator.userActivation?.hasBeenActive && navigator.vibrate(ms);
  const SOUNDS = {
    tick: () => tone(2400, 0.035, { type: "square", vol: 0.04 }),
    press: () => tone(900, 0.1, { type: "triangle", vol: 0.16, to: 520 }),
    blip: () => tone(1100 + Math.random() * 500, 0.05, { type: "square", vol: 0.05 }),
    hover: () => tone(1500, 0.14, { vol: 0.08, to: 1900 }),
    queue: () => [880, 1175, 1480].forEach((f, i) => tone(f, 0.6, { vol: 0.09, delay: i * 0.07 })),
    crowd: () => { hiss(2.6, { from: 500, to: 1100, vol: 0.3, q: 0.4, attack: 0.5 }); hiss(2.2, { from: 1500, to: 2600, vol: 0.12, q: 0.6, attack: 0.4, delay: 0.1 }); },
    powerup: () => { tone(110, 1, { type: "sawtooth", vol: 0.07, to: 880, attack: 0.8 }); hiss(1, { from: 200, to: 5000, vol: 0.2, attack: 0.9 }); },
    chime: () => { tone(660, 0.5, { vol: 0.12 }); tone(990, 0.7, { vol: 0.09, delay: 0.09 }); buzz(8); },
    ok: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: "triangle", vol: 0.12, delay: i * 0.08 })); buzz([15, 40, 15]); },
    whoosh: () => hiss(0.9),
    descend: () => { hiss(1.1, { from: 2400, to: 160, vol: 0.22, attack: 0.15 }); tone(320, 1, { type: "sawtooth", vol: 0.025, to: 70 }); buzz(20); },
    warp: () => { hiss(1.9, { from: 120, to: 4200, vol: 0.3, attack: 1.1 }); tone(55, 1.9, { type: "sawtooth", vol: 0.04, to: 220, attack: 1 }); },
    roll: () => hiss(1.1, { from: 300, to: 1400, vol: 0.16, q: 2, attack: 0.5 }),
    thud: () => { tone(110, 0.4, { vol: 0.28, to: 38 }); hiss(0.45, { from: 400, to: 90, vol: 0.18, attack: 0.01 }); buzz(30); },
    boom: () => { hiss(1.2, { from: 900, to: 50, vol: 0.4, attack: 0.01, q: 0.6 }); tone(80, 0.9, { vol: 0.3, to: 28 }); buzz([60, 30, 90]); },
    open: () => hiss(0.35, { from: 600, to: 2400, vol: 0.08, q: 3, attack: 0.05 }),
    close: () => hiss(0.3, { from: 2400, to: 600, vol: 0.07, q: 3, attack: 0.05 }),
  };
  // engine: a continuous low rumble whose loudness and pitch follow the throttle (0..1); call it every frame
  const engine = level => {
    if (!eng) {
      const c = ac(); if (!c) return;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), o = c.createOscillator(), og = c.createGain(), g = c.createGain();
      src.buffer = noiseBuf; src.loop = true;
      f.type = "lowpass"; f.frequency.value = 200; f.Q.value = 4;
      o.type = "sawtooth"; o.frequency.value = 42; og.gain.value = 0.12;
      g.gain.value = 0;
      src.connect(f).connect(g); o.connect(og).connect(f);
      g.connect(master);
      src.start(); o.start();
      eng = { f, o, g };
    }
    const t = actx.currentTime, l = Math.max(0, Math.min(1, level));
    eng.g.gain.setTargetAtTime(l * 0.22, t, 0.12);
    eng.f.frequency.setTargetAtTime(160 + l * 900, t, 0.12);
    eng.o.frequency.setTargetAtTime(38 + l * 40, t, 0.12);
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
  window.sfx = { play: name => { if (!reduce || name !== "warp") SOUNDS[name]?.(); }, engine, pluck };
  const whoosh = () => !reduce && SOUNDS.whoosh();
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
    window.sfx.play("descend");
    countAlt(12000, 0, dur, () => { vTop.textContent = "Touchdown"; window.sfx.play("thud"); setTimeout(ready, quick ? 220 : 380); });
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
    whoosh();
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

  // ---------- asteroid blaster: 30 seconds, click rocks to blast them ----------
  let playing = false;
  const startBlaster = () => {
    if (playing) return;
    playing = true;
    window.lenis?.stop();
    const cv = document.createElement("canvas"), hud = document.createElement("div"), exit = document.createElement("button");
    cv.className = "play-canvas"; hud.className = "play-hud";
    exit.className = "play-exit"; exit.type = "button"; exit.innerHTML = "<span aria-hidden=\"true\">✕</span> Exit game";
    document.body.append(cv, hud, exit);
    const g = cv.getContext("2d"), dpr = Math.min(devicePixelRatio, 2);
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    const accent = getComputedStyle(document.body).getPropertyValue("--planet").trim() || "#9cc9dc";
    const best0 = +(store(() => localStorage.getItem("blaster-best")) || 0);
    let rocks = [], bits = [], beams = [], score = 0, t0 = performance.now(), spawnAt = 0, over = false, raf;
    const rock = (x, y, r, vx, vy) => ({ x, y, r, vx, vy, a: 0, va: (Math.random() - 0.5) * 0.04, pts: Array.from({ length: 10 }, () => 0.75 + Math.random() * 0.35) });
    const spawn = () => {
      const side = Math.random() * 4 | 0, r = 18 + Math.random() * 26;
      const x = side === 0 ? -r : side === 1 ? innerWidth + r : Math.random() * innerWidth;
      const y = side === 2 ? -r : side === 3 ? innerHeight + r : Math.random() * innerHeight;
      const ang = Math.atan2(innerHeight / 2 - y, innerWidth / 2 - x) + (Math.random() - 0.5) * 1.2, sp = 1 + Math.random() * 1.6;
      rocks.push(rock(x, y, r, Math.cos(ang) * sp, Math.sin(ang) * sp));
    };
    const ship = () => ({ x: innerWidth / 2, y: innerHeight - 40 });
    const shoot = e => {
      if (over) return restart();
      const s0 = ship();
      beams.push({ x1: s0.x, y1: s0.y, x2: e.clientX, y2: e.clientY, life: 1 });
      rocks.forEach(k => {
        if (Math.hypot(k.x - e.clientX, k.y - e.clientY) > k.r + 6) return;
        k.dead = true;
        score += Math.round(60 - k.r);
        for (let i = 0; i < 14; i++) bits.push({ x: k.x, y: k.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1 });
        if (k.r > 26) for (let i = 0; i < 2; i++) rocks.push(rock(k.x, k.y, k.r * 0.55, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));
      });
      rocks = rocks.filter(k => !k.dead);
    };
    const quit = () => {
      cancelAnimationFrame(raf); cv.remove(); hud.remove(); exit.remove(); playing = false; window.lenis?.start();
      removeEventListener("keydown", onKey); removeEventListener("resize", size);
    };
    const onKey = e => { if (e.key === "Escape") quit(); };
    const restart = () => { rocks = []; bits = []; beams = []; score = 0; t0 = performance.now(); over = false; };
    cv.addEventListener("pointerdown", shoot);
    exit.addEventListener("click", () => quit());
    addEventListener("keydown", onKey);
    const frame = now => {
      raf = requestAnimationFrame(frame);
      const left = Math.max(0, 30 - (now - t0) / 1000);
      if (!over && left === 0) {
        over = true;
        const best = Math.max(best0, score, +(store(() => localStorage.getItem("blaster-best")) || 0));
        store(() => localStorage.setItem("blaster-best", best));
        if (score >= 400) collect("blaster");
      }
      if (!over && now > spawnAt) { spawn(); spawnAt = now + Math.max(260, 700 - (30 - left) * 14); }
      g.clearRect(0, 0, innerWidth, innerHeight);
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 0, innerWidth, innerHeight);
      g.lineWidth = 1.5; g.strokeStyle = accent;
      rocks.forEach(k => {
        k.x += k.vx; k.y += k.vy; k.a += k.va;
        g.beginPath();
        k.pts.forEach((m, i) => { const a = k.a + (i / k.pts.length) * Math.PI * 2; g[i ? "lineTo" : "moveTo"](k.x + Math.cos(a) * k.r * m, k.y + Math.sin(a) * k.r * m); });
        g.closePath(); g.stroke();
      });
      rocks = rocks.filter(k => k.x > -80 && k.x < innerWidth + 80 && k.y > -80 && k.y < innerHeight + 80);
      beams.forEach(b => { g.globalAlpha = b.life; g.beginPath(); g.moveTo(b.x1, b.y1); g.lineTo(b.x2, b.y2); g.stroke(); b.life -= 0.08; });
      bits.forEach(b => { b.x += b.vx; b.y += b.vy; b.life -= 0.025; g.globalAlpha = Math.max(0, b.life); g.fillStyle = accent; g.fillRect(b.x, b.y, 2, 2); });
      g.globalAlpha = 1;
      beams = beams.filter(b => b.life > 0); bits = bits.filter(b => b.life > 0);
      const s0 = ship();
      g.beginPath(); g.moveTo(s0.x, s0.y - 16); g.lineTo(s0.x - 11, s0.y + 10); g.lineTo(s0.x, s0.y + 4); g.lineTo(s0.x + 11, s0.y + 10); g.closePath();
      g.fillStyle = "#e9ebee"; g.fill();
      const best = Math.max(best0, +(store(() => localStorage.getItem("blaster-best")) || 0));
      hud.innerHTML = over
        ? `<b>${score}</b> points · best ${Math.max(best, score)}<span>Click to play again</span>`
        : `<b>${score}</b> points · ${left.toFixed(1)}s · best ${best}<span>Click rocks to blast them</span>`;
    };
    raf = requestAnimationFrame(frame);
    toast("Asteroid blaster: 30 seconds. Score 400 for a star fragment.");
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
    play: () => { toggleTerm(false); setTimeout(startBlaster, 200); return "Launching asteroid blaster..."; },
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
    if ($(".duty-fx")) return null;
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
    const o = overlay("guitar-fx", "Guitar", '<div class="gt">' +
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

  // gaming: the queue pops, like it does on Summoner's Rift. Accept and the asteroid blaster loads in
  const leagueFx = () => {
    const C = 2 * Math.PI * 46;
    const o = overlay("league-fx", "Match found", '<div class="lol">' +
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
      setTimeout(() => { o.close(); setTimeout(startBlaster, 300); }, 1700);
    });
  };

  // sports: a penalty at the Stretford End. Pick a corner; the keeper guesses
  const unitedFx = () => {
    const o = overlay("united-fx", "Penalty", '<div class="pk">' +
      '<small>Old Trafford · Theatre of Dreams</small><b>Penalty to United</b>' +
      '<div class="pk-pitch"><div class="pk-goal"><i class="pk-keeper"></i>' +
      ["Bottom left", "Down the middle", "Top right"].map((t, i) => `<button type="button" class="pk-zone" data-z="${i}" aria-label="Shoot ${t.toLowerCase()}"></button>`).join("") +
      '</div><i class="pk-ball"></i></div>' +
      '<p class="pk-msg" aria-live="polite">Pick your corner.</p><p class="pk-score">Goals <b>0</b> · Saved <b>0</b></p>' +
      '<button class="btn" type="button" data-close>Back to the dressing room</button></div>');
    if (!o) return;
    const pitch = $(".pk-pitch", o.fx), msg = $(".pk-msg", o.fx), [goals, saves] = $$(".pk-score b", o.fx);
    let busy = false;
    $$(".pk-zone", o.fx).forEach(z => z.addEventListener("click", () => {
      if (busy) return;
      busy = true;
      const aim = +z.dataset.z, dive = Math.floor(Math.random() * 3), scored = aim !== dive;
      pitch.dataset.aim = aim; pitch.dataset.dive = dive;
      pitch.classList.remove("goal", "saved"); void pitch.offsetWidth; pitch.classList.add("shot");
      window.sfx.play("press");
      setTimeout(() => {
        pitch.classList.add(scored ? "goal" : "saved");
        if (scored) { goals.textContent = +goals.textContent + 1; msg.textContent = "GOAL! Glory Glory Man United!"; window.sfx.play("crowd"); window.sfx.play("ok"); }
        else { saves.textContent = +saves.textContent + 1; msg.textContent = "Saved. Go again."; window.sfx.play("thud"); }
      }, 480);
      setTimeout(() => { pitch.classList.remove("shot", "goal", "saved"); busy = false; if (scored) msg.textContent = "Again? Pick a corner."; }, 2200);
    }));
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
