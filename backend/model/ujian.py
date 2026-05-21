# Contoh struktur model database jika pakai SQLAlchemy
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Float, JSON, Enum as SQLEnum
from config.database import Base

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Didapat dari JWT Token login siswa
    mata_pelajaran = Column(String(100))
    jenis_ujian = Column(String(20)) # pre_test atau post_test
    total_benar = Column(Integer)
    total_salah = Column(Integer)
    skor = Column(Float)
    detail_jawaban = Column(JSON) # Menyimpan array [true, false, ...]
    created_at = Column(DateTime, default=datetime.utcnow)