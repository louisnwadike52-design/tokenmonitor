/**
 * Subscription reference data — flat monthly list prices in USD, current as of
 * 2026-09. Claude Code / Codex / Gemini CLI users are typically on one of these
 * plans rather than paying per token, so the "actual cost" of their usage is
 * this flat fee, not the API-equivalent figure. These are published consumer
 * prices (see PRICING.md for sources); update by PR when they change.
 *
 * `tool` links a plan to the adapter whose usage it covers.
 */
export const PLANS = {
  "claude-pro": { label: "Claude Pro", tool: "claude", usdPerMonth: 20 },
  "claude-max-5x": { label: "Claude Max 5x", tool: "claude", usdPerMonth: 100 },
  "claude-max-20x": { label: "Claude Max 20x", tool: "claude", usdPerMonth: 200 },
  "chatgpt-plus": { label: "ChatGPT Plus", tool: "codex", usdPerMonth: 20 },
  "chatgpt-pro-5x": { label: "ChatGPT Pro (5x)", tool: "codex", usdPerMonth: 100 },
  "chatgpt-pro": { label: "ChatGPT Pro (20x)", tool: "codex", usdPerMonth: 200 },
  "gemini-pro": { label: "Google AI Pro", tool: "gemini", usdPerMonth: 19.99 },
  "gemini-ultra-5x": { label: "Google AI Ultra (5x)", tool: "gemini", usdPerMonth: 99.99 },
  "gemini-ultra": { label: "Google AI Ultra (20x)", tool: "gemini", usdPerMonth: 199.99 },
};

/**
 * Compares real usage against a subscription plan. Sums the API-equivalent cost
 * of the plan's tool over the date range, counts the distinct calendar months
 * that actually have usage, and reports the flat fee for those months plus the
 * "effective value" multiple (API-equivalent ÷ fee).
 */
export function planSummary(records, plan, options = {}) {
  const { since, until } = options;
  const months = new Set();
  let api = 0;
  let count = 0;
  let unpriced = false;
  for (const record of records) {
    if (record.tool !== plan.tool) continue;
    if (since && record.date < since) continue;
    if (until && record.date > until) continue;
    count += 1;
    months.add(record.date.slice(0, 7));
    if (record.cost === null) unpriced = true;
    else api += record.cost;
  }
  const monthCount = count > 0 ? months.size : 0;
  const fee = plan.usdPerMonth * monthCount;
  return { months: monthCount, fee, api, unpriced, count, ratio: fee > 0 ? api / fee : 0 };
}
