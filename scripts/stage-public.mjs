import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist", "public");

const PUBLIC_HTML_FILES = [
  "index.html",
  "about.html",
  "service.html",
  "blog.html",
  "privacy.html",
  "terms.html",
  "cookies.html",
  "licenses.html",
  "404.html",
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of PUBLIC_HTML_FILES) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outDir, file));
  }
}

const assetsSrc = path.join(root, "assets");
if (fs.existsSync(assetsSrc)) {
  fs.cpSync(assetsSrc, path.join(outDir, "assets"), { recursive: true });
}

const adminDistSrc = path.join(root, "dist", "admin");
if (fs.existsSync(adminDistSrc)) {
  fs.cpSync(adminDistSrc, path.join(outDir, "admin"), { recursive: true });
}

console.log("[stage-public] Staged public static site and /admin bundle to dist/public");
