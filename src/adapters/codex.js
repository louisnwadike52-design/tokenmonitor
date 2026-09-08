import { jsonlObjects, walkFiles } from "../fsx.js";
import { emptyUsage } from "../usage.js";

/**
 * Codex CLI writes rollout files under `~/.codex/sessions/YYYY/MM/DD/`.
 * `token_count` events carry a per-request delta (`info.last_token_usage`)
 * and a cumulative total (`info.total_token_usage`). Deltas are preferred;
 * when a file predates deltas, its final cumulative total is used instead.
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
  let sawDelta = false;
  let finalTotal = null;
  let finalDate = null;
  for await (const line of jsonlObjects(file)) {
    const payload = line?.payload;
    if (!payload || typeof payload !== "object") continue;
    // `turn_context` / `session_meta` events name the model; the field has
    // moved around across Codex versions, so check the known locations.
    const named = payload.model ?? payload.turn_context?.model ?? payload.info?.model;
    if (typeof named === "string" && named) model = named;
    if (payload.type !== "token_count" || !payload.info) continue;
    const date = String(line.timestamp ?? "").slice(0, 10);
    const delta = payload.info.last_token_usage;
    if (delta) {
      sawDelta = true;
      if (date) yield toRecord(model, date, delta);
    } else if (payload.info.total_token_usage) {
      finalTotal = payload.info.total_token_usage;
      finalDate = date || finalDate;
    }
  }
  if (!sawDelta && finalTotal && finalDate) {
    yield toRecord(model, finalDate, finalTotal);
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
