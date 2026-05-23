import type {
  BrowserAction,
  DemoScript,
  ProductMap,
  Scene,
  Page,
  PageSection,
} from "@demo-copilot/types";

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "") || u.href;
  } catch {
    return url;
  }
}

function urlsMatch(a: string, b: string): boolean {
  return normalizeUrlKey(a) === normalizeUrlKey(b);
}

function findPage(productMap: ProductMap, url: string): Page | undefined {
  const key = normalizeUrlKey(url);
  return productMap.pages.find((p) => normalizeUrlKey(p.url) === key);
}

function isLikelySelector(s: string): boolean {
  const t = s.trim();
  if (!t || t.length > 120) return false;
  if (/^(the |a |an |this )/i.test(t) && !t.includes("#") && !t.includes("[")) return false;
  return (
    t.startsWith("#") ||
    t.startsWith(".") ||
    t.startsWith("[") ||
    t.includes(":has-text") ||
    t.includes("nth-of-type") ||
    /^[a-z][a-z0-9_-]*$/i.test(t)
  );
}

function matchSectionByHint(sections: PageSection[] | undefined, hint: string): string | null {
  if (!sections?.length || !hint.trim()) return null;
  const lower = hint.toLowerCase();
  const hit = sections.find(
    (s) =>
      lower.includes(s.label.toLowerCase()) ||
      s.label.toLowerCase().split(/\s+/).some((w) => w.length > 3 && lower.includes(w))
  );
  return hit?.selector ?? null;
}

function resolveScrollTarget(
  visualFocus: string,
  page: Page | undefined
): string | null {
  if (isLikelySelector(visualFocus)) return visualFocus.trim();

  const fromSection = matchSectionByHint(page?.sections, visualFocus);
  if (fromSection) return fromSection;

  if (page?.sections?.length) {
    return page.sections[0].selector;
  }

  const card = page?.components.find((c) => c.type === "card" || c.type === "nav");
  if (card) return card.selector;

  return page?.components[0]?.selector ?? null;
}

export function inferScenePageUrl(
  scene: Scene,
  productMap: ProductMap,
  baseUrl: string,
  sceneIndex: number
): string {
  const nav = scene.actions.find((a): a is Extract<BrowserAction, { type: "navigate" }> => a.type === "navigate");
  if (nav?.url) return nav.url;

  const pages = productMap.pages;
  if (pages.length === 0) return baseUrl;

  const flow = productMap.primaryValuePaths[0] ?? productMap.flows[0];
  if (flow?.steps.length) {
    const stepIdx = Math.min(sceneIndex, flow.steps.length - 1);
    const step = flow.steps[stepIdx];
    if (step?.pageUrl && pages.some((p) => urlsMatch(p.url, step.pageUrl))) {
      return step.pageUrl;
    }
  }

  const pageIdx = Math.min(sceneIndex, pages.length - 1);
  return pages[pageIdx]?.url ?? baseUrl;
}

function dedupeActions(actions: BrowserAction[]): BrowserAction[] {
  const out: BrowserAction[] = [];
  let lastScrollTo = false;

  for (const a of actions) {
    if (a.type === "navigate") {
      const prev = out[out.length - 1];
      if (prev?.type === "navigate" && urlsMatch(prev.url, a.url)) continue;
      out.push(a);
      lastScrollTo = false;
      continue;
    }
    if (a.type === "scrollTo") {
      if (lastScrollTo) continue;
      lastScrollTo = true;
      out.push(a);
      continue;
    }
    if (a.type === "scroll") continue;
    lastScrollTo = false;
    out.push(a);
  }
  return out;
}

export function normalizeSceneActions(
  scene: Scene,
  pageUrl: string,
  productMap: ProductMap,
  previousPageUrl: string,
  sceneIndex: number
): BrowserAction[] {
  const page = findPage(productMap, pageUrl);
  const targetUrl = inferScenePageUrl(scene, productMap, previousPageUrl, sceneIndex);
  const actions: BrowserAction[] = [];
  const forbidBlindScroll = process.env.SCRIPT_FORBID_BLIND_SCROLL !== "false";

  const hasNavigate = scene.actions.some((a) => a.type === "navigate");
  const needsNavigate = !urlsMatch(targetUrl, previousPageUrl);

  if (needsNavigate && !hasNavigate) {
    actions.push({ type: "navigate", url: targetUrl });
    actions.push({ type: "wait", ms: 1500 });
  }

  let scrollToAdded = false;

  for (const a of scene.actions) {
    if (a.type === "navigate") {
      if (!actions.some((x) => x.type === "navigate" && urlsMatch(x.url, a.url))) {
        actions.push(a);
        actions.push({ type: "wait", ms: 1200 });
      }
      continue;
    }

    if (a.type === "scroll" && forbidBlindScroll) {
      if (scrollToAdded) continue;
      const sel = resolveScrollTarget(scene.visualFocus, page);
      if (sel) {
        actions.push({ type: "scrollTo", selector: sel, block: "center" });
        scrollToAdded = true;
      }
      continue;
    }

    if (a.type === "scrollTo") {
      if (scrollToAdded) continue;
      actions.push({ ...a, block: a.block ?? "center" });
      scrollToAdded = true;
      continue;
    }

    actions.push(a);
  }

  if (!scrollToAdded && scene.visualFocus) {
    const sel = resolveScrollTarget(scene.visualFocus, page);
    if (sel) {
      actions.push({ type: "scrollTo", selector: sel, block: "center" });
    }
  }

  return dedupeActions(actions);
}

export function normalizeDemoScript(
  script: DemoScript,
  productMap: ProductMap,
  baseUrl: string
): DemoScript {
  let previousPageUrl = baseUrl;

  const scenes = script.scenes.map((scene, idx) => {
    const pageUrl = inferScenePageUrl(scene, productMap, baseUrl, idx);
    const actions = normalizeSceneActions(scene, pageUrl, productMap, previousPageUrl, idx);
    const visualFocus =
      isLikelySelector(scene.visualFocus)
        ? scene.visualFocus
        : resolveScrollTarget(scene.visualFocus, findPage(productMap, pageUrl)) ?? scene.visualFocus;

    const nav = actions.find((a): a is Extract<BrowserAction, { type: "navigate" }> => a.type === "navigate");
    previousPageUrl = nav?.url ?? pageUrl;

    return { ...scene, actions, visualFocus };
  });

  return { ...script, scenes };
}

export function sceneStartUrl(
  scene: Scene,
  productMap: ProductMap,
  baseUrl: string,
  sceneIndex: number
): string {
  const nav = scene.actions.find((a): a is Extract<BrowserAction, { type: "navigate" }> => a.type === "navigate");
  if (nav?.url) return nav.url;
  return inferScenePageUrl(scene, productMap, baseUrl, sceneIndex);
}
