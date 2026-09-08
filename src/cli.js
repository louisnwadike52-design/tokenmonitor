import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { adapters } from "./adapters/index.js";
import { aggregate, totalsOf } from "./aggregate.js";
import { loadUserPricing, resolvePaths } from "./config.js";
import { costOf } from "./pricing.js";
import { renderReport } from "./report.js";

const COMMANDS = { summary: "tool-model", daily: "date", models: "model" };

const HELP = `tokenmonitor — token usage & estimated spend across AI coding CLIs

Usage: tokenmonitor [command] [options]

Commands:
  summary   usage grouped by tool and model (default)
  daily     usage grouped by day
  models    usage grouped by model

Options:
  --since <YYYY-MM-DD>  only include usage on or after this date
  --until <YYYY-MM-DD>  only include usage on or before this date
  --tool <name>         limit to one tool: ${adapters.map((a) => a.name).join(", ")}
  --json                machine-readable output
  --no-color            disable ANSI styling
  -h, --help            show this help
  -v, --version         show the version`;

const OPTIONS = {
  since: { type: "string" },
  until: { type: "string" },
  tool: { type: "string" },
  json: { type: "boolean" },
  "no-color": { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
};

export async function run(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    console.error(`${error.message}\nRun "tokenmonitor --help" for usage.`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) return print(HELP);
  if (values.version) return print(version());

  const groupBy = COMMANDS[positionals[0] ?? "summary"];
  const invalid = validate(values, positionals, groupBy);
  if (invalid) {
    console.error(`${invalid}\nRun "tokenmonitor --help" for usage.`);
    return 2;
  }

  const records = await collectRecords(values.tool, await loadUserPricing());
  const rows = aggregate(records, { ...values, groupBy });
  if (values.json) {
    return print(JSON.stringify({ rows, totals: totalsOf(rows) }, null, 2));
  }
  if (rows.length === 0) {
    return print("No usage found. Supported logs: " +
      adapters.map((a) => a.name).join(", ") + " (see README for locations).");
  }
  return print(renderReport(rows, totalsOf(rows), { groupBy, color: useColor(values) }));
}

async function collectRecords(tool, pricingOverrides) {
  const paths = resolvePaths();
  const records = [];
  const active = adapters.filter((a) => !tool || a.name === tool);
  await Promise.all(
    active.map(async (adapter) => {
      try {
        for await (const record of adapter.collect(paths)) {
          record.cost = costOf(record.model, record.usage, pricingOverrides);
          records.push(record);
        }
      } catch (error) {
        console.error(`warning: ${adapter.name} adapter failed: ${error.message}`);
      }
    }),
  );
  return records;
}

function validate(values, positionals, groupBy) {
  if (!groupBy) return `Unknown command "${positionals[0]}".`;
  if (positionals.length > 1) return `Unexpected argument "${positionals[1]}".`;
  for (const key of ["since", "until"]) {
    if (values[key] && !/^\d{4}-\d{2}-\d{2}$/.test(values[key])) {
      return `--${key} must be a YYYY-MM-DD date.`;
    }
  }
  if (values.tool && !adapters.some((a) => a.name === values.tool)) {
    return `Unknown tool "${values.tool}".`;
  }
  return null;
}

function useColor(values) {
  return !values["no-color"] && !process.env.NO_COLOR && process.stdout.isTTY === true;
}

function version() {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  return `tokenmonitor v${pkg.version}`;
}

function print(text) {
  console.log(text);
  return 0;
}
