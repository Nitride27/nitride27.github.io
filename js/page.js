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
  const file = p => p.split("/").pop() || "index.html";
  const here = file(location.pathname);
  const isIndex = document.body.classList.contains("index-page");

  // ---------- chrome ----------
  let veil = $(".transition-veil");
  if (!veil) { veil = document.createElement("div"); veil.className = "transition-veil"; document.body.prepend(veil); }
  veil.setAttribute("aria-hidden", "true");
  veil.innerHTML = '<div class="veil-hud"><span class="v1"></span><b></b><span class="v2"></span><div class="bar"><i></i></div></div>';
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
  const audio = new Audio("audio/Interstellar.mp3");
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
  if (!muted) tryPlay();
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
    countAlt(12000, 1200, 850, () => setTimeout(ready, 120));
  } else requestAnimationFrame(ready);
  addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("is-leaving"); });

  window.leaveTo = href => {
    saveTime();
    const name = PLANETS[file(new URL(href, location.href).pathname)] || "";
    vTop.textContent = name === "Orbit" ? "Returning to" : isIndex ? "Descending to" : "Launching to";
    vName.textContent = name === "Orbit" ? "Orbit" : name;
    vAlt.textContent = "";
    vBar.style.setProperty("--p", 0);
    document.body.classList.add("is-leaving");
    whoosh();
    if (reduce) return (location.href = href);
    countAlt(0, 12000, 650, () => (location.href = href));
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
    $$(".index-list li").forEach(li => li.classList.toggle("is-hidden", f !== "all" && !li.dataset.cat.split(" ").includes(f)));
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
    whoami: () => "Samridha Shrestha. AI/ML engineer in Kathmandu, currently interning at Octacore Solutions.",
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

  // ---------- ASCII landing site in the footer ----------
  const ascii = $(".ascii");
  if (ascii) {
    const ROWS = 11, SURF = 7, LANDER = ["  _|_  ", " /(o)\\ ", "/_____\\", " /   \\ "];
    let cols = 0, heights = [], stars = [];
    const measure = () => {
      const probe = document.createElement("span");
      probe.textContent = "0".repeat(20);
      ascii.appendChild(probe);
      const cw = probe.getBoundingClientRect().width / 20 || 7.2;
      probe.remove();
      cols = Math.ceil(ascii.clientWidth / cw);
      const mid = cols / 2;
      heights = Array.from({ length: cols }, (_, x) => {
        const flat = Math.abs(x - mid) < 7; // level pad under the lander
        const h = Math.sin(x * 0.11) * 1.4 + Math.sin(x * 0.037 + 1) * 1.8 + Math.sin(x * 0.29) * 0.5;
        return flat ? SURF : Math.round(SURF - Math.max(-1, Math.min(4, h + 1.2)));
      });
      stars = Array.from({ length: Math.round(cols / 9) }, () => [Math.random() * cols | 0, Math.random() * (SURF - 3) | 0]);
    };
    const SHADE = ".:-=+*#%@";
    const draw = t => {
      const grid = Array.from({ length: ROWS }, () => Array(cols).fill(" "));
      stars.forEach(([x, y], i) => { if (Math.sin(t * 0.002 + i * 1.7) > -0.2) grid[y][x] = Math.sin(t * 0.003 + i) > 0.85 ? "*" : "."; });
      for (let x = 0; x < cols; x++) {
        const top = heights[x];
        for (let y = top; y < ROWS; y++) {
          if (y === top) {
            const l = heights[x - 1] ?? top, r = heights[x + 1] ?? top;
            grid[y][x] = l > top && r >= top ? "/" : r > top && l >= top ? "\\" : ["_", "-", "~"][(Math.sin(x * 0.7 + t * 0.0015) * 1.5 + 1.5) | 0];
          } else grid[y][x] = SHADE[Math.min(SHADE.length - 1, ((y - top) * 1.6 + ((x * 7) % 3)) | 0)];
        }
      }
      const lx = Math.round(cols / 2 - 3);
      LANDER.forEach((line, i) => [...line].forEach((ch, k) => { if (ch !== " ") grid[SURF - LANDER.length + i][lx + k] = ch; }));
      if (Math.sin(t * 0.004) > 0) grid[SURF - LANDER.length][lx + 3] = "*"; // beacon
      ascii.textContent = grid.map(r => r.join("")).join("\n");
    };
    measure();
    addEventListener("resize", measure);
    let visible = false, last = 0;
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(ascii);
    const loop = now => { if (visible && now - last > 120) { draw(now); last = now; } requestAnimationFrame(loop); };
    draw(0);
    if (!reduce) requestAnimationFrame(loop);
  }


  // ---------- skills: hover or focus a skill to see which projects used it ----------
  const usedPanel = $(".used-in");
  if (usedPanel) {
    const title = $(".used-title", usedPanel), list = $(".used-list", usedPanel);
    const show = el => {
      $$("[data-used]").forEach(x => x.classList.toggle("on", x === el));
      title.textContent = el.textContent;
      list.innerHTML = "";
      el.dataset.used.split("|").forEach(u => { const li = document.createElement("li"); li.textContent = u; list.appendChild(li); });
      usedPanel.classList.remove("pulse"); void usedPanel.offsetWidth; usedPanel.classList.add("pulse");
    };
    $$("[data-used]").forEach(el => {
      el.tabIndex = 0;
      ["pointerenter", "focus", "click"].forEach(ev => el.addEventListener(ev, () => show(el)));
    });
  }

  // ---------- projects: a preview card follows the cursor over the list ----------
  const preview = $(".row-preview");
  if (preview && matchMedia("(pointer: fine)").matches) {
    const inner = $(".row-preview-inner", preview);
    let px = 0, py = 0, tx = 0, ty = 0, raf;
    const follow = () => { px += (tx - px) * 0.18; py += (ty - py) * 0.18; preview.style.transform = `translate(${px}px, ${py}px)`; raf = requestAnimationFrame(follow); };
    $$(".index-list li").forEach(li => {
      li.addEventListener("pointerenter", () => {
        inner.innerHTML = li.dataset.img ? `<img src="${li.dataset.img}" alt="">` : `<span style="background:${li.dataset.tint || "#222"}">${li.dataset.glyph || ""}</span>`;
        preview.classList.add("show");
        if (!raf) follow();
      });
      li.addEventListener("pointerleave", () => preview.classList.remove("show"));
    });
    addEventListener("pointermove", e => { tx = e.clientX + 24; ty = e.clientY - 90; });
  }

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
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·";
  $$(".label:not(.hud-num)").forEach(el => {
    const final = el.textContent;
    ScrollTrigger.create({
      trigger: el, start: "top 92%", once: true,
      onEnter: () => {
        let f = 0;
        const run = () => {
          el.textContent = [...final].map((ch, i) => (ch === " " || i < f / 2 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
          if (f++ < final.length * 2) requestAnimationFrame(run); else el.textContent = final;
        };
        run();
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
  ScrollTrigger.batch(".rows li, .index-list li, .skill-row", {
    start: "top 92%",
    onEnter: els => gsap.fromTo(els, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.out", stagger: 0.07, overwrite: true }),
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
