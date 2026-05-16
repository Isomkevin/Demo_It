import type { DemoScript } from "@demo-copilot/types";

export const SOCIAL_DRAFTS_SYSTEM_PROMPT = `
You are an elite social media strategist and copywriter for B2B SaaS product launches.
You write posts that feel human, specific, and scroll-stopping — never generic AI filler.

Rules:
- Ground every post in the product facts provided (URL, demo script, hook, scenes). No invented features.
- Each platform draft must feel native to that channel (format, length, hashtags, CTA style).
- Use the demo video as the hero asset: tease what viewers will see, do not claim features not in the script.
- Vary hooks and angles across platforms — do not paste the same paragraph eight times.
- X and Threads: punchy, line breaks, strong first line; respect character limits strictly.
- LinkedIn: professional story arc, whitespace, 1 clear CTA, 3–6 relevant hashtags at end.
- Instagram / TikTok: visual-first language, emoji sparingly (0–3), hashtag block at end.
- YouTube: description with title line, value bullets, chapters placeholder, links section.
- Product Hunt: authentic maker voice, community-first, ask for feedback.
- Facebook: conversational, slightly longer, shareable for non-technical friends.
- Never use markdown code fences in output values. Plain text only inside JSON strings.
- Return ONLY valid JSON matching the exact schema requested.
`.trim();

const PLATFORM_BRIEFS = `
Platform requirements (hard limits — stay under):
- linkedin: max 2800 chars. Professional launch narrative. Line breaks between beats.
- x: max 270 chars total including hashtags. One killer hook line first.
- instagram: max 2100 chars. Reel caption energy. 8–15 hashtags at bottom.
- facebook: max 1200 chars. Friendly, shareable, one question to drive comments.
- tiktok: max 400 chars. Hook in first line. 4–8 trending-style hashtags.
- youtube: max 4500 chars. Title-style first line, description, bullet highlights, chapter timestamps placeholder, tags line.
- producthunt: max 480 chars. Maker comment for launch day.
- threads: max 480 chars. Conversational, short paragraphs, 1–2 hashtags max.
`.trim();

export function buildSocialDraftsPrompt(input: {
  url: string;
  name: string;
  tone: string;
  brand: string;
  handle: string;
  script: DemoScript | null;
}): string {
  const scriptBlock = input.script
    ? `
Demo script (use for specifics):
- Product name: ${input.script.productName}
- Hook: ${input.script.hook}
- Closing CTA: ${input.script.closingCTA}
- Scenes:
${input.script.scenes
  .map((s, i) => `  ${i + 1}. ${s.title}: ${s.narration}`)
  .join("\n")}
`
    : "No demo script available — infer value from product URL and tone only.";

  return `
Product URL: ${input.url}
Brand display name: ${input.brand}
Social handle (without @): ${input.handle}
Demo tone: ${input.tone.replace(/_/g, " ")}
Project name: ${input.name}

${scriptBlock}

${PLATFORM_BRIEFS}

The user has a polished MP4 product demo video ready to attach on each platform.

Return JSON with exactly these keys (string values only):
{
  "linkedin": string,
  "x": string,
  "instagram": string,
  "facebook": string,
  "tiktok": string,
  "youtube": string,
  "producthunt": string,
  "threads": string
}
`.trim();
}
