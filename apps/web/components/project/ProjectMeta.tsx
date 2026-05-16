import type { ApiProject } from "@/lib/api-client";
import { displayHost, toneLabel } from "@/lib/project-display";

type Props = {
  project: Pick<ApiProject, "url" | "tone" | "name">;
};

export function ProjectMeta({ project }: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
        <span className="text-muted">Tone</span>
        {toneLabel(project.tone)}
      </span>
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-muted transition hover:border-accent/30 hover:text-accent"
        title={project.url}
      >
        <span className="truncate">{displayHost(project.url)}</span>
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}
