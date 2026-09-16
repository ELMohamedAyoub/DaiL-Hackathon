import os

from langchain_anthropic import ChatAnthropic

os.environ["LANGSMITH_TRACING"] = os.getenv("LANGSMITH_TRACING", "true")
os.environ["LANGSMITH_ENDPOINT"] = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
os.environ["LANGSMITH_API_KEY"] = os.getenv("LANGSMITH_API_KEY")
os.environ["LANGSMITH_PROJECT"] = os.getenv("LANGSMITH_PROJECT")
os.environ["ANTHROPIC_API_KEY"] = os.getenv("ANTHROPIC_API_KEY")

CHROMA_HOST = os.getenv("CHROMA_HOST", "api.trychroma.com")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")
CHROMA_TOKEN = os.getenv("CHROMA_TOKEN")

MODELS = {
    "claude-haiku-4-5": ChatAnthropic(model="claude-haiku-4-5-20251001"),
    "claude-sonnet-5": ChatAnthropic(model="claude-sonnet-5"),
    "claude-opus-5": ChatAnthropic(model="claude-opus-5", temperature=0.0),
}
