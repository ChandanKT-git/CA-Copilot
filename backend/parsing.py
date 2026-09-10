import io
import logging

import pandas as pd
from pypdf import PdfReader

logger = logging.getLogger("ca_copilot")

SUPPORTED_EXTS = {"pdf", "csv", "xlsx", "xls", "txt", "md", "json"}


def guess_doc_type(filename: str, text: str) -> str:
    name = filename.lower()
    sample = text.lower()[:4000]
    if "form 16" in sample or "form no. 16" in sample:
        return "Form 16"
    if "26as" in sample or "annual tax statement" in sample:
        return "Form 26AS"
    if "profit and loss" in sample or "balance sheet" in sample:
        return "Financial Statement"
    if "statement" in name and ("bank" in name or "account" in sample):
        return "Bank Statement"
    if name.endswith(".csv") or name.endswith(".xlsx") or name.endswith(".xls"):
        return "Ledger / Tabular"
    return "Document"


def extract_text(data: bytes, content_type: str, filename: str) -> str:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()
    try:
        if name.endswith(".pdf") or "pdf" in ctype:
            reader = PdfReader(io.BytesIO(data))
            pages = []
            for p in reader.pages:
                try:
                    pages.append(p.extract_text() or "")
                except Exception:
                    pages.append("")
            return "\n\n".join(pages).strip()
        if name.endswith(".csv") or "csv" in ctype:
            df = pd.read_csv(io.BytesIO(data))
            return df.to_string(index=False)
        if name.endswith((".xlsx", ".xls")) or "sheet" in ctype or "excel" in ctype:
            xls = pd.read_excel(io.BytesIO(data), sheet_name=None)
            parts = []
            for sheet, df in xls.items():
                parts.append(f"# Sheet: {sheet}\n{df.to_string(index=False)}")
            return "\n\n".join(parts)
        return data.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"Failed to parse {filename}: {e}")
        return data.decode("utf-8", errors="ignore")
