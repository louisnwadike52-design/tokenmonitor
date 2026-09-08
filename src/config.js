import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readJsonFile } from "./fsx.js";

/**
 * Resolves the log directories of every supported AI CLI, honoring the same
 * environment variables the tools themselves use. When a tool's env override
 * is set it REPLACES the defaults (matching each CLI's own behavior), so
 * pointing at a scratch directory fully isolates a run. Only directories that
 * exist are returned, so adapters never probe blindly.
 */
export function resolvePaths(env = process.env, home = homedir()) {
  const claudeRoots = env.CLAUDE_CONFIG_DIR
    ? [env.CLAUDE_CONFIG_DIR]
    : [join(home, ".claude"), join(home, ".config", "claude")];
  return {
    claudeProjects: existing(claudeRoots.map((root) => join(root, "projects"))),
    codexSessions: existing([join(env.CODEX_HOME ?? join(home, ".codex"), "sessions")]),
    geminiDirs: existing([env.GEMINI_DIR ?? join(home, ".gemini")]),
  };
}

function existing(dirs) {
  return [...new Set(dirs)].filter((dir) => existsSync(dir));
}

/**
 * Loads user pricing overrides, merged over the built-in table by the caller.
 * Location: $TOKENMONITOR_PRICING, else ~/.config/tokenmonitor/pricing.json.
 */
export async function loadUserPricing(env = process.env, home = homedir()) {
  const configHome = env.XDG_CONFIG_HOME ?? join(home, ".config");
  const file =
    env.TOKENMONITOR_PRICING ?? join(configHome, "tokenmonitor", "pricing.json");
  const pricing = await readJsonFile(file);
  return pricing && typeof pricing === "object" ? pricing : {};
}
