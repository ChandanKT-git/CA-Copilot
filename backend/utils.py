import os
import uuid
import logging
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from db import db

logger = logging.getLogger("ca_copilot")

APP_NAME = "ca-copilot"

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    region_name=os.environ.get("AWS_REGION_NAME", "us-east-1"),
)
AWS_BUCKET_NAME = os.environ.get("AWS_BUCKET_NAME", "ca-copilot-bucket")


def gen_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def put_object(path: str, data: bytes, content_type: str) -> dict:
    try:
        s3_client.put_object(
            Bucket=AWS_BUCKET_NAME,
            Key=path,
            Body=data,
            ContentType=content_type
        )
        return {"status": "ok", "path": path}
    except ClientError as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise


def get_object(path: str):
    try:
        response = s3_client.get_object(Bucket=AWS_BUCKET_NAME, Key=path)
        content = response["Body"].read()
        content_type = response.get("ContentType", "application/octet-stream")
        return content, content_type
    except ClientError as e:
        logger.error(f"Failed to get object from S3: {e}")
        raise


async def log_audit(user_id: str, action: str, entity: str = "", entity_id: str = None, detail: str = ""):
    await db.audit_logs.insert_one({
        "id": gen_id(),
        "user_id": user_id,
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "detail": detail,
        "created_at": now_iso(),
    })
