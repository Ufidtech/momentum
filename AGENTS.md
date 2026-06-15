# AI Coding Agent Instructions for Project: Momentum

[cite_start]You are helping build "Momentum", a Cognitive Translation Layer for the USAII Global AI Hackathon 2026[cite: 3, 5, 17]. [cite_start]Adhere strictly to the following architectural constraints and product rules[cite: 5].

## 🛑 Hard Technical Constraints

- [cite_start]**Frontend Stack**: Next.js (App Router) + Tailwind CSS[cite: 5, 23, 81].
- [cite_start]**Language**: Pure Vanilla JavaScript ONLY[cite: 5, 81]. Do NOT write TypeScript, types, interfaces, or use `.ts`/`.tsx` extensions.
- **Backend Stack**: FastAPI (Python). [cite_start]Django is strictly forbidden[cite: 5, 82].
- [cite_start]**AI Model Naming**: Every backend Anthropic call must use the exact model string `claude-sonnet-4-6`[cite: 5, 82].

## 🧠 Core Product Workflows

[cite_start]The app is a decoupled 3-stage single-page application pipeline[cite: 23]:

1. [cite_start]**Screen 1: Brain Dump**: A minimalist, dark-themed page centered around a single massive text field[cite: 24, 31, 32]. [cite_start]Runs local sentiment analysis via `Transformers.js` (`Xenova/all-MiniLM-L6-v2`) before calling the backend[cite: 36, 51].
2. [cite_start]**Screen 2: Ambiguity Ledger**: Shows an AI confidence score and 2-3 interactive assumption cards[cite: 24, 42, 43]. [cite_start]**CRITICAL GATE**: The UI must hard-code a block preventing the user from moving forward until they manually confirm or edit every single card[cite: 46, 47, 48].
3. [cite_start]**Screen 3: Action Horizon**: A split-pane screen showing a broad 30/60/90-day trajectory on the left, and exactly ONE 15-minute concrete micro-task on the right[cite: 24, 58, 59, 60].

## 🛡️ Responsible AI Style Guidelines

- [cite_start]BANNED prescriptive verbs in generated copy: "you must", "you should", "the correct steps are"[cite: 72, 77, 79].
- [cite_start]ALLOWED conditional phrasing: "a possible path", "based on your constraints", "one option to explore"[cite: 72, 79].
