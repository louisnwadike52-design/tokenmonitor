import assert from "node:assert/strict";
import test from "node:test";
import { addUsage, emptyUsage, totalTokens } from "../src/usage.js";

test("emptyUsage is all zeros", () => {
  assert.deepEqual(emptyUsage(), {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  });
});

test("addUsage accumulates in place and tolerates missing/string values", () => {
  const target = emptyUsage();
  addUsage(target, { input: 10, output: 5 });
  addUsage(target, { input: "20", cacheRead: undefined });
  assert.equal(target.input, 30);
  assert.equal(target.output, 5);
  assert.equal(target.cacheRead, 0);
});

test("totalTokens sums every category", () => {
  assert.equal(
    totalTokens({ input: 1, output: 2, cacheRead: 3, cacheWrite5m: 4, cacheWrite1h: 5 }),
    15,
  );
});
