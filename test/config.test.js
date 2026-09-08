import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadUserPricing, resolvePaths } from "../src/config.js";

function scratchHome() {
  const home = mkdtempSync(join(tmpdir(), "tm-home-"));
  mkdirSync(join(home, ".claude", "projects"), { recursive: true });
  mkdirSync(join(home, ".codex", "sessions"), { recursive: true });
  mkdirSync(join(home, ".gemini"), { recursive: true });
  return home;
}

test("defaults resolve to the standard home directories", () => {
  const home = scratchHome();
  const paths = resolvePaths({}, home);
  assert.deepEqual(paths.claudeProjects, [join(home, ".claude", "projects")]);
  assert.deepEqual(paths.codexSessions, [join(home, ".codex", "sessions")]);
  assert.deepEqual(paths.geminiDirs, [join(home, ".gemini")]);
});

test("CLAUDE_CONFIG_DIR REPLACES the default (does not add to it)", () => {
  const home = scratchHome();
  const override = mkdtempSync(join(tmpdir(), "tm-cc-"));
  mkdirSync(join(override, "projects"), { recursive: true });
  const paths = resolvePaths({ CLAUDE_CONFIG_DIR: override }, home);
  // The real ~/.claude/projects must NOT leak in when the override is set.
  assert.deepEqual(paths.claudeProjects, [join(override, "projects")]);
});

test("nonexistent directories are filtered out", () => {
  const paths = resolvePaths(
    { CLAUDE_CONFIG_DIR: "/definitely/not/here", CODEX_HOME: "/nope", GEMINI_DIR: "/nope" },
    "/also/not/here",
  );
  assert.deepEqual(paths, { claudeProjects: [], codexSessions: [], geminiDirs: [] });
});

test("loadUserPricing returns {} when the file is missing", async () => {
  const pricing = await loadUserPricing({ TOKENMONITOR_PRICING: "/no/such/file.json" });
  assert.deepEqual(pricing, {});
});
