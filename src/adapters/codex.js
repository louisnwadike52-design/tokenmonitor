import { jsonlObjects, walkFiles } from "../fsx.js";
import { emptyUsage } from "../usage.js";

/**
 * Codex CLI writes rollout files under `~/.codex/sessions/YYYY/MM/DD/`.
 * `token_count` events carry a cumulative running total (`info.total_token_usage`)
 * and, on newer versions, the latest request's usage (`info.last_token_usage`).
 *
 * We derive each event's usage by DIFFING the cumulative total against the
 * previous one, rather than summing per-request figures. Because the totals are
 * cumulative, a repeated or duplicated snapshot produces a zero delta and cannot
 * be counted twice. Files that predate cumulative totals fall back to the
 * per-request `last_token_usage` deltas.
 */
export const codex = {
  name: "codex",
  async *collect(paths) {
    for (const dir of paths.codexSessions ?? []) {
      for await (const file of walkFiles(dir, ".jsonl")) {
        yield* parseSession(file);
      }
    }
  },
};

async function* parseSession(file) {
  let model = "unknown";
  const prev = { input: 0, cached: 0, output: 0 };
  let usedTotals = false;
  const deltaOnly = [];
  for await (const line of jsonlObjects(file)) {
    const payload = line?.payload;
    if (!payload || typeof payload !== "object") continue;
    // `turn_context` / `session_meta` events name the model; the field has
    // moved around across Codex versions, so check the known locations.
    const named = payload.model ?? payload.turn_context?.model ?? payload.info?.model;
    if (typeof named === "string" && named) model = named;
    if (payload.type !== "token_count" || !payload.info) continue;
    const date = String(line.timestamp ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const total = payload.info.total_token_usage;
    if (total) {
      usedTotals = true;
      const cur = {
        input: total.input_tokens ?? 0,
        cached: total.cached_input_tokens ?? 0,
        output: total.output_tokens ?? 0,
      };
      // Non-negative per-field delta; a reset (cur < prev) re-baselines to cur.
      const d = {
        input: Math.max(cur.input - prev.input, 0),
        cached: Math.max(cur.cached - prev.cached, 0),
        output: Math.max(cur.output - prev.output, 0),
      };
      prev.input = cur.input;
      prev.cached = cur.cached;
      prev.output = cur.output;
      if (d.input > 0 || d.output > 0) {
        yield toRecord(model, date, {
          input_tokens: d.input,
          cached_input_tokens: d.cached,
          output_tokens: d.output,
        });
      }
    } else if (payload.info.last_token_usage) {
      deltaOnly.push({ date, tokens: payload.info.last_token_usage });
    }
  }
  // Older Codex format: no cumulative totals, only per-request deltas.
  if (!usedTotals) {
    for (const r of deltaOnly) yield toRecord(model, r.date, r.tokens);
  }
}

function toRecord(model, date, tokens) {
  // OpenAI's input_tokens includes cached tokens; split them out so cached
  // reads are billed at the discounted rate.
  const cached = tokens.cached_input_tokens ?? 0;
  const usage = emptyUsage();
  usage.input = Math.max((tokens.input_tokens ?? 0) - cached, 0);
  usage.cacheRead = cached;
  usage.output = tokens.output_tokens ?? 0; // includes reasoning tokens
  return { tool: "codex", model, date, usage };
}
