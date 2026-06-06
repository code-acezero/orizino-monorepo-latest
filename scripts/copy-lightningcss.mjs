#!/usr/bin/env node
/**
 * scripts/copy-lightningcss.mjs
 *
 * Copies the Linux glibc lightningcss binary into the lightningcss package
 * root so Next.js / Tailwind can find it on Netlify / Linux CI.
 *
 * Usage (any of the apps):
 *   node ../../scripts/copy-lightningcss.mjs
 *
 * The script is intentionally safe:
 *  - exits 0 when the source binary is absent (e.g. local macOS dev)
 *  - exits 1 only when the copy itself errors, so CI knows to investigate
 */

import { existsSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const TAG = "[copy-lightningcss]";

let src, dst;
try {
  const srcPkg = require.resolve("lightningcss-linux-x64-gnu/package.json");
  const lcPkg  = require.resolve("lightningcss/package.json");
  const { join, dirname } = await import("node:path");
  src = join(dirname(srcPkg), "lightningcss.linux-x64-gnu.node");
  dst = join(dirname(lcPkg),  "lightningcss.linux-x64-gnu.node");
} catch (e) {
  console.log(TAG, "resolve failed (non-Linux env?), skipping:", e.message);
  process.exit(0);
}

if (!existsSync(src)) {
  console.log(TAG, "source binary not found, skipping:", src);
  process.exit(0);
}

try {
  copyFileSync(src, dst);
  console.log(TAG, "OK:", src, "→", dst);
} catch (e) {
  console.error(TAG, "copy FAILED:", e.message);
  process.exit(1);
}
