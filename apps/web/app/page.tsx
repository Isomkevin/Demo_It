"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export default function Home() {
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState("marketing");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { project } = await api.createProject({ url, tone });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      alert("Failed to create project: " + err);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <div className="z-10 w-full max-w-xl p-8 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Demo Copilot</h1>
        <p className="text-zinc-400 mb-8">Generate cinematic product demos from any URL.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="url" className="text-sm font-medium text-zinc-300">Product URL</label>
            <input
              id="url"
              type="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-zinc-600 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tone" className="text-sm font-medium text-zinc-300">Demo Tone</label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all appearance-none"
            >
              <option value="marketing">Marketing (Upbeat, Value-focused)</option>
              <option value="investor">Investor (Visionary, Metrics-focused)</option>
              <option value="user_onboarding">Onboarding (Educational, Clear)</option>
              <option value="tutorial">Tutorial (Step-by-step, Technical)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? "Generating..." : "Generate Demo"}
          </button>
        </form>
      </div>
    </main>
  );
}
