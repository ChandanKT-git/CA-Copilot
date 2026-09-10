"""Backend integration tests for CA AI CoPilot."""
import io
import json
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "ca.test@example.com"
SEED_PASSWORD = "Passw0rd!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(session):
    # try login first, else register
    r = session.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    if r.status_code == 200:
        return r.json()["token"]
    # register a fresh account
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={"name": "Test CA", "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---------- health ----------
def test_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- auth ----------
def test_google_config_disabled(session):
    r = session.get(f"{API}/auth/google/config")
    assert r.status_code == 200
    assert r.json().get("enabled") is False


def test_login_invalid(session):
    r = session.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "wrong"})
    assert r.status_code == 401


def test_me(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert "user" in r.json()


# ---------- documents ----------
@pytest.fixture(scope="session")
def uploaded_doc(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {
        "file": (
            "salary_slip.txt",
            b"Salary income 1840000, TDS deducted 211000, Section 80C 150000. Employer TDS certificate for FY 2024-25.",
            "text/plain",
        )
    }
    r = requests.post(f"{API}/documents/upload", headers=headers, files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "parsed"
    assert d["num_chunks"] >= 1
    assert "id" in d
    return d


def test_list_documents(auth_headers, uploaded_doc):
    r = requests.get(f"{API}/documents", headers=auth_headers)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert uploaded_doc["id"] in ids


def test_get_document_chunks(auth_headers, uploaded_doc):
    r = requests.get(f"{API}/documents/{uploaded_doc['id']}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "chunks" in data and len(data["chunks"]) >= 1


# ---------- copilot chat (SSE) ----------
def test_copilot_chat_stream_with_sources(auth_token, uploaded_doc):
    headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    body = {"message": "What is the TDS deducted?"}
    r = requests.post(f"{API}/copilot/chat", headers=headers, json=body, stream=True, timeout=90)
    assert r.status_code == 200
    tokens = []
    saw_meta_with_sources = False
    saw_done = False
    for raw in r.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data:"):
            continue
        try:
            evt = json.loads(raw[5:].strip())
        except Exception:
            continue
        t = evt.get("type")
        if t == "meta":
            if evt.get("sources"):
                saw_meta_with_sources = True
        elif t == "token":
            tokens.append(evt.get("content", ""))
        elif t == "done":
            saw_done = True
            break
        elif t == "error":
            pytest.fail(f"LLM stream error: {evt}")
    assert saw_done, "Did not receive done event"
    assert len("".join(tokens)) > 0, "No tokens streamed"
    assert saw_meta_with_sources, "Expected sources in meta since doc was uploaded"


def test_copilot_sessions(auth_headers):
    r = requests.post(f"{API}/copilot/sessions", headers=auth_headers)
    assert r.status_code == 200
    sid = r.json()["id"]
    r2 = requests.get(f"{API}/copilot/sessions", headers=auth_headers)
    assert sid in [s["id"] for s in r2.json()]


# ---------- ITR ----------
def test_itr_validate(auth_headers):
    payload = {
        "taxpayer_name": "Ananya Rao",
        "pan": "ABCPD1234E",
        "assessment_year": "2025-26",
        "regime": "new",
        "income": {"salary": 1840000},
        "deductions": {"section_80c": 150000},
        "taxes": {"tds": 211000},
    }
    r = requests.post(f"{API}/copilot/itr/validate", headers=auth_headers, json=payload, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "computation" in data
    comp = data["computation"]
    for k in ("gross_total_income", "taxable_income", "total_tax_paid", "refund_or_payable"):
        assert k in comp, f"missing {k} in computation"
    assert "analysis" in data


def test_itr_list(auth_headers):
    r = requests.get(f"{API}/copilot/itr/validations", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- reconciliation ----------
def test_reconcile(auth_headers, uploaded_doc):
    r = requests.post(
        f"{API}/copilot/reconcile",
        headers=auth_headers,
        json={"document_id": uploaded_doc["id"]},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "report" in data
    for k in ("matched", "unmatched", "summary"):
        assert k in data["report"]


# ---------- clients ----------
def test_clients_crud_and_message(auth_headers):
    r = requests.post(f"{API}/clients", headers=auth_headers, json={"name": "TEST_Acme", "email": "acme@ex.com"})
    assert r.status_code == 200
    cid = r.json()["id"]
    r2 = requests.post(
        f"{API}/clients/{cid}/message",
        headers=auth_headers,
        json={"subject": "Hello", "body": "Test message"},
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "queued"
    r3 = requests.get(f"{API}/clients/{cid}/messages", headers=auth_headers)
    assert r3.status_code == 200
    assert len(r3.json()) >= 1


# ---------- audit ----------
def test_audit(auth_headers):
    r = requests.get(f"{API}/audit", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


# ---------- dashboard ----------
def test_dashboard_stats(auth_headers):
    r = requests.get(f"{API}/dashboard/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for k in ("documents", "hours_saved", "weekly_activity", "filing_status", "doc_types", "recent_activity"):
        assert k in data


# ---------- delete doc last ----------
def test_delete_document(auth_headers, uploaded_doc):
    r = requests.delete(f"{API}/documents/{uploaded_doc['id']}", headers=auth_headers)
    assert r.status_code == 200
