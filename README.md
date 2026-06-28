# agentkit-algovault

> **The Brain Layer for AI Trading Agents** — AlgoVault's composite trade-call verdicts for [Coinbase AgentKit](https://github.com/coinbase/agentkit), **keyless free tier**, served over the AlgoVault MCP server.

`agentkit-algovault` gives any AgentKit agent native access to AlgoVault's signal-interpretation tools. It is a walletless, read-only [action provider](https://github.com/coinbase/agentkit/blob/master/CONTRIBUTING-TYPESCRIPT.md#adding-an-action-provider) that delegates to the AlgoVault MCP surface (`api.algovault.com/mcp`) over the [Model Context Protocol](https://modelcontextprotocol.io) — the scoring engine stays server-side and always current.

## Actions

| Action | Tool | Tier | What it returns |
|---|---|---|---|
| `get_trade_call` | `get_trade_call` | **Free** | Composite **BUY / SELL / HOLD** verdict for a crypto perp (or supported TradFi symbol), with confidence, market regime, funding, and reasoning. |
| `get_trade_signal` | `get_trade_signal` | **Free** | Alias of the trade call (kept for "give me a signal" phrasing). |
| `get_market_regime` | `get_market_regime` | Free* | Market-regime classification (trending / ranging / volatile) + cross-venue funding context. |
| `scan_funding_arb` | `scan_funding_arb` | Free* | Cross-venue funding-rate arbitrage opportunities, ranked by spread (free tier returns the top 5). |

<sub>*Available keyless on the free tier; an `ALGOVAULT_API_KEY` raises request limits.</sub>

The composite verdict aggregates indicators across exchanges. AlgoVault's PFE (peak-favourable-excursion) win-rate track record is published live at [algovault.com](https://algovault.com).

## Installation

```bash
npm install agentkit-algovault
```

`@coinbase/agentkit` is a peer dependency (bring your own version `>=0.10.0`):

```bash
npm install @coinbase/agentkit
```

## Usage

Add `algoVaultActionProvider()` to your agent's action providers — keyless, zero config:

```ts
import { AgentKit } from "@coinbase/agentkit";
import { algoVaultActionProvider } from "agentkit-algovault";

const agentKit = await AgentKit.from({
  walletProvider, // your existing wallet provider — AlgoVault itself needs no wallet
  actionProviders: [
    algoVaultActionProvider(), // keyless free tier (100 calls/month)
  ],
});
```

The actions are then available to your agent (e.g. via `getLangChainTools(agentKit)` or the Vercel AI SDK extension). Ask it `"AlgoVault trade call for BTC"` and it calls `get_trade_call` and returns the verdict.

## Configuration

**Keyless (free tier) — nothing to configure.** All four actions work without an API key (100 calls/month; `scan_funding_arb` returns the top 5).

**Optional — raise request limits / unlock paid tiers** with an API key, via config or env:

```ts
algoVaultActionProvider({ apiKey: process.env.ALGOVAULT_API_KEY });
```

| Variable | Required | Description |
|---|---|---|
| `ALGOVAULT_API_KEY` | No | Unlocks paid limits. Omit for the keyless free tier. Sent as `Authorization: Bearer`. |
| `ALGOVAULT_MCP_URL` | No | Override the MCP endpoint. Defaults to `https://api.algovault.com/mcp`. |

## How it works

```
AgentKit agent ──▶ algovault action provider ──▶ @modelcontextprotocol/sdk
                                                   (Streamable HTTP)
                                                         │
                                                         ▼
                                            api.algovault.com/mcp  ──▶ verdict
```

The provider holds no scoring logic. Each action forwards its arguments to the named MCP tool and returns the server's verdict. Structured AlgoVault errors (e.g. an out-of-universe symbol) surface their `suggested_*` guidance so the agent can self-correct.

## Staying in sync

The provider is a thin proxy, so its input schemas must track the live MCP tools. A version-sync canary fetches the live `tools/list` and asserts the four actions' fields still match the bundled schemas:

```bash
npm run check:schema          # exits non-zero on drift
npm run check:schema -- --simulate-drift   # proves the check fails on a mismatch
```

## Development

```bash
npm install
npm test          # 25 unit tests (provider, schemas, utils — MCP client mocked)
npm run build     # → dist/ (ESM + .d.ts)
npm run check:schema
```

## License

MIT

---

**Try it now:** `npm i agentkit-algovault` and add `algoVaultActionProvider()` to your agent — your first verdict is one keyless call away.

Built by **[AlgoVault Labs](https://algovault.com)** — composable, API-first signal-interpretation tools for AI agents.
