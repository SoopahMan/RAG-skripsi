from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnableLambda
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from typing import TypedDict, Optional
from .vector_database import get_vectorstore
from dotenv import load_dotenv
import os

load_dotenv()

api_key       = os.getenv("OPENAI_API_KEY")
langsmith_key = os.getenv("LANGCHAIN_API_KEY")

os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
os.environ.setdefault("LANGCHAIN_PROJECT",    "socratic-tutor")
os.environ.setdefault("LANGCHAIN_API_KEY",     langsmith_key or "")


# =========================
# SCHEMAS
# =========================
class RAGResponse(BaseModel):
    answer: str = Field(description="Respon untuk membantu siswa berpikir")
    confidence_score: float = Field(description="Skor keyakinan 0.0 - 1.0")
    source_found: bool = Field(description="Apakah jawaban ditemukan di konteks")


class ChatMessage(BaseModel):
    role: str
    content: str


# =========================
# GRAPH STATE
# =========================
class TutorState(TypedDict):
    # --- inputs ---
    question:      str
    history:       list[ChatMessage]
    feedback_mode: str               # belum_paham | mulai_paham | paham

    # --- intermediate ---
    context:          Optional[str]
    history_text:     Optional[str]
    confidence_score: Optional[float]
    source_found:     Optional[bool]

    # --- output ---
    answer:       Optional[str]
    final_result: Optional[dict]

# =========================
# PROMPT TEMPLATES
# =========================
PROMPT_BELUM_PAHAM = """
Kamu adalah tutor AI SD yang menggunakan metode Socratic Prompting.

TUJUAN:
Siswa menyatakan BELUM PAHAM. Bantu siswa menemukan jawaban sendiri melalui
pertanyaan bertahap — jangan berikan jawaban langsung sama sekali.

ATURAN WAJIB:
- JANGAN pernah memberikan jawaban final secara langsung.
- Gunakan bahasa sederhana untuk anak SD.
- Berikan petunjuk kecil (hint), bukan solusi penuh.
- Ajukan pertanyaan yang membantu siswa berpikir sendiri.
- Jika siswa salah → arahkan perlahan tanpa menyalahkan.
- Selalu akhiri dengan satu pertanyaan lanjutan.
- Maksimal 3 paragraf pendek.
- Gunakan hanya informasi yang terdapat pada CONTEXT. Jangan menggunakan pengetahuan lain di luar CONTEXT. Jika informasi tidak tersedia pada CONTEXT,
beritahu pengguna bahwa materi tidak ditemukan.

PROSES BERPIKIR:
1. Pahami inti pertanyaan siswa.
2. Cari materi relevan di KONTEKS.
3. Pecah masalah menjadi langkah kecil.
4. Berikan pertanyaan pemandu satu per satu.
5. Dorong siswa berpikir sendiri.

RIWAYAT CHAT:
{history}

KONTEKS:
{context}

PERTANYAAN SISWA:
{question}

Jika informasi tidak ditemukan pada CONTEXT:
- Jangan memberikan penjelasan tambahan.
- Jangan memberikan contoh.
- Jangan menggunakan pengetahuan umum.
- Jangan menebak.
- Jangan membuat pertanyaan lanjutan.
{format_instructions}
"""

PROMPT_MULAI_PAHAM = """
Kamu adalah tutor AI SD yang menggunakan metode Socratic semi-penjelasan.

TUJUAN:
Siswa menyatakan MULAI PAHAM. Berikan semi-penjelasan (jelaskan sebagian konsep
kunci) sekaligus tetap ajukan pertanyaan untuk memastikan pemahaman makin dalam.

ATURAN WAJIB:
- Boleh menjelaskan 1–2 konsep kunci secara singkat.
- Jangan langsung memberikan semua jawaban.
- Gunakan bahasa sederhana untuk anak SD.
- Kombinasikan: penjelasan singkat + pertanyaan lanjutan.
- Apresiasi kemajuan siswa dengan hangat.
- Selalu akhiri dengan satu pertanyaan konfirmasi pemahaman.
- Maksimal 3 paragraf pendek.
- Gunakan hanya informasi yang terdapat pada CONTEXT. Jangan menggunakan pengetahuan lain di luar CONTEXT. Jika informasi tidak tersedia pada CONTEXT,
beritahu pengguna bahwa materi tidak ditemukan.

PROSES BERPIKIR:
1. Kenali bagian yang sudah mulai dipahami siswa dari riwayat chat.
2. Jelaskan 1–2 konsep kunci yang masih kabur.
3. Tanyakan satu pertanyaan untuk memastikan pemahaman.

RIWAYAT CHAT:
{history}

KONTEKS:
{context}

PERTANYAAN SISWA:
{question}

Jika informasi tidak ditemukan pada CONTEXT:
- Jangan memberikan penjelasan tambahan.
- Jangan memberikan contoh.
- Jangan menggunakan pengetahuan umum.
- Jangan menebak.
- Jangan membuat pertanyaan lanjutan.
{format_instructions}
"""

PROMPT_PAHAM = """
Kamu adalah tutor AI SD yang memberikan konfirmasi dan penjelasan penuh.

TUJUAN:
Siswa menyatakan sudah PAHAM. Berikan apresiasi tulus, lalu jelaskan jawaban
secara lengkap dan jelas agar pemahaman siswa semakin kokoh.

ATURAN WAJIB:
- Gunakan hanya informasi yang terdapat pada CONTEXT. Jangan menggunakan pengetahuan lain di luar CONTEXT. Jika informasi tidak tersedia pada CONTEXT,
beritahu pengguna bahwa materi tidak ditemukan.
- Mulai dengan apresiasi yang hangat dan tulus.
- Berikan penjelasan lengkap dan jelas dari awal sampai akhir.
- Gunakan bahasa sederhana untuk anak SD.
- Boleh gunakan analogi atau contoh nyata agar lebih mudah dipahami.
- TIDAK perlu mengajukan pertanyaan lagi — cukup tutup dengan rangkuman singkat.
- Maksimal 4 paragraf.

PROSES BERPIKIR:
1. Apresiasi pencapaian siswa.
2. Rangkum perjalanan belajar dari riwayat chat.
3. Jelaskan konsep secara penuh dan terstruktur.
4. Tutup dengan rangkuman 1-2 kalimat.

RIWAYAT CHAT:
{history}

KONTEKS:
{context}

PERTANYAAN SISWA:
{question}

Jika informasi tidak ditemukan pada CONTEXT:
- Jangan memberikan penjelasan tambahan.
- Jangan memberikan contoh.
- Jangan menggunakan pengetahuan umum.
- Jangan menebak.
- Jangan membuat pertanyaan lanjutan.
{format_instructions}
"""

PROMPT_MAP = {
    "belum_paham": PROMPT_BELUM_PAHAM,
    "mulai_paham": PROMPT_MULAI_PAHAM,
    "paham":       PROMPT_PAHAM,
}

CONFIDENCE_THRESHOLD = 0.6


# =========================
# NODE 1 — retrieve
# Pulls relevant chunks from the vector store and
# calculates a naive confidence score from chunk count.
# =========================
def retrieve(state: TutorState) -> TutorState:
    vectorstore = get_vectorstore()
    docs = vectorstore.as_retriever(search_kwargs={"k": 5}).invoke(
        state["question"]
    )

    context      = "\n\n".join(doc.page_content for doc in docs)
    source_found = len(docs) > 0
    confidence_score = min(len(docs) / 5, 1.0) if source_found else 0.1

    return {
        **state,
        "context":          context,
        "source_found":     source_found,
        "confidence_score": confidence_score,
    }


# =========================
# NODE 2 — build_history
# Serialises chat history into a plain-text block.
# =========================
def build_history_node(state: TutorState) -> TutorState:
    history = state.get("history") or []

    if not history:
        history_text = "Belum ada percakapan sebelumnya."
    else:
        history_text = "\n".join(
            f"{msg.role}: {msg.content}" for msg in history
        )

    return {**state, "history_text": history_text}


# =========================
# NODE 3 — generate
# Selects the right prompt template based on feedback_mode
# and calls the LLM.  The full prompt | model | parser
# chain is a single LangChain runnable so LangSmith records
# it as one traceable step inside the node.
# =========================
def generate(state: TutorState) -> TutorState:
    parser   = JsonOutputParser(pydantic_object=RAGResponse)
    template = PROMPT_MAP.get(state["feedback_mode"], PROMPT_BELUM_PAHAM)

    prompt = ChatPromptTemplate.from_template(
        template,
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    model = ChatOpenAI(model="gpt-4o-mini", temperature=0.6, api_key=api_key)

    chain = prompt | model | parser

    parsed = chain.invoke({
        "context":  state["context"],
        "question": state["question"],
        "history":  state["history_text"],
    })

    # Override with deterministic values — never trust LLM for these
    parsed["confidence_score"] = state["confidence_score"]
    parsed["source_found"]     = state["source_found"]

    return {**state, "answer": parsed["answer"], "final_result": parsed}


# =========================
# NODE 4 — confidence_filter
# Replaces the answer when confidence is below threshold so
# the LLM output is never surfaced for off-topic questions.
# This also runs after `generate` succeeds, acting as a
# pass-through that stamps `status: success` on the result.
# =========================
def confidence_filter(state: TutorState) -> TutorState:
    if state["confidence_score"] >= CONFIDENCE_THRESHOLD:
        # Pass-through: just ensure status field is set
        result = state.get("final_result", {})
        result.setdefault("feedback_mode", state["feedback_mode"])
        result.setdefault("status",        "success")
        return {**state, "final_result": result}

    fallback = (
        "Hmm, kakak belum menemukan materi itu di buku belajar kita 🤔 "
        "Coba gunakan kata lain atau tanyakan materi IPA kelas 5 ya!"
    )

    return {
        **state,
        "answer": fallback,
        "final_result": {
            "answer":           fallback,
            "confidence_score": state["confidence_score"],
            "source_found":     state["source_found"],
            "feedback_mode":    state["feedback_mode"],
            "status":           "filtered_by_confidence",
        },
    }


# =========================
# CONDITIONAL EDGE
# Routes to `generate` only when confidence is high enough;
# skips the LLM call entirely otherwise (saves latency + cost).
# =========================
def should_generate(state: TutorState) -> str:
    if state["confidence_score"] >= CONFIDENCE_THRESHOLD:
        return "generate"
    return "confidence_filter"


# =========================
# BUILD GRAPH
# =========================
def build_graph() -> StateGraph:
    graph = StateGraph(TutorState)

    graph.add_node("retrieve",          RunnableLambda(retrieve))
    graph.add_node("build_history",     RunnableLambda(build_history_node))
    graph.add_node("generate",          RunnableLambda(generate))
    graph.add_node("confidence_filter", RunnableLambda(confidence_filter))

    graph.set_entry_point("retrieve")

    graph.add_edge("retrieve", "build_history")

    graph.add_conditional_edges(
        "build_history",
        should_generate,
        {
            "generate":          "generate",
            "confidence_filter": "confidence_filter",
        },
    )

    graph.add_edge("generate",          "confidence_filter")
    graph.add_edge("confidence_filter", END)

    return graph.compile()


# Module-level singleton — graph is compiled once at import time
tutor_graph = build_graph()


# =========================
# PUBLIC ENTRY POINT
# Mirrors the old get_rag_response() signature exactly
# so router.py needs zero changes.
# =========================
def get_rag_response(
    question: str,
    history: list = [],
    feedback_mode: str = "belum_paham",
) -> dict:

    # =========================================================
    # HARDCODE LIST MATERI
    # =========================================================
    materi_keywords = [
        "materi apa",
        "materi yang kamu punya",
        "apa saja materinya",
        "materi tersedia",
        "daftar materi",
        "kamu bisa apa",
    ]

    lower_q = question.lower()

    if any(k in lower_q for k in materi_keywords):
        return {
            "answer": """
Aku punya beberapa materi IPA kelas 5 🌟

📚 Daftar materi:
1. Kondisi geografis wilayah Indonesia.
2. Persebaran dan perbedaan flora dan fauna di Indonesia.
3. Upaya menjaga kelestarian kekayaan alam.
4. Ekosistem dan lingkungan.
5. Perubahan tubuh manusia
6. Peninggalan sejarah dan budaya



Kamu mau belajar materi yang mana dulu? 😊
""",
            "confidence_score": 1.0,
            "source_found": True,
            "feedback_mode": feedback_mode,
            "status": "success",
        }

    # =========================================================
    # FLOW NORMAL RAG
    # =========================================================
    initial_state: TutorState = {
        "question": question,
        "history": history,
        "feedback_mode": feedback_mode,
        "context": None,
        "history_text": None,
        "confidence_score": None,
        "source_found": None,
        "answer": None,
        "final_result": None,
    }

    final_state = tutor_graph.invoke(initial_state)
    return final_state["final_result"]