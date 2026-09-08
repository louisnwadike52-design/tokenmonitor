import assert from "node:assert/strict";
import test from "node:test";
import { formatCost, renderReport } from "../src/report.js";

const usage = { input: 1500, output: 200, cacheRead: 10000, cacheWrite5m: 300, cacheWrite1h: 0 };
const rows = [
  { tool: "claude", model: "claude-opus-5", usage, cost: 1.2345, unpriced: false },
];
const totals = { usage, cost: 1.2345, unpriced: false };

test("renders an aligned table with headers, formatted numbers, and totals", () => {
  const out = renderReport(rows, totals, { groupBy: "tool-model", color: false });
  assert.match(out, /Tool\s+Model\s+Input\s+Output\s+Cache Read\s+Cache Write\s+Total\s+Est\. Cost/);
  assert.match(out, /claude\s+claude-opus-5/);
  assert.match(out, /1,500/);
  assert.match(out, /12,000/); // total tokens
  assert.match(out, /\$1\.23/);
  assert.match(out, /TOTAL/);
  assert.doesNotMatch(out, /\x1b\[/); // no ANSI when color is off
});

test("adds a footnote when totals include unpriced usage", () => {
  const flagged = { ...totals, unpriced: true };
  const out = renderReport(rows, flagged, { groupBy: "tool-model", color: false });
  assert.match(out, /\* excludes usage from models with no pricing data/);
});

test("formatCost covers unpriced, starred, and large values", () => {
  assert.equal(formatCost({ cost: 0, unpriced: true }), "—");
  assert.equal(formatCost({ cost: 3.5, unpriced: true }), "$3.50*");
  assert.equal(formatCost({ cost: 5000, unpriced: false }), "$5,000");
});
