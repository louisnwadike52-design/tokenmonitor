import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gemini } from "../src/adapters/gemini.js";

const fixtures = fileURLToPath(new URL("./fixtures/gemini", import.meta.url));

async function collect() {
  const records = [];
  for await (const r of gemini.collect({ geminiDirs: [fixtures] })) records.push(r);
  return records;
}

test("extracts session-metrics tokens keyed by model id", async () => {
  const records = await collect();
  const pro = records.find((r) => r.model === "gemini-2.5-pro");
  assert.deepEqual(pro, {
    tool: "gemini",
    model: "gemini-2.5-pro",
    date: "2026-09-03",
    usage: {
      input: 3800, // 5000 prompt − 1200 cached
      output: 1200, // 900 candidates + 300 thoughts
      cacheRead: 1200,
      cacheWrite5m: 0,
      cacheWrite1h: 0,
    },
  });
});

test("extracts API usageMetadata from chat transcripts", async () => {
  const records = await collect();
  const flash = records.find((r) => r.model === "gemini-2.5-flash");
  assert.deepEqual(flash, {
    tool: "gemini",
    model: "gemini-2.5-flash",
    date: "2026-09-04",
    usage: { input: 70, output: 25, cacheRead: 30, cacheWrite5m: 0, cacheWrite1h: 0 },
  });
});

test("emits nothing else from the fixture tree", async () => {
  assert.equal((await collect()).length, 2);
});
