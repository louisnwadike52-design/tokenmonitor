import assert from "node:assert/strict";
import test from "node:test";
import { costOf, normalizeModel, resolvePricing } from "../src/pricing.js";

const oneOfEach = {
  input: 1e6,
  output: 1e6,
  cacheRead: 1e6,
  cacheWrite5m: 1e6,
  cacheWrite1h: 1e6,
};
const inputOnly = { input: 1e6, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

test("applies anthropic cache read/write multipliers", () => {
  // 5 + 25 + 0.5 (read ×0.1) + 6.25 (5m ×1.25) + 10 (1h ×2)
  assert.equal(costOf("claude-opus-4-8", oneOfEach), 46.75);
});

test("longest-prefix match resolves date-suffixed and versioned ids", () => {
  assert.equal(costOf("claude-opus-4-5-20251101", inputOnly), 5);
  assert.equal(costOf("claude-opus-4-1-20250805", inputOnly), 15); // base opus-4 rate
  assert.equal(costOf("gpt-5-codex", inputOnly), 1.25);
  assert.equal(costOf("gpt-5-mini-2026-01-01", inputOnly), 0.25); // not base gpt-5
});

test("normalizes provider prefixes", () => {
  assert.equal(normalizeModel("models/gemini-2.5-pro"), "gemini-2.5-pro");
  assert.equal(normalizeModel("anthropic.claude-opus-5"), "claude-opus-5");
  assert.equal(normalizeModel("us.anthropic.claude-opus-4-6"), "claude-opus-4-6");
});

test("unknown models cost null instead of a wrong guess", () => {
  assert.equal(resolvePricing("mystery-model-9000"), null);
  assert.equal(costOf("mystery-model-9000", oneOfEach), null);
});

test("user overrides beat the built-in table", () => {
  const overrides = { "mystery-model": { input: 1, output: 2 } };
  assert.equal(costOf("mystery-model-9000", inputOnly, overrides), 1);
  assert.equal(costOf("claude-opus-4-8", inputOnly, { "claude-opus-4-8": { input: 9, output: 9 } }), 9);
});

test("sibling model ids do not inherit a prefix model's price", () => {
  // o3-pro is a real, separately priced model ($20/$80 per OpenAI's pricing
  // page, vs o3's $2/$8). It must resolve to null rather than silently
  // inheriting o3's rate — a 10x undercount.
  assert.equal(resolvePricing("o3-pro"), null);
  assert.equal(costOf("o3-pro", inputOnly), null);
});
