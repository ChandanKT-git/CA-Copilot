import os

import numpy as np
from fastembed import TextEmbedding
import asyncio
import logging
from google import genai
from google.genai import types
from openai import AsyncOpenAI

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-flash-latest"

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "qwen/qwen3.8-27b"

logger = logging.getLogger("ca_copilot")

EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBED_DIM = 384

_embedder = None


def get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding(model_name=EMBED_MODEL_NAME)
    return _embedder


def warmup_embedder() -> bool:
    try:
        embed_query("warmup")
        return True
    except Exception:
        return False


def _normalize(vec) -> list:
    a = np.asarray(vec, dtype=np.float32)
    n = float(np.linalg.norm(a))
    if not np.isfinite(n) or n == 0:
        return a.tolist()
    return (a / n).tolist()


def embed_passages(texts):
    """Embed document chunks (BGE 'passage:' convention). Blocking — run in threadpool."""
    m = get_embedder()
    prefixed = [f"passage: {t}" for t in texts]
    return [_normalize(v) for v in m.embed(prefixed)]


def embed_query(text: str):
    """Embed a search query (BGE 'query:' convention). Blocking — run in threadpool."""
    m = get_embedder()
    vec = next(iter(m.embed([f"query: {text}"])))
    return _normalize(vec)


def rank_by_embedding(query_vec, chunks, k: int = 5):
    """Cosine ranking over pre-normalized vectors (dot product)."""
    qv = np.asarray(query_vec, dtype=np.float32)
    scored = []
    for c in chunks:
        emb = c.get("embedding")
        if not emb:
            continue
        v = np.asarray(emb, dtype=np.float32)
        if v.shape != qv.shape:
            continue
        scored.append((float(np.dot(qv, v)), c))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, c in scored[:k]:
        out.append({
            "chunk_id": c.get("id"),
            "document_id": c.get("document_id"),
            "filename": c.get("filename"),
            "index": c.get("index"),
            "text": c["text"],
            "score": round(max(0.0, score), 4),
        })
    return out


def chunk_text(text: str, size: int = 900, overlap: int = 150):
    import re
    text = re.sub(r"\n{3,}", "\n\n", text or "").strip()
    if not text:
        return []
    paragraphs = re.split(r"\n\s*\n", text)
    chunks, buf = [], ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(buf) + len(para) + 2 <= size:
            buf = f"{buf}\n\n{para}" if buf else para
        else:
            if buf:
                chunks.append(buf)
            if len(para) <= size:
                buf = para
            else:
                for i in range(0, len(para), size - overlap):
                    chunks.append(para[i:i + size])
                buf = ""
    if buf:
        chunks.append(buf)
    return [c.strip() for c in chunks if c.strip()]


def _get_gemini_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY") or GEMINI_API_KEY
    return genai.Client(api_key=api_key)


def _get_groq_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")


async def stream_answer(session_id: str, system_message: str, prompt: str):
    try:
        client = _get_gemini_client()
        stream = await asyncio.wait_for(
            client.aio.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=system_message)
            ),
            timeout=30.0
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        logger.error(f"Gemini failed in stream_answer: {e}. Falling back to Groq...")
        groq_client = _get_groq_client()
        stream = await asyncio.wait_for(
            groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            ),
            timeout=30.0
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


async def complete(session_id: str, system_message: str, prompt: str) -> str:
    try:
        client = _get_gemini_client()
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=system_message)
            ),
            timeout=45.0
        )
        return response.text or ""
    except Exception as e:
        logger.error(f"Gemini failed in complete: {e}. Falling back to Groq...")
        groq_client = _get_groq_client()
        response = await asyncio.wait_for(
            groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ]
            ),
            timeout=45.0
        )
        if response.choices and response.choices[0].message.content:
            return response.choices[0].message.content
        return ""

