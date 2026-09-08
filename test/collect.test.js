import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collectUsage } from "../src/collect.js";

const fx = (p) => fileURLToPath(new URL(`./fixtures/${p}`, import.meta.url));

test("collects and prices records from every adapter", async () => {
  const records = await collectUsage({
    paths: {
      claudeProjects: [fx("claude")],
      codexSessions: [fx("codex")],
      geminiDirs: [fx("gemini")],
    },
    pricing: {},
  });
  const tools = new Set(records.map((r) => r.tool));
  assert.deepEqual([...tools].sort(), ["claude", "codex", "gemini"]);
  // Every priced record carries a numeric cost; known models are all priced here.
  assert.ok(records.every((r) => typeof r.cost === "number"));
  assert.ok(records.every((r) => r.cost >= 0));
});

test("records with zero total tokens are dropped", async () => {
  const records = await collectUsage({
    paths: { claudeProjects: [fx("zero-usage")], codexSessions: [], geminiDirs: [] },
    pricing: {},
  });
  assert.equal(records.length, 0);
});

test("the tool filter limits collection to one adapter", async () => {
  const records = await collectUsage({
    tool: "codex",
    paths: {
      claudeProjects: [fx("claude")],
      codexSessions: [fx("codex")],
      geminiDirs: [fx("gemini")],
    },
    pricing: {},
  });
  assert.ok(records.length > 0);
  assert.ok(records.every((r) => r.tool === "codex"));
});

test("pricing overrides flow through to cost", async () => {
  const records = await collectUsage({
    tool: "gemini",
    paths: { claudeProjects: [], codexSessions: [], geminiDirs: [fx("gemini")] },
    pricing: { "gemini-2.5-pro": { input: 0, output: 0 } },
  });
  const pro = records.find((r) => r.model.startsWith("gemini-2.5-pro"));
  assert.ok(pro, "expected a gemini-2.5-pro record");
  assert.equal(pro.cost, 0); // zeroed by the override
});
