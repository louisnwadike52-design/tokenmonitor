import { totalTokens } from "./usage.js";

const INT = new Intl.NumberFormat("en-US");

const LABEL_COLUMNS = {
  "tool-model": [
    { header: "Tool", get: (r) => r.tool, left: true },
    { header: "Model", get: (r) => r.model, left: true },
  ],
  date: [{ header: "Date", get: (r) => r.date, left: true }],
  model: [
    { header: "Model", get: (r) => r.model, left: true },
    { header: "Tool", get: (r) => r.tool, left: true },
  ],
};

const USAGE_COLUMNS = [
  { header: "Input", get: (r) => INT.format(r.usage.input) },
  { header: "Output", get: (r) => INT.format(r.usage.output) },
  { header: "Cache Read", get: (r) => INT.format(r.usage.cacheRead) },
  { header: "Cache Write", get: (r) => INT.format(r.usage.cacheWrite5m + r.usage.cacheWrite1h) },
  { header: "Total", get: (r) => INT.format(totalTokens(r.usage)) },
  { header: "Est. Cost", get: (r) => formatCost(r) },
];

const COST_NOTE =
  "Est. Cost = pay-as-you-go API list price. On a subscription you pay a flat fee, not this — run \"tokenmonitor plans\" or pass --plan.";

export function money(value) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCost(row) {
  if (row.cost === 0 && row.unpriced) return "—";
  const digits = row.cost >= 1000 ? 0 : 2;
  const value = row.cost.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `$${value}${row.unpriced ? "*" : ""}`;
}

/** Renders rows plus a totals line as an aligned terminal table. */
export function renderReport(rows, totals, { groupBy, color = false }) {
  const columns = [...LABEL_COLUMNS[groupBy], ...USAGE_COLUMNS];
  const header = columns.map((c) => c.header);
  const body = rows.map((row) => columns.map((c) => c.get(row) ?? ""));
  const totalRow = columns.map((c, i) => (i === 0 ? "TOTAL" : c.left ? "" : c.get(totals)));
  const widths = header.map((_, i) =>
    Math.max(...[header, ...body, [totalRow[i]]].map((cells) => (cells[i] ?? "").length)),
  );
  const style = (text) => (color ? `\x1b[1m${text}\x1b[0m` : text);
  const divider = widths.map((w) => "─".repeat(w)).join("──");
  const lines = [
    style(renderLine(header, columns, widths)),
    divider,
    ...body.map((cells) => renderLine(cells, columns, widths)),
    divider,
    style(renderLine(totalRow, columns, widths)),
    "",
    COST_NOTE,
  ];
  if (totals.unpriced) lines.push("* excludes usage from models with no pricing data");
  return lines.join("\n");
}

/** Renders a subscription comparison block below the table. */
export function renderPlanSummary(plan, s) {
  if (s.count === 0) return `Subscription check — ${plan.label}: no ${plan.tool} usage in range.`;
  const star = s.unpriced ? "*" : "";
  return [
    `Subscription check — ${plan.label}`,
    `  Plan fee:         ${money(plan.usdPerMonth)}/mo × ${s.months} mo = ${money(s.fee)}`,
    `  API-equivalent:   ${money(s.api)}${star}  (${plan.tool} usage)`,
    `  Effective value:  ${s.ratio.toFixed(1)}× your subscription`,
    s.ratio >= 1
      ? "  → Your plan covers this; the same usage would cost more at API rates."
      : "  → This usage would cost less than your plan fee at API rates.",
  ].join("\n");
}

/** Renders the reference list of known subscription plans. */
export function renderPlanList(plans) {
  const rows = Object.entries(plans).map(([id, p]) => [id, p.label, p.tool, `${money(p.usdPerMonth)}/mo`]);
  const header = ["Plan ID", "Name", "Tool", "Price"];
  const widths = header.map((_, i) => Math.max(...[header, ...rows].map((r) => r[i].length)));
  const line = (cells) =>
    cells.map((c, i) => (i === 3 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join("  ").trimEnd();
  return [line(header), widths.map((w) => "─".repeat(w)).join("──"), ...rows.map(line)].join("\n");
}

function renderLine(cells, columns, widths) {
  return cells
    .map((cell, i) => (columns[i].left ? cell.padEnd(widths[i]) : cell.padStart(widths[i])))
    .join("  ")
    .trimEnd();
}
