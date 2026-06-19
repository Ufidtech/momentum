# Momentum

**Cognitive Translation Layer: verbal chaos → structured execution.**
Built for the **USAII Global AI Hackathon 2026** | Undergraduate Track (AI for Life, Learning & Work)

## The Problem: Overwhelmed Explorer Syndrome

High-potential individuals stall because abstract goals generate cognitive paralysis. Existing structured tools (like Notion) require users to already think in categories. Generic AI chat tools produce 47-step monolithic to-do lists that increase decision anxiety.

## The Solution

Momentum is not a task generator; it is a **Cognitive Translation Layer**. It takes unstructured, emotionally overwhelmed human syntax and translates it into structured, objective milestones with a human-in-the-loop verification process.

### The 3-Stage Pipeline:

1. **Screen 1: Brain Dump** - Raw verbal chaos input. Evaluated locally on the Edge via `Transformers.js` to extract sentiment and metadata without hitting the cloud.
2. **Screen 2: Ambiguity Ledger** - The System surfaces assumptions it must make to proceed. **Hard Gate:** The user must manually confirm or edit every assumption before proceeding. (Responsible AI Design).
3. **Screen 3: Action Horizon** - Generates broad 30/60/90-day trajectory milestones and exactly **ONE** 15-minute actionable micro-task.

## Tech Stack & Architecture

### **Frontend (Client & Edge)**

- **Framework:** Next.js (App Router) + React
- **Styling:** Tailwind CSS
- **Edge AI Preprocessing:** `Transformers.js` (`Xenova/all-MiniLM-L6-v2`) via Web Workers for zero-latency local sentiment extraction.
- **Resilience:** Built with zero-crash fallback architecture. If the Cloud AI layer times out (e.g., 503 errors), the UI seamlessly falls back to a locally mocked Demo Mode to ensure presentation continuity.

### **Backend (Cloud AI Layer)**

- **Framework:** FastAPI (Python)
- **AI Models:** Gemini API (`gemini-2.5-flash-lite`)
- **Architecture:** Stateless REST API receiving Edge-processed metadata and raw text to orchestrate LLM reasoning.

## How to Run Locally

### 1. Start the Backend (FastAPI)

```bash
cd backend
# Create and activate virtual environment
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
# Install dependencies
pip install -r requirements.txt
# Run the server
python -m uvicorn main:app --reload
```

_The backend will run on http://localhost:8000_

### 2. Start the Frontend (Next.js)

```bash
cd frontend
# Install dependencies
npm install
# Start the development server
npm run dev
```

_The frontend will run on http://localhost:3000_

---

## Responsible AI Guiding Principles

- **No Prescriptive Language:** The AI is system-prompted to avoid "you must" or "the correct steps are".
- **Human Sovereignty:** The AI never assigns a task. It proposes options, and the user must explicitly click "Approve & Claim Task" to lock it into their session.
- **Transparent Uncertainty:** AI confidence scores are surfaced immediately, powered by the Ambiguity Ledger highlighting exactly what data the AI is missing.

---
