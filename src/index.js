/**
 * Programmatic API. Consume tokenmonitor as a library:
 *
 *   import { collectUsage, aggregate, totalsOf } from "tokenmonitor";
 *   const records = await collectUsage();               // priced usage records
 *   const rows = aggregate(records, { groupBy: "date" });
 *   console.log(totalsOf(rows));
 *
 * Every export is documented at its definition site.
 */
export { adapters } from "./adapters/index.js";
export { collectUsage } from "./collect.js";
export { aggregate, totalsOf } from "./aggregate.js";
export { resolvePaths, loadUserPricing } from "./config.js";
export { PRICING, costOf, resolvePricing, normalizeModel } from "./pricing.js";
export { PLANS, planSummary } from "./plans.js";
export { renderReport, renderPlanSummary, renderPlanList, formatCost } from "./report.js";
export { emptyUsage, addUsage, totalTokens } from "./usage.js";
