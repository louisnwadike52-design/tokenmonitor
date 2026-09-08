#!/usr/bin/env node
/**
 * Repo hygiene gate, run by `npm run lint` and CI:
 *  1. every JS file stays within the 150-line project limit
 *  2. every src module imports cleanly (parse + link check)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_LINES = 150;
const ROOTS = ["bin", "src", "test", "scripts"];
const failures = [];

for (const root of ROOTS) {
  for (const file of jsFiles(root)) {
    const lines = readFileSync(file, "utf8").trimEnd().split("\n").length;
    if (lines > MAX_LINES) {
      failures.push(`${file}: ${lines} lines (max ${MAX_LINES})`);
    }
  }
}

for (const file of jsFiles("src")) {
  try {
    await import(pathToFileURL(file));
  } catch (error) {
    failures.push(`${file}: failed to import — ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error(`check failed:\n${failures.map((f) => ` - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("check passed: file sizes within limits, all src modules import cleanly");

function jsFiles(root, out = []) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) jsFiles(path, out);
    else if (/\.(js|mjs)$/.test(entry.name)) out.push(path);
  }
  return out;
}
