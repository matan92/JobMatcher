import io
import pdfplumber
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ai_resume_parser import parse_resume_text

router = APIRouter(prefix="/parse-resume", tags=["resume"])

@router.post("")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    filename = (file.filename or "").lower()

    if filename.endswith(".pdf"):
        text = extract_pdf_text(content)

    elif filename.endswith(".txt"):
        # Try utf-8 first, then fallback safely
        text = safe_decode_text(content)

    elif filename.endswith(".docx"):
        # Optional: only if you already installed python-docx
        text = extract_docx_text(content)

    else:
        raise HTTPException(400, "Unsupported file type. Use PDF, DOCX, or TXT.")

    # Ensure string
    if not isinstance(text, str):
        text = str(text)

    parsed = await parse_resume_text(text)

    # IMPORTANT: ensure response is JSON-safe
    return ensure_json_safe(parsed)


def extract_pdf_text(binary: bytes) -> str:
    with pdfplumber.open(io.BytesIO(binary)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages)


def safe_decode_text(binary: bytes) -> str:
    try:
        return binary.decode("utf-8")
    except UnicodeDecodeError:
        # common Windows encodings fallback
        try:
            return binary.decode("cp1255")  # Hebrew Windows
        except UnicodeDecodeError:
            return binary.decode("latin-1", errors="ignore")


def extract_docx_text(binary: bytes) -> str:
    # Requires: pip install python-docx
    from docx import Document
    doc = Document(io.BytesIO(binary))
    return "\n".join([p.text for p in doc.paragraphs if p.text])


def ensure_json_safe(obj):
    """
    FastAPI JSON encoder crashes on raw bytes.
    Convert any bytes recursively to safe strings.
    """
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="ignore")
    if isinstance(obj, dict):
        return {k: ensure_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [ensure_json_safe(x) for x in obj]
    return obj
