import type { ApiProject } from "@/lib/api-client";
import { displayHost } from "@/lib/project-display";
import { postCaption } from "@/lib/post-caption";
import { generatePlatformDrafts, type PlatformDrafts } from "@/lib/platform-drafts";
import type { SocialPlatformId } from "@/lib/social-platforms";

export type PostContent = {
  brand: string;
  handle: string;
  /** Preview card caption — mirrors LinkedIn draft by default */
  caption: string;
  platformDrafts: PlatformDrafts;
};

export function previewCaption(content: PostContent, platform: SocialPlatformId = "linkedin"): string {
  return content.platformDrafts[platform]?.trim() || content.caption;
}

export function defaultPostContent(project: Pick<ApiProject, "url" | "name" | "tone">): PostContent {
  const host = displayHost(project.url);
  const brand = project.name || host;
  const handle = host.replace(/\./g, "");
  const platformDrafts = generatePlatformDrafts(project, brand, handle);

  return {
    brand,
    handle,
    caption: platformDrafts.linkedin || postCaption(project),
    platformDrafts,
  };
}

const STORAGE_PREFIX = "demo-it:post:";
const ACTIVE_PLATFORM_PREFIX = "demo-it:post-platform:";
const AI_GENERATED_PREFIX = "demo-it:post-ai-generated:";

export function wasAiGenerated(projectId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${AI_GENERATED_PREFIX}${projectId}`) === "1";
  } catch {
    return false;
  }
}

export function markAiGenerated(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${AI_GENERATED_PREFIX}${projectId}`, "1");
  } catch {
    // ignore
  }
}

export function clearAiGenerated(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${AI_GENERATED_PREFIX}${projectId}`);
  } catch {
    // ignore
  }
}

function mergeDrafts(
  defaults: PlatformDrafts,
  saved?: Partial<PlatformDrafts>
): PlatformDrafts {
  const merged = { ...defaults };
  if (!saved) return merged;
  for (const key of Object.keys(saved) as SocialPlatformId[]) {
    const value = saved[key]?.trim();
    if (value) merged[key] = value;
  }
  return merged;
}

export function applyAiDrafts(
  current: PostContent,
  result: { brand: string; handle: string; caption: string; platformDrafts: PlatformDrafts }
): PostContent {
  return {
    brand: result.brand,
    handle: result.handle,
    caption: result.caption,
    platformDrafts: result.platformDrafts,
  };
}

export function loadPostContent(project: ApiProject): PostContent {
  const defaults = defaultPostContent(project);
  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${project.id}`);
    if (!raw) return defaults;

    const saved = JSON.parse(raw) as Partial<PostContent> & {
      platformDrafts?: Partial<PlatformDrafts>;
    };

    const brand = saved.brand?.trim() || defaults.brand;
    const handle = saved.handle?.trim() || defaults.handle;

    let platformDrafts: PlatformDrafts;
    if (saved.platformDrafts && Object.keys(saved.platformDrafts).length > 0) {
      platformDrafts = mergeDrafts(
        generatePlatformDrafts(project, brand, handle),
        saved.platformDrafts
      );
    } else if (saved.caption?.trim()) {
      platformDrafts = generatePlatformDrafts(project, brand, handle);
      platformDrafts.linkedin = saved.caption.trim();
    } else {
      platformDrafts = mergeDrafts(defaults.platformDrafts, saved.platformDrafts);
    }

    return {
      brand,
      handle,
      caption: saved.caption?.trim() || platformDrafts.linkedin || defaults.caption,
      platformDrafts,
    };
  } catch {
    return defaults;
  }
}

export function savePostContent(projectId: string, content: PostContent): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(content));
  } catch {
    // ignore quota / private mode
  }
}

export function loadActivePlatform(projectId: string): SocialPlatformId {
  if (typeof window === "undefined") return "linkedin";
  try {
    const raw = localStorage.getItem(`${ACTIVE_PLATFORM_PREFIX}${projectId}`);
    if (raw === "x" || raw === "instagram" || raw === "facebook" || raw === "tiktok") {
      return raw;
    }
    if (raw === "youtube" || raw === "producthunt" || raw === "threads" || raw === "linkedin") {
      return raw;
    }
    return "linkedin";
  } catch {
    return "linkedin";
  }
}

export function saveActivePlatform(projectId: string, platform: SocialPlatformId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${ACTIVE_PLATFORM_PREFIX}${projectId}`, platform);
  } catch {
    // ignore
  }
}
