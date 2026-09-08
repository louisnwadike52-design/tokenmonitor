/**
 * Prices in USD per 1,000,000 tokens — published API list prices, current as of
 * 2026-09 (sources in PRICING.md). This is the pay-as-you-go rate; subscription
 * users pay a flat fee instead (see src/plans.js). Update by PR when prices
 * change — cite the vendor page in the PR.
 *
 * Lookup is longest-prefix match on the normalized model id, so date-suffixed
 * ids resolve naturally ("claude-opus-4-5-20251101" matches "claude-opus-4-5").
 * Unknown models cost `null` — tokens are still counted, never mispriced.
 *
 * Vendor cache billing baked into the helpers (matches ccusage's methodology):
 *   anthropic: cache read ×0.1, cache write ×1.25 (5m TTL) / ×2 (1h TTL)
 *   openai:    cached input ×0.1, no write premium
 *   google:    implicit-cache reads ×0.25, no write premium
 */
const anthropic = (input, output) => ({
  input,
  output,
  cacheRead: input * 0.1,
  cacheWrite5m: input * 1.25,
  cacheWrite1h: input * 2,
});
const openai = (input, output) => ({ input, output, cacheRead: input * 0.1 });
const google = (input, output) => ({ input, output, cacheRead: input * 0.25 });

export const PRICING = {
  // Anthropic
  "claude-fable-5": anthropic(10, 50),
  "claude-mythos-5": anthropic(10, 50),
  "claude-opus-5": anthropic(5, 25),
  "claude-opus-4-8": anthropic(5, 25),
  "claude-opus-4-7": anthropic(5, 25),
  "claude-opus-4-6": anthropic(5, 25),
  "claude-opus-4-5": anthropic(5, 25),
  "claude-opus-4": anthropic(15, 75), // Opus 4.0 / 4.1
  "claude-3-opus": anthropic(15, 75),
  "claude-sonnet-5": anthropic(3, 15),
  "claude-sonnet-4": anthropic(3, 15),
  "claude-3-7-sonnet": anthropic(3, 15),
  "claude-3-5-sonnet": anthropic(3, 15),
  "claude-haiku-4-5": anthropic(1, 5),
  "claude-3-5-haiku": anthropic(0.8, 4),
  "claude-3-haiku": anthropic(0.25, 1.25),
  // OpenAI
  "gpt-6": openai(10, 50),
  "gpt-5.3-codex": openai(1.75, 14),
  "gpt-5-codex": openai(1.25, 10),
  "gpt-5.1": openai(1.25, 10),
  "gpt-5-mini": openai(0.25, 2),
  "gpt-5-nano": openai(0.05, 0.4),
  "gpt-5": openai(1.25, 10),
  "gpt-4.1-mini": openai(0.4, 1.6),
  "gpt-4.1-nano": openai(0.1, 0.4),
  "gpt-4.1": openai(2, 8),
  "gpt-4o-mini": openai(0.15, 0.6),
  "gpt-4o": openai(2.5, 10),
  "o3-mini": openai(1.1, 4.4),
  "o3": openai(2, 8),
  "o4-mini": openai(1.1, 4.4),
  "codex-mini": openai(1.5, 6),
  // Google
  "gemini-3.1-pro": google(2, 12),
  "gemini-3-pro": google(2, 12),
  "gemini-2.5-pro": google(1.25, 10),
  "gemini-2.5-flash-lite": google(0.1, 0.4),
  "gemini-2.5-flash": google(0.3, 2.5),
  "gemini-2.0-flash": google(0.1, 0.4),
};

/** Strips provider prefixes ("models/", "anthropic.", …) and lowercases. */
export function normalizeModel(model) {
  return String(model)
    .toLowerCase()
    .replace(/^models\//, "")
    .replace(/^(us\.|eu\.)?(anthropic|openai|google)[./]/, "");
}

/** Longest-prefix match against PRICING merged with `overrides`; null if none. */
export function resolvePricing(model, overrides = {}) {
  const id = normalizeModel(model);
  const table = { ...PRICING, ...overrides };
  let best = null;
  for (const prefix of Object.keys(table)) {
    if (id.startsWith(prefix) && (best === null || prefix.length > best.length)) {
      best = prefix;
    }
  }
  return best === null ? null : table[best];
}

/** Estimated cost in USD for one usage record, or null for unpriced models. */
export function costOf(model, usage, overrides = {}) {
  const price = resolvePricing(model, overrides);
  if (!price) return null;
  return (
    (usage.input * price.input +
      usage.output * price.output +
      usage.cacheRead * (price.cacheRead ?? price.input * 0.1) +
      usage.cacheWrite5m * (price.cacheWrite5m ?? 0) +
      usage.cacheWrite1h * (price.cacheWrite1h ?? 0)) /
    1e6
  );
}
