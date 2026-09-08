import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { claude } from "../src/adapters/claude.js";

const fixtures = fileURLToPath(new URL("./fixtures/claude", import.meta.url));

async function collect() {
  const records = [];
  for await (const r of claude.collect({ claudeProjects: [fixtures] })) records.push(r);
  return records;
}

test("parses usage, dedupes resumed sessions, skips synthetic/corrupt lines", async () => {
  const records = await collect();
  assert.equal(records.length, 2);

  const opus = records.find((r) => r.model === "claude-opus-4-8");
  assert.deepEqual(opus, {
    tool: "claude",
    model: "claude-opus-4-8",
    date: "2026-09-01",
    usage: { input: 100, output: 50, cacheRead: 1000, cacheWrite5m: 150, cacheWrite1h: 50 },
  });
});

test("falls back to the flat cache-write total when the TTL split is absent", async () => {
  const records = await collect();
  const sonnet = records.find((r) => r.model === "claude-sonnet-5");
  assert.deepEqual(sonnet.usage, {
    input: 10,
    output: 20,
    cacheRead: 0,
    cacheWrite5m: 30,
    cacheWrite1h: 0,
  });
});

test("yields nothing for missing directories", async () => {
  const records = [];
  for await (const r of claude.collect({ claudeProjects: ["/nonexistent/nowhere"] })) {
    records.push(r);
  }
  assert.equal(records.length, 0);
});
