"""
socratic_metrics.py
-------------------
Custom RAGAS-compatible metrics untuk tutor Socratic IPA SD.

Masalah dengan RAGAS standar:
  - Answer Correctness → akan MENGHUKUM jawaban Socratic karena tidak
    langsung menjawab pertanyaan, padahal itu memang tujuannya.
  - Answer Relevancy  → sama, respons Socratic penuh pertanyaan balik,
    bukan penjelasan, sehingga skor akan rendah secara tidak adil.

Solusi: 4 metrik custom yang sadar konteks Socratic + 2 metrik RAGAS
standar yang tetap relevan (faithfulness, context_recall).

METRIK CUSTOM:
  1. SocraticAdherence     — apakah respons TIDAK membocorkan jawaban final
                             pada mode belum_paham?
  2. ModeConsistency       — apakah gaya respons sesuai feedback_mode?
  3. QuestionPresence      — apakah ada pertanyaan di akhir respons
                             (wajib untuk belum_paham & mulai_paham)?
  4. ForbiddenLeakage      — apakah respons BEBAS dari kata kunci jawaban
                             yang seharusnya tidak diberikan?

METRIK RAGAS STANDAR (tetap dipakai):
  5. faithfulness          — apakah klaim dalam respons didukung konteks?
  6. context_recall        — apakah konteks mencakup ground_truth?
"""

import re
import os
from dataclasses import dataclass, field
from typing import Optional

from langchain_openai import ChatOpenAI
from ragas.metrics.base import MetricWithLLM, SingleTurnMetric
from ragas.dataset_schema import SingleTurnSample
from dotenv import load_dotenv

load_dotenv()


# =========================
# LLM JUDGE (shared)
# =========================
def get_judge_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    )


# =========================
# UTIL: call LLM judge
# =========================
async def _llm_judge(prompt: str, llm: ChatOpenAI) -> str:
    from langchain_core.messages import HumanMessage
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content.strip()


# =========================
# 1. SocraticAdherence
# Mengukur apakah respons TIDAK membocorkan jawaban langsung.
# Hanya bermakna pada mode belum_paham.
# Skor: 1.0 = tidak bocor, 0.0 = bocor jawaban.
# =========================
@dataclass
class SocraticAdherence(MetricWithLLM, SingleTurnMetric):
    name: str = "socratic_adherence"
    _required_columns: dict = field(default_factory=lambda: {
        "single_turn": {"response", "reference"}   # reference = ground_truth
    })

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        response    = sample.response or ""
        ground_truth = sample.reference or ""

        prompt = f"""
Kamu adalah evaluator untuk sistem tutor Socratic anak SD.

TUGAS:
Periksa apakah RESPONS di bawah ini membocorkan jawaban final yang ada di GROUND TRUTH.
Dalam metode Socratic, tutor TIDAK BOLEH langsung memberikan jawaban.

GROUND TRUTH (jawaban yang seharusnya TIDAK langsung diberikan):
{ground_truth}

RESPONS TUTOR:
{response}

KRITERIA BOCOR (jawaban dianggap bocor jika):
- Menyebutkan fakta utama dari ground_truth secara eksplisit
- Memberikan penjelasan lengkap yang seharusnya siswa temukan sendiri
- Tidak ada pertanyaan balik kepada siswa

Jawab HANYA dengan format:
VERDICT: [TIDAK_BOCOR / BOCOR]
ALASAN: [satu kalimat singkat]
"""
        result = await _llm_judge(prompt, self.llm)
        return 1.0 if "TIDAK_BOCOR" in result.upper() else 0.0


# =========================
# 2. ModeConsistency
# Mengukur apakah gaya respons sesuai feedback_mode.
# Skor: 1.0 = konsisten, 0.5 = sebagian, 0.0 = tidak konsisten.
# =========================
@dataclass
class ModeConsistency(MetricWithLLM, SingleTurnMetric):
    name: str = "mode_consistency"
    _required_columns: dict = field(default_factory=lambda: {
        "single_turn": {"response", "user_input"}
    })

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        response     = sample.response or ""
        # feedback_mode disisipkan di user_input oleh runner
        user_input   = sample.user_input or ""
        feedback_mode = "belum_paham"
        for mode in ["belum_paham", "mulai_paham", "paham"]:
            if mode in user_input:
                feedback_mode = mode
                break

        mode_descriptions = {
            "belum_paham": (
                "Tutor HANYA boleh mengajukan pertanyaan dan memberi petunjuk kecil. "
                "DILARANG memberikan penjelasan atau jawaban langsung."
            ),
            "mulai_paham": (
                "Tutor boleh menjelaskan 1-2 konsep kunci SECARA SINGKAT, "
                "lalu wajib mengajukan SATU pertanyaan konfirmasi."
            ),
            "paham": (
                "Tutor wajib memberikan APRESIASI tulus dan penjelasan LENGKAP. "
                "DILARANG mengajukan pertanyaan lagi."
            ),
        }

        expectation = mode_descriptions.get(feedback_mode, "")

        prompt = f"""
Kamu adalah evaluator kualitas tutor AI untuk anak SD.

FEEDBACK MODE: {feedback_mode}
EKSPEKTASI RESPONS:
{expectation}

RESPONS TUTOR:
{response}

Nilai konsistensi respons terhadap ekspektasi mode:
- 1.0 = Sangat konsisten (memenuhi semua ekspektasi)
- 0.5 = Sebagian konsisten (memenuhi sebagian ekspektasi)
- 0.0 = Tidak konsisten (melanggar ekspektasi utama)

Jawab HANYA dengan format:
SCORE: [1.0 / 0.5 / 0.0]
ALASAN: [satu kalimat singkat]
"""
        result = await _llm_judge(prompt, self.llm)
        match  = re.search(r"SCORE:\s*([\d.]+)", result)
        return float(match.group(1)) if match else 0.0


# =========================
# 3. QuestionPresence
# Mengukur apakah ada pertanyaan di akhir respons.
# Wajib untuk belum_paham dan mulai_paham.
# Harus TIDAK ada untuk mode paham.
# Skor: 1.0 = sesuai ekspektasi, 0.0 = tidak sesuai.
# =========================
@dataclass
class QuestionPresence(MetricWithLLM, SingleTurnMetric):
    name: str = "question_presence"
    _required_columns: dict = field(default_factory=lambda: {
        "single_turn": {"response", "user_input"}
    })

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        response    = sample.response or ""
        user_input  = sample.user_input or ""
        feedback_mode = "belum_paham"
        for mode in ["belum_paham", "mulai_paham", "paham"]:
            if mode in user_input:
                feedback_mode = mode
                break

        # Deteksi pertanyaan: kalimat yang diakhiri "?" atau mengandung kata tanya
        has_question = bool(re.search(
            r"\?|apakah|apa yang|mengapa|bagaimana|coba pikirkan|menurutmu|kira-kira",
            response,
            re.IGNORECASE,
        ))

        if feedback_mode in ("belum_paham", "mulai_paham"):
            # Harus ada pertanyaan
            return 1.0 if has_question else 0.0
        else:
            # Mode paham: tidak boleh ada pertanyaan
            return 0.0 if has_question else 1.0


# =========================
# 4. ForbiddenLeakage
# Mengukur seberapa banyak kata kunci jawaban yang "bocor"
# ke respons pada mode belum_paham.
# Skor: 1.0 = tidak ada kebocoran, menurun setiap ada kebocoran.
# =========================
@dataclass
class ForbiddenLeakage(MetricWithLLM, SingleTurnMetric):
    name: str = "forbidden_leakage"
    _required_columns: dict = field(default_factory=lambda: {
        "single_turn": {"response", "user_input"}
    })

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        response   = sample.response or ""
        user_input = sample.user_input or ""

        # Ekstrak forbidden keywords yang disisipkan runner di user_input
        # Format: "[FORBIDDEN: kata1|kata2|kata3]"
        forbidden_match = re.search(r"\[FORBIDDEN:(.*?)\]", user_input, re.DOTALL)
        if not forbidden_match:
            return 1.0  # tidak ada forbidden keywords → tidak relevan

        forbidden_keywords = [
            kw.strip().lower()
            for kw in forbidden_match.group(1).split("|")
            if kw.strip()
        ]

        response_lower = response.lower()
        leaked = [kw for kw in forbidden_keywords if kw in response_lower]

        if not forbidden_keywords:
            return 1.0

        leak_ratio = len(leaked) / len(forbidden_keywords)
        return round(1.0 - leak_ratio, 2)


# =========================
# 5. AntiHallucinationCompliance
# Khusus untuk pertanyaan di luar konteks (is_out_of_context).
# Mengukur apakah AI mengakui keterbatasan dan TIDAK mengarang jawaban.
# Skor: 1.0 = menolak dengan benar, 0.0 = mengarang jawaban.
# =========================
@dataclass
class AntiHallucinationCompliance(MetricWithLLM, SingleTurnMetric):
    name: str = "anti_hallucination_compliance"
    _required_columns: dict = field(default_factory=lambda: {
        "single_turn": {"response", "user_input"}
    })

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        user_input = sample.user_input or ""
        response   = sample.response   or ""

        # Hanya relevan untuk item out_of_context
        if "[OUT_OF_CTX:1]" not in user_input:
            return 1.0   # tidak relevan → skip, skor penuh

        prompt = f"""
Kamu adalah evaluator untuk sistem tutor AI anak SD.

KONTEKS: Pertanyaan siswa berada DI LUAR materi yang tersedia.
Tutor yang baik harus MENGAKUI bahwa materi tidak tersedia,
bukan mengarang jawaban.

RESPONS TUTOR:
{response}

Apakah tutor dengan benar mengakui keterbatasan (menyatakan materi tidak tersedia,
tidak memberikan jawaban yang dikarang, dan tidak berpura-pura tahu)?

Jawab HANYA dengan format:
VERDICT: [BENAR / SALAH]
ALASAN: [satu kalimat singkat]
"""
        result = await _llm_judge(prompt, self.llm)
        return 1.0 if "BENAR" in result.upper() else 0.0