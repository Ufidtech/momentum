# backend/main.py
import os
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from google import genai
from google.genai import types

# load environment variables from .env file
load_dotenv()

# logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("momentum-backend")

# FastAPI app
app = FastAPI(title="Momentum Core API", version="1.0.0")

# CORS access for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# schemas
class AmbiguityRequest(BaseModel):
    brain_dump: str = Field(..., description="The raw unstructured brain dump text.")
    sentiment_score: float = Field(..., description="The local sentiment score of the brain dump.")
    word_count: int = Field(..., description="The word count of the brain dump.")

class AssumptionCard(BaseModel):
    id: int
    label: str
    default_value: str
    editable: bool = True

class AmbiguityResponse(BaseModel):
    confidence_score: int
    confidence_reason: str
    assumptions: List[AssumptionCard]

class ResolvedAssumption(BaseModel):
    id: int
    value: str

class PlanRequest(BaseModel):
    brain_dump: str = Field(..., description="The raw unstructured brain dump text.")
    resolved_assumptions: List[ResolvedAssumption] = Field(..., description="The user-resolved assumptions.")

class Milestones(BaseModel):
    day30: str
    day60: str
    day90: str

class PlanResponse(BaseModel):
    milestones: Milestones
    micro_task: str

# System instructions for both stage1 and stage2.
STAGE1_SYSTEM_PROMPT = """You are an Ambiguity Filter. Your only job is to analyze an unstructured brain dump and identify what critical information is MISSING before a realistic plan can be built.
 
Rules:
- NEVER generate a plan or task list. That is not your job.
- NEVER use prescriptive language: avoid 'you must', 'you should', 'the correct answer is'.
- Output exactly 2-3 assumptions you are forced to make given the missing information.
- Output a confidence score from 1-10 explaining WHY confidence is at that level.
 
Output format (JSON only, no markdown):
{ "confidence_score": 5, "confidence_reason": "Budget and timeline undefined", "assumptions": [ { "id": 1, "label": "Budget", "default_value": "Assumed $0 budget and free tools only" }, { "id": 2, "label": "Experience", "default_value": "Assumed no prior technical experience" } ] }"""

STAGE2_SYSTEM_PROMPT = """You are a Strategic Execution Engine. You receive an idea and a set of confirmed user constraints. Generate a realistic trajectory and one hyper-specific first action.
 
Rules:
- NEVER use: 'you must', 'the correct steps are', 'you need to'. BANNED.
- ALWAYS use: 'a possible path', 'based on your constraints', 'one option to explore'.
- The micro_task must be completable in 15 minutes with no preparation.
- The micro_task must name a specific output (a sentence, a text, a sketch, a number).
- Milestones are trajectories, not instructions. Keep them broad and conditional.
 
Output format (JSON only, no markdown):
{ "milestones": { "day30": "Validate the core idea with 3 real people", "day60": "Build or wireframe a minimal version", "day90": "Share publicly or test with a small group" }, "micro_task": "Write 3 sentences describing your idea and send it to one person you trust for honest feedback." }"""

# global client instance cache
_gemini_client = None

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in the environment variables.")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client

def clean_json_response(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

@app.get("/")
def home():
    return {"status": "Momentum API is active"}

@app.post("/analyze-ambiguity/", response_model=AmbiguityResponse)
async def analyze_ambiguity(request: AmbiguityRequest):
    logger.info("Received analyze-ambiguity request")
    try:
        client = get_gemini_client()
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is missing on the server. Please set the GEMINI_API_KEY environment variable."
        )

    # Format the user content by combining both sentiment metadata and brain dump.
    user_content = f"""[Metadata]
Sentiment Score: {request.sentiment_score}
Word Count: {request.word_count}

[Brain Dump]
{request.brain_dump}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=STAGE1_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
            )
        )
        
        response_text = response.text
        if not response_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Empty response from Gemini API"
            )
            
        logger.info(f"Gemini response raw: {response_text}")
        cleaned_text = clean_json_response(response_text)
        data = json.loads(cleaned_text)
        
        # Ensure 'editable' key exists for frontend
        if "assumptions" in data:
            for item in data["assumptions"]:
                item["editable"] = True
                
        return data

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Gemini response: {e}")
        # Return fallback structured response to prevent user blockage
        fallback = {
            "confidence_score": 5,
            "confidence_reason": "High emotional density detected. Surfacing baseline assumptions.",
            "assumptions": [
                { "id": 1, "label": "Budget", "default_value": "Assumed $0 budget and free tools only", "editable": True },
                { "id": 2, "label": "Experience", "default_value": "Assumed no prior technical experience", "editable": True }
            ]
        }
        return fallback
    except Exception as e:
        logger.error(f"Unexpected error in analyze-ambiguity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error contacting Gemini API: {str(e)}"
        )

@app.post("/generate-plan/", response_model=PlanResponse)
async def generate_plan(request: PlanRequest):
    logger.info("Received generate-plan request")
    try:
        client = get_gemini_client()
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is missing on the server. Please set the GEMINI_API_KEY environment variable."
        )

    # Format the resolved assumptions for the prompt
    assumptions_list = []
    for ass in request.resolved_assumptions:
        assumptions_list.append(f"- Assumption ID {ass.id}: {ass.value}")
    resolved_str = "\n".join(assumptions_list)

    user_content = f"""[Original Brain Dump]
{request.brain_dump}

[Confirmed Constraints & Resolved Assumptions]
{resolved_str}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=STAGE2_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.3,
            )
        )
        
        response_text = response.text
        if not response_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Empty response from Gemini API"
            )
            
        logger.info(f"Gemini response raw: {response_text}")
        cleaned_text = clean_json_response(response_text)
        data = json.loads(cleaned_text)
        return data

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Gemini response: {e}")
        fallback = {
            "milestones": {
                "day30": "A possible path is to draft a basic concept paper.",
                "day60": "Based on your constraints, one option to explore is wireframing a user flow.",
                "day90": "A potential path is sharing a simple mockup with a small group of trusted peers."
            },
            "micro_task": "Write exactly 3 sentences describing the core idea and save it to a local file."
        }
        return fallback
    except Exception as e:
        logger.error(f"Unexpected error in generate-plan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error contacting Gemini API: {str(e)}"
        )