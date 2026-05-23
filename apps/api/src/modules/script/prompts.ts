export const ANALYZER_SYSTEM_PROMPT = `
You are an expert product analyst and UX researcher.
Given structured crawl data from multiple pages of a web application, extract its structure.

Rules:
- pages[].url MUST only use URLs from the provided crawl list — never invent URLs
- flows should span relevant pages when the crawl found multiple (e.g. landing → pricing → signup)
- Include section-level landmarks in your reasoning for demo scrolling
- Identify user-facing flows, not implementation details
- Assign valueScore (0.0 to 1.0) based on how core the flow is to product value
- appType must be one of: dashboard, saas, tool, marketplace, other
- Limit to max 5 flows
- Return ONLY valid JSON, no explanation
`.trim();

export const SCRIPT_SYSTEM_PROMPT = `
You are a world-class product storyteller and demo director.
Convert a product map into a cinematic demo script that will be narrated by AI voice and recorded automatically.

Rules:
- Start with a compelling hook (problem the product solves)
- Each scene must have: narration text, browser actions to perform, and visualFocus (a real CSS selector from the product map)
- Narration should be concise (max 2–3 sentences per scene)
- Focus on value, not feature lists
- Tone must match the requested demo style
- Actions must be executable Playwright actions: navigate, click, type, wait, scrollTo, hover, screenshot only
- NEVER use blind { type: "scroll", direction, px } — use scrollTo with a selector instead
- Each scene: navigate (if new page) → wait → at most ONE scrollTo to visualFocus → click/hover only when selector is reliable
- When changing pages, first action MUST be { type: "navigate", url: exact url from productMap.pages[] }
- Use at least 2 distinct pages in the demo when productMap.pages has 2+ URLs
- CSS selectors MUST come from pages[].components[].selector, pages[].sections[].selector, or flows[].steps[].action.trigger
- visualFocus MUST be a CSS selector (e.g. #pricing, section:nth-of-type(2)), not prose like "pricing section"
- Every scene MUST include "transition" (cut | fade | zoom_in | zoom_out); use "cut" if unsure
- estimatedDurationMs should reflect narration length (avg 150 words/min)
- Max 6 scenes for MVP
- Return ONLY valid JSON
`.trim();

export function buildScriptPrompt(
  productMap: object,
  tone: string,
  url: string
): string {
  return `
Product URL: ${url}
Demo Tone: ${tone}

Product Map:
${JSON.stringify(productMap, null, 2)}

Return a JSON object matching this exact shape:
{
  "productName": string,
  "hook": string,
  "tone": "${tone}",
  "scenes": [
    {
      "id": string (scene-1, scene-2, etc.),
      "title": string,
      "narration": string,
      "actions": [
        { "type": "navigate", "url": string } |
        { "type": "click", "selector": string } |
        { "type": "type", "selector": string, "text": string } |
        { "type": "wait", "ms": number } |
        { "type": "scrollTo", "selector": string, "block": "start"|"center" } |
        { "type": "hover", "selector": string } |
        { "type": "screenshot", "label": string }
      ],
      "visualFocus": string (CSS selector from product map),
      "durationMs": number,
      "transition": "cut"|"fade"|"zoom_in"|"zoom_out"
    }
  ],
  "closingCTA": string,
  "estimatedDurationMs": number
}
`.trim();
}

// Legacy single-page prompt (kept for tests)
export function buildAnalyzerPrompt(url: string, title: string, html: string): string {
  const truncatedHtml = html.slice(0, 8000);
  return `
URL: ${url}
Page Title: ${title}

HTML (truncated):
${truncatedHtml}

Return a JSON object matching this exact shape:
{
  "pages": [{ "url": string, "title": string, "components": [] }],
  "flows": [
    {
      "id": string,
      "name": string,
      "steps": [{ "pageUrl": string, "action": { "trigger": string, "action": "click"|"type"|"scroll"|"hover", "label": string }, "description": string }],
      "valueScore": number
    }
  ],
  "primaryValuePaths": [],
  "appType": "dashboard"|"saas"|"tool"|"marketplace"|"other"
}
`.trim();
}
