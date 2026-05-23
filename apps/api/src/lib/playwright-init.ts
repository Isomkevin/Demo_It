import type { BrowserContext } from "playwright";

/** Passthrough for esbuild/tsx `__name` injected into serialized page.evaluate bodies. */
const EVAL_POLYFILL =
  "globalThis.__name = function(fn) { return fn; };";

/**
 * tsx/esbuild injects `__name()` when serializing functions for page.evaluate.
 * Install this on every BrowserContext before navigation or evaluate calls.
 */
export async function installEvaluatePolyfill(context: BrowserContext): Promise<void> {
  await context.addInitScript(EVAL_POLYFILL);
}
