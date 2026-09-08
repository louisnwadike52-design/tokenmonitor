import assert from "node:assert/strict";
import test from "node:test";
import { PLANS, planSummary } from "../src/plans.js";

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };
const records = [
  { tool: "claude", model: "claude-opus-5", date: "2026-07-15", usage, cost: 100 },
  { tool: "claude", model: "claude-opus-5", date: "2026-08-10", usage, cost: 200 },
  { tool: "claude", model: "claude-opus-5", date: "2026-08-20", usage, cost: 300 },
  { tool: "codex", model: "gpt-5", date: "2026-08-01", usage, cost: 50 },
  { tool: "claude", model: "mystery", date: "2026-08-25", usage, cost: null },
];

test("known plans expose a label, tool, and monthly price", () => {
  assert.equal(PLANS["claude-max-20x"].usdPerMonth, 200);
  assert.equal(PLANS["claude-max-20x"].tool, "claude");
});

test("summary counts distinct months and computes the value multiple", () => {
  const s = planSummary(records, PLANS["claude-max-20x"]);
  assert.equal(s.months, 2); // July + August
  assert.equal(s.fee, 400); // $200 × 2 months
  assert.equal(s.api, 600); // 100 + 200 + 300 (claude only; codex excluded)
  assert.equal(s.ratio, 1.5);
  assert.equal(s.unpriced, true); // the mystery-model record is unpriced
});

test("date filters scope the comparison", () => {
  const s = planSummary(records, PLANS["claude-max-20x"], { since: "2026-08-01" });
  assert.equal(s.months, 1);
  assert.equal(s.api, 500);
});

test("no matching usage yields a zero summary", () => {
  const s = planSummary(records, PLANS["gemini-pro"]);
  assert.equal(s.count, 0);
  assert.equal(s.fee, 0);
  assert.equal(s.ratio, 0);
});
