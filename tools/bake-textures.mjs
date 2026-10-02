// Bakes every planet, Milky Way and nebula texture to images/tex/*.webp.
// The site loads these files instead of painting noise in the browser.
// Run: node tools/bake-textures.mjs   (needs ImageMagick `convert` with WebP)
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";

// ---------------- noise ----------------
const hash = (x, y, z, s) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const lerp = (a, b, t) => a + (b - a) * t;
const noise = (x, y, z, s) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash(xi + a, yi + b, zi + d, s);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
};
const fbm = (x, y, z, s, oct = 6) => {
  let a = 0.5, f = 1, sum = 0;
  for (let i = 0; i < oct; i++) { sum += a * noise(x * f, y * f, z * f, s + i); a *= 0.5; f *= 2.03; }
  return sum / (1 - Math.pow(0.5, oct));
};
const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const R = (...p) => p.map(([t, h]) => [t, hex(h)]);
const ramp = (stops, t) => {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = (t - t0) / (t1 - t0);
    return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
  }
  return stops[stops.length - 1][1];
};

// impact craters: bowl + raised rim
const craterSet = (seed, count, minR, maxR) => {
  let s = seed;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: count }, () => {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u);
    return [q * Math.cos(th), u, q * Math.sin(th), minR + Math.pow(rnd(), 3) * (maxR - minR)];
  });
};
const craters = (set, x, y, z) => {
  let h = 0;
  for (const [cx, cy, cz, r] of set) {
    const d = Math.acos(Math.min(1, x * cx + y * cy + z * cz)) / r;
    if (d < 1.25) h += d < 1 ? (d * d - 1) * 0.6 : (1.25 - d) * 1.2 * (d - 1) * 4;
  }
  return h;
};
const MOON_C = craterSet(7, 90, 0.03, 0.32), DESERT_C = craterSet(13, 30, 0.02, 0.14), ICE_C = craterSet(29, 18, 0.02, 0.1);
const cracks = (x, y, z) => Math.pow(1 - Math.abs(fbm(x * 3.2, y * 3.2, z * 3.2, 37) * 2 - 1), 12);
const G = 0.62; // tilt of the galactic plane (space.js aims the sky using the same value)

// ---------------- painters: (x, y, z, lat) on the unit sphere -> [r, g, b, aux] ----------------
// aux is height for rocky worlds and a water mask for ocean worlds
const PAINT = {
  ice: (x, y, z, lat) => {
    const n = fbm(x * 2.4, y * 2.4, z * 2.4, 11) + craters(ICE_C, x, y, z) * 0.08;
    if (Math.abs(lat) + (n - 0.5) * 0.35 > 0.74) return [236, 246, 252, 200];
    return [...ramp(R([0, 0x0b3a78], [0.45, 0x2f86d6], [0.65, 0x82cff0], [1, 0xeafaff]), n), n * 255];
  },
  terran: (x, y, z, lat) => {
    const n = fbm(x * 1.7, y * 1.7, z * 1.7, 21);
    if (Math.abs(lat) > 0.86) return [240, 244, 248, 255];
    return n < 0.53 ? [...ramp(R([0, 0x021d52], [0.8, 0x0a4ea6], [1, 0x1f9ad0]), n / 0.53), 0]
      : [...ramp(R([0, 0xd9c48a], [0.08, 0x4c8a2c], [0.45, 0x2f6b22], [0.7, 0x8a7342], [0.88, 0x9a8466], [1, 0xf4f4ef]), (n - 0.53) / 0.47), 255];
  },
  lava: (x, y, z) => { const n = fbm(x * 2.6, y * 2.6, z * 2.6, 31); return [...ramp(R([0, 0x140b08], [0.6, 0x34221b], [1, 0x5c3f36]), n), (n - cracks(x, y, z) * 0.6) * 255]; },
  lavaGlow: (x, y, z) => [...ramp(R([0, 0x000000], [0.28, 0x6a1402], [0.62, 0xff4e0a], [1, 0xffd77a]), cracks(x, y, z) * 1.6), 255],
  gas: (x, y, z, lat) => {
    const turb = fbm(x * 3, y * 3, z * 3, 41, 6);
    const t = Math.sin(lat * 16 + turb * 2.6) * 0.5 + 0.5;
    const spot = Math.exp(-(Math.pow((x - 0.55) / 0.2, 2) + Math.pow((lat + 0.36) / 0.08, 2) + Math.pow((z - 0.8) / 0.35, 2)));
    const c = ramp(R([0, 0x7a3510], [0.3, 0xc8661f], [0.55, 0xedbd80], [0.8, 0xfbf0da], [1, 0xd47f33]), t * 0.85 + turb * 0.15);
    return [lerp(c[0], 0xd2, spot), lerp(c[1], 0x40, spot), lerp(c[2], 0x1e, spot), 128];
  },
  desert: (x, y, z) => {
    const n = fbm(x * 2.2, y * 2.2, z * 2.2, 51), c = craters(DESERT_C, x, y, z);
    return [...ramp(R([0, 0x501806], [0.4, 0xb4441a], [0.66, 0xdd6e2e], [1, 0xf0b07c]), n + Math.sin((x + n) * 22) * 0.03 + c * 0.05), (n * 0.6 + 0.4 + c * 0.25) * 200];
  },
  ocean: (x, y, z) => {
    const n = fbm(x * 2, y * 2, z * 2, 61);
    return n > 0.67 ? [...ramp(R([0, 0xe2cf98], [0.25, 0x3e8a44], [1, 0x2a5a30]), (n - 0.67) / 0.33), 255]
      : [...ramp(R([0, 0x001a52], [0.7, 0x0656c0], [1, 0x1e96ee]), n / 0.67), 0];
  },
  moon: (x, y, z) => {
    const n = fbm(x * 4, y * 4, z * 4, 99), c = craters(MOON_C, x, y, z), mare = fbm(x * 1.2, y * 1.2, z * 1.2, 5, 3) > 0.58 ? -0.18 : 0;
    return [...ramp(R([0, 0x2c2c2e], [1, 0xbcbcc0]), n * 0.7 + 0.2 + c * 0.12 + mare), (0.5 + c * 0.4 + n * 0.2) * 255];
  },
  clouds: (x, y, z, lat, seed) => { const n = fbm(x * 3, y * 3, z * 3, 71 + seed, 6); return [255, 255, 255, Math.max(0, n - 0.52) * 2.4 * 255]; },

  // The Milky Way as photographed from a dark site: a granular band of star clouds, a golden-peach
  // bulge, cream arms, a blue-violet halo, the dark Great Rift down the spine, and dense coloured stars.
  sky: (x, y, z) => {
    const b = y * Math.cos(G) - z * Math.sin(G);
    if (Math.abs(b) > 0.6) return [0, 0, 0, 255]; // most of the sphere is empty; skip it
    const cd = Math.acos(Math.max(-1, Math.min(1, x * 0.9 + (y * Math.sin(G) + z * Math.cos(G)) * 0.436)));
    const core = Math.exp(-Math.pow(cd / 0.6, 2));
    const width = 0.15 + core * 0.14;
    const spine = Math.exp(-Math.pow(b / width, 2));
    const halo = Math.exp(-Math.pow(b / 0.4, 2));
    // star clouds at three scales: big bright patches, medium knots, fine granular texture
    const big = fbm(x * 3, y * 3, z * 3, 3, 4), mid = fbm(x * 9, y * 9, z * 9, 5, 4), fine = fbm(x * 30, y * 30, z * 30, 7, 3);
    const cloud = Math.pow(big, 1.5) * 1.5 * (0.5 + mid * 0.9) * (0.35 + fine * 1.3);
    // Great Rift: dark lanes hugging the spine, ragged at the edges
    const riftOn = smooth(0.4, 0.6, fbm(x * 2.2, y * 2.2, z * 2.2, 13, 3));                  // patchy along the band's length
    const riftFil = 1 - Math.abs(fbm(x * 11, y * 11, z * 11, 17, 5) * 2 - 1);              // ragged filaments
    const riftOff = (fbm(x * 3, y * 3, z * 3, 19, 3) - 0.5) * width * 0.9;                // wanders off the spine
    const rift = smooth(0.45, 0.8, riftFil) * riftOn * Math.exp(-Math.pow((b - riftOff) / (width * 0.35), 2));
    const lum = (spine * cloud * (0.55 + core * 1.3) * (1 - rift * 0.9) + halo * 0.06) * 225;
    // colour: peach-gold bulge -> cream arms -> blue-violet outer halo
    const edge = smooth(0.3, 1.1, Math.abs(b) / width);
    let c = [lerp(1.0, 0.62, edge), lerp(0.86, 0.68, edge), lerp(0.72, 1.0, edge)];
    c = [c[0] + core * 0.16, c[1] + core * 0.03, c[2] - core * 0.16];
    let r = lum * c[0], g = lum * c[1], bl = lum * c[2];
    // faint hydrogen-pink knots along the band
    const ha = smooth(0.66, 0.8, fbm(x * 12, y * 12, z * 12, 23, 4)) * spine * (1 - rift) * 40;
    r += ha; g += ha * 0.25; bl += ha * 0.45;
    // rift dust keeps a dark brown tint instead of going grey
    r += rift * spine * 9; g += rift * spine * 5; bl += rift * spine * 3;
    // resolved stars, denser in the band, with real colour variety
    const sx = Math.floor(x * 1400), sy = Math.floor(y * 1400), sz = Math.floor(z * 1400);
    const h = hash(sx, sy, sz, 77);
    if (h < 0.0016 + spine * 0.012) {
      const k = Math.pow(hash(sx, sy, sz, 78), 3) * 255, t = hash(sx, sy, sz, 79);
      const tint = t < 0.3 ? [0.7, 0.82, 1] : t < 0.65 ? [1, 1, 1] : t < 0.85 ? [1, 0.9, 0.72] : [1, 0.68, 0.45];
      r += k * tint[0]; g += k * tint[1]; bl += k * tint[2];
    }
    const roll = v => 255 * (1 - Math.exp(-v / 200));  // filmic rolloff: bright core keeps detail instead of clipping
    return [roll(r), roll(g), roll(bl), 255];
  },
};

// a single nebula in the Hubble palette for the subpage backdrop: amber up top, teal below
const nebula = (u, v) => {
  const X = u - 0.5, Y = v - 0.5;
  const wx = X + (fbm(X * 2.5, Y * 2.5, 1, 5, 3) - 0.5) * 0.4, wy = Y + (fbm(X * 2.5, Y * 2.5, 7, 6, 3) - 0.5) * 0.4;
  const r = Math.hypot(wx * 1.15, wy * 0.95);
  const mask = Math.exp(-Math.pow(r / 0.34, 2.2)) * smooth(0, 0.18, Math.min(u, 1 - u, v, 1 - v));
  const body = fbm(wx * 3.2, wy * 3.2, 3.3, 23, 6);
  const dens = smooth(0.3, 0.62, body) * mask;
  const fil = Math.pow(1 - Math.abs(fbm(wx * 6, wy * 6, 9.1, 61, 5) * 2 - 1), 5) * dens;
  const mix = smooth(-0.2, 0.2, wy + (fbm(wx * 2, wy * 2, 4.4, 47, 3) - 0.5) * 0.5);
  const glob = smooth(0.62, 0.75, fbm(wx * 6, wy * 6, 2.2, 91, 4)) * smooth(0.1, 0.5, dens);
  const lit = (dens * 1.35 + fil * 1.2) * (1 - glob * 0.9) * 255;
  return [lit * lerp(0.14, 1.0, mix), lit * lerp(0.55, 0.58, mix), lit * lerp(0.68, 0.14, mix), 255];
};

// push colours away from grey so they hold up after lighting
const grade = (c, sat, gain = 1) => {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return [(l + (c[0] - l) * sat) * gain, (l + (c[1] - l) * sat) * gain, (l + (c[2] - l) * sat) * gain];
};

// north-up rows (image files are read top-down)
const paint = ({ kind, w, h, seed = 0, sat = 1, gain = 1 }) => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - j / h) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < w; i++) {
      const c = kind === "nebula" ? nebula(i / w, 1 - j / h) : PAINT[kind](cl * Math.cos((i / w) * Math.PI * 2), sl, cl * Math.sin((i / w) * Math.PI * 2), sl, seed);
      const g = grade(c, sat, gain), k = (j * w + i) * 4;
      rgba[k] = g[0]; rgba[k + 1] = g[1]; rgba[k + 2] = g[2]; rgba[k + 3] = c[3];
    }
  }
  return rgba;
};

if (!isMainThread) {
  parentPort.postMessage(paint(workerData));
} else {
  const OUT = "images/tex", TMP = join(tmpdir(), "bake-tex");
  mkdirSync(OUT, { recursive: true });
  mkdirSync(TMP, { recursive: true });
  const P = { sat: 1.45 };
  // [name, paint job, outputs]; outputs: [file, mode, size] where mode is rgb | rgba | aux | rough
  const JOBS = [
    ...["ice", "terran", "lava", "gas", "desert", "ocean"].map(t => [t, { kind: t, w: 2048, h: 1024, ...P }, [
      [`${t}@2x`, "rgb", 2048], [t, "rgb", 1024],
      ...(t === "gas" ? [] : [[`${t}-aux`, t === "terran" || t === "ocean" ? "rough" : "aux", 1024]]),
    ]]),
    ["moon", { kind: "moon", w: 1024, h: 512 }, [["moon", "rgb", 512], ["moon-aux", "aux", 512]]],
    ["lavaGlow", { kind: "lavaGlow", w: 2048, h: 1024, sat: 1.2 }, [["lava-glow@2x", "rgb", 2048], ["lava-glow", "rgb", 1024]]],
    ["clouds1", { kind: "clouds", w: 2048, h: 1024, seed: 3 }, [["clouds-a@2x", "alpha", 2048], ["clouds-a", "alpha", 1024]]],
    ["clouds2", { kind: "clouds", w: 2048, h: 1024, seed: 9 }, [["clouds-b@2x", "alpha", 2048], ["clouds-b", "alpha", 1024]]],
    ["sky", { kind: "sky", w: 4096, h: 2048, sat: 1.5 }, [["sky", "rgb", 4096], ["sky-sm", "rgb", 2048]]],
    ["nebula", { kind: "nebula", w: 1024, h: 1024, sat: 1.4 }, [["nebula", "rgb", 1024]]],
  ];

  const write = (name, data, w, h, outs) => {
    const raw = join(TMP, name + ".raw");
    writeFileSync(raw, data);
    for (const [file, mode, size] of outs) {
      const dst = join(OUT, file + ".webp");
      const resize = size === w ? [] : ["-resize", `${size}x${size / 2 | 0}`];
      if (name === "nebula") resize.length = 0;
      const base = ["-size", `${w}x${h}`, "-depth", "8", "rgba:" + raw];
      let args;
      if (mode === "rgb") args = [...base, "-alpha", "off", ...resize, "-quality", "84", dst];
      else if (mode === "alpha") args = [...base, ...resize, "-quality", "80", "-define", "webp:alpha-quality=80", dst];
      else if (mode === "aux") args = [...base, "-alpha", "extract", ...resize, "-quality", "78", dst];
      else args = [...base, "-alpha", "extract", "-threshold", "50%", "+level", "27%,92%", ...resize, "-quality", "78", dst]; // water glossy, land matte
      execFileSync("convert", args);
    }
    console.log("baked", name, outs.map(o => o[0]).join(", "));
  };

  const queue = JOBS.filter(j => !process.env.ONLY || process.env.ONLY.split(",").includes(j[0])); // ONLY=sky,gas to re-bake a few
  const run = () => {
    const job = queue.shift();
    if (!job) return Promise.resolve();
    const [name, data, outs] = job;
    return new Promise((res, rej) => {
      const wk = new Worker(new URL(import.meta.url), { workerData: data });
      wk.once("message", buf => { write(name, buf, data.w, data.h, outs); res(); });
      wk.once("error", rej);
    }).then(run);
  };
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(cpus().length, JOBS.length) }, run));
  rmSync(TMP, { recursive: true, force: true });
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
