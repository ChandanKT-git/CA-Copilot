import json
import logging

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from fastapi.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict

import os

from db import db, client
from utils import gen_id, now_iso, log_audit, put_object, get_object, APP_NAME
from parsing import extract_text, guess_doc_type, SUPPORTED_EXTS
from rag_engine import (
    chunk_text, stream_answer, complete,
    embed_passages, embed_query, rank_by_embedding, warmup_embedder,
    EMBED_MODEL_NAME,
)
from tax import compute_return
from auth import router as auth_router, get_current_user

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ca_copilot")

app = FastAPI(title="CA AI CoPilot")
api = APIRouter(prefix="/api")


# ------------------------- health -------------------------
@api.get("/")
async def root():
    return {"message": "CA AI CoPilot API", "status": "ok"}


# ------------------------- documents -------------------------
async def _load_scope_chunks(user_id: str, document_ids: Optional[List[str]]):
    query = {"user_id": user_id}
    if document_ids:
        query["document_id"] = {"$in": document_ids}
    return await db.chunks.find(query, {"_id": 0}).to_list(5000)


async def _ensure_embeddings(chunks):
    """Lazily backfill dense embeddings for any chunk that predates the dense retriever."""
    missing = [c for c in chunks if not c.get("embedding")]
    if missing:
        vectors = await run_in_threadpool(embed_passages, [c["text"] for c in missing])
        for c, v in zip(missing, vectors):
            c["embedding"] = v
            await db.chunks.update_one({"id": c["id"]}, {"$set": {"embedding": v, "embedding_model": EMBED_MODEL_NAME}})
    return chunks


@api.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type .{ext}. Allowed: {', '.join(sorted(SUPPORTED_EXTS))}")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 15MB limit")

    path = f"{APP_NAME}/uploads/{user['id']}/{gen_id()}.{ext}"
    content_type = file.content_type or "application/octet-stream"
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=502, detail="File storage failed")

    doc_id = gen_id()
    text = extract_text(data, content_type, file.filename)
    doc_type = guess_doc_type(file.filename, text)
    chunks = chunk_text(text)

    chunk_docs = []
    for i, ct in enumerate(chunks):
        chunk_docs.append({
            "id": gen_id(),
            "document_id": doc_id,
            "user_id": user["id"],
            "filename": file.filename,
            "index": i,
            "text": ct,
            "created_at": now_iso(),
        })
    if chunk_docs:
        vectors = await run_in_threadpool(embed_passages, [c["text"] for c in chunk_docs])
        for c, v in zip(chunk_docs, vectors):
            c["embedding"] = v
            c["embedding_model"] = EMBED_MODEL_NAME
        await db.chunks.insert_many(chunk_docs)

    document = {
        "id": doc_id,
        "user_id": user["id"],
        "filename": file.filename,
        "storage_path": result["path"],
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "doc_type": doc_type,
        "status": "parsed" if chunks else "empty",
        "num_chunks": len(chunk_docs),
        "char_count": len(text),
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.documents.insert_one(document)
    await log_audit(user["id"], "document.upload", "document", doc_id, f"{file.filename} ({doc_type}, {len(chunk_docs)} chunks)")
    document.pop("_id", None)
    return document


@api.get("/documents")
async def list_documents(user: dict = Depends(get_current_user)):
    docs = await db.documents.find({"user_id": user["id"], "is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/documents/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"], "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = await db.chunks.find({"document_id": doc_id}, {"_id": 0}).sort("index", 1).to_list(1000)
    doc["chunks"] = chunks
    return doc


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.documents.update_one({"id": doc_id}, {"$set": {"is_deleted": True}})
    await db.chunks.delete_many({"document_id": doc_id})
    await log_audit(user["id"], "document.delete", "document", doc_id, doc.get("filename", ""))
    return {"ok": True}


# ------------------------- copilot chat (RAG) -------------------------
class ChatReq(BaseModel):
    message: str
    session_id: Optional[str] = None
    document_ids: Optional[List[str]] = None


SYSTEM_COPILOT = (
    "You are CA CoPilot, an assistant for Indian Chartered Accountants. You help with income-tax, "
    "ITR filing, GST, reconciliation, audit and accounting queries. Answer precisely and cite the "
    "provided document context when relevant. If the context does not contain the answer, say so and "
    "answer from general CA knowledge, clearly flagging any assumption. Use INR and reference Indian "
    "tax law where applicable. Be concise and structured."
)


@api.get("/copilot/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    sessions = await db.chat_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return sessions


@api.post("/copilot/sessions")
async def create_session(user: dict = Depends(get_current_user)):
    session = {"id": gen_id(), "user_id": user["id"], "title": "New conversation", "created_at": now_iso(), "updated_at": now_iso()}
    await db.chat_sessions.insert_one(dict(session))
    session.pop("_id", None)
    return session


@api.get("/copilot/sessions/{session_id}/messages")
async def session_messages(session_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.messages.find({"session_id": session_id, "user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    return msgs


@api.delete("/copilot/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    await db.chat_sessions.delete_one({"id": session_id, "user_id": user["id"]})
    await db.messages.delete_many({"session_id": session_id, "user_id": user["id"]})
    return {"ok": True}


@api.post("/copilot/chat")
async def copilot_chat(body: ChatReq, user: dict = Depends(get_current_user)):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is empty")

    session_id = body.session_id
    if not session_id:
        session_id = gen_id()
        await db.chat_sessions.insert_one({
            "id": session_id, "user_id": user["id"],
            "title": message[:60], "created_at": now_iso(), "updated_at": now_iso(),
        })
    else:
        await db.chat_sessions.update_one(
            {"id": session_id, "user_id": user["id"]},
            {"$set": {"updated_at": now_iso()}},
        )

    await db.messages.insert_one({
        "id": gen_id(), "session_id": session_id, "user_id": user["id"],
        "role": "user", "content": message, "sources": [], "created_at": now_iso(),
    })

    scope_chunks = await _load_scope_chunks(user["id"], body.document_ids)
    scope_chunks = await _ensure_embeddings(scope_chunks)
    sources = []
    context_block = ""
    if scope_chunks:
        qvec = await run_in_threadpool(embed_query, message)
        results = rank_by_embedding(qvec, scope_chunks, k=5)
        sources = [{
            "document_id": r["document_id"], "filename": r["filename"],
            "index": r["index"], "score": r["score"],
            "snippet": r["text"][:280],
        } for r in results]
        context_block = "\n\n".join(
            f"[Source {i+1} · {r['filename']} · chunk {r['index']}]\n{r['text']}"
            for i, r in enumerate(results)
        )

    if context_block:
        prompt = (
            f"Use the following document context to answer the CA's question.\n\n"
            f"=== DOCUMENT CONTEXT ===\n{context_block}\n=== END CONTEXT ===\n\n"
            f"Question: {message}\n\n"
            f"Cite sources inline as [Source N] where you rely on them."
        )
    else:
        prompt = f"Question: {message}\n\n(No documents uploaded yet — answer from general CA knowledge.)"

    async def event_gen():
        yield f"data: {json.dumps({'type': 'meta', 'session_id': session_id, 'sources': sources})}\n\n"
        acc = []
        try:
            async for token in stream_answer(session_id, SYSTEM_COPILOT, prompt):
                acc.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            logger.error(f"LLM stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'The assistant is unavailable right now.'})}\n\n"
        answer = "".join(acc)
        await db.messages.insert_one({
            "id": gen_id(), "session_id": session_id, "user_id": user["id"],
            "role": "assistant", "content": answer, "sources": sources, "created_at": now_iso(),
        })
        await log_audit(user["id"], "copilot.query", "session", session_id, message[:80])
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ------------------------- ITR validation -------------------------
class ITRReq(BaseModel):
    taxpayer_name: str
    pan: Optional[str] = ""
    assessment_year: str = "2025-26"
    regime: str = "new"
    income: dict = {}
    deductions: dict = {}
    taxes: dict = {}


SYSTEM_ITR = (
    "You are an ITR filing validation engine for Indian Chartered Accountants. Given a computed tax "
    "summary and the raw inputs, produce a rigorous validation. Return ONLY valid minified JSON, no "
    "markdown, matching exactly this schema: "
    '{"checks":[{"label":str,"status":"pass"|"warn"|"fail","detail":str}],'
    '"issues":[str],"recommendations":[str],"summary":str}. '
    "Checks should cover: regime optimality, TDS vs tax liability mismatch, deduction limits (80C 1.5L, "
    "80D, home loan 2L, NPS 50k), rebate 87A eligibility, high refund/payable flags, and data completeness."
)


@api.post("/copilot/itr/validate")
async def validate_itr(body: ITRReq, user: dict = Depends(get_current_user)):
    payload = body.model_dump()
    computed = compute_return(payload)

    prompt = (
        f"Taxpayer inputs (INR):\n{json.dumps(payload, default=str)}\n\n"
        f"Deterministic computation:\n{json.dumps(computed)}\n\n"
        f"Validate this ITR and return the JSON per schema."
    )
    try:
        raw = await complete(f"itr-{gen_id()}", SYSTEM_ITR, prompt)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw[raw.find("{"):]
        start, end = raw.find("{"), raw.rfind("}")
        analysis = json.loads(raw[start:end + 1]) if start != -1 else {}
    except Exception as e:
        logger.error(f"ITR analysis parse error: {e}")
        analysis = {
            "checks": [{"label": "AI validation", "status": "warn", "detail": "AI analysis unavailable; computation is still valid."}],
            "issues": [],
            "recommendations": [],
            "summary": "Tax computed deterministically. AI narrative could not be generated.",
        }

    record = {
        "id": gen_id(),
        "user_id": user["id"],
        "taxpayer_name": body.taxpayer_name,
        "pan": body.pan,
        "assessment_year": body.assessment_year,
        "input": payload,
        "computation": computed,
        "analysis": analysis,
        "created_at": now_iso(),
    }
    await db.itr_validations.insert_one(dict(record))
    await log_audit(user["id"], "itr.validate", "itr", record["id"], f"{body.taxpayer_name} AY{body.assessment_year}")
    record.pop("_id", None)
    return record


@api.get("/copilot/itr/validations")
async def list_itr(user: dict = Depends(get_current_user)):
    items = await db.itr_validations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


# ------------------------- reconciliation -------------------------
class ReconcileReq(BaseModel):
    document_id: str
    instruction: Optional[str] = ""


SYSTEM_RECON = (
    "You are a reconciliation engine for Indian CAs. Analyse the provided ledger/statement text and "
    "produce a reconciliation summary. Return ONLY valid minified JSON: "
    '{"matched":int,"unmatched":int,"total_debit":str,"total_credit":str,'
    '"discrepancies":[{"description":str,"amount":str,"severity":"low"|"medium"|"high"}],'
    '"summary":str}. Use INR formatting. If figures are not present, estimate from context and note it.'
)


@api.post("/copilot/reconcile")
async def reconcile(body: ReconcileReq, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": body.document_id, "user_id": user["id"], "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = await db.chunks.find({"document_id": body.document_id}, {"_id": 0}).sort("index", 1).to_list(50)
    text = "\n".join(c["text"] for c in chunks)[:12000]
    prompt = f"Instruction: {body.instruction or 'Reconcile this statement.'}\n\nStatement content:\n{text}"
    try:
        raw = (await complete(f"recon-{gen_id()}", SYSTEM_RECON, prompt)).strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw[raw.find("{"):]
        start, end = raw.find("{"), raw.rfind("}")
        report = json.loads(raw[start:end + 1])
    except Exception as e:
        logger.error(f"Reconcile parse error: {e}")
        raise HTTPException(status_code=502, detail="Reconciliation analysis failed")
    await log_audit(user["id"], "reconcile.run", "document", body.document_id, doc.get("filename", ""))
    return {"document": doc, "report": report}


# ------------------------- clients (communication stubs) -------------------------
class ClientReq(BaseModel):
    name: str
    email: str
    pan: Optional[str] = ""
    status: Optional[str] = "active"


class MessageStubReq(BaseModel):
    subject: str
    body: str


@api.get("/clients")
async def list_clients(user: dict = Depends(get_current_user)):
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return clients


@api.post("/clients")
async def create_client(body: ClientReq, user: dict = Depends(get_current_user)):
    c = {
        "id": gen_id(), "user_id": user["id"], "name": body.name, "email": body.email,
        "pan": body.pan, "status": body.status, "messages_sent": 0,
        "created_at": now_iso(),
    }
    await db.clients.insert_one(dict(c))
    await log_audit(user["id"], "client.create", "client", c["id"], body.name)
    c.pop("_id", None)
    return c


@api.post("/clients/{client_id}/message")
async def send_client_message(client_id: str, body: MessageStubReq, user: dict = Depends(get_current_user)):
    cl = await db.clients.find_one({"id": client_id, "user_id": user["id"]})
    if not cl:
        raise HTTPException(status_code=404, detail="Client not found")
    stub = {
        "id": gen_id(), "user_id": user["id"], "client_id": client_id,
        "subject": body.subject, "body": body.body, "channel": "email (stub)",
        "status": "queued", "created_at": now_iso(),
    }
    await db.client_messages.insert_one(dict(stub))
    await db.clients.update_one({"id": client_id}, {"$inc": {"messages_sent": 1}})
    await log_audit(user["id"], "client.message", "client", client_id, body.subject)
    stub.pop("_id", None)
    return stub


@api.get("/clients/{client_id}/messages")
async def client_messages(client_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.client_messages.find({"client_id": client_id, "user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return msgs


# ------------------------- audit -------------------------
@api.get("/audit")
async def audit_logs(user: dict = Depends(get_current_user)):
    logs = await db.audit_logs.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(300)
    return logs


# ------------------------- dashboard -------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    uid = user["id"]
    docs = await db.documents.count_documents({"user_id": uid, "is_deleted": False})
    parsed = await db.documents.count_documents({"user_id": uid, "is_deleted": False, "status": "parsed"})
    chunks = await db.chunks.count_documents({"user_id": uid})
    queries = await db.messages.count_documents({"user_id": uid, "role": "user"})
    itr = await db.itr_validations.count_documents({"user_id": uid})
    clients = await db.clients.count_documents({"user_id": uid})

    hours_saved = round(parsed * 2 + itr * 6 + queries * 0.25, 1)
    cost_saved = int(hours_saved * 1500)

    # weekly activity from audit logs (last 7 days)
    since = (datetime.now(timezone.utc) - timedelta(days=6)).date()
    logs = await db.audit_logs.find({"user_id": uid}, {"_id": 0, "created_at": 1, "action": 1}).to_list(3000)
    day_counts = defaultdict(int)
    action_counts = Counter()
    for l in logs:
        action_counts[l.get("action", "other")] += 1
        try:
            d = datetime.fromisoformat(l["created_at"]).date()
        except Exception:
            continue
        if d >= since:
            day_counts[d.isoformat()] += 1
    weekly = []
    for i in range(7):
        d = (since + timedelta(days=i)).isoformat()
        weekly.append({"day": (since + timedelta(days=i)).strftime("%a"), "actions": day_counts.get(d, 0)})

    itr_docs = await db.itr_validations.find({"user_id": uid}, {"_id": 0, "computation": 1}).to_list(500)
    refund = sum(1 for x in itr_docs if x.get("computation", {}).get("refund_or_payable", 0) < 0)
    payable = sum(1 for x in itr_docs if x.get("computation", {}).get("refund_or_payable", 0) > 0)
    settled = len(itr_docs) - refund - payable

    doc_type_counts = Counter()
    for d in await db.documents.find({"user_id": uid, "is_deleted": False}, {"_id": 0, "doc_type": 1}).to_list(500):
        doc_type_counts[d.get("doc_type", "Document")] += 1

    recent = await db.audit_logs.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(8)

    return {
        "documents": docs,
        "parsed": parsed,
        "chunks": chunks,
        "queries": queries,
        "itr_validations": itr,
        "clients": clients,
        "hours_saved": hours_saved,
        "cost_saved": cost_saved,
        "weekly_activity": weekly,
        "action_breakdown": [{"name": k, "value": v} for k, v in action_counts.most_common(6)],
        "filing_status": [
            {"name": "Refund Due", "value": refund},
            {"name": "Tax Payable", "value": payable},
            {"name": "Settled", "value": settled},
        ],
        "doc_types": [{"name": k, "value": v} for k, v in doc_type_counts.items()],
        "recent_activity": recent,
    }


# ------------------------- wire up -------------------------
app.include_router(auth_router)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():

    try:
        ok = await run_in_threadpool(warmup_embedder)
        logger.info(f"Embedding model ({EMBED_MODEL_NAME}) warmup: {ok}")
    except Exception as e:
        logger.error(f"Embedder warmup failed: {e}")
    await db.users.create_index("email", unique=True)
    await db.chunks.create_index("user_id")
    await db.chunks.create_index("document_id")


@app.on_event("shutdown")
async def shutdown():
    client.close()
