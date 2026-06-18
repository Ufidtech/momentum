"use client";

import { useState } from "react";

export default function MomentumApp() {
  // Application State
  const [currentScreen, setCurrentScreen] = useState < 1 | 2 | 3 > (1);
  const [brainDump, setBrainDump] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handlers
  const handleAnalyzeThoughts = async () => {
    if (!brainDump.trim()) return;

    setIsAnalyzing(true);
    // TODO: Integrate Transformers.js here for local sentiment analysis
    // TODO: POST to David's backend -> /analyze-ambiguity/

    // Simulating API delay for UI testing
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentScreen(2);
    }, 1500);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">

      {/* SCREEN 1: Brain Dump */}
      {currentScreen === 1 && (
        <div className="w-full max-w-3xl flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-medium tracking-tight text-white">Momentum</h1>
            <p className="text-zinc-400">Pour out your idea. Don't organize it. Just type.</p>
          </div>

          <textarea
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            placeholder="I want to start a... but I'm worried about..."
            className="w-full h-64 p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-zinc-600"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              {brainDump.length} characters
            </span>
            <button
              onClick={handleAnalyzeThoughts}
              disabled={!brainDump.trim() || isAnalyzing}
              className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? "Processing..." : "Analyze My Thoughts"}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: Ambiguity Ledger (Placeholder) */}
      {currentScreen === 2 && (
        <div className="w-full max-w-2xl text-center">
          <h2 className="text-2xl font-medium mb-4">Ambiguity Ledger</h2>
          <p className="text-zinc-400 mb-8">Human validation required.</p>
          <button
            onClick={() => setCurrentScreen(3)}
            className="px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
          >
            Mock: Resolve Assumptions -> Next
          </button>
        </div>
      )}

      {/* SCREEN 3: Action Horizon (Placeholder) */}
      {currentScreen === 3 && (
        <div className="w-full max-w-5xl text-center">
          <h2 className="text-2xl font-medium mb-4">Action Horizon</h2>
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-900/50">Left Pane: 30/60/90</div>
            <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-900/50">Right Pane: 15-min Focus Task</div>
          </div>
        </div>
      )}

    </main>
  );
}