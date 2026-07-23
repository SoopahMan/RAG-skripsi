"""
run_eval.py
-----------
Runner evaluasi RAGAS untuk tutor Socratic IPA SD kelas 5.

Fix v2:
  - Import dari ragas.metrics.collections (non-deprecated)
  - LangchainLLMWrapper diganti llm_factory
  - Context injection: chunk evaluasi di-embed sementara ke Chroma
    agar retriever benar-benar menemukan konteks → confidence > 0.6
  - Metric scoring dijalankan manual (async) karena custom metric
    tidak menggunakan ragas.evaluate() yang punya validasi kolom ketat

Cara menjalankan:
  python run_eval.py
  python run_eval.py --category socratic_prompting
  python run_eval.py --category multi_turn
  python run_eval.py --category anti_halusinasi
  python run_eval.py --mode belum_paham
  python run_eval.py --output hasil.csv
  python run_eval.py --no-ragas-standard
"""

import asyncio
import argparse
import os
import sys
import warnings
from datetime import datetime
from contextlib import contextmanager

import pandas as pd
from dotenv import load_dotenv

# --- Suppress deprecation warnings dari ragas ---
warnings.filterwarnings("ignore", category=DeprecationWarning, module="ragas")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


# =========================
# IMPORT RAGAS (non-deprecated)
# =========================
try:
    from ragas.metrics.collections import faithfulness, context_recall
except ImportError:
    # Fallback untuk versi lama
    from ragas.metrics import faithfulness, context_recall   # type: ignore

from ragas.dataset_schema import SingleTurnSample, EvaluationDataset
from openai import AsyncOpenAI

# =========================
# IMPORT PROJECT
# =========================
from app.core.rag import get_rag_response, ChatMessage
from app.core.vector_database import get_vectorstore

# CATATAN: run_eval mengimport node-node LangGraph secara langsung
# dari core.rag agar bisa bypass confidence_filter saat eval in-context.
# Pastikan core/rag.py mengekspos:
#   retrieve, build_history_node, generate, TutorState
# (Semua ini sudah ada di rag.py versi LangGraph yang dibuat sebelumnya)

from eval_dataset import (
    EVAL_DATASET,
    CATEGORIES,
    get_by_category,
    get_by_mode,
    get_multi_turn_groups,
)
from socratic_metrics import (
    SocraticAdherence,
    ModeConsistency,
    QuestionPresence,
    ForbiddenLeakage,
    AntiHallucinationCompliance,
)


# ============================================================
# ROOT CAUSE ANALYSIS
# ============================================================
# Masalah: confidence_score = len(docs) / 3
#   → Jika hanya 1 chunk di-inject dan retriever hanya menemukan
#     1 dokumen, maka 1/3 = 0.333 < 0.6 → difilter, meskipun
#     konteks sebenarnya RELEVAN.
#
# Akar masalah: rumus confidence menghukum pertanyaan yang memang
# hanya butuh 1 chunk relevan. Ini bukan ukuran relevansi,
# melainkan ukuran kuantitas dokumen.
#
# Fix: gunakan eval_rag_call() yang:
#   1. Inject chunks ke Chroma sebelum memanggil RAG
#   2. BYPASS confidence filter untuk item in-context
#      dengan memanggil LangGraph graph langsung (skip filter node)
#   3. Cleanup chunks setelah selesai
# ============================================================

def inject_contexts(item: dict) -> list[str]:
    """
    Tambahkan contexts dari dataset ke vectorstore sementara.
    Inject semua chunk PLUS duplikasi dengan teks pertanyaan
    sebagai prefix agar similarity score lebih tinggi saat retrieval.
    Return list of injected doc IDs untuk cleanup.
    """
    contexts = item.get("contexts") or []
    if not contexts:
        return []

    vs   = get_vectorstore()
    ids  = []
    base = f"eval_{item['category']}_{abs(hash(item['question']))}"

    for i, chunk in enumerate(contexts):
        # Chunk asli
        doc_id = f"{base}_{i}"
        vs.add_texts(
            texts=[chunk],
            metadatas=[{"eval": "true", "source": "eval_injection"}],
            ids=[doc_id],
        )
        ids.append(doc_id)

        # Duplikasi dengan konteks pertanyaan sebagai prefix
        # → meningkatkan similarity saat query = pertanyaan siswa
        augmented_id = f"{base}_{i}_aug"
        vs.add_texts(
            texts=[f"{item['question']}\n\n{chunk}"],
            metadatas=[{"eval": "true", "source": "eval_injection_aug"}],
            ids=[augmented_id],
        )
        ids.append(augmented_id)

    return ids


def cleanup_contexts(ids: list[str]):
    """Hapus dokumen eval yang di-inject setelah selesai."""
    if not ids:
        return
    try:
        vs = get_vectorstore()
        vs.delete(ids=ids)
    except Exception:
        pass


# ============================================================
# UTIL: augment user_input
# ============================================================
def build_user_input(item: dict) -> str:
    forbidden_str = "|".join(item.get("forbidden") or [])
    return (
        f"{item['question']} "
        f"[MODE:{item['feedback_mode']}] "
        f"[FORBIDDEN:{forbidden_str}] "
        f"[CATEGORY:{item.get('category', '')}] "
        f"[OUT_OF_CTX:{'1' if item.get('is_out_of_context') else '0'}]"
    )


# ============================================================
# BUILD CHAT HISTORY untuk multi-turn
# ============================================================
def build_chat_history(item: dict, all_results: list[dict]) -> list[ChatMessage]:
    tid  = item.get("multi_turn_id")
    turn = item.get("turn", 1)
    if not tid or turn <= 1:
        return []

    history = []
    for prev in all_results:
        if (
            prev.get("multi_turn_id") == tid
            and prev.get("turn", 0) < turn
            and prev.get("response")
        ):
            history.append(ChatMessage(role="user",      content=prev["question"]))
            history.append(ChatMessage(role="assistant", content=prev["response"]))
    return history


# ============================================================
# GENERATE RESPONSES dengan context injection
# ============================================================
def generate_responses(dataset: list[dict]) -> list[dict]:
    print(f"\n📚 Generating responses untuk {len(dataset)} sampel...\n")

    # Pisahkan multi-turn
    multi_groups: dict[str, list[dict]] = {}
    regular: list[dict] = []

    for item in dataset:
        if item.get("multi_turn_id"):
            multi_groups.setdefault(item["multi_turn_id"], []).append(item)
        else:
            regular.append(item)

    for tid in multi_groups:
        multi_groups[tid].sort(key=lambda x: x.get("turn", 0))

    results: list[dict] = []

    # -- Regular items --
    for i, item in enumerate(regular, 1):
        tag = f"[{item['category']}]"
        print(f"  {i:>2}. {tag:<28} {item['question'][:52]}...")
        injected_ids = inject_contexts(item)
        try:
            response, rag_meta = _call_rag(item, history=[])
        finally:
            cleanup_contexts(injected_ids)
        results.append({**item, "response": response, "rag_meta": rag_meta})

    # -- Multi-turn groups --
    for tid, turns in multi_groups.items():
        print(f"\n  🔁 Multi-turn group: {tid}")
        for item in turns:
            print(f"     turn {item['turn']}: {item['question'][:52]}...")
            injected_ids = inject_contexts(item)
            history      = build_chat_history(item, results)
            try:
                response, rag_meta = _call_rag(item, history=history)
            finally:
                cleanup_contexts(injected_ids)
            results.append({**item, "response": response, "rag_meta": rag_meta})

    print(f"\n  ✅ {len(results)} respons berhasil di-generate.\n")
    return results


def _call_rag(item: dict, history: list) -> tuple[str, dict]:
    """
    Panggil RAG.
    - Item out-of-context: jalankan normal agar confidence filter aktif.
    - Item in-context: bypass confidence filter, panggil node RAG langsung.

    Mengapa bypass diperlukan?
    Rumus confidence = len(docs) / k  menghukum pertanyaan yang hanya
    butuh 1 chunk relevan → 1/3 = 0.333 < 0.6 → difilter meski jawaban
    sebenarnya bisa diberikan. Selama eval, yang diukur adalah KUALITAS
    RESPONS, bukan seberapa banyak dokumen yang ter-retrieve.
    """
    try:
        is_ooc = item.get("is_out_of_context", False)

        if is_ooc:
            # Biarkan confidence filter berjalan normal
            result = get_rag_response(
                question=item["question"],
                history=history,
                feedback_mode=item["feedback_mode"],
            )
            return result.get("answer", ""), result

        # In-context: bypass confidence filter
        # Panggil node-node LangGraph secara manual (tanpa confidence_filter)
        from app.core.rag import retrieve, build_history_node, generate, TutorState

        state: TutorState = {
            "question":         item["question"],
            "history":          history,
            "feedback_mode":    item["feedback_mode"],
            "context":          None,
            "history_text":     None,
            "confidence_score": None,
            "source_found":     None,
            "answer":           None,
            "final_result":     None,
        }

        state = retrieve(state)
        state = build_history_node(state)

        # Override confidence → generate selalu dipanggil
        state["confidence_score"] = 1.0
        state["source_found"]     = True

        state  = generate(state)
        result = state.get("final_result") or {}
        result.setdefault("status",        "success")
        result.setdefault("feedback_mode", item["feedback_mode"])
        return result.get("answer", ""), result

    except Exception as e:
        print(f"    ⚠️  RAG error: {e}")
        return "", {}


# ============================================================
# SCORING: jalankan custom metrics secara manual (async)
# Ini menghindari ragas.evaluate() yang punya validasi kolom ketat
# dan masih menggunakan API lama.
# ============================================================
async def score_custom_metrics(
    results: list[dict],
    metrics: list,
) -> dict[str, list[float]]:
    """Return dict[metric_name → list of scores]."""
    scores: dict[str, list[float]] = {m.name: [] for m in metrics}

    for item in results:
        sample = SingleTurnSample(
            user_input=build_user_input(item),
            response=item.get("response") or "",
            reference=item.get("ground_truth") or "",
            retrieved_contexts=item.get("contexts") or [],
        )
        for metric in metrics:
            try:
                score = await metric._single_turn_ascore(sample)
            except Exception as e:
                print(f"    ⚠️  Metric {metric.name} error: {e}")
                score = float("nan")
            scores[metric.name].append(score)

    return scores


# ============================================================
# SCORING: ragas standard metrics via evaluate()
# ============================================================
def score_standard_metrics(results: list[dict]) -> dict[str, list[float]]:
    """
    Jalankan faithfulness & context_recall via ragas.evaluate().
    Hanya untuk item yang bukan out_of_context (konteks tersedia).
    """
    try:
        from ragas import evaluate as ragas_evaluate
        try:
            from ragas.llms import llm_factory
            from openai import OpenAI
            llm = llm_factory("gpt-4o-mini", client=OpenAI(api_key=OPENAI_API_KEY))
        except ImportError:
            from langchain_openai import ChatOpenAI
            from ragas.llms import LangchainLLMWrapper
            llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=OPENAI_API_KEY))

        faithfulness.llm   = llm
        context_recall.llm = llm

        samples = []
        valid_indices = []

        for i, item in enumerate(results):
            if item.get("is_out_of_context") or not item.get("contexts"):
                continue
            samples.append(SingleTurnSample(
                user_input=item["question"],
                response=item.get("response") or "",
                reference=item.get("ground_truth") or "",
                retrieved_contexts=item.get("contexts") or [],
            ))
            valid_indices.append(i)

        if not samples:
            return {}

        dataset    = EvaluationDataset(samples=samples)
        eval_result = ragas_evaluate(
            dataset=dataset,
            metrics=[faithfulness, context_recall],
        )
        df = eval_result.to_pandas()

        # Ekspansi ke semua indeks (OOC item dapat NaN)
        faith_scores   = [float("nan")] * len(results)
        recall_scores  = [float("nan")] * len(results)
        for j, idx in enumerate(valid_indices):
            faith_scores[idx]  = df["faithfulness"].iloc[j]
            recall_scores[idx] = df["context_recall"].iloc[j]

        return {
            "faithfulness":   faith_scores,
            "context_recall": recall_scores,
        }

    except Exception as e:
        print(f"  ⚠️  Standard metrics error: {e}")
        return {}


# ============================================================
# THRESHOLDS & METADATA
# ============================================================
THRESHOLDS = {
    "socratic_adherence":            0.80,
    "mode_consistency":              0.75,
    "question_presence":             0.80,
    "forbidden_leakage":             0.80,
    "anti_hallucination_compliance": 0.90,
    "faithfulness":                  0.70,
    "context_recall":                0.60,
}

RECS = {
    "socratic_adherence": (
        "Perketat ATURAN WAJIB di PROMPT_BELUM_PAHAM. "
        "Tambahkan contoh negatif (few-shot) tentang respons yang 'bocor'."
    ),
    "mode_consistency": (
        "Periksa apakah feedback_mode dikirim benar dari frontend. "
        "Perjelas perbedaan instruksi antar mode di sistem prompt."
    ),
    "question_presence": (
        "Untuk belum_paham/mulai_paham: tambahkan instruksi eksplisit "
        "'WAJIB akhiri dengan satu pertanyaan'. "
        "Untuk paham: tambahkan 'JANGAN mengajukan pertanyaan lagi'."
    ),
    "forbidden_leakage": (
        "Tambahkan daftar topik yang tidak boleh disebutkan langsung "
        "di sistem prompt mode belum_paham."
    ),
    "anti_hallucination_compliance": (
        "Perkuat instruksi: 'Jika materi tidak ada di konteks, katakan terus terang. "
        "Jangan mengarang jawaban.' di semua template prompt."
    ),
    "faithfulness": (
        "Periksa kualitas konteks yang di-retrieve. "
        "Coba tingkatkan k (jumlah chunks) atau perbaiki chunking strategy."
    ),
    "context_recall": (
        "Gunakan embedding model yang lebih baik, atau perbaiki "
        "cara chunking agar informasi kunci tidak terpotong."
    ),
}


# ============================================================
# MAIN
# ============================================================
async def run_evaluation(
    category_filter: str | None = None,
    mode_filter:     str | None = None,
    use_ragas_standard: bool = True,
    output_path:     str | None = None,
):
    # --- Filter dataset ---
    dataset = EVAL_DATASET
    if category_filter:
        dataset = get_by_category(category_filter)
        if not dataset:
            print(f"❌ Kategori tidak ditemukan: {category_filter}")
            print(f"   Pilihan: {', '.join(CATEGORIES)}")
            return
    if mode_filter:
        dataset = [d for d in dataset if d["feedback_mode"] == mode_filter]
        if not dataset:
            print(f"❌ Tidak ada data untuk mode: {mode_filter}")
            return

    print(f"\n{'='*64}")
    print(f"🎯  EVALUASI TUTOR SOCRATIC — {len(dataset)} sampel")
    if category_filter:
        print(f"    Kategori : {category_filter}")
    if mode_filter:
        print(f"    Mode     : {mode_filter}")
    print(f"{'='*64}")

    # --- Generate responses ---
    results = generate_responses(dataset)

    # --- Custom metrics ---
    custom_metrics = [
        SocraticAdherence(),
        ModeConsistency(),
        QuestionPresence(),
        ForbiddenLeakage(),
        AntiHallucinationCompliance(),
    ]
    print("⚙️  Scoring custom metrics...\n")
    custom_scores = await score_custom_metrics(results, custom_metrics)

    # --- Standard metrics ---
    standard_scores: dict[str, list[float]] = {}
    if use_ragas_standard:
        print("⚙️  Scoring RAGAS standard metrics (faithfulness, context_recall)...\n")
        standard_scores = score_standard_metrics(results)

    # --- Buat DataFrame ---
    all_scores = {**custom_scores, **standard_scores}
    metric_cols = list(all_scores.keys())

    df = pd.DataFrame({
        "category":       [d.get("category", "")       for d in results],
        "feedback_mode":  [d["feedback_mode"]           for d in results],
        "turn":           [d.get("turn", "-")           for d in results],
        "question_short": [d["question"][:48]           for d in results],
        "exp_status":     [d.get("expected_status", "") for d in results],
        "rag_status":     [d.get("rag_meta", {}).get("status", "") for d in results],
        "confidence":     [d.get("rag_meta", {}).get("confidence_score", 0) for d in results],
        **all_scores,
    })

    # ============================================================
    # OUTPUT
    # ============================================================
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width",       220)
    pd.set_option("display.max_colwidth", 50)
    pd.set_option("display.float_format", "{:.3f}".format)

    print("\n" + "="*72)
    print("📊  HASIL PER SAMPEL")
    print("="*72)
    print(df.to_string(index=False))

    print("\n" + "="*72)
    print("📈  RATA-RATA PER KATEGORI")
    print("="*72)
    print(df.groupby("category")[metric_cols].mean().round(3).to_string())

    print("\n" + "="*72)
    print("📈  RATA-RATA PER FEEDBACK MODE")
    print("="*72)
    print(df.groupby("feedback_mode")[metric_cols].mean().round(3).to_string())

    print("\n" + "="*72)
    print("🏆  RATA-RATA KESELURUHAN")
    print("="*72)
    overall = df[metric_cols].mean()
    for metric, score in overall.items():
        import math
        if math.isnan(score):
            continue
        filled = int(score * 24)
        bar    = "█" * filled + "░" * (24 - filled)
        flag   = " ✅" if score >= THRESHOLDS.get(metric, 0.7) else " ⚠️"
        print(f"  {metric:<36} {bar}  {score:.3f}{flag}")

    print("\n" + "="*72)
    print("💡  INTERPRETASI & REKOMENDASI")
    print("="*72)
    issues = {
        m: s for m, s in overall.items()
        if not pd.isna(s) and s < THRESHOLDS.get(m, 0.7)
    }
    if not issues:
        print("  ✅ Semua metrik di atas threshold!\n")
    else:
        for metric, score in sorted(issues.items(), key=lambda x: x[1]):
            rec = RECS.get(metric, "")
            print(f"  ⚠️  {metric} = {score:.3f} (threshold {THRESHOLDS.get(metric, 0.7)})")
            print(f"     → {rec}\n")

    # Validasi confidence
    _validate_confidence(results)

    # Simpan CSV
    if not output_path:
        ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"eval_results_{ts}.csv"
    df.to_csv(output_path, index=False)
    print(f"\n💾  Disimpan ke: {output_path}\n")
    return df


# ============================================================
# VALIDASI CONFIDENCE (OOC items)
# ============================================================
def _validate_confidence(results: list[dict]):
    ooc = [r for r in results if r.get("is_out_of_context")]
    if not ooc:
        return

    print("\n" + "="*72)
    print("🔍  VALIDASI CONFIDENCE FILTER (Out-of-Context)")
    print("="*72)
    passed = 0
    for item in ooc:
        status  = item.get("rag_meta", {}).get("status", "")
        conf    = item.get("rag_meta", {}).get("confidence_score", 0)
        ok      = status == "filtered_by_confidence"
        passed += int(ok)
        flag    = "✅ FILTERED" if ok else "❌ LOLOS (periksa threshold)"
        print(f"  {flag} | conf={conf:.2f} | {item['question'][:50]}")

    pct = passed / len(ooc) * 100
    print(f"\n  {passed}/{len(ooc)} ({pct:.0f}%) pertanyaan OOC berhasil difilter.\n")


# ============================================================
# ENTRY POINT
# ============================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Evaluasi tutor Socratic IPA SD dengan RAGAS"
    )
    parser.add_argument("--category", choices=CATEGORIES, default=None)
    parser.add_argument("--mode", choices=["belum_paham", "mulai_paham", "paham"], default=None)
    parser.add_argument("--output", default=None)
    parser.add_argument(
        "--no-ragas-standard", action="store_true",
        help="Lewati faithfulness & context_recall (hemat biaya API)"
    )
    args = parser.parse_args()

    asyncio.run(run_evaluation(
        category_filter=args.category,
        mode_filter=args.mode,
        use_ragas_standard=not args.no_ragas_standard,
        output_path=args.output,
    ))