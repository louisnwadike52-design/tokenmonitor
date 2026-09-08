import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { adapters } from "./adapters/index.js";
import { aggregate, totalsOf } from "./aggregate.js";
import { collectUsage } from "./collect.js";
import { PLANS, planSummary } from "./plans.js";
import { renderPlanList, renderPlanSummary, renderReport } from "./report.js";

const GROUPS = { summary: "tool-model", daily: "date", models: "model" };
const TOOLS = adapters.map((a) => a.name).join(", ");
const PLAN_IDS = Object.keys(PLANS).join(", ");

const HELP = `tokenmonitor — token usage & estimated spend across AI coding CLIs

Usage: tokenmonitor [command] [options]

Commands:
  summary   usage grouped by tool and model (default)
  daily     usage grouped by day
  models    usage grouped by model
  plans     list known subscription plans

Options:
  --since <YYYY-MM-DD>  only include usage on or after this date
  --until <YYYY-MM-DD>  only include usage on or before this date
  --tool <name>         limit to one tool: ${TOOLS}
  --plan <id>           compare usage against a subscription plan (see: plans)
  --json                machine-readable output
  --no-color            disable ANSI styling
  -h, --help            show this help
  -v, --version         show the version

Cost is ESTIMATED at pay-as-you-go API list prices. On a subscription you pay a
flat fee instead — use --plan to see your usage against your plan.`;

const OPTIONS = {
  since: { type: "string" },
  until: { type: "string" },
  tool: { type: "string" },
  plan: { type: "string" },
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
    return fail(error.message);
  }
  const { values, positionals } = parsed;
  if (values.help) return print(HELP);
  if (values.version) return print(version());
  if (positionals[0] === "plans") return print(renderPlanList(PLANS));

  const groupBy = GROUPS[positionals[0] ?? "summary"];
  const invalid = validate(values, positionals, groupBy);
  if (invalid) return fail(invalid);

  const records = await collectUsage({
    tool: values.tool,
    onWarn: (message) => console.error(`warning: ${message}`),
  });
  const rows = aggregate(records, { ...values, groupBy });
  const plan = values.plan ? PLANS[values.plan] : null;
  const summary = plan ? planSummary(records, plan, values) : null;

  if (values.json) {
    const payload = { rows, totals: totalsOf(rows) };
    if (plan) payload.plan = { id: values.plan, ...plan, ...summary };
    return print(JSON.stringify(payload, null, 2));
  }
  if (rows.length === 0) {
    return print(`No usage found. Supported tools: ${TOOLS} (see README for log locations).`);
  }
  let out = renderReport(rows, totalsOf(rows), { groupBy, color: useColor(values) });
  if (plan) out += `\n\n${renderPlanSummary(plan, summary)}`;
  return print(out);
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
    return `Unknown tool "${values.tool}". Valid: ${TOOLS}.`;
  }
  if (values.plan && !PLANS[values.plan]) {
    return `Unknown plan "${values.plan}". Valid: ${PLAN_IDS}.`;
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

function fail(message) {
  console.error(`${message}\nRun "tokenmonitor --help" for usage.`);
  return 2;
}

function print(text) {
  console.log(text);
  return 0;
}
