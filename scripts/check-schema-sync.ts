/**
 * Version-sync canary.
 *
 * agentkit-algovault is a thin proxy over the AlgoVault MCP server, so its
 * bundled zod input schemas must track the live tools. This script fetches the
 * live `tools/list` from api.algovault.com/mcp and asserts that the four
 * actions' field names + required set still match this package's schemas.
 * Exits non-zero on drift.
 *
 *   npm run check:schema
 *   npm run check:schema -- --simulate-drift   # prove the check fails on a mismatch
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { z } from "zod";
import {
  GetTradeCallSchema,
  GetTradeSignalSchema,
  GetMarketRegimeSchema,
  ScanFundingArbSchema,
} from "../src/schemas.js";
import { ALGOVAULT_MCP_URL, ALGOVAULT_CLIENT_INFO } from "../src/constants.js";

const SIMULATE_DRIFT = process.argv.includes("--simulate-drift");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PACKAGE_SCHEMAS: Record<string, z.ZodObject<any>> = {
  get_trade_call: GetTradeCallSchema,
  get_trade_signal: GetTradeSignalSchema,
  get_market_regime: GetMarketRegimeSchema,
  scan_funding_arb: ScanFundingArbSchema,
};

const sortJoin = (a: string[]): string => [...a].sort().join(", ");
const setEq = (a: string[], b: string[]): boolean => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/** Package-side field names + required (a field is required iff `undefined` fails to parse). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function packageShape(schema: z.ZodObject<any>): { fields: string[]; required: string[] } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape = schema.shape as Record<string, any>;
  const fields = Object.keys(shape);
  const required = fields.filter((k) => !shape[k].safeParse(undefined).success);
  return { fields, required };
}

async function liveTools(): Promise<Map<string, { fields: string[]; required: string[] }>> {
  const transport = new StreamableHTTPClientTransport(new URL(ALGOVAULT_MCP_URL));
  const client = new Client({ ...ALGOVAULT_CLIENT_INFO }, { capabilities: {} });
  const out = new Map<string, { fields: string[]; required: string[] }>();
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of tools as Array<{ name: string; inputSchema?: any }>) {
      const isc = t.inputSchema ?? {};
      out.set(t.name, {
        fields: Object.keys(isc.properties ?? {}),
        required: (isc.required ?? []) as string[],
      });
    }
  } finally {
    await client.close().catch(() => undefined);
  }
  return out;
}

async function main(): Promise<void> {
  const live = await liveTools();
  let drift = false;

  for (const [tool, schema] of Object.entries(PACKAGE_SCHEMAS)) {
    const pkg = packageShape(schema);
    if (SIMULATE_DRIFT && tool === "get_trade_call") {
      pkg.fields.push("__simulated_drift_field__");
    }
    const liveShape = live.get(tool);
    if (!liveShape) {
      console.error(`✗ ${tool}: NOT FOUND in live tools/list`);
      drift = true;
      continue;
    }
    const fieldsOk = setEq(pkg.fields, liveShape.fields);
    const requiredOk = setEq(pkg.required, liveShape.required);
    if (fieldsOk && requiredOk) {
      console.log(`✓ ${tool}: fields [${sortJoin(pkg.fields)}] · required [${sortJoin(pkg.required)}]`);
    } else {
      drift = true;
      console.error(`✗ ${tool}: DRIFT`);
      if (!fieldsOk) console.error(`    fields   pkg=[${sortJoin(pkg.fields)}]  live=[${sortJoin(liveShape.fields)}]`);
      if (!requiredOk) console.error(`    required pkg=[${sortJoin(pkg.required)}]  live=[${sortJoin(liveShape.required)}]`);
    }
  }

  if (drift) {
    console.error(
      "\nSchema drift detected — the bundled zod schemas no longer match the live AlgoVault MCP tools. Update src/schemas.ts.",
    );
    process.exit(1);
  }
  console.log("\nAll 4 action schemas match the live AlgoVault MCP tools/list.");
}

main().catch((err) => {
  console.error("check:schema failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
