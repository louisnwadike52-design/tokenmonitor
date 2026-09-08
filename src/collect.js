import { adapters } from "./adapters/index.js";
import { loadUserPricing, resolvePaths } from "./config.js";
import { costOf } from "./pricing.js";
import { totalTokens } from "./usage.js";

/**
 * Runs every registered adapter (or just one), prices each usage record at
 * pay-as-you-go API list rates, and returns the flat list. This is the shared
 * data path behind both the CLI and the programmatic API (src/index.js).
 *
 * - Records with zero total tokens are dropped (no empty rows).
 * - `record.cost` is a number, or null when the model has no pricing data.
 * - One adapter throwing never sinks the others; failures go to `onWarn`.
 *
 * @param {object} [options]
 * @param {object} [options.paths]   Override log directories (see resolvePaths).
 * @param {object} [options.pricing] Pricing overrides merged over the defaults.
 * @param {string} [options.tool]    Limit collection to a single adapter.
 * @param {(message: string) => void} [options.onWarn] Adapter-failure sink.
 * @returns {Promise<Array>} priced usage records
 */
export async function collectUsage(options = {}) {
  const paths = options.paths ?? resolvePaths();
  const overrides = options.pricing ?? (await loadUserPricing());
  const onWarn = options.onWarn ?? (() => {});
  const active = adapters.filter((a) => !options.tool || a.name === options.tool);
  const records = [];
  await Promise.all(
    active.map(async (adapter) => {
      try {
        for await (const record of adapter.collect(paths)) {
          if (totalTokens(record.usage) <= 0) continue;
          record.cost = costOf(record.model, record.usage, overrides);
          records.push(record);
        }
      } catch (error) {
        onWarn(`${adapter.name} adapter failed: ${error.message}`);
      }
    }),
  );
  return records;
}
