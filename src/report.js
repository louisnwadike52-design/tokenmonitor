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
  const totalRow = columns.map((c, i) =>
    i === 0 ? "TOTAL" : c.left ? "" : c.get(totals),
  );
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
  ];
  if (totals.unpriced) {
    lines.push("", "* excludes usage from models with no pricing data");
  }
  return lines.join("\n");
}

function renderLine(cells, columns, widths) {
  return cells
    .map((cell, i) =>
      columns[i].left ? cell.padEnd(widths[i]) : cell.padStart(widths[i]),
    )
    .join("  ")
    .trimEnd();
}
