from pydantic import BaseModel
from typing import List
from enum import Enum

class JenisUjianEnum(str, Enum):
    PRE_TEST = "pre_test"
    POST_TEST = "post_test"

# Skema data yang diterima dari React
class TestResultCreate(BaseModel):
    mata_pelajaran: str
    jenis_ujian: JenisUjianEnum
    total_benar: int
    total_salah: int
    skor: float
    detail_jawaban: List[bool]  # Menyimpan track record benar/salah tiap nomor

# Skema untuk response ke client
class TestResultResponse(BaseModel):
    id: int
    status: str
    message: str