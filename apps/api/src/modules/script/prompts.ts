export const ANALYZER_SYSTEM_PROMPT = `
You are an expert product analyst and UX researcher.
Given a raw HTML snapshot and URL of a web application, extract its structure.

Rules:
- Identify user-facing flows, not implementation details
- Assign valueScore (0.0 to 1.0) based on how core the flow is to product value
- appType must be one of: dashboard, saas, tool, marketplace, other
- Limit to max 5 flows
- Return ONLY valid JSON, no explanation
`.trim();

export function buildAnalyzerPrompt(url: string, title: string, html: string): string {
  const truncatedHtml = html.slice(0, 8000); // keep within token budget
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
  "primaryValuePaths": [/* same shape as flows, top 2-3 most important */],
  "appType": "dashboard"|"saas"|"tool"|"marketplace"|"other"
}
`.trim();
}

export const SCRIPT_SYSTEM_PROMPT = `
You are a world-class product storyteller and demo director.
Convert a product map into a cinematic demo script that will be narrated by AI voice and recorded automatically.

Rules:
- Start with a compelling hook (problem the product solves)
- Each scene must have: narration text, browser actions to perform, and a visual focus area
- Narration should be concise (max 2–3 sentences per scene)
- Focus on value, not feature lists
- Tone must match the requested demo style
- Actions must be executable Playwright actions (navigate, click, type, wait, scroll)
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
        { "type": "scroll", "direction": "down"|"up", "px": number }
      ],
      "visualFocus": string,
      "durationMs": number,
      "transition": "cut"|"fade"|"zoom_in"|"zoom_out"
    }
  ],
  "closingCTA": string,
  "estimatedDurationMs": number
}
`.trim();
}
