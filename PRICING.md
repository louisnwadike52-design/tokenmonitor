# Pricing & methodology

This document explains **exactly** how `tokenmonitor` counts tokens and estimates
cost, and lists the prices it ships with and where they come from. The guiding
rule is **no guesses**: every token is read from a real log field, and any model
without a known price is shown as `—` rather than estimated.

## Token counting

`tokenmonitor` never infers or samples token counts — it reads the exact fields
each tool records, and de-duplicates so nothing is counted twice.

| Tool | Source fields | Notes |
| --- | --- | --- |
| **Claude Code** | `message.usage.{input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens}` and `cache_creation.{ephemeral_5m_input_tokens, ephemeral_1h_input_tokens}` | The four input categories don't overlap (`total_input = input + cache_read + cache_creation`). Records are de-duplicated on `message.id` + `requestId`, so resumed sessions written to multiple files are counted once. |
| **Codex CLI** | `token_count` events → `info.last_token_usage.{input_tokens, cached_input_tokens, output_tokens}` | Per-request deltas are summed; a file with only cumulative totals falls back to its final `total_token_usage`. `input` is reported net of `cached_input_tokens`; `output` includes reasoning tokens. |
| **Gemini CLI** | session metrics `tokens.{prompt, candidates, cached, thoughts}` and API `usageMetadata.{promptTokenCount, candidatesTokenCount, cachedContentTokenCount, thoughtsTokenCount}` | `input` is net of cached; thinking (`thoughts`) tokens count as output. Best-effort across Gemini's varying on-disk formats. |

This matches the methodology of [ccusage](https://ccusage.com/guide/cost-modes), the
established Claude Code cost tool.

## Cost estimation

Cost is computed at **pay-as-you-go API list prices**:

```
input×Pin + output×Pout + cacheRead×Pin×0.1 + cacheWrite5m×Pin×1.25 + cacheWrite1h×Pin×2
```

- **Cache multipliers (Anthropic):** cache read = 0.1× input; 5-minute cache write
  = 1.25× input; 1-hour cache write = 2× input. When a Claude log omits the TTL
  split, the whole `cache_creation` total is priced at the 5-minute (1.25×) rate —
  the same fallback ccusage uses.
- **Cached input (OpenAI, Gemini):** billed at a fraction of the input rate
  (OpenAI 0.1×, Gemini implicit-cache reads 0.25×).
- **Unknown models cost `null`** (rendered `—` and footnoted). Tokens are still
  counted; the cost is never fabricated.
- **Not included:** per-request server-tool surcharges (e.g. web search). These are
  usually negligible and are deliberately omitted rather than estimated.

### What the cost number means

If you pay per token via the **API**, this approximates your bill. If you're on a
**subscription** (Claude Pro/Max, ChatGPT Plus/Pro, Google AI Pro/Ultra), you pay a
flat monthly fee and this figure is the *pay-as-you-go equivalent* — i.e. how much
your usage would have cost without the plan. Use `--plan <id>` to compare the two.

## API prices (USD per 1,000,000 tokens)

Shipped in [`src/pricing.js`](src/pricing.js); lookup is longest-prefix match on the
normalized model id. Representative rows (see the file for the full table):

| Model | Input | Output |
| --- | --- | --- |
| claude-opus-5 / 4.8 / 4.7 / 4.6 | $5 | $25 |
| claude-fable-5 | $10 | $50 |
| claude-sonnet-5 / 4.x | $3 | $15 |
| claude-haiku-4-5 | $1 | $5 |
| gpt-5 / gpt-5-codex | $1.25 | $10 |
| gpt-5.3-codex | $1.75 | $14 |
| gemini-2.5-pro | $1.25 | $10 |
| gemini-2.5-flash | $0.30 | $2.50 |
| gemini-2.5-flash-lite | $0.10 | $0.40 |

Sources: Anthropic — [Claude API pricing](https://benchlm.ai/anthropic/api-pricing);
OpenAI — [pricepertoken](https://pricepertoken.com/pricing-page/model/openai-gpt-5-codex);
Google — [Gemini pricing](https://www.cloudzero.com/blog/gemini-pricing/) (all September 2026).

## Subscription plans (USD per month)

Shipped in [`src/plans.js`](src/plans.js):

| Plan ID | Plan | Tool | Price |
| --- | --- | --- | --- |
| claude-pro | Claude Pro | claude | $20 |
| claude-max-5x | Claude Max 5x | claude | $100 |
| claude-max-20x | Claude Max 20x | claude | $200 |
| chatgpt-plus | ChatGPT Plus | codex | $20 |
| chatgpt-pro-5x | ChatGPT Pro (5x) | codex | $100 |
| chatgpt-pro | ChatGPT Pro (20x) | codex | $200 |
| gemini-pro | Google AI Pro | gemini | $19.99 |
| gemini-ultra-5x | Google AI Ultra (5x) | gemini | $99.99 |
| gemini-ultra | Google AI Ultra (20x) | gemini | $199.99 |

Sources: [Claude plans](https://intuitionlabs.ai/articles/claude-pricing-plans-api-costs),
[ChatGPT plans](https://intuitionlabs.ai/articles/chatgpt-plans-comparison),
[Google AI plans](https://blog.google/products-and-platforms/products/google-one/google-ai-subscriptions/)
(September 2026). Prices vary by region/currency (e.g. Claude Max is ~£90 / ~£180 in the UK).

## Overriding prices

The built-in tables are estimates and change over time. Override them without
touching the source: create `~/.config/tokenmonitor/pricing.json` (or point
`$TOKENMONITOR_PRICING` at a file). Keys are model-id prefixes; values are USD per
million tokens with optional `cacheRead`, `cacheWrite5m`, `cacheWrite1h`:

```json
{ "claude-opus-5": { "input": 4.5, "output": 22.5 } }
```

Corrections and price-update PRs to `src/pricing.js` / `src/plans.js` are welcome —
please cite the vendor page.
