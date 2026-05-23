/**
 * Run: pnpm --filter api exec tsx src/modules/analyzer/merge-product-map.test.ts
 */
import assert from "node:assert/strict";
import { mergeCrawledPages } from "./merge-product-map";
import type { ProductMap, SiteScrape } from "@demo-copilot/types";

const site: SiteScrape = {
  seedUrl: "https://example.com/",
  pages: [
    {
      url: "https://example.com/",
      title: "Home",
      components: [],
      sections: [],
      interactions: [],
    },
  ],
};

const productMap: ProductMap = {
  pages: [{ url: "https://example.com/", title: "Home", components: [] }],
  flows: [
    {
      id: "f1",
      name: "Broken flow",
      valueScore: 0.8,
      steps: undefined as unknown as ProductMap["flows"][0]["steps"],
    },
  ],
  primaryValuePaths: [
    {
      id: "p1",
      name: "Path without steps",
      valueScore: 0.9,
      steps: undefined as unknown as ProductMap["flows"][0]["steps"],
    },
  ],
  appType: "saas",
};

const merged = mergeCrawledPages(productMap, site);
assert.equal(merged.flows.length, 0, "flows with missing steps are dropped");
assert.equal(merged.primaryValuePaths.length, 0, "empty primaryValuePaths when no valid flows");

const withValid = mergeCrawledPages(
  {
    ...productMap,
    flows: [
      {
        id: "ok",
        name: "OK",
        valueScore: 1,
        steps: [
          {
            pageUrl: "https://example.com/",
            description: "Open home",
            action: { trigger: "body", action: "click", label: "Home" },
          },
        ],
      },
    ],
    primaryValuePaths: [],
  },
  site
);
assert.equal(withValid.flows.length, 1);
assert.equal(withValid.primaryValuePaths.length, 1);
assert.equal(withValid.primaryValuePaths[0]?.id, "ok");

console.log("merge-product-map.test.ts: ok");
