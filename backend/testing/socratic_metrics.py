"""
socratic_metrics.py
-------------------
Custom RAGAS-compatible metrics untuk tutor Socratic IPA SD.

Kompatibel dengan RAGAS >= 0.2 (API baru: llm_factory, required_columns property).

METRIK CUSTOM:
  1. SocraticAdherence        — tidak bocor jawaban (belum_paham)
  2. ModeConsistency          — gaya sesuai feedback_mode
  3. QuestionPresence         — ada/tidak pertanyaan sesuai mode
  4. ForbiddenLeakage         — keyword jawaban tidak bocor (regex)
  5. AntiHallucinationCompliance — AI mengakui OOC, tidak mengarang

CATATAN _required_columns:
  RAGAS >= 0.2 mengubah required_columns dari dict[str, set]
  menjadi property yang mengembalikan set[MetricType].
  Untuk custom metric yang hanya butuh user_input + response,
  cukup override required_columns sebagai property yang
  mengembalikan set kosong — validasi kolom dilewati, dan
  akses sample.user_input / sample.response tetap berfungsi.
"""

import re
import os
from dataclasses import dataclass, field
from typing import Optional

from openai import AsyncOpenAI
from ragas.metrics.base import SingleTurnMetric
from ragas.dataset_schema import SingleTurnSample
from dotenv import load_dotenv

load_dotenv()

_aclient = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# =========================
# UTIL: call LLM judge (langsung via openai async, bypass ragas wrapper)
# =========================
async def _llm_judge(prompt: str) -> str:
    response = await _aclient.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()


# =========================
# BASE: custom metric tanpa _required_columns dict lama
# =========================
@dataclass
class BaseSocraticMetric(SingleTurnMetric):
    """
    Override required_columns sebagai property yang mengembalikan set kosong
    agar RAGAS tidak memvalidasi kolom secara ketat.
    Metrik tetap bisa akses sample.user_input, .response, .reference.
    """
    name: str = "base_socratic"

    @property
    def required_columns(self):   # noqa: D401
        return set()              # skip ragas column validation

    def init(self, llm_factory: Optional[object] = None):
        """
        Optional initializer called by RAGAS. Store llm_factory if provided
        so metrics can use shared LLM client if needed.
        """
        self.llm_factory = llm_factory
        return None

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        raise NotImplementedError


# =========================
# UTIL: ekstrak feedback_mode dari augmented user_input
# =========================
def _extract_mode(user_input: str) -> str:
    m = re.search(r"\[MODE:([\w_]+)\]", user_input)
    return m.group(1) if m else "belum_paham"


# =========================
# 1. SocraticAdherence
# Apakah respons TIDAK membocorkan jawaban final?
# Skor 1.0 = aman, 0.0 = bocor.
# Hanya bermakna untuk mode belum_paham.
# =========================
@dataclass
class SocraticAdherence(BaseSocraticMetric):
    name: str = "socratic_adherence"

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        mode = _extract_mode(sample.user_input or "")
        if mode != "belum_paham":
            return 1.0   # tidak relevan untuk mode lain

        response     = sample.response  or ""
        ground_truth = sample.reference or ""

        if not response or not ground_truth:
            return 0.5

        prompt = f"""
Kamu adalah evaluator sistem tutor Socratic untuk siswa SD.

TUGAS:
Periksa apakah RESPONS di bawah ini membocorkan jawaban final dari GROUND TRUTH.
Dalam metode Socratic, tutor TIDAK BOLEH langsung memberikan jawaban — hanya boleh
memberi petunjuk dan pertanyaan pemandu.

GROUND TRUTH (jawaban yang seharusnya TIDAK langsung diberikan):
{ground_truth}

RESPONS TUTOR:
{response}

KRITERIA BOCOR:
- Menyebutkan fakta utama dari ground_truth secara eksplisit
- Memberikan penjelasan lengkap tanpa pertanyaan balik
- Siswa tidak perlu berpikir lagi setelah membaca respons ini

Jawab HANYA dengan format:
VERDICT: [TIDAK_BOCOR / BOCOR]
ALASAN: [satu kalimat singkat]
"""
        result = await _llm_judge(prompt)
        return 1.0 if "TIDAK_BOCOR" in result.upper() else 0.0


# =========================
# 2. ModeConsistency
# Apakah gaya respons sesuai feedback_mode?
# Skor: 1.0 / 0.5 / 0.0
# =========================
@dataclass
class ModeConsistency(BaseSocraticMetric):
    name: str = "mode_consistency"

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        user_input = sample.user_input or ""
        response   = sample.response   or ""
        mode       = _extract_mode(user_input)

        if not response:
            return 0.0

        mode_expectations = {
            "belum_paham": (
                "Tutor HANYA boleh mengajukan pertanyaan dan memberi petunjuk kecil. "
                "DILARANG memberikan penjelasan atau jawaban langsung."
            ),
            "mulai_paham": (
                "Tutor boleh menjelaskan 1–2 konsep kunci secara singkat, "
                "lalu WAJIB mengajukan satu pertanyaan konfirmasi di akhir."
            ),
            "paham": (
                "Tutor wajib memberikan APRESIASI tulus dan penjelasan LENGKAP. "
                "DILARANG mengajukan pertanyaan baru."
            ),
        }

        expectation = mode_expectations.get(mode, "")

        prompt = f"""
Kamu adalah evaluator kualitas tutor AI untuk siswa SD.

FEEDBACK MODE: {mode}
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
        result = await _llm_judge(prompt)
        match  = re.search(r"SCORE:\s*([\d.]+)", result)
        return float(match.group(1)) if match else 0.0


# =========================
# 3. QuestionPresence
# Ada/tidak pertanyaan → sesuai ekspektasi mode?
# belum_paham & mulai_paham: HARUS ada pertanyaan → 1.0
# paham: TIDAK BOLEH ada pertanyaan → 1.0
# =========================
@dataclass
class QuestionPresence(BaseSocraticMetric):
    name: str = "question_presence"

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        user_input = sample.user_input or ""
        response   = sample.response   or ""
        mode       = _extract_mode(user_input)

        has_question = bool(re.search(
            r"\?|apakah|apa yang|mengapa|bagaimana|coba pikirkan|menurutmu|kira-kira",
            response,
            re.IGNORECASE,
        ))

        if mode in ("belum_paham", "mulai_paham"):
            return 1.0 if has_question else 0.0
        else:   # paham
            return 0.0 if has_question else 1.0


# =========================
# 4. ForbiddenLeakage
# Seberapa banyak keyword jawaban bocor ke respons?
# Skor: 1.0 = tidak ada kebocoran.
# =========================
@dataclass
class ForbiddenLeakage(BaseSocraticMetric):
    name: str = "forbidden_leakage"

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        user_input = sample.user_input or ""
        response   = sample.response   or ""
        mode       = _extract_mode(user_input)

        if mode != "belum_paham":
            return 1.0   # hanya relevan untuk mode ini

        forbidden_match = re.search(r"\[FORBIDDEN:(.*?)\]", user_input, re.DOTALL)
        if not forbidden_match:
            return 1.0

        forbidden_keywords = [
            kw.strip().lower()
            for kw in forbidden_match.group(1).split("|")
            if kw.strip()
        ]

        if not forbidden_keywords:
            return 1.0

        response_lower = response.lower()
        leaked = [kw for kw in forbidden_keywords if kw in response_lower]
        return round(1.0 - len(leaked) / len(forbidden_keywords), 2)


# =========================
# 5. AntiHallucinationCompliance
# Apakah AI mengakui keterbatasan saat pertanyaan di luar konteks?
# Hanya aktif untuk item [OUT_OF_CTX:1].
# =========================
@dataclass
class AntiHallucinationCompliance(BaseSocraticMetric):
    name: str = "anti_hallucination_compliance"

    async def _single_turn_ascore(
        self,
        sample: SingleTurnSample,
        callbacks=None,
    ) -> float:
        user_input = sample.user_input or ""
        response   = sample.response   or ""

        if "[OUT_OF_CTX:1]" not in user_input:
            return 1.0   # tidak relevan → skip

        if not response:
            return 0.0

        prompt = f"""
Kamu adalah evaluator sistem tutor AI untuk siswa SD.

KONTEKS: Pertanyaan siswa BERADA DI LUAR materi yang tersedia.
Tutor yang baik harus MENGAKUI bahwa materi tidak tersedia,
bukan mengarang jawaban.

RESPONS TUTOR:
{response}

Apakah tutor dengan benar mengakui keterbatasan?
(menyatakan materi tidak tersedia / tidak memberikan jawaban yang dikarang)

Jawab HANYA dengan format:
VERDICT: [BENAR / SALAH]
ALASAN: [satu kalimat singkat]
"""
        result = await _llm_judge(prompt)
        return 1.0 if "BENAR" in result.upper() else 0.0