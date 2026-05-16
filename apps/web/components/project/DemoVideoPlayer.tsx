"use client";

import { useState } from "react";
import { GradientCta } from "@/components/theme/GradientCta";

type Props = {
  src: string;
  downloadHref: string;
};

export function DemoVideoPlayer({ src, downloadHref }: Props) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface-muted p-8 text-center">
        <p className="text-sm font-medium text-foreground">Video could not be loaded</p>
        <p className="max-w-sm text-xs text-muted">
          The file may still be processing, or the API cannot serve the file. Try downloading directly.
        </p>
        <GradientCta href={downloadHref} download>
          Download MP4
        </GradientCta>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-stone-900 aspect-video">
      <video
        src={src}
        controls
        className="h-full w-full object-contain"
        autoPlay
        onError={() => setError(true)}
      />
    </div>
  );
}
