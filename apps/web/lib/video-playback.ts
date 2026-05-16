const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function videoPlaybackUrl(projectId: string, videoUrl?: string | null): string | null {
  if (!videoUrl) return null;
  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    return videoUrl;
  }
  return `${API_BASE}/api/v1/projects/${projectId}/video`;
}
