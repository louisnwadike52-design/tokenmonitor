import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { codex } from "../src/adapters/codex.js";

const fixtures = fileURLToPath(new URL("./fixtures/codex", import.meta.url));

async function collect() {
  const records = [];
  for await (const r of codex.collect({ codexSessions: [fixtures] })) records.push(r);
  return records;
}

test("emits one record per token_count delta, splitting cached input out", async () => {
  const records = (await collect()).filter((r) => r.model === "gpt-5-codex");
  assert.equal(records.length, 2);
  assert.deepEqual(records[0].usage, {
    input: 600, // 1000 input − 400 cached
    output: 200,
    cacheRead: 400,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
  assert.equal(records[0].date, "2026-09-01");
  assert.deepEqual(records[1].usage, {
    input: 500, // 2000 input − 1500 cached
    output: 100,
    cacheRead: 1500,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
  assert.equal(records[1].date, "2026-09-02");
});

test("falls back to the final cumulative total when a file has no deltas", async () => {
  const records = (await collect()).filter((r) => r.model === "gpt-5");
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    tool: "codex",
    model: "gpt-5",
    date: "2026-08-15",
    usage: { input: 3000, output: 800, cacheRead: 2000, cacheWrite5m: 0, cacheWrite1h: 0 },
  });
});
