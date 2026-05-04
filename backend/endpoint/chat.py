from fastapi import APIRouter, Depends
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends

from core.ingestion import ingest_pdf_to_chroma
from core.rag import get_rag_chain
from pydantic import BaseModel
import shutil
from dotenv import load_dotenv
import os

load_dotenv()

api_key=os.getenv("OPENAI_API_KEY")


router = APIRouter(tags=["Chat Session"])

class QuestionRequest(BaseModel):
    question: str

@router.post("/ask")
async def ask(request: QuestionRequest):
    try:
        chain = get_rag_chain()
        result = chain.invoke(request.question)
                
                # Ambang batas (Threshold) Confidence Score
                # Jika di bawah 0.6, kita anggap AI sedang menebak/halusinasi
        THRESHOLD = 0.6
                
        if result['confidence_score'] < THRESHOLD:
                    return {
                        "answer": "Aduh, sepertinya materi itu belum ada di buku IPA kelas 5 kita. Coba tanya pertanyaan lain seputar IPA ya!",
                        "confidence_score": result['confidence_score'],
                        "status": "filtered_by_confidence"
                    }
                    
        return {
                    "answer": result['answer'],
                    "confidence_score": result['confidence_score'],
                    "status": "success"
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    local_path = f"data/{file.filename}"
    with open(local_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    msg = ingest_pdf_to_chroma(local_path)
    return {"status": msg}
