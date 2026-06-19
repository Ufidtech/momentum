"use client";

import { useEffect, useRef, useState } from "react";

export default function MomentumApp() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [brainDump, setBrainDump] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");

  const [confidenceData, setConfidenceData] = useState({
    score: 0,
    reason: "",
  });
  const [assumptions, setAssumptions] = useState([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const [plan, setPlan] = useState(null);
  const [isTaskApproved, setIsTaskApproved] = useState(false);

  const [localMetadata, setLocalMetadata] = useState({
    sentiment_score: 0.5,
    word_count: 0,
    char_count: 0,
  });

  const worker = useRef(null);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map());

  useEffect(() => {
    const aiWorker = new Worker(new URL("../lib/worker.js", import.meta.url), {
      type: "module",
    });

    aiWorker.addEventListener("message", (event) => {
      const { id, ok, payload, error } = event.data || {};
      const pending = pendingRequestsRef.current.get(id);

      if (!pending) return;

      if (ok) {
        pending.resolve(payload);
      } else {
        pending.reject(new Error(error || "Worker failed"));
      }

      pendingRequestsRef.current.delete(id);
    });

    worker.current = aiWorker;

    return () => {
      aiWorker.terminate();
      worker.current = null;
      pendingRequestsRef.current.clear();
    };
  }, []);

  const analyzeLocally = (text) => {
    return new Promise((resolve, reject) => {
      if (!worker.current) {
        reject(new Error("Worker not ready"));
        return;
      }

      const id = ++requestIdRef.current;
      pendingRequestsRef.current.set(id, { resolve, reject });
      worker.current.postMessage({ id, text });
    });
  };

  const renderMockData = () => {
    setConfidenceData({
      score: 7,
      reason: "Idea has strong signals but key details are missing",
    });
    setAssumptions([
      {
        id: 1,
        label: "Budget",
        default_value: "Assumed $0 budget and free tools only",
        value: "Assumed $0 budget and free tools only",
        isConfirmed: false,
      },
      {
        id: 2,
        label: "Experience",
        default_value: "Assumed no prior technical experience",
        value: "Assumed no prior technical experience",
        isConfirmed: false,
      },
    ]);
    setIsAnalyzing(false);
    setCurrentScreen(2);
  };

  const handleAnalyzeThoughts = async () => {
    if (!brainDump.trim()) return;

    setIsAnalyzing(true);
    setLoadingMessage("Analyzing locally...");

    try {
      const localData = await analyzeLocally(brainDump);
      setLocalMetadata(localData);

      setLoadingMessage("Connecting to AI Layer...");

      const response = await fetch("http://localhost:8000/analyze-ambiguity/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brain_dump: brainDump,
          sentiment_score: localData.sentiment_score,
          word_count: localData.word_count,
        }),
      });

      if (!response.ok) {
        console.warn("Backend error, triggering Demo Mode...");
        renderMockData();
        return;
      }

      const data = await response.json();

      setConfidenceData({
        score: data.confidence_score ?? 7,
        reason: data.confidence_reason ?? "Analysis complete",
      });

      setAssumptions(
        (data.assumptions || []).map((item) => ({
          id: item.id,
          label: item.label || "Assumption",
          default_value: item.default_value || "",
          value: item.default_value || "",
          isConfirmed: false,
        }))
      );

      setIsAnalyzing(false);
      setCurrentScreen(2);
    } catch (error) {
      console.error("Connection or worker error:", error);
      renderMockData();
    }
  };

  const handleUpdateAssumption = (id, newValue) => {
    setAssumptions((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              value: newValue,
              isConfirmed: false,
            }
          : a
      )
    );
  };

  const handleConfirmAssumption = (id) => {
    setAssumptions((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              isConfirmed: true,
            }
          : a
      )
    );
  };

  const allAssumptionsConfirmed =
    assumptions.length > 0 && assumptions.every((a) => a.isConfirmed);

  const handleGeneratePlan = async () => {
    if (!allAssumptionsConfirmed) return;

    setIsGeneratingPlan(true);

    try {
      const response = await fetch("http://localhost:8000/generate-plan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brain_dump: brainDump,
          resolved_assumptions: assumptions.map((a) => ({
            id: a.id,
            value: a.value,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend rejected with status: ${response.status}`);
      }

      const data = await response.json();

      setPlan({
        milestones: {
          day30: data.milestones?.day30 || "Validate with 3 real people",
          day60: data.milestones?.day60 || "Build minimal wireframe",
          day90: data.milestones?.day90 || "Launch/public test",
        },
        micro_task:
          data.micro_task ||
          "Write 3 sentences describing your idea and send it to one person you trust.",
      });

      setIsTaskApproved(false);
      setCurrentScreen(3);
      setIsGeneratingPlan(false);
    } catch (error) {
      console.error("API Error during plan generation:", error);

      setPlan({
        milestones: {
          day30: "Validate the core idea with 3 real people",
          day60: "Build a minimal working prototype",
          day90: "Launch publicly and gather feedback",
        },
        micro_task:
          "Write 3 sentences describing your idea and send it to one person you trust for honest feedback.",
      });

      setIsTaskApproved(false);
      setCurrentScreen(3);
      setIsGeneratingPlan(false);
    }
  };

  const handleApproveTask = () => {
    setIsTaskApproved(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">

      {/* Premium AI Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">

        {/* Base */}
        <div className="absolute inset-0 bg-[#030712]" />

        {/* Top Left Glow */}
        <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full bg-violet-600/60 blur-[120px]" />

        {/* Bottom Right Glow */}
        <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full bg-indigo-600/60 blur-[120px]" />

        {/* Center subtle glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[150px]" />

        {/* Dark center overlay to keep content readable */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#030712_70%)]" />

        {/* Radial Overlay */}
        {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030712_75%)]" /> */}

        {/* Wave Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-100"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${120 + i * 45}
                  C300 ${60 + i * 45},
                  700 ${200 + i * 45},
                  1440 ${120 + i * 45}`}
              stroke="rgba(99,102,241,0.35)"
              strokeWidth="1"
              fill="none"
            />
          ))}
        </svg>

        {/* Stars — bright and visible */}
        <div className="absolute top-[10%] left-[8%] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_3px_rgba(255,255,255,0.9)]" />
        <div className="absolute top-[18%] left-[20%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_2px_rgba(255,255,255,0.8)]" />
        <div className="absolute top-[8%] left-[35%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_2px_rgba(255,255,255,0.8)]" />
        <div className="absolute top-[14%] left-[50%] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_3px_rgba(255,255,255,0.9)]" />
        <div className="absolute top-[6%] right-[30%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_2px_rgba(255,255,255,0.8)]" />
        <div className="absolute top-[20%] right-[15%] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_3px_rgba(255,255,255,0.9)]" />
        <div className="absolute top-[30%] right-[25%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_2px_rgba(255,255,255,0.8)]" />
        <div className="absolute top-[35%] left-[12%] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_3px_rgba(255,255,255,0.9)]" />
        <div className="absolute top-[5%] right-[8%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_2px_rgba(255,255,255,0.8)]" />
      </div>

      {/* Navigation */}
      <nav className="px-10 py-5 border-b border-white/10 backdrop-blur-xl bg-black/10">
        <span className="text-2xl font-bold text-indigo-500">
          Momentum
        </span>
      </nav>

      {/* SCREEN 1 - Brain Dump */}
      {currentScreen === 1 && (
        <div className="max-w-4xl mx-auto px-10 py-20 flex flex-col gap-8 animate-in fade-in duration-500">
          <div className="space-y-3">
            <h1 className="text-6xl font-extrabold tracking-tight text-white">
              What&apos;s on your mind today
              <span className="text-indigo-500">?</span>
            </h1>
            <p className="text-lg text-zinc-400">
              Describe your goals, worries, or ideas. We&apos;ll help you find your first step.
            </p>
          </div>

          <textarea
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            placeholder="Type your thoughts, goals, challenges, or ideas freely..."
            className="w-full h-72 p-6 bg-[#0f172a]/60 backdrop-blur-xl border border-zinc-700 rounded-xl text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-zinc-600 shadow-[0_0_40px_rgba(99,102,241,0.08)]"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              {brainDump.length} / 2000 characters
            </span>
            <button
              onClick={handleAnalyzeThoughts}
              disabled={!brainDump.trim() || isAnalyzing}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? loadingMessage : "Analyze My Thoughts →"}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2 - Ambiguity Ledger */}
      {currentScreen === 2 && (
        <div className="max-w-3xl mx-auto px-10 py-16 flex flex-col gap-8 animate-in fade-in duration-500">
          <div className="space-y-3">
            <h2 className="text-5xl font-bold text-white">
              Ambiguity Ledger
            </h2>
            <p className="text-lg text-zinc-400">
              Review the assumptions AI made. Confirm or correct them before we build your plan.
            </p>
          </div>

          {/* Confidence Score Card */}
          <div className="px-8 py-6 bg-[#111827]/80 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.08)]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">
                  Confidence Score
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-3">
                  High Potential
                </div>
                <p className="text-zinc-200 text-lg font-medium">
                  {confidenceData.reason}
                </p>
                <p className="text-sm text-zinc-400 mt-2">
                  Based on the clarity, feasibility, and completeness of your input.
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-indigo-400 leading-none">
                  {confidenceData.score}
                  <span className="text-zinc-500 text-2xl">/10</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  AI Confidence
                </p>
              </div>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 transition-all duration-700"
                style={{ width: `${confidenceData.score * 10}%` }}
              />
            </div>
          </div>

          {/* Assumption Cards */}
          <div className="space-y-4">
            {assumptions.map((assumption) => (
              <div
                key={assumption.id}
                className={`p-5 border rounded-xl transition-all ${
                  assumption.isConfirmed
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-zinc-700 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_0_40px_rgba(99,102,241,0.08)]"
                }`}
              >
                <p className="text-white font-bold text-lg mb-1">
                  {assumption.label} Assumption
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                  What the AI assumed — edit if incorrect
                </p>
                <textarea
                  value={assumption.value}
                  onChange={(e) =>
                    handleUpdateAssumption(assumption.id, e.target.value)
                  }
                  disabled={assumption.isConfirmed}
                  placeholder="Correct this assumption if needed..."
                  className="w-full min-h-20 bg-[#1F2937] text-white border border-zinc-700 rounded-lg p-3 focus:border-indigo-500 outline-none disabled:opacity-50 resize-none placeholder:text-zinc-600"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500">
                    {assumption.isConfirmed ? "✓ Confirmed" : "Pending review"}
                  </span>
                  {!assumption.isConfirmed && (
                    <button
                      onClick={() => handleConfirmAssumption(assumption.id)}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Confirm Assumption
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={!allAssumptionsConfirmed || isGeneratingPlan}
            className="w-full mt-4 px-6 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGeneratingPlan ? "Building Strategy..." : "Generate Action Horizon →"}
          </button>

          {!allAssumptionsConfirmed && (
            <p className="text-center text-sm text-zinc-500">
              Confirm all assumptions above to continue.
            </p>
          )}
        </div>
      )}

      {/* SCREEN 3 - Action Horizon */}
      {currentScreen === 3 && plan && (
        <div className="max-w-6xl mx-auto px-10 py-16 flex flex-col gap-8 animate-in fade-in duration-500">
          <div className="space-y-2">
            <h2 className="text-5xl font-bold text-white">Action Horizon</h2>
            <p className="text-lg text-zinc-400">
              Your custom execution trajectory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Milestones Card */}
            <div className="p-8 border border-zinc-700 rounded-xl bg-[#0f172a]/60 backdrop-blur-xl flex flex-col gap-6 shadow-[0_0_40px_rgba(99,102,241,0.08)]">
              <h3 className="text-xl font-bold text-white border-b border-zinc-700 pb-4">
                Milestones
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-indigo-400 font-mono text-sm mb-2">DAY 30</p>
                  <textarea
                    value={plan.milestones.day30}
                    onChange={(e) =>
                      setPlan((prev) => ({
                        ...prev,
                        milestones: { ...prev.milestones, day30: e.target.value },
                      }))
                    }
                    className="w-full min-h-16 bg-[#0B0F19] border border-zinc-700 rounded-lg p-3 text-white resize-none outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <p className="text-indigo-400 font-mono text-sm mb-2">DAY 60</p>
                  <textarea
                    value={plan.milestones.day60}
                    onChange={(e) =>
                      setPlan((prev) => ({
                        ...prev,
                        milestones: { ...prev.milestones, day60: e.target.value },
                      }))
                    }
                    className="w-full min-h-16 bg-[#0B0F19] border border-zinc-700 rounded-lg p-3 text-white resize-none outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <p className="text-indigo-400 font-mono text-sm mb-2">DAY 90</p>
                  <textarea
                    value={plan.milestones.day90}
                    onChange={(e) =>
                      setPlan((prev) => ({
                        ...prev,
                        milestones: { ...prev.milestones, day90: e.target.value },
                      }))
                    }
                    className="w-full min-h-16 bg-[#0B0F19] border border-zinc-700 rounded-lg p-3 text-white resize-none outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Focus Task Card */}
            <div className="p-8 border border-indigo-500/30 rounded-xl bg-indigo-500/5 backdrop-blur-xl flex flex-col gap-6 relative">
              <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-bl-lg rounded-tr-xl">
                15-MIN FOCUS
              </div>
              <h3 className="text-xl font-bold text-white mt-2">
                Your First Step
              </h3>
              <textarea
                value={plan.micro_task}
                onChange={(e) =>
                  setPlan((prev) => ({
                    ...prev,
                    micro_task: e.target.value,
                  }))
                }
                className="w-full min-h-16 bg-[#0B0F19] border border-zinc-700 rounded-lg p-3 text-xl leading-relaxed text-white resize-none outline-none focus:border-indigo-500"
              />
              <button
                className={`mt-auto w-full px-6 py-4 font-semibold rounded-lg transition-all ${
                  isTaskApproved
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
                onClick={handleApproveTask}
                disabled={isTaskApproved}
              >
                {isTaskApproved ? "✓ Task Approved" : "Approve & Claim Task"}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}