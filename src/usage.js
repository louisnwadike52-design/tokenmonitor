/**
 * The normalized usage shape every adapter produces. Cache-write tokens are
 * split by TTL because Anthropic bills 5-minute and 1-hour cache writes at
 * different rates; adapters for vendors without write premiums leave both at 0.
 */
export function emptyUsage() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };
}

/** Adds `extra` into `target` in place and returns `target`. */
export function addUsage(target, extra) {
  for (const key of Object.keys(target)) target[key] += extra[key] ?? 0;
  return target;
}

export function totalTokens(usage) {
  return (
    usage.input +
    usage.output +
    usage.cacheRead +
    usage.cacheWrite5m +
    usage.cacheWrite1h
  );
}
