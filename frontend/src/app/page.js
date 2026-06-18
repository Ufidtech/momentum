"use client";

import { useState, useEffect, useRef } from "react";

export default function MomentumApp() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const worker = useRef(null);

  // Screen 1: Brain Dump
  const [brainDump, setBrainDump] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");

  // Screen 2: Ambiguity Ledger
  const [confidenceData, setConfidenceData] = useState({ score: 0, reason: "" });
  const [assumptions, setAssumptions] = useState([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Screen 3: Action Horizon
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const aiWorker = new Worker(new URL('../lib/worker.js', import.meta.url), {
      type: 'module'
    });
    worker.current = aiWorker;
    return () => {
      aiWorker.terminate();
      worker.current = null;
    };
  }, []);

  // --- HANDLERS ---
  const handleAnalyzeThoughts = async () => {
    if (!brainDump.trim()) return;
    setIsAnalyzing(true);
    setLoadingMessage("Connecting to AI Layer...");

    try {
      const response = await fetch("http://localhost:8000/analyze-ambiguity/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brain_dump: brainDump,
          sentiment_score: 4.5,
          word_count: brainDump.split(/\s+/).length
        })
      });

      if (!response.ok) {
        console.warn("Backend error, triggering Demo Mode...");
        // Fallback to local data if API is down
        if (typeof renderMockData === 'function') renderMockData();
        return;
      }
      const data = await response.json();
      setConfidenceData(data.confidence || { score: 7, reason: "Analysis complete" });
      setAssumptions((data.assumptions || []).map((item, index) => ({
        id: index + 1,
        label: item.label || "Assumption",
        value: item.description || item.value || "No description",
        isConfirmed: false
      })));
      setIsAnalyzing(false);
      setCurrentScreen(2);
    } catch (error) {
      console.error("Connection error:", error);
      renderMockData();
    }
  };

  const renderMockData = () => {
    setConfidenceData({ score: 7, reason: "High potential (Demo Mode)" });
    setAssumptions([
      { id: 1, label: "Business Type", value: "SaaS Platform", isConfirmed: false },
      { id: 2, label: "Resources", value: "Open source tools", isConfirmed: false }
    ]);
    setIsAnalyzing(false);
    setCurrentScreen(2);
  };

  const handleUpdateAssumption = (id, newValue) => {
    setAssumptions(assumptions.map(a => a.id === id ? { ...a, value: newValue } : a));
  };

  const handleConfirmAssumption = (id) => {
    setAssumptions(assumptions.map(a => a.id === id ? { ...a, isConfirmed: true } : a));
  };

  const allAssumptionsConfirmed = assumptions.length > 0 && assumptions.every(a => a.isConfirmed);

  const handleGeneratePlan = async () => {
    // 1. Ensure all assumptions are confirmed before proceeding
    if (!allAssumptionsConfirmed) return;
    setIsGeneratingPlan(true);

    try {
      // 2. Exact keys required by the backend
      const response = await fetch("http://localhost:8000/generate-plan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brain_dump: brainDump,
          // THIS IS THE FIX: Map to objects with 'id' and 'value'
          resolved_assumptions: assumptions.map(a => ({ id: a.id, value: a.value }))
        })
      });

      if (!response.ok) {
        throw new Error(`Backend rejected with status: ${response.status}`);
      }

      const data = await response.json();

      // 3. Update the plan state
      setPlan({
        milestones: {
          day30: data.plan?.milestones?.day30 || "Validate with 3 real people",
          day60: data.plan?.milestones?.day60 || "Build minimal wireframe",
          day90: data.plan?.milestones?.day90 || "Launch/Public test"
        },
        microTask: data.plan?.microTask || "Write 3 sentences describing your idea."
      });

      // 4. Force screen change
      setCurrentScreen(3);
      setIsGeneratingPlan(false);

    } catch (error) {
      console.error("API Error during plan generation:", error);
      // Fallback for demo mode
      setPlan({
        milestones: { day30: "Validate core idea", day60: "Build MVP", day90: "Launch" },
        microTask: "Write 3 sentences describing your idea and send to one person."
      });
      setCurrentScreen(3); // Move to screen 3 anyway
      setIsGeneratingPlan(false);
    }
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
            <span className="text-sm text-zinc-500">{brainDump.length} characters</span>
            <button
              onClick={handleAnalyzeThoughts}
              disabled={!brainDump.trim() || isAnalyzing}
              className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? loadingMessage : "Analyze My Thoughts"}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: Ambiguity Ledger */}
      {currentScreen === 2 && (
        <div className="w-full max-w-2xl flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="text-center">
            <h2 className="text-2xl font-medium text-white mb-2">Ambiguity Ledger</h2>
            <div className="inline-block px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/20">
              Confidence: {confidenceData.score}/10 — {confidenceData.reason}
            </div>
          </div>
          <div className="space-y-4">
            {assumptions.map((assumption) => (
              <div key={assumption.id} className={`p-4 border rounded-xl transition-all ${assumption.isConfirmed ? 'border-green-500/50 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                <p className="text-sm text-zinc-400 mb-2">{assumption.label} Assumption</p>
                <input
                  type="text"
                  value={assumption.value}
                  onChange={(e) => handleUpdateAssumption(assumption.id, e.target.value)}
                  disabled={assumption.isConfirmed}
                  className="w-full bg-transparent text-white border-b border-zinc-700 pb-2 focus:border-blue-500 outline-none disabled:opacity-50"
                />
                {!assumption.isConfirmed && (
                  <button onClick={() => handleConfirmAssumption(assumption.id)} className="mt-4 text-sm text-blue-400 hover:text-blue-300">
                    Confirm Assumption
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleGeneratePlan} disabled={!allAssumptionsConfirmed || isGeneratingPlan} className="w-full mt-4 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isGeneratingPlan ? "Building Strategy..." : "Generate Action Horizon"}
          </button>
        </div>
      )}

      {/* SCREEN 3: Action Horizon */}
      {currentScreen === 3 && plan && (
        <div className="w-full max-w-5xl animate-in fade-in duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-medium text-white">Action Horizon</h2>
            <p className="text-zinc-400">Your custom execution trajectory.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-900/50 flex flex-col gap-6">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-4">Milestones</h3>
              <div className="space-y-4">
                <p><span className="text-blue-400 font-mono text-sm">DAY 30:</span> {plan.milestones.day30}</p>
                <p><span className="text-blue-400 font-mono text-sm">DAY 60:</span> {plan.milestones.day60}</p>
                <p><span className="text-blue-400 font-mono text-sm">DAY 90:</span> {plan.milestones.day90}</p>
              </div>
            </div>
            <div className="p-8 border border-blue-500/30 rounded-xl bg-blue-500/5 flex flex-col gap-6 relative">
              <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-black text-xs font-bold rounded-bl-lg rounded-tr-xl">15-MIN FOCUS</div>
              <h3 className="text-lg font-medium text-white mt-2">Your First Step</h3>
              <p className="text-xl leading-relaxed">{plan.microTask}</p>
              <button className="mt-auto w-full px-6 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-all" onClick={() => alert("Task Claimed! You are officially in motion.")}>
                Approve & Claim Task
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}