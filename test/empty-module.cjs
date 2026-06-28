// Jest stub for heavy/ESM-only wallet SDKs that the @coinbase/agentkit barrel
// pulls transitively (e.g. @coinbase/cdp-sdk → jose). This provider is
// walletless and the tests never exercise wallet providers, so an empty stub
// lets the agentkit module graph load under the CommonJS test transform.
module.exports = {};
