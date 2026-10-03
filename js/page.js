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
  setTimeout(sync, 1500); // after the arrival veil lifts
  const saveTime = () => store(() => sessionStorage.setItem("audio-time", audio.currentTime));
  addEventListener("pagehide", saveTime);

  // engine whoosh, synthesised so there's no extra file to load
  const whoosh = () => {
    if (muted || reduce) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(), t = ctx.currentTime, len = 0.9;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = "bandpass"; f.Q.value = 0.9;
    f.frequency.setValueAtTime(180, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + len * 0.75);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  };

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
    countAlt(12000, 0, 1500, () => { vTop.textContent = "Touchdown"; setTimeout(ready, 380); });
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
  const copy = text => navigator.clipboard?.writeText(text).then(() => toast("Copied " + text), () => toast(text));
  $$("[data-copy]").forEach(el => el.addEventListener("click", () => copy(el.dataset.copy)));

  $$(".filters button").forEach(b => b.addEventListener("click", () => {
    $$(".filters button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    const f = b.dataset.filter;
    $$(".proj-grid li").forEach(li => li.classList.toggle("is-hidden", f !== "all" && !li.dataset.cat.split(" ").includes(f)));
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }));

  // sticky project copy follows whichever image is centred
  const figs = $$(".showcase-media figure");
  if (figs.length) {
    const arts = $$(".showcase-copy article"), dashes = $$(".dashes i");
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const i = figs.indexOf(en.target);
      [figs, arts, dashes].forEach(list => list.forEach((el, k) => el.classList.toggle("on", k === i)));
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
    if (e.key === "ArrowUp" && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
    if (e.key === "ArrowDown") { input.value = history[++hIdx] || ""; hIdx = Math.min(hIdx, history.length); e.preventDefault(); }
  });
  const toggleTerm = (open = !term.classList.contains("open")) => {
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
  const ascii = $(".ascii");
  let startLander = () => {};
  if (ascii) {
    const ROWS = 15, SURF = 11;
    const LANDER = ["  ╭─╮  ", " ╭┤o├╮ ", " ╰┬─┬╯ ", " ╱   ╲ "];
    const RINGED = ["   ▄██▄   ", "══▐████▌══", "   ▀██▀   "];
    const EIGHTHS = " ▁▂▃▄▅▆▇█";
    const G = 0.006, THRUST = 0.015, SIDE = 0.008; // rows or cols per 50ms step
    let cols = 0, heights = [], near = [], far = [], stars = [], mid = 0, comet = null;
    const measure = () => {
      const probe = document.createElement("span");
      probe.textContent = "█".repeat(20);
      ascii.appendChild(probe);
      const cw = probe.getBoundingClientRect().width / 20 || 7.2;
      probe.remove();
      cols = Math.ceil(ascii.clientWidth / cw);
      mid = cols / 2;
      // near terrain as float rows (smaller = higher) with a level pad in the middle; far range sits behind it
      near = Array.from({ length: cols }, (_, x) => {
        if (Math.abs(x - mid) < 7) return SURF;
        const h = Math.sin(x * 0.11) * 1.4 + Math.sin(x * 0.037 + 1) * 1.8 + Math.sin(x * 0.29) * 0.5;
        const edge = Math.min(1, (Math.abs(x - mid) - 7) / 5); // ease out of the pad
        return SURF - Math.max(-1, Math.min(4.2, h + 1.2)) * edge;
      });
      far = Array.from({ length: cols }, (_, x) => SURF - 3.2 - Math.abs(Math.sin(x * 0.045 + 2)) * 3 - Math.sin(x * 0.17) * 0.6);
      heights = near.map(Math.round);
      stars = Array.from({ length: Math.round(cols / 6) }, () => [Math.random() * cols | 0, Math.random() * (SURF - 6) | 0, Math.random()]);
    };
    // game: null while parked; otherwise the lander's state
    let game = null, keys = {}, held = false;
    const esc = c => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);
    const draw = t => {
      const grid = Array.from({ length: ROWS }, () => Array.from({ length: cols }, () => [" ", ""]));
      const put = (y, x, ch, cls) => { if (grid[y] && x >= 0 && x < cols && ch !== " ") grid[y][x] = [ch, cls]; };
      const text = (y, str, x = 1, cls = "t") => [...str].forEach((ch, k) => grid[y] && x + k < cols && x + k >= 0 && (grid[y][x + k] = [ch, cls]));
      stars.forEach(([x, y, p], i) => {
        const tw = Math.sin(t * 0.002 + i * 1.7);
        if (tw > -0.3) put(y, x, tw > 0.92 ? "+" : p > 0.85 ? "•" : "·", tw > 0.92 ? "b" : "s");
      });
      // ringed planet up in the sky
      const px = Math.round(cols * 0.78);
      RINGED.forEach((row, r) => [...row].forEach((ch, k) => put(1 + r, px + k, ch, ch === "═" || ch === "▐" || ch === "▌" ? "r" : "q")));
      // a shooting star now and then
      if (!comet && Math.random() < 0.01) comet = { x: Math.random() * cols * 0.6, y: Math.random() * 3 | 0, v: 1.6 };
      if (comet) { comet.x += comet.v; text(comet.y, "──·", Math.round(comet.x), "c"); if (comet.x > cols) comet = null; }
      // terrain: eighth blocks give the ridgeline sub-row detail
      const layer = (hs, top, fill) => hs.forEach((h, x) => {
        const row = Math.floor(h), cover = 1 - (h - row);
        for (let y = Math.max(0, row); y < ROWS; y++) {
          const ch = y === row ? EIGHTHS[Math.max(1, Math.round(cover * 8))] : fill(y - row, x);
          put(y, x, ch, top);
        }
      });
      layer(far, "f", () => "░");
      layer(near, "n", (d, x) => (d < 2 ? "█" : d < 3 ? "▓" : (x * 3 + d) % 7 ? "▓" : "▒"));
      const pad = Math.round(mid - 7);
      for (let x = pad; x < pad + 14; x++) put(SURF, x, x === pad || x === pad + 13 ? (Math.sin(t * 0.006) > 0 ? "◆" : "◇") : "▀", "p");
      const lx = game ? Math.round(game.x) : Math.round(mid - 3), ly = game ? Math.round(game.y) : SURF - LANDER.length;
      if (!(game && game.over === "crash")) {
        LANDER.forEach((line, r) => [...line].forEach((ch, k) => put(ly + r, lx + k, ch, "l")));
        if (game && game.firing && !game.over) { text(ly + 4, "▼", lx + 3, "fl"); if (Math.random() > 0.4) text(ly + 5, "░", lx + 3, "fl"); }
      } else text(Math.min(ly + 3, SURF - 1), "▒ ╱▓╲ ░", lx, "w"); // wreckage
      if (!game) {
        if (Math.sin(t * 0.004) > 0) put(SURF - LANDER.length - 1, lx + 3, "*", "fl"); // beacon
        text(0, "[ click to fly the lander ]", Math.max(1, Math.round(mid - 14)));
      } else {
        text(0, `FUEL ${String(Math.max(0, game.fuel | 0)).padStart(3)}   V ${(game.vy * 20).toFixed(1)}   H ${(game.vx * 20).toFixed(1)}   ↑ / SPACE / HOLD = thrust   ← → = steer`);
        if (game.over) text(2, game.over === "land" ? "TOUCHDOWN. Nice flying, captain.  [ click to fly again ]" : "CRASHED. Too fast or off the pad.  [ click to try again ]", Math.max(1, Math.round(mid - 28)));
      }
      // one span per run of the same layer keeps the DOM small
      ascii.innerHTML = grid.map(row => {
        let out = "", cls = null, run = "";
        row.forEach(([ch, c]) => { if (c !== cls) { if (run) out += cls ? `<i class="a-${cls}">${run}</i>` : run; run = ""; cls = c; } run += esc(ch); });
        return out + (cls ? `<i class="a-${cls}">${run}</i>` : run);
      }).join("\n");
      ascii.classList.toggle("playing", !!game);
      exitBtn.hidden = !game;
    };
    const step = () => {
      const g = game;
      if (!g || g.over) return;
      g.firing = (keys.up || held) && g.fuel > 0;
      g.vy += G - (g.firing ? THRUST : 0);
      if (g.fuel > 0 && keys.left) g.vx -= SIDE;
      if (g.fuel > 0 && keys.right) g.vx += SIDE;
      g.fuel -= (g.firing ? 1 : 0) + (keys.left || keys.right ? 0.4 : 0);
      g.x = Math.max(0, Math.min(cols - 7, g.x + g.vx));
      g.y += g.vy;
      const lx = Math.round(g.x), ground = Math.min(...heights.slice(lx, lx + 7));
      if (g.y + LANDER.length >= ground) {
        g.y = ground - LANDER.length;
        const onPad = lx >= Math.round(mid - 7) && lx + 7 <= Math.round(mid + 7) + 1;
        g.over = onPad && g.vy < 0.14 && Math.abs(g.vx) < 0.1 ? "land" : "crash";
        if (g.over === "land") { toast("Touchdown! Soft landing."); collect("lander"); } else toast("Crashed. Try a gentler burn.");
      }
    };
    startLander = () => {
      game = { x: Math.random() * (cols - 8), y: 0, vx: (Math.random() - 0.5) * 0.2, vy: 0, fuel: 120, over: null };
      ascii.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    };
    const exitBtn = document.createElement("button");
    exitBtn.type = "button"; exitBtn.className = "play-exit lander-exit"; exitBtn.innerHTML = "<span aria-hidden=\"true\">✕</span> Exit";
    exitBtn.addEventListener("click", () => { game = null; keys = {}; exitBtn.hidden = true; });
    ascii.before(exitBtn);
    ascii.addEventListener("click", () => { if (!game || game.over) startLander(); });
    ascii.addEventListener("pointerdown", () => (held = true));
    addEventListener("pointerup", () => (held = false));
    const KEYS = { ArrowUp: "up", " ": "up", w: "up", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
    addEventListener("keydown", e => { if (game && !game.over && KEYS[e.key] && !e.target.closest("input,textarea")) { keys[KEYS[e.key]] = true; e.preventDefault(); } });
    addEventListener("keyup", e => { if (KEYS[e.key]) keys[KEYS[e.key]] = false; });
    ascii.setAttribute("title", "Click to fly the lander");
    measure();
    addEventListener("resize", measure);
    let visible = false, last = 0, lastStep = 0;
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(ascii);
    const loop = now => {
      if (game && now - lastStep > 50) { step(); lastStep = now; }
      if (visible && (game ? now - last > 50 : now - last > 120)) { draw(now); last = now; }
      requestAnimationFrame(loop);
    };
    draw(0);
    requestAnimationFrame(loop);
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
      ["This portfolio", "index.html"], ["Every project", "https://github.com/Nitride27"],
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
    };
    stops.forEach((b, i) => b.addEventListener("click", () => pick(i)));
    flight.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { pick(cur + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { pick(cur - 1); e.preventDefault(); }
    });
    pick(stops.length - 1);
  }

  // ---------- about: off-duty cards do something ----------
  $$("[data-duty]").forEach(card => card.addEventListener("click", () => {
    const d = card.dataset.duty;
    if (d === "music") { setMuted(!(muted || audio.paused)); toast(muted ? "Music off" : "Music on: Interstellar"); }
    if (d === "game") startBlaster();
    if (d === "anime") open("https://apps.samridhashrestha.com.np/animestudio/", "_blank", "noopener");
    if (d === "sports") kick(card);
  }));
  // a ball that bounces around inside its card
  const kick = card => {
    const ball = $(".ball", card), W = card.clientWidth - 22, H = card.clientHeight - 22;
    if (!ball._s) { ball._s = { x: W - 20, y: H - 20, vx: 0, vy: 0, run: false }; ball.style.cssText = "left:0;top:0;right:auto;bottom:auto"; }
    const st = ball._s;
    st.vx = (Math.random() - 0.5) * 18; st.vy = -10 - Math.random() * 8;
    if (st.run) return;
    st.run = true;
    const tick = () => {
      st.vy += 0.6; st.x += st.vx; st.y += st.vy;
      if (st.x < 0 || st.x > W) { st.vx *= -0.8; st.x = Math.max(0, Math.min(W, st.x)); }
      if (st.y < 0) { st.vy *= -0.8; st.y = 0; }
      if (st.y > H) { st.y = H; st.vy *= -0.6; st.vx *= 0.9; }
      ball.style.transform = `translate(${st.x}px, ${st.y}px) rotate(${st.x * 4}deg)`;
      if (Math.abs(st.vy) < 0.8 && st.y >= H - 0.5 && Math.abs(st.vx) < 0.3) { st.run = false; return; }
      requestAnimationFrame(tick);
    };
    tick();
  };

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
    gsap.from($$(".split-char", el), {
      yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.06, delay: isIndex ? 0.2 : 0.95,
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
  const cards = $$(".stack-card");
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

  // showcase counter follows the active project
  const counter = $(".showcase-count b");
  if (counter) $$(".showcase-media figure").forEach((f, i) => ScrollTrigger.create({
    trigger: f, start: "top 55%", end: "bottom 45%", onToggle: self => self.isActive && (counter.textContent = String(i + 1).padStart(2, "0")),
  }));

  addEventListener("load", () => ScrollTrigger.refresh());
})();
