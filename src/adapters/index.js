import { claude } from "./claude.js";
import { codex } from "./codex.js";
import { gemini } from "./gemini.js";

/**
 * Every supported AI CLI has one adapter: `{ name, collect(paths) }` where
 * `collect` is an async generator of usage records (see src/usage.js).
 * To support a new tool, add an adapter file and register it here.
 */
export const adapters = [claude, codex, gemini];
