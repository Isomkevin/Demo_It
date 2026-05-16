import { z } from "zod";
import type { DemoScript } from "@demo-copilot/types";
import { callLLM } from "../../lib/llm";
import { buildSocialDraftsPrompt, SOCIAL_DRAFTS_SYSTEM_PROMPT } from "./prompts";

export const SOCIAL_PLATFORM_IDS = [
  "linkedin",
  "x",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "producthunt",
  "threads",
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

const CHAR_LIMITS: Record<SocialPlatformId, number> = {
  linkedin: 2800,
  x: 270,
  instagram: 2100,
  facebook: 1200,
  tiktok: 400,
  youtube: 4500,
  producthunt: 480,
  threads: 480,
};

const SocialDraftsSchema = z.object({
  linkedin: z.string(),
  x: z.string(),
  instagram: z.string(),
  facebook: z.string(),
  tiktok: z.string(),
  youtube: z.string(),
  producthunt: z.string(),
  threads: z.string(),
});

export type SocialDrafts = z.infer<typeof SocialDraftsSchema>;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function enforceLimits(drafts: SocialDrafts): SocialDrafts {
  const out = { ...drafts };
  for (const id of SOCIAL_PLATFORM_IDS) {
    out[id] = truncate(out[id], CHAR_LIMITS[id]);
  }
  return out;
}

export async function generateSocialDrafts(input: {
  url: string;
  name: string;
  tone: string;
  brand: string;
  handle: string;
  script: DemoScript | null;
}): Promise<SocialDrafts> {
  const userPrompt = buildSocialDraftsPrompt(input);
  const raw = await callLLM(SOCIAL_DRAFTS_SYSTEM_PROMPT, userPrompt, SocialDraftsSchema, 8192);
  return enforceLimits(raw);
}
