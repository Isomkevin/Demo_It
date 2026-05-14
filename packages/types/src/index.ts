// ─── Product Analysis ────────────────────────────────────────────────────────

export type Page = {
  url: string;
  title: string;
  components: Component[];
};

export type Component = {
  type: "button" | "form" | "nav" | "input" | "modal" | "card" | "table" | "other";
  selector: string;
  label: string;
  isInteractive: boolean;
};

export type Interaction = {
  trigger: string;         // CSS selector
  action: "click" | "type" | "scroll" | "hover";
  label: string;
};

export type UserFlow = {
  id: string;
  name: string;
  steps: FlowStep[];
  valueScore: number;      // 0–1, AI-assigned importance
};

export type FlowStep = {
  pageUrl: string;
  action: Interaction;
  description: string;
};

export type ProductMap = {
  pages: Page[];
  flows: UserFlow[];
  primaryValuePaths: UserFlow[];
  appType: "dashboard" | "saas" | "tool" | "marketplace" | "other";
};

// ─── Script / Narrative ──────────────────────────────────────────────────────

export type DemoTone = "investor" | "user_onboarding" | "marketing" | "tutorial";

export type Scene = {
  id: string;
  title: string;
  narration: string;
  actions: BrowserAction[];
  visualFocus: string;        // CSS selector or area description
  durationMs: number;         // estimated
  transition: "cut" | "fade" | "zoom_in" | "zoom_out";
};

export type DemoScript = {
  productName: string;
  hook: string;
  tone: DemoTone;
  scenes: Scene[];
  closingCTA: string;
  estimatedDurationMs: number;
};

// ─── Browser Actions ─────────────────────────────────────────────────────────

export type BrowserAction =
  | { type: "navigate"; url: string }
  | { type: "click"; selector: string; label?: string }
  | { type: "type"; selector: string; text: string }
  | { type: "wait"; ms: number }
  | { type: "scroll"; direction: "up" | "down"; px?: number }
  | { type: "hover"; selector: string }
  | { type: "screenshot"; label: string };

// ─── Voice / Audio ───────────────────────────────────────────────────────────

export type VoiceStyle = "startup_hype" | "neutral" | "enterprise" | "friendly";

export type WordTiming = {
  word: string;
  startMs: number;
  endMs: number;
};

export type VoiceOutput = {
  sceneId: string;
  audioUrl: string;
  durationMs: number;
  wordTimings: WordTiming[];
};

// ─── Timeline ────────────────────────────────────────────────────────────────

export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
};

export type Transition = {
  type: "fade" | "cut" | "zoom_in" | "zoom_out" | "slide";
  durationMs: number;
};

export type TimelineScene = {
  sceneId: string;
  videoSegmentUrl: string;
  audioSegmentUrl: string;
  captions: Caption[];
  transition: Transition;
  startMs: number;
  endMs: number;
};

export type Timeline = {
  scenes: TimelineScene[];
  totalDurationMs: number;
  fps: number;
  resolution: { width: number; height: number };
};

// ─── Jobs / Orchestration ────────────────────────────────────────────────────

export type PipelineStage =
  | "queued"
  | "analyzing"
  | "scripting"
  | "recording"
  | "voicing"
  | "syncing"
  | "rendering"
  | "completed"
  | "failed";

export type JobStatus = {
  projectId: string;
  stage: PipelineStage;
  progress: number;           // 0–100
  message: string;
  error?: string;
};

/** Final MP4 compositing: HyperFrames (HTML/CSS/JS + CLI) or Remotion (React). */
export type RenderBackend = "hyperframes" | "remotion";

// ─── DB Models (mirrors Prisma) ───────────────────────────────────────────────

export type Project = {
  id: string;
  url: string;
  name: string;
  tone: DemoTone;
  status: PipelineStage;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DemoRun = {
  id: string;
  projectId: string;
  script?: DemoScript;
  timeline?: Timeline;
  videoUrl?: string;
  durationMs?: number;
  createdAt: Date;
};
