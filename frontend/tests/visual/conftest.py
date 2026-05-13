"""
Shared fixtures for browser-use visual / AI tests.

Requires:
  - ANTHROPIC_API_KEY or OPENAI_API_KEY in environment (or .env at project root)
  - WheelCheck backend running on :8080
  - WheelCheck frontend running on :3000
"""
import os
import pytest
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
_root = Path(__file__).parent.parent.parent.parent
load_dotenv(_root / ".env", override=False)

FRONTEND_URL = os.getenv("WHEELCHECK_FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("WHEELCHECK_BACKEND_URL", "http://localhost:8080")


def get_llm():
    """Return the best available LLM — prefer Claude Sonnet (vision-capable)."""
    if os.getenv("ANTHROPIC_API_KEY"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-sonnet-4-5",
            timeout=120,
            stop=None,
        )
    elif os.getenv("OPENAI_API_KEY"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o", timeout=120)
    else:
        pytest.skip("No LLM API key found (ANTHROPIC_API_KEY or OPENAI_API_KEY). Set one to run visual tests.")


@pytest.fixture(scope="session")
def llm():
    return get_llm()


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
