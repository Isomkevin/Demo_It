"use client";
import { useProjectStatus } from "@/hooks/useProjectStatus";
import { useEffect, useState } from "react";
import { api, type ApiProject } from "@/lib/api-client";
import { motion } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function videoPlaybackUrl(project: Pick<ApiProject, "id" | "videoUrl">): string {
  if (project.videoUrl.startsWith("http://") || project.videoUrl.startsWith("https://")) {
    return project.videoUrl;
  }
  return `${API_BASE}/api/v1/projects/${project.id}/video`;
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { status, done } = useProjectStatus(params.id);
  const [project, setProject] = useState<ApiProject | null>(null);

  useEffect(() => {
    if (done) {
      api.getProject(params.id).then((res) => setProject(res.project)).catch(console.error);
    }
  }, [done, params.id]);

  const stages = [
    { key: "queued", label: "Queued" },
    { key: "analyzing", label: "Analyzing UI" },
    { key: "scripting", label: "Writing Script" },
    { key: "recording", label: "Recording Video" },
    { key: "voicing", label: "Generating Voice" },
    { key: "rendering", label: "Rendering Final Video" },
    { key: "completed", label: "Completed" },
  ];

  const currentStageIndex = status ? stages.findIndex((s) => s.key === status.stage) : 0;
  const progress = status?.progress || 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 lg:p-24 bg-zinc-950 text-white">
      <div className="z-10 w-full max-w-4xl p-8 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800">
        <h1 className="text-3xl font-bold mb-8">Demo Generation Status</h1>

        {status?.stage === "failed" ? (
          <div className="p-6 bg-red-950/50 border border-red-900 rounded-xl text-red-400">
            <h2 className="text-xl font-bold mb-2">Generation Failed</h2>
            <p>An error occurred during the demo generation pipeline.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-sm font-medium text-zinc-400 mb-2">
                <span>{status ? stages[Math.max(0, currentStageIndex)]?.label : "Initializing..."}</span>
                <span>{progress}%</span>
              </div>
              
              <div className="w-full bg-zinc-950 h-4 rounded-full overflow-hidden border border-zinc-800">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut", duration: 0.5 }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
                {stages.map((stage, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <div key={stage.key} className="flex flex-col items-center gap-2 text-center">
                      <div className={`w-3 h-3 rounded-full ${isPast ? 'bg-emerald-500' : isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'}`} />
                      <span className={`text-xs ${isCurrent ? 'text-white font-medium' : 'text-zinc-500'}`}>{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {done && project?.videoUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-col items-center gap-6"
              >
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
                  <video
                    src={videoPlaybackUrl(project)}
                    controls
                    className="w-full h-full object-contain"
                    autoPlay
                  />
                </div>
                
                <a
                  href={videoPlaybackUrl(project)}
                  download
                  className="px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Demo
                </a>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
