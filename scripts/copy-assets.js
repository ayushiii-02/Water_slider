const { cpSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..");
const src = join(root, "assets");

if (!existsSync(src)) {
  console.warn("assets/ folder not found — skipping copy");
  process.exit(0);
}

function copyAssetsTo(dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// Vite serves files from public/ during dev and copies them into dist/ on build.
copyAssetsTo(join(root, "public", "assets"));

const distAssets = join(root, "dist", "assets");
if (existsSync(join(root, "dist"))) {
  copyAssetsTo(distAssets);
}

console.log("Synced assets -> public/assets" + (existsSync(join(root, "dist")) ? " and dist/assets" : ""));
