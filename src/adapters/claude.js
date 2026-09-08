import { jsonlObjects, walkFiles } from "../fsx.js";
import { emptyUsage } from "../usage.js";

/**
 * Claude Code writes one JSONL file per session under
 * `~/.claude/projects/<project>/<session>.jsonl`. Assistant entries carry
 * `message.usage` and `message.model`. Resumed sessions duplicate entries
 * across files, so records are deduplicated on message id + request id.
 */
export const claude = {
  name: "claude",
  async *collect(paths) {
    const seen = new Set();
    for (const dir of paths.claudeProjects ?? []) {
      for await (const file of walkFiles(dir, ".jsonl")) {
        for await (const entry of jsonlObjects(file)) {
          const record = toRecord(entry, seen);
          if (record) yield record;
        }
      }
    }
  },
};

function toRecord(entry, seen) {
  const message = entry?.message;
  const tokens = message?.usage;
  if (!tokens || !message.model || message.model === "<synthetic>") return null;
  const key = `${message.id ?? ""}:${entry.requestId ?? ""}`;
  if (key !== ":") {
    if (seen.has(key)) return null;
    seen.add(key);
  }
  const date = String(entry.timestamp ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const usage = emptyUsage();
  usage.input = tokens.input_tokens ?? 0;
  usage.output = tokens.output_tokens ?? 0;
  usage.cacheRead = tokens.cache_read_input_tokens ?? 0;
  // Newer logs break cache writes down by TTL; older ones only have the total.
  const ttlSplit = tokens.cache_creation;
  usage.cacheWrite5m =
    ttlSplit?.ephemeral_5m_input_tokens ?? tokens.cache_creation_input_tokens ?? 0;
  usage.cacheWrite1h = ttlSplit?.ephemeral_1h_input_tokens ?? 0;
  return { tool: "claude", model: message.model, date, usage };
}
