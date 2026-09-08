import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../src/index.js";

test("public API surface is stable", () => {
  const expected = [
    "adapters",
    "collectUsage",
    "aggregate",
    "totalsOf",
    "resolvePaths",
    "loadUserPricing",
    "PRICING",
    "costOf",
    "resolvePricing",
    "normalizeModel",
    "PLANS",
    "planSummary",
    "renderReport",
    "renderPlanSummary",
    "renderPlanList",
    "formatCost",
    "emptyUsage",
    "addUsage",
    "totalTokens",
  ];
  for (const name of expected) assert.ok(name in api, `missing export: ${name}`);
});

test("the pipeline is usable end to end from the library API", () => {
  const usage = { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };
  const cost = api.costOf("claude-opus-5", usage);
  const records = [{ tool: "claude", model: "claude-opus-5", date: "2026-09-01", usage, cost }];
  const rows = api.aggregate(records, { groupBy: "tool-model" });
  const totals = api.totalsOf(rows);
  assert.equal(totals.cost, 5); // $5/M input
  assert.match(api.renderReport(rows, totals, { groupBy: "tool-model" }), /claude-opus-5/);
});
