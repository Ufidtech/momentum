import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "Momentum API is active"}

@patch("main.get_gemini_client")
def test_analyze_ambiguity_success(mock_get_client):
    # will test the client and also generate_content output
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"confidence_score": 7, "confidence_reason": "No timeline specified", "assumptions": [{"id": 1, "label": "Budget", "default_value": "Assumed $0 budget"}]}'
    mock_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_client

    payload = {
        "brain_dump": "I want to start a podcast about computer history but don't know what mic to buy.",
        "sentiment_score": 0.4,
        "word_count": 14
    }
    response = client.post("/analyze-ambiguity/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["confidence_score"] == 7
    assert data["confidence_reason"] == "No timeline specified"
    assert data["assumptions"][0]["id"] == 1
    assert data["assumptions"][0]["editable"] is True

@patch("main.get_gemini_client")
def test_analyze_ambiguity_json_parse_fallback(mock_get_client):
    # If the response is not valid JSON, it should fall back to standard JSON fallback structure.
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is not JSON at all!"
    mock_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_client

    payload = {
        "brain_dump": "I want to start a podcast about computer history but don't know what mic to buy.",
        "sentiment_score": 0.4,
        "word_count": 14
    }
    response = client.post("/analyze-ambiguity/", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Should contain fallback values
    assert data["confidence_score"] == 5
    assert len(data["assumptions"]) == 2
    assert data["assumptions"][0]["label"] == "Budget"

@patch("main.get_gemini_client")
def test_generate_plan_success(mock_get_client):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"milestones": {"day30": "Draft outline", "day60": "Record 1 ep", "day90": "Publish"}, "micro_task": "Write 3 sentences"}'
    mock_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_client

    payload = {
        "brain_dump": "I want to start a podcast about computer history but don't know what mic to buy.",
        "resolved_assumptions": [
            {"id": 1, "value": "I have $100 budget"}
        ]
    }
    response = client.post("/generate-plan/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["milestones"]["day30"] == "Draft outline"
    assert data["micro_task"] == "Write 3 sentences"

@patch("main.get_gemini_client")
def test_generate_plan_fallback(mock_get_client):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Invalid JSON string"
    mock_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_client

    payload = {
        "brain_dump": "I want to start a podcast about computer history but don't know what mic to buy.",
        "resolved_assumptions": [
            {"id": 1, "value": "I have $100 budget"}
        ]
    }
    response = client.post("/generate-plan/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "milestones" in data
    assert "day30" in data["milestones"]
    assert "micro_task" in data
