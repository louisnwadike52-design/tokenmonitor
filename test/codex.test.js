import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { codex } from "../src/adapters/codex.js";
import { addUsage, emptyUsage } from "../src/usage.js";

const fixtures = fileURLToPath(new URL("./fixtures/codex", import.meta.url));
const dupes = fileURLToPath(new URL("./fixtures/codex-dupes", import.meta.url));

async function collectFrom(dir) {
  const records = [];
  for await (const r of codex.collect({ codexSessions: [dir] })) records.push(r);
  return records;
}

const sumUsage = (records) => records.reduce((acc, r) => addUsage(acc, r.usage), emptyUsage());

test("derives per-event usage by diffing cumulative totals, splitting cached input out", async () => {
  const records = (await collectFrom(fixtures)).filter((r) => r.model === "gpt-5-codex");
  assert.equal(records.length, 2);
  assert.deepEqual(records[0].usage, {
    input: 600, // (1000 − 0 prev) input, minus 400 cached
    output: 200,
    cacheRead: 400,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
  assert.equal(records[0].date, "2026-09-01");
  assert.deepEqual(records[1].usage, {
    input: 500, // (3000 − 1000) input delta, minus (1900 − 400) cached delta
    output: 100,
    cacheRead: 1500,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
  assert.equal(records[1].date, "2026-09-02");
});

test("cumulative-only files are diffed, not summed — totals reconcile exactly", async () => {
  const records = (await collectFrom(fixtures)).filter((r) => r.model === "gpt-5");
  // Snapshots 1000 then 5000 input → per-event deltas that sum to the final
  // cumulative, never the sum of the snapshots (which would be 6000).
  assert.deepEqual(sumUsage(records), {
    input: 3000, // 5000 total input − 2000 cached
    output: 800,
    cacheRead: 2000,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
});

test("duplicate/repeated cumulative snapshots are never double-counted", async () => {
  // Snapshots: 1000, 1000 (duplicate), 3000. The duplicate must contribute zero.
  const records = await collectFrom(dupes);
  assert.deepEqual(sumUsage(records), {
    input: 2500, // 3000 total input − 500 cached; the repeated 1000 adds nothing
    output: 300,
    cacheRead: 500,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
});
