import os
import random
from openai import AzureOpenAI

VECTOR_DIMENSIONS = 1536

USE_REAL_AI = os.getenv("USE_REAL_AI", "false").lower() == "true"


# -----------------------------
# FAKE EMBEDDINGS (LOCAL / DEV)
# -----------------------------
def generate_fake_embedding():
    return [random.random() for _ in range(VECTOR_DIMENSIONS)]


# -----------------------------
# REAL EMBEDDINGS (AZURE OPENAI)
# -----------------------------
def generate_real_embedding(text: str):
    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        api_version="2024-02-15-preview",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    )

    response = client.embeddings.create(
        model=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
        input=text
    )
    return response.data[0].embedding


# -----------------------------
# SINGLE PUBLIC FUNCTION
# -----------------------------
def generate_embedding(text: str | None = None):
    """
    Returns a vector embedding.
    Uses fake embeddings unless USE_REAL_AI=true.
    """
    if USE_REAL_AI:
        if not text:
            raise ValueError("Text is required when USE_REAL_AI=true")
        return generate_real_embedding(text)

    # Default: local development
    return generate_fake_embedding()
