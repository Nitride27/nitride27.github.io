// Builds js/three.min.js: only the parts of three.js the site uses, exposed as window.THREE.
// The import list is generated from the site's own scripts, so adding THREE.Something there is picked up next build.
// Run: cd tools && npm install && npm run build:three
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { build } from "esbuild";

const used = new Set();
for (const f of readdirSync("../js").filter(f => f.endsWith(".js") && f !== "three.min.js"))
  for (const [, name] of readFileSync(`../js/${f}`, "utf8").matchAll(/THREE\.([A-Za-z0-9_]+)/g)) used.add(name);
const names = [...used].sort();
writeFileSync("three-entry.gen.js", `import { ${names.join(", ")} } from "three";\nwindow.THREE = { ${names.join(", ")} };\n`);

const out = await build({
  entryPoints: ["three-entry.gen.js"], bundle: true, minify: true, format: "iife", target: "es2019",
  outfile: "../js/three.min.js", legalComments: "none", metafile: true,
  banner: { js: `/* three.js r158 (MIT), tree-shaken for this site: ${names.length} exports */` },
});
const bytes = Object.values(out.metafile.outputs)[0].bytes;
console.log(`js/three.min.js: ${(bytes / 1024).toFixed(0)} KB, ${names.length} exports`);
