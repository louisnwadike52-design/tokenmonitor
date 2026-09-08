import assert from "node:assert/strict";
import test from "node:test";
import { aggregate, totalsOf } from "../src/aggregate.js";

const usage = (input, output) => ({ input, output, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 });

const records = [
  { tool: "claude", model: "claude-opus-5", date: "2026-09-01", usage: usage(100, 10), cost: 1 },
  { tool: "claude", model: "claude-opus-5", date: "2026-09-02", usage: usage(200, 20), cost: 2 },
  { tool: "codex", model: "gpt-5", date: "2026-09-02", usage: usage(50, 5), cost: 0.5 },
  { tool: "codex", model: "mystery", date: "2026-09-03", usage: usage(9, 9), cost: null },
];

test("groups by tool+model, summing usage and cost", () => {
  const rows = aggregate(records, { groupBy: "tool-model" });
  assert.equal(rows.length, 3);
  const opus = rows.find((r) => r.model === "claude-opus-5");
  assert.equal(opus.usage.input, 300);
  assert.equal(opus.cost, 3);
  assert.equal(opus.unpriced, false);
});

test("marks rows containing unpriced records", () => {
  const rows = aggregate(records, { groupBy: "tool-model" });
  const mystery = rows.find((r) => r.model === "mystery");
  assert.equal(mystery.unpriced, true);
  assert.equal(mystery.cost, 0);
});

test("groups by date across tools, sorted ascending", () => {
  const rows = aggregate(records, { groupBy: "date" });
  assert.deepEqual(rows.map((r) => r.date), ["2026-09-01", "2026-09-02", "2026-09-03"]);
  const sep2 = rows.find((r) => r.date === "2026-09-02");
  assert.equal(sep2.usage.input, 250); // claude 200 + codex 50
  assert.equal(sep2.cost, 2.5);
});

test("applies since/until/tool filters", () => {
  const rows = aggregate(records, { groupBy: "date", since: "2026-09-02", until: "2026-09-02" });
  assert.deepEqual(rows.map((r) => r.date), ["2026-09-02"]);
  const codexOnly = aggregate(records, { groupBy: "tool-model", tool: "codex" });
  assert.equal(codexOnly.length, 2);
  assert.ok(codexOnly.every((r) => r.tool === "codex"));
});

test("totalsOf sums rows and propagates the unpriced flag", () => {
  const rows = aggregate(records, { groupBy: "tool-model" });
  const totals = totalsOf(rows);
  assert.equal(totals.usage.input, 359);
  assert.equal(totals.cost, 3.5);
  assert.equal(totals.unpriced, true);
});
