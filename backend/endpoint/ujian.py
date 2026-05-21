from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from schema.ujian import TestResultCreate, TestResultResponse
from model.ujian import TestResult
from config.database import get_db
from core.auth.auth import get_current_user

router = APIRouter()


@router.post(
    "/save-test-result",
    response_model=TestResultResponse,
    status_code=status.HTTP_201_CREATED
)
async def save_test_result(
    payload: TestResultCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:

        new_result = TestResult(
            user_id=current_user.id,
            mata_pelajaran=payload.mata_pelajaran,
            jenis_ujian=payload.jenis_ujian.value,
            total_benar=payload.total_benar,
            total_salah=payload.total_salah,
            skor=payload.skor,
            detail_jawaban=payload.detail_jawaban
        )

        db.add(new_result)
        db.commit()
        db.refresh(new_result)

        return {
            "id": new_result.id,
            "status": "success",
            "message": "Lembar jawaban berhasil disimpan."
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )