import type { ApiProject } from "@/lib/api-client";
import { displayHost } from "@/lib/project-display";

export function postCaption(project: Pick<ApiProject, "url" | "tone">): string {
  const host = displayHost(project.url);
  const tone = project.tone?.replace(/_/g, " ") ?? "marketing";
  return `Just shipped a ${tone} walkthrough for ${host} — scripted, recorded, and narrated in one pass.`;
}
