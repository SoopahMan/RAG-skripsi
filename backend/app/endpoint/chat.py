from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks
from core.rag import get_rag_response, ChatMessage
from pydantic import BaseModel
from typing import Literal, List
import shutil
import os

from core.vector_database import get_vectorstore

from core.upload_progress import create_task
from core.ingestion import ingest_pdf_to_chroma

from sqlalchemy.orm import Session

from config.database import get_db

from model.document import KnowledgeDocument

from schema.document import KnowledgeDocumentResponse


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
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):

    os.makedirs("data", exist_ok=True)

    local_path = f"data/{file.filename}"

    with open(local_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    task_id = create_task()

    background_tasks.add_task(
        ingest_pdf_to_chroma,
        local_path,
        task_id
    )

    return {
        "task_id": task_id
    }

from core.upload_progress import UPLOAD_TASKS


@router.get("/upload-status/{task_id}")
async def upload_status(task_id: str):

    if task_id not in UPLOAD_TASKS:
        return {
            "error": "Task tidak ditemukan"
        }

    return UPLOAD_TASKS[task_id]

@router.get(
    "/documents",
    response_model=List[KnowledgeDocumentResponse]
)
def get_documents(
    db: Session = Depends(get_db)
):

    documents = (

        db.query(KnowledgeDocument)

        .order_by(
            KnowledgeDocument.created_at.desc()
        )

        .all()

    )

    return documents

@router.delete(
    "/documents/{document_id}"
)
def delete_document(

    document_id: str,

    db: Session = Depends(get_db)

):

    document = (

        db.query(KnowledgeDocument)

        .filter(
            KnowledgeDocument.document_id == document_id
        )

        .first()

    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Dokumen tidak ditemukan"
        )

    vectorstore = get_vectorstore()

    try:

        vectorstore.delete(

            where={
                "document_id": document_id
            }

        )

    except Exception as e:

        print(e)

    pdf_path = os.path.join(
        "data",
        document.filename
    )

    if os.path.exists(pdf_path):

        os.remove(pdf_path)

    db.delete(document)

    db.commit()

    return {

        "status":"success",

        "message":"Dokumen berhasil dihapus."

    }