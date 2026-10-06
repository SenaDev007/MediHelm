// ============================================================
// MediHelm — post-build standalone (monorepo backend/ + frontend/).
// Next.js `output: "standalone"` avec racine de traçage = racine du
// dépôt produit un serveur imbriqué .next/standalone/frontend/server.js
// qui fait `process.chdir(__dirname)` : il sert public/ et .next/static
// DEPUIS le standalone. Or Next ne les copie PAS automatiquement —
// sans cette copie, tous les chunks clients (JS/CSS) et les fichiers
// publics (images, manifest, sw.js) renverraient 404 en production.
// Idempotent : lancé par `pnpm build` après `next build`.
// ============================================================
const fs = require("fs");
const path = require("path");

const frontendRoot = path.join(__dirname, "..");
const standalone = path.join(frontendRoot, ".next", "standalone", "frontend");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error(
    "[copy-standalone-assets] ERREUR — .next/standalone/frontend/server.js introuvable." +
      " Le build a-t-il été lancé avec output: 'standalone' ?"
  );
  process.exit(1);
}

function copyDir(label, from, to) {
  if (!fs.existsSync(from)) {
    console.error(`[copy-standalone-assets] ERREUR — source absente : ${from}`);
    process.exit(1);
  }
  fs.cpSync(from, to, { recursive: true, force: true });
  console.log(`[copy-standalone-assets] ${label} -> ${path.relative(frontendRoot, to)}`);
}

copyDir("public/", path.join(frontendRoot, "public"), path.join(standalone, "public"));
copyDir(
  ".next/static/",
  path.join(frontendRoot, ".next", "static"),
  path.join(standalone, ".next", "static")
);

console.log("[copy-standalone-assets] standalone auto-suffisant (assets statiques inclus).");
