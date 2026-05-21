from fastapi import APIRouter, File, UploadFile, HTTPException
from core.ingestion import ingest_pdf_to_chroma
from core.rag import get_rag_response, ChatMessage
from pydantic import BaseModel
from typing import Literal
import shutil

router = APIRouter(tags=["Chat Session"])


# =========================
# REQUEST MODEL
# =========================
class QuestionRequest(BaseModel):
    question: str
    chat_history: list[ChatMessage] = []
    feedback_mode: Literal["belum_paham", "mulai_paham", "paham"] = "belum_paham"


# =========================
# FEEDBACK LABEL (untuk respons)
# =========================
FEEDBACK_LABEL = {
    "belum_paham": "Socratic penuh",
    "mulai_paham": "Semi-penjelasan",
    "paham":       "Penjelasan penuh",
}


# =========================
# ASK ENDPOINT
# =========================
@router.post("/ask")
async def ask(request: QuestionRequest):
    try:
        result = get_rag_response(
            question=request.question,
            history=request.chat_history,
            feedback_mode=request.feedback_mode,
        )

        THRESHOLD = 0.6

        # confidence terlalu rendah
        if result["confidence_score"] < THRESHOLD:
            return {
                "answer": (
                    "Hmm, kakak belum menemukan materi itu di buku belajar kita 🤔 "
                    "Coba gunakan kata lain atau tanyakan materi IPA kelas 5 ya!"
                ),
                "confidence_score": result["confidence_score"],
                "feedback_mode": request.feedback_mode,
                "status": "filtered_by_confidence",
            }

        return {
            "answer": result["answer"],
            "confidence_score": result["confidence_score"],
            "source_found": result["source_found"],
            "feedback_mode": result["feedback_mode"],
            "mode_label": FEEDBACK_LABEL.get(request.feedback_mode, "-"),
            "status": "success",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# UPLOAD PDF
# =========================
@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    local_path = f"data/{file.filename}"

    with open(local_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    msg = ingest_pdf_to_chroma(local_path)

    return {"status": msg}