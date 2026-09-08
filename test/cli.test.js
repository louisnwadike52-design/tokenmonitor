import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/tokenmonitor.js", import.meta.url));
const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));

// Point every adapter at the fixture tree so tests never read real logs.
const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: `${fixtures}/claude-home`,
  CODEX_HOME: `${fixtures}/codex-home`,
  GEMINI_DIR: `${fixtures}/gemini`,
  TOKENMONITOR_PRICING: `${fixtures}/no-such-pricing.json`,
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

test("unknown commands and flags exit 2 with guidance", () => {
  assert.equal(cli("bogus").status, 2);
  assert.equal(cli("--bogus").status, 2);
  assert.match(cli("bogus").stderr, /--help/);
});

test("invalid dates and tools are rejected", () => {
  assert.equal(cli("--since", "yesterday").status, 2);
  assert.equal(cli("--tool", "copilot").status, 2);
});

test("--json reports fixture usage end to end", () => {
  const { status, stdout } = cli("daily", "--json", "--tool", "gemini");
  assert.equal(status, 0);
  const report = JSON.parse(stdout);
  assert.equal(report.rows.length, 2);
  assert.equal(report.totals.usage.cacheRead, 1230);
});
