# Momentum Backend API

Momentum is a Cognitive Translation Layer built for the USAII Global AI Hackathon 2026. It takes unstructured, emotionally driven user brain dumps, surfaces operational assumptions through an interactive validation gate, and generates broad trajectory plans with a single hyper-specific first action.

---

## What We Have Done? (Completed)

1. **FastAPI Application Framework**:
   - Initialized FastAPI inside `main.py`.
   - Enabled Cross-Origin Resource Sharing (CORS) so the Next.js frontend running locally on `localhost:3000` can securely connect.
   - Configured structured log traces for easy debugging.

2. **Data Schemas & Validations**:
   - Set up Pydantic validation schemas for both Stage 1 and Stage 2 inputs and outputs, ensuring data integrity.

3. **Gemini API Integration**:
   - Integrated Google's Gemini SDK (`google-genai`) using the exact model string `gemini-2.5-flash-lite`.
   - Designed helper methods for loading environment configuration and cleaning raw markdown JSON blocks returned by the model.
   - Embedded structured catch blocks and fallback responses so the API remains functional even if transient network errors or JSON parsing failures occur.

4. **Engine Prompts**:
   - **Stage 1 (Ambiguity Filter)**: Analyzes brain dumps, computes sentiment scores and word density, outputs 2-3 interactive assumption cards, and provides a reasoned confidence score (1-10).
   - **Stage 2 (Strategic Engine)**: Incorporates user-resolved assumptions, templates broad 30/60/90-day milestone trajectories (using non-prescriptive, conditional language), and outputs exactly one concrete 15-minute micro-task.

5. **Automated Unit Testing**:
   - Developed a test suite in `test_backend.py` containing mocks for endpoint execution, schema validations, and fallback parsing.

---

## Getting Started

### 1. Requirements Installation

Ensure you are in the `backend/` directory, activate your virtual environment, and run:

```powershell
pip install -r requirements.txt
```

### 2. Configure Environment Variables

1. Copy the example template:
   ```powershell
   copy .env.example .env
   ```
2. Open `.env` and fill in your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_from_google_ai_studio
   ```

### 3. Run the FastAPI Server

Launch the local Uvicorn development server:

```powershell
uvicorn main:app --reload
```

- The API will run locally at `http://127.0.0.1:8000`.

---

## Testing the API

### Interactive API Docs (Swagger UI)

Visit `http://127.0.0.1:8000/docs` in your browser. You can click on any route, click "Try it out", edit the JSON inputs, and run real queries against the model.

### Running Automated Unit Tests

Run the mock tests using `pytest` from the project root:

```powershell
pytest backend/test_backend.py
```

---

## What We Need to Do Next!

- **Frontend Initialization**: Set up the Next.js frontend structure inside the `frontend` directory using App Router and Tailwind CSS (pure Vanilla Javascript, no TypeScript).

- **Local Sentiment Model**: Integrate `Transformers.js` (`Xenova/all-MiniLM-L6-v2`) in Screen 1 of the frontend to analyze tone and word density, passing these metrics as metadata to `POST /analyze-ambiguity/`.

- **Frontend-Backend API Connection**: Connect the frontend Single Page Application (SPA) state flow to query:
  1. `POST /analyze-ambiguity/` when submitting the Brain Dump.
  2. `POST /generate-plan/` once the user confirms/edits all cards in the Ambiguity Ledger.

- **Interactive Assumption Cards**: Enforce the block in Screen 2 that prevents the user from proceeding until every single card has been manually checked or edited.
- **Final QA**: Perform full journey end-to-end checks utilizing the synthetic user test scenarios.
