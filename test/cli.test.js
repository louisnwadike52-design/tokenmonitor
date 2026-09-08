import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/tokenmonitor.js", import.meta.url));
const home = fileURLToPath(new URL("./fixtures/home", import.meta.url));

// Point every adapter at the self-contained fake home so tests never touch the
// developer's real logs. CLAUDE_CONFIG_DIR must fully replace the default.
const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: `${home}/.claude`,
  CODEX_HOME: `${home}/.codex`,
  GEMINI_DIR: `${home}/.gemini`,
  TOKENMONITOR_PRICING: `${home}/no-such-pricing.json`,
  NO_COLOR: "1",
};

const cli = (...args) => spawnSync(process.execPath, [bin, ...args], { env, encoding: "utf8" });

test("--help exits 0 and prints usage", () => {
  const { status, stdout } = cli("--help");
  assert.equal(status, 0);
  assert.match(stdout, /Usage: tokenmonitor/);
});

test("--version exits 0 and prints the package version", () => {
  const { status, stdout } = cli("--version");
  assert.equal(status, 0);
  assert.match(stdout, /^tokenmonitor v\d+\.\d+\.\d+/);
});

test("unknown commands, flags, dates, tools, and plans exit 2", () => {
  assert.equal(cli("bogus").status, 2);
  assert.equal(cli("--bogus").status, 2);
  assert.equal(cli("--since", "yesterday").status, 2);
  assert.equal(cli("--tool", "copilot").status, 2);
  assert.equal(cli("--plan", "nope").status, 2);
});

test("summary reads all three tools from the fake home", () => {
  const { status, stdout } = cli("summary");
  assert.equal(status, 0);
  assert.match(stdout, /claude/);
  assert.match(stdout, /codex/);
  assert.match(stdout, /gemini/);
  assert.match(stdout, /pay-as-you-go API list price/);
});

test("plans lists subscription reference data", () => {
  const { status, stdout } = cli("plans");
  assert.equal(status, 0);
  assert.match(stdout, /claude-max-20x/);
});

test("--json emits rows and totals", () => {
  const { status, stdout } = cli("daily", "--json", "--tool", "gemini");
  assert.equal(status, 0);
  const report = JSON.parse(stdout);
  assert.equal(report.rows.length, 1);
  assert.equal(report.totals.usage.cacheRead, 100);
});

test("--plan attaches a subscription comparison to JSON and text", () => {
  const json = JSON.parse(cli("--json", "--plan", "claude-max-20x").stdout);
  assert.equal(json.plan.id, "claude-max-20x");
  assert.equal(json.plan.usdPerMonth, 200);
  assert.equal(json.plan.months, 1); // both fixture dates fall in 2026-09
  assert.ok(json.plan.api > 0);

  const text = cli("--plan", "claude-max-20x").stdout;
  assert.match(text, /Subscription check — Claude Max 20x/);
  assert.match(text, /Effective value/);
});
