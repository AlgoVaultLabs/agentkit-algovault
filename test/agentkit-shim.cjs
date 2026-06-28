// Test shim for @coinbase/agentkit.
//
// The real barrel (dist/index.js) eagerly loads every wallet provider AND all
// 40+ built-in action providers, many of which pull ESM-only SDKs that the
// CommonJS Jest transform cannot parse (@across-protocol/app-sdk, @solana/web3.js,
// jose, …). This provider only needs `ActionProvider` (base class) and
// `CreateAction` (decorator) at runtime — `Network` is a compile-time-only type —
// so load just those two modules directly by file path, bypassing the package's
// exports map and the barrel's eager side-effects. The classes/decorator are the
// real implementations, so the provider behaves identically under test.
const path = require("path");

const apDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@coinbase",
  "agentkit",
  "dist",
  "action-providers",
);

const { ActionProvider } = require(path.join(apDir, "actionProvider.js"));
const { CreateAction } = require(path.join(apDir, "actionDecorator.js"));

module.exports = { ActionProvider, CreateAction };
