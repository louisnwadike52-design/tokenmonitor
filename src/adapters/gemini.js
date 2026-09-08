import { stat } from "node:fs/promises";
import { readJsonFile, walkFiles } from "../fsx.js";
import { emptyUsage } from "../usage.js";

const TOKEN_KEYS = ["tokens", "usageMetadata"];

/**
 * Gemini CLI's on-disk formats vary by version (`~/.gemini/sessions/`,
 * `~/.gemini/tmp/<hash>/`), so this adapter scans JSON files for the two
 * shapes Gemini uses for token counts: session metrics (`tokens: {prompt,
 * candidates, cached, thoughts}`) and API `usageMetadata` (`promptTokenCount`,
 * `candidatesTokenCount`, …). Model and date are inherited from enclosing
 * objects; the file's mtime is the date of last resort.
 */
export const gemini = {
  name: "gemini",
  async *collect(paths) {
    for (const dir of paths.geminiDirs ?? []) {
      for await (const file of walkFiles(dir, ".json")) {
        const data = await readJsonFile(file);
        if (!data) continue;
        yield* extract(data, null, await mtimeDate(file));
      }
    }
  },
};

async function mtimeDate(file) {
  try {
    return (await stat(file)).mtime.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function* extract(node, model, date, depth = 0) {
  if (depth > 24) return; // guard against pathologically nested JSON
  if (Array.isArray(node)) {
    for (const item of node) yield* extract(item, model, date, depth + 1);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const ownModel = typeof node.model === "string" ? node.model : model;
  const ownDate =
    isoDate(node.timestamp) ?? isoDate(node.startTime) ?? isoDate(node.lastUpdated) ?? date;
  for (const key of TOKEN_KEYS) {
    const record = toRecord(node[key], ownModel, ownDate);
    if (record) yield record;
  }
  for (const [key, value] of Object.entries(node)) {
    if (TOKEN_KEYS.includes(key) || value === null || typeof value !== "object") continue;
    // In session metrics, per-model stats are keyed by the model id itself.
    yield* extract(value, /^gemini/i.test(key) ? key : ownModel, ownDate, depth + 1);
  }
}

function isoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : null;
}

function toRecord(tokens, model, date) {
  if (!tokens || typeof tokens !== "object" || !model || !date) return null;
  const prompt = tokens.prompt ?? tokens.promptTokenCount ?? 0;
  const candidates = tokens.candidates ?? tokens.candidatesTokenCount ?? 0;
  const cached = tokens.cached ?? tokens.cachedContentTokenCount ?? 0;
  const thoughts = tokens.thoughts ?? tokens.thoughtsTokenCount ?? 0;
  if (prompt + candidates <= 0) return null;

  const usage = emptyUsage();
  usage.input = Math.max(prompt - cached, 0);
  usage.cacheRead = cached;
  usage.output = candidates + thoughts; // thinking tokens bill as output
  return { tool: "gemini", model, date, usage };
}
