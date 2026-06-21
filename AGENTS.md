# AI Coding Agent Instructions for Project: Momentum

You are helping build "Momentum", a Cognitive Translation Layer for the USAII Global AI Hackathon 2026. Adhere strictly to the following architectural constraints and product rules.

## Hard Technical Constraints

- **Frontend Stack**: Next.js (App Router) + Tailwind CSS.
- **Language**: Pure Vanilla JavaScript ONLY. Do NOT write TypeScript, types, interfaces, or use `.ts`/`.tsx` extensions.
- **Backend Stack**: FastAPI (Python). Django is strictly forbidden.
- **AI Model Naming**: Every backend call must use the exact model string `gemini-2.5-flash-lite`.

## Core Product Workflows

The app is a decoupled 3-stage single-page application pipeline.

1. **Screen 1: Brain Dump**: A minimalist, dark-themed page centered around a single massive text field. Runs local sentiment analysis via `Transformers.js` (`Xenova/all-MiniLM-L6-v2`) before calling the backend.
2. **Screen 2: Ambiguity Ledger**: Shows an AI confidence score and 2-3 interactive assumption cards. The UI must hard-code a block preventing the user from moving forward until they manually confirm or edit every single card.
3. **Screen 3: Action Horizon**: A split-pane screen showing a sequential 3-phase trajectory on the left (Phase 1: immediate next move, Phase 2: builds on Phase 1, Phase 3: the broader target — no fixed day counts or deadlines, since people progress at different speeds), and exactly ONE 15-minute concrete micro-task on the right, claimed via a live 15-minute commitment timer with an optional on-device before/after reflection check.

## Responsible AI Style Guidelines

- BANNED prescriptive verbs in generated copy: "you must", "you should", "the correct steps are".
- ALLOWED conditional phrasing: "a possible path", "based on your constraints", "one option to explore".
