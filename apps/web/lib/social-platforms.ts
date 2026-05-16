export type SocialPlatformId =
  | "linkedin"
  | "x"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "producthunt"
  | "threads";

export type SocialPlatform = {
  id: SocialPlatformId;
  label: string;
  shortLabel: string;
  charLimit: number | null;
  tip: string;
  videoNote: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    shortLabel: "in",
    charLimit: 3000,
    tip: "Native video performs well. Upload your MP4 directly or paste the link in a comment.",
    videoNote: "Upload MP4 as native video",
  },
  {
    id: "x",
    label: "X (Twitter)",
    shortLabel: "X",
    charLimit: 280,
    tip: "Keep the hook in the first line. Attach the MP4 or share a landing link.",
    videoNote: "Attach MP4 or link",
  },
  {
    id: "instagram",
    label: "Instagram",
    shortLabel: "IG",
    charLimit: 2200,
    tip: "Reels prefer vertical; use your MP4 as a Reel or carousel cover.",
    videoNote: "Post as Reel",
  },
  {
    id: "facebook",
    label: "Facebook",
    shortLabel: "FB",
    charLimit: 63206,
    tip: "Square or landscape video works for feed posts. Add captions for sound-off viewers.",
    videoNote: "Upload MP4 to post",
  },
  {
    id: "tiktok",
    label: "TikTok",
    shortLabel: "TT",
    charLimit: 2200,
    tip: "Lead with a bold hook in the first 2 seconds. Use 3–5 relevant hashtags.",
    videoNote: "Upload vertical MP4",
  },
  {
    id: "youtube",
    label: "YouTube",
    shortLabel: "YT",
    charLimit: 5000,
    tip: "Paste this as the video description when you upload the MP4.",
    videoNote: "Description + Shorts upload",
  },
  {
    id: "producthunt",
    label: "Product Hunt",
    shortLabel: "PH",
    charLimit: 500,
    tip: "Use as your maker comment or launch day update. Link to the live demo.",
    videoNote: "Embed or link in comment",
  },
  {
    id: "threads",
    label: "Threads",
    shortLabel: "Th",
    charLimit: 500,
    tip: "Conversational tone works best. Attach the clip or link to the full video.",
    videoNote: "Attach clip or link",
  },
];

export function platformById(id: SocialPlatformId): SocialPlatform {
  return SOCIAL_PLATFORMS.find((p) => p.id === id) ?? SOCIAL_PLATFORMS[0];
}

export function shareComposerUrl(
  platformId: SocialPlatformId,
  text: string,
  pageUrl: string
): string | null {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(pageUrl);

  switch (platformId) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodedText}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    case "threads":
      return "https://www.threads.net/";
    case "instagram":
    case "tiktok":
    case "youtube":
    case "producthunt":
      return platformId === "producthunt"
        ? "https://www.producthunt.com/"
        : null;
    default:
      return null;
  }
}
