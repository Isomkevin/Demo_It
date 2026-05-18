import { ApiError } from "@/lib/api-client";

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 402) {
      return err.message || "You need credits or a paid plan to continue.";
    }
    return err.message;
  }

  const raw = err instanceof Error ? err.message : "Something went wrong";
  const lower = raw.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return "Cannot reach the API. Run pnpm dev and confirm NEXT_PUBLIC_API_URL points to port 3001.";
  }
  if (raw.includes("API error 404")) {
    return "Project not found. It may have been removed.";
  }
  if (raw.includes("API error 500") || raw.includes("API error 502")) {
    return "Server error — check API logs and your .env keys (LLM, ElevenLabs, database).";
  }
  if (raw.includes("API error 503")) {
    return "API is starting up. Wait a moment and try again.";
  }

  return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
}
