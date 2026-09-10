import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
import bcrypt
import requests
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr

from db import db
from utils import gen_id, now_iso, log_audit

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 7
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class GoogleReq(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode()[:72], h.encode())
    except Exception:
        return False


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def sanitize(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user.get("name"),
        "email": user.get("email"),
        "picture": user.get("picture"),
        "auth_provider": user.get("auth_provider"),
        "role": user.get("role", "ca"),
        "created_at": user.get("created_at"),
    }


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register")
async def register(body: RegisterReq):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {
        "id": gen_id(),
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "picture": None,
        "auth_provider": "password",
        "role": "ca",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await log_audit(user["id"], "user.register", "user", user["id"], "Email/password signup")
    return {"token": create_token(user["id"]), "user": sanitize(user)}


@router.post("/login")
async def login(body: LoginReq):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await log_audit(user["id"], "user.login", "user", user["id"], "Email/password login")
    return {"token": create_token(user["id"]), "user": sanitize(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": sanitize(user)}


@router.get("/google/config")
async def google_config():
    return {"client_id": GOOGLE_CLIENT_ID, "enabled": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)}


@router.post("/google")
async def google_auth(body: GoogleReq):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(status_code=400, detail="Google login is not configured on the server")
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    redirect_uri = body.redirect_uri or "postmessage"
    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": body.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Google token exchange failed: {token_resp.text}")
    access_token = token_resp.json().get("access_token")
    info = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    ).json()
    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")
    user = await db.users.find_one({"email": email})
    if not user:
        user = {
            "id": gen_id(),
            "name": info.get("name") or email.split("@")[0],
            "email": email,
            "password_hash": None,
            "picture": info.get("picture"),
            "auth_provider": "google",
            "role": "ca",
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
        await log_audit(user["id"], "user.register", "user", user["id"], "Google signup")
    await log_audit(user["id"], "user.login", "user", user["id"], "Google login")
    return {"token": create_token(user["id"]), "user": sanitize(user)}
