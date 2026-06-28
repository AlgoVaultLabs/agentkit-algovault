/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  // Source uses NodeNext ESM ".js" specifiers; strip them so the CommonJS test
  // transform resolves the sibling ".ts" files.
  moduleNameMapper: {
    // The @coinbase/agentkit barrel eagerly loads every wallet provider AND all
    // 40+ built-in action providers + their (often ESM-only) SDKs. Map it to a
    // shim that exposes only ActionProvider + CreateAction (all this provider
    // needs) so the CommonJS test graph stays small and parseable.
    "^@coinbase/agentkit$": "<rootDir>/test/agentkit-shim.cjs",
    // The @coinbase/agentkit barrel eagerly loads every wallet provider, which
    // pull heavy/ESM-only SDKs (cdp-sdk→jose, @solana/web3.js→rpc-websockets→uuid,
    // privy, zerodev). This provider is walletless and the tests never touch a
    // wallet provider, so stub those SDKs to empty objects — the wallet-provider
    // classes still define (they extend agentkit's own base, using the SDKs only
    // in lazily-called methods), letting the CommonJS test graph load.
    "^@coinbase/cdp-sdk(/.*)?$": "<rootDir>/test/empty-module.cjs",
    "^@solana/(web3\\.js|kit|spl-token)(/.*)?$": "<rootDir>/test/empty-module.cjs",
    "^@privy-io/(.*)$": "<rootDir>/test/empty-module.cjs",
    "^@zerodev/(.*)$": "<rootDir>/test/empty-module.cjs",
    // Source uses NodeNext ESM ".js" specifiers; strip them so the test
    // transform resolves the sibling ".ts" files.
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
