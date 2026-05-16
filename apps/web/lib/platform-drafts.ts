import type { ApiProject } from "@/lib/api-client";
import { displayHost } from "@/lib/project-display";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatformId,
} from "@/lib/social-platforms";

export type PlatformDrafts = Record<SocialPlatformId, string>;

type DraftContext = {
  brand: string;
  handle: string;
  host: string;
  url: string;
  toneLabel: string;
  hashtag: string;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function toneLabel(tone?: string): string {
  return tone?.replace(/_/g, " ") ?? "marketing";
}

function brandHashtag(brand: string): string {
  const tag = brand.replace(/[^a-zA-Z0-9]/g, "");
  return tag ? `#${tag}` : "#ProductLaunch";
}

function buildContext(project: Pick<ApiProject, "url" | "name" | "tone">, brand: string, handle: string): DraftContext {
  const host = displayHost(project.url);
  return {
    brand,
    handle,
    host,
    url: project.url,
    toneLabel: toneLabel(project.tone),
    hashtag: brandHashtag(brand),
  };
}

function draftLinkedIn(ctx: DraftContext): string {
  return `We just shipped a ${ctx.toneLabel} demo for ${ctx.brand}.

In under two minutes you'll see ${ctx.host} in action — scripted from the live product, recorded with browser automation, and narrated with AI voice.

▶ Watch the walkthrough: ${ctx.url}

Built for founders who need launch-ready video without a production crew.

#ProductLaunch #SaaS #DemoVideo #AI`;
}

function draftX(ctx: DraftContext): string {
  const text = `New demo drop 🎬

${ctx.toneLabel} walkthrough for ${ctx.brand} — URL in, narrated MP4 out. No manual screen recording.

${ctx.url}

#buildinpublic #saas`;
  return truncate(text, 280);
}

function draftInstagram(ctx: DraftContext): string {
  return `✨ ${ctx.brand} demo is live

${ctx.toneLabel} product walkthrough — from live URL to cinematic MP4 with AI narration.

🔗 ${ctx.url}

${ctx.hashtag} #productdemo #startup #ai #saas #demovideo`;
}

function draftFacebook(ctx: DraftContext): string {
  return `🎬 New demo video for ${ctx.brand}

We turned ${ctx.host} into a ${ctx.toneLabel} walkthrough — scripted, recorded, and voiced automatically.

Watch here: ${ctx.url}

Perfect for sharing with your team, investors, or customers.`;
}

function draftTikTok(ctx: DraftContext): string {
  const tag = ctx.hashtag.replace("#", "");
  return `POV: you needed a launch demo yesterday 🎬

${ctx.toneLabel} walkthrough for ${ctx.brand} — paste URL, get narrated video.

#${tag} #saas #productdemo #startup #ai #fyp`;
}

function draftYouTube(ctx: DraftContext): string {
  return `${ctx.brand} — ${ctx.toneLabel} product demo (full walkthrough)

See how ${ctx.host} works in a narrated screen capture — generated from the live product URL.

🔗 Product: ${ctx.url}

---
Chapters
0:00 Intro
0:15 Product walkthrough
0:45 Key features
1:15 Wrap-up

#demo #saas #productwalkthrough`;
}

function draftProductHunt(ctx: DraftContext): string {
  return truncate(
    `Hey Product Hunt! 👋

We built ${ctx.brand} and wanted to show it properly — so we generated a ${ctx.toneLabel} demo straight from our live URL.

No recording marathons. Paste link → narrated MP4.

Would love feedback on the walkthrough: ${ctx.url}`,
    500
  );
}

function draftThreads(ctx: DraftContext): string {
  return truncate(
    `Just dropped a ${ctx.toneLabel} demo for ${ctx.brand} 🎬

Live URL → scripted walkthrough + AI voice. Took minutes, not days.

${ctx.url}

Who else is shipping with video-first launches?`,
    500
  );
}

const GENERATORS: Record<SocialPlatformId, (ctx: DraftContext) => string> = {
  linkedin: draftLinkedIn,
  x: draftX,
  instagram: draftInstagram,
  facebook: draftFacebook,
  tiktok: draftTikTok,
  youtube: draftYouTube,
  producthunt: draftProductHunt,
  threads: draftThreads,
};

export function generatePlatformDrafts(
  project: Pick<ApiProject, "url" | "name" | "tone">,
  brand: string,
  handle: string
): PlatformDrafts {
  const ctx = buildContext(project, brand, handle);
  const drafts = {} as PlatformDrafts;

  for (const platform of SOCIAL_PLATFORMS) {
    const platformId = platform.id;
    let text = GENERATORS[platformId](ctx);
    if (platform.charLimit && text.length > platform.charLimit) {
      text = truncate(text, platform.charLimit);
    }
    drafts[platformId] = text;
  }

  return drafts;
}

export function emptyPlatformDrafts(): PlatformDrafts {
  return SOCIAL_PLATFORMS.reduce((acc, p) => {
    acc[p.id] = "";
    return acc;
  }, {} as PlatformDrafts);
}
