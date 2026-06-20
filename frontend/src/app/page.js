"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE_URL = "https://momentum-backend-qn65.onrender.com";

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
  const [isDemoMode, setIsDemoMode] = useState(false);

  // --- Edge AI worker (Transformers.js, runs locally in-browser) ---
  const workerRef = useRef(null);
  const pendingRequests = useRef(new Map());

  useEffect(() => {
    // Pre-warm the backend the moment the page loads. Free-tier hosts
    // (Render, etc.) sleep after inactivity and can take 30-60s to wake
    // on a cold request — firing this early, while the user is still
    // typing, hides most of that latency by the time they hit submit.
    fetch(`${API_BASE_URL}/`).catch(() => {
      // Ignore errors here — handleAnalyzeThoughts has its own fallback
      // if the backend is still genuinely unreachable later.
    });
  }, []);

  useEffect(() => {
    // Spin up the worker once, client-side only.
    workerRef.current = new Worker(
      new URL("../lib/worker.js", import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { id, ok, payload, error } = event.data || {};
      const pending = pendingRequests.current.get(id);
      if (!pending) return;
      pendingRequests.current.delete(id);
      if (ok) {
        pending.resolve(payload);
      } else {
        pending.reject(new Error(error || "Worker analysis failed"));
      }
    };

    workerRef.current.onerror = (err) => {
      pendingRequests.current.forEach(({ reject }) => reject(err));
      pendingRequests.current.clear();
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Runs local embedding/sentiment extraction in the Web Worker.
  // Falls back to a lightweight local heuristic if the worker isn't ready,
  // errors out, or takes too long (e.g. slow first-time model download),
  // so the UI never blocks on the edge-AI step.
  const runLocalAnalysis = (text) => {
    return new Promise((resolve) => {
      const fallback = () => {
        resolve({
          sentiment_score: 0.5,
          word_count: text.split(/\s+/).filter((w) => w.length > 0).length,
          char_count: text.length,
        });
      };

      if (!workerRef.current) {
        fallback();
        return;
      }

      const id = `${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        pendingRequests.current.delete(id);
        fallback();
      }, 8000);

      pendingRequests.current.set(id, {
        resolve: (payload) => {
          clearTimeout(timeout);
          resolve(payload);
        },
        reject: () => {
          clearTimeout(timeout);
          fallback();
        },
      });

      workerRef.current.postMessage({ id, text });
    });
  };

  const renderMockData = () => {
    setIsDemoMode(true);
    setConfidenceData({
      score: 7,
      reason: "High potential (Demo Mode)",
    });
    setAssumptions([
      {
        id: 1,
        label: "Budget",
        value: "Assumed $0 budget and free tools only",
        isConfirmed: false,
      },
      {
        id: 2,
        label: "Experience",
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
    setIsDemoMode(false);
    setLoadingMessage("Running local AI analysis...");

    try {
      // Edge AI step: real local sentiment/embedding extraction via Transformers.js,
      // running entirely in the browser before anything hits the network.
      const localData = await runLocalAnalysis(brainDump);

      setLoadingMessage("Connecting to AI Layer...");

      const response = await fetch(`${API_BASE_URL}/analyze-ambiguity/`, {
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
          value: item.default_value || "",
          isConfirmed: false,
        }))
      );

      setIsAnalyzing(false);
      setCurrentScreen(2);
    } catch (error) {
      console.error("Connection error:", error);
      renderMockData();
    }
  };

  const handleUpdateAssumption = (id, newValue) => {
    setAssumptions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, value: newValue, isConfirmed: false } : a
      )
    );
  };

  const handleConfirmAssumption = (id) => {
    setAssumptions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isConfirmed: true } : a))
    );
  };

  const allAssumptionsConfirmed =
    assumptions.length > 0 && assumptions.every((a) => a.isConfirmed);

  const handleGeneratePlan = async () => {
    if (!allAssumptionsConfirmed) return;

    setIsGeneratingPlan(true);

    try {
      const response = await fetch(`${API_BASE_URL}/generate-plan/`, {
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
          phase1: data.milestones?.phase1 || "Validate with 3 real people",
          phase2: data.milestones?.phase2 || "Build minimal wireframe",
          phase3: data.milestones?.phase3 || "Launch/public test",
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
      setIsDemoMode(true);
      setPlan({
        milestones: {
          phase1: "Validate core idea",
          phase2: "Build MVP",
          phase3: "Launch",
        },
        micro_task:
          "Write 3 sentences describing your idea and send to one person.",
      });
      setIsTaskApproved(false);
      setCurrentScreen(3);
      setIsGeneratingPlan(false);
    }
  };

  const handleApproveTask = () => {
    setIsTaskApproved(true);
  };

  const handleStartOver = () => {
    setBrainDump("");
    setAssumptions([]);
    setPlan(null);
    setIsTaskApproved(false);
    setConfidenceData({ score: 0, reason: "" });
    setCurrentScreen(1);
    setIsAnalyzing(false);
    setIsGeneratingPlan(false);
    setLoadingMessage("Processing...");
    setIsDemoMode(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-50 pb-16">
      {currentScreen === 1 && (
        <div className="w-full max-w-3xl flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-medium tracking-tight text-white">
              Momentum
            </h1>
            <p className="text-zinc-400">
              Pour out your idea. Don&apos;t organize it. Just type.
            </p>
          </div>

          <textarea
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            spellCheck="false"
            autoComplete="off"
            placeholder="I want to start a... but I'm worried about..."
            className="w-full h-64 p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-zinc-600"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              {brainDump.length} characters
            </span>
            <button
              onClick={() => {
                if (!brainDump.trim() || isAnalyzing) return;
                handleAnalyzeThoughts();
              }}
              className={`px-6 py-3 font-medium rounded-lg transition-all ${!brainDump.trim() || isAnalyzing
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-white text-black active:bg-zinc-300 hover:bg-zinc-200"
                }`}
            >
              {isAnalyzing ? loadingMessage : "Analyze My Thoughts"}
            </button>
          </div>
        </div>
      )}

      {currentScreen === 2 && (
        <div className="w-full max-w-2xl flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="text-center">
            <h2 className="text-2xl font-medium text-white mb-2">
              Ambiguity Ledger
            </h2>
            {isDemoMode && (
              <div className="mb-2 inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/30">
                Demo Mode — sample output (live AI unreachable)
              </div>
            )}
            <div className="inline-block px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/20">
              Confidence: {confidenceData.score}/10 — {confidenceData.reason}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Based on your constraints, a few assumptions are still unresolved.
            </p>
          </div>

          <div className="space-y-4">
            {assumptions.map((assumption) => (
              <div
                key={assumption.id}
                className={`p-4 border rounded-xl transition-all ${assumption.isConfirmed
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-zinc-800 bg-zinc-900"
                  }`}
              >
                <p className="text-sm text-zinc-400 mb-2">
                  {assumption.label} Assumption
                </p>
                <textarea
                  value={assumption.value}
                  onChange={(e) =>
                    handleUpdateAssumption(assumption.id, e.target.value)
                  }
                  disabled={assumption.isConfirmed}
                  className="w-full min-h-20 bg-transparent text-white border border-zinc-700 rounded-lg p-3 focus:border-blue-500 outline-none disabled:opacity-50 resize-none"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500">
                    {assumption.isConfirmed ? "Confirmed" : "Pending review"}
                  </span>
                  {!assumption.isConfirmed && (
                    <button
                      onClick={() => handleConfirmAssumption(assumption.id)}
                      className="text-sm text-blue-400 hover:text-blue-300"
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
            className={`w-full mt-4 px-6 py-3 font-medium rounded-lg transition-all ${!allAssumptionsConfirmed || isGeneratingPlan
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-white text-black active:bg-zinc-300 hover:bg-zinc-200"
              }`}
          >
            {isGeneratingPlan
              ? "Building Strategy..."
              : "Generate Action Horizon"}
          </button>

          {!allAssumptionsConfirmed && (
            <p className="text-center text-sm text-zinc-500">
              Screen 3 is blocked until every assumption is confirmed.
            </p>
          )}
        </div>
      )}

      {currentScreen === 3 && plan && (
        <div className="w-full max-w-5xl animate-in fade-in duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-medium text-white">Action Horizon</h2>
            <p className="text-zinc-400">
              Your custom execution trajectory.
            </p>
            {isDemoMode && (
              <div className="mt-3 inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/30">
                Demo Mode — sample output (live AI unreachable)
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-900/50 flex flex-col gap-6">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-4">
                Milestones
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-blue-400 font-mono text-sm mb-2">PHASE 1: IMMEDIATE</p>
                  <textarea
                    value={plan.milestones.phase1}
                    onChange={(e) =>
                      setPlan((prev) => ({
                        ...prev,
                        milestones: { ...prev.milestones, phase1: e.target.value },
                      }))
                    }
                    className="w-full min-h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white resize-none outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <p className="text-blue-400 font-mono text-sm mb-2">PHASE 2: EXECUTION</p>
                  <textarea
                    value={plan.milestones.phase2}
                    onChange={(e) =>
                      setPlan((prev) => ({
                        ...prev,
                        milestones: { ...prev.milestones, phase2: e.target.value },
                      }))
                    }
                    className="w-full min-h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white resize-none outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <p className="text-blue-400 font-mono text-sm mb-2">PHASE 3: TARGET GOAL</p>
                  <textarea
                    value={plan.milestones.phase3}
                    onChange={(e) =>
                      setPlan((prev) => ({
                        ...prev,
                        milestones: { ...prev.milestones, phase3: e.target.value },
                      }))
                    }
                    className="w-full min-h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white resize-none outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 border border-blue-500/30 rounded-xl bg-blue-500/5 flex flex-col gap-6 relative">
              <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-black text-xs font-bold rounded-bl-lg rounded-tr-xl">
                15-MIN FOCUS
              </div>

              <h3 className="text-lg font-medium text-white mt-2">
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
                className="w-full min-h-40 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xl leading-relaxed text-white resize-none outline-none focus:border-blue-500"
              />

              <button
                className={`mt-auto w-full px-6 py-4 font-medium rounded-lg transition-all ${isTaskApproved
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                onClick={handleApproveTask}
                disabled={isTaskApproved}
              >
                {isTaskApproved ? "Task Approved" : "Approve & Claim Task"}
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handleStartOver}
              className="text-sm text-zinc-500 hover:text-white transition-all underline decoration-zinc-700 underline-offset-4"
            >
              Start a new idea
            </button>
          </div>

        </div>
      )}
    </main>
  );
}