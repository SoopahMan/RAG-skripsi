"""
run_eval.py
-----------
Runner evaluasi RAGAS untuk tutor Socratic IPA SD kelas 5.
Mendukung semua 8 kategori pertanyaan, termasuk multi-turn dan anti-halusinasi.

Cara menjalankan:
  python run_eval.py
  python run_eval.py --category socratic_prompting
  python run_eval.py --category multi_turn
  python run_eval.py --mode belum_paham
  python run_eval.py --output hasil.csv
  python run_eval.py --no-ragas-standard
"""

import asyncio
import argparse
import os
import sys
from datetime import datetime

import pandas as pd
from langchain_openai import ChatOpenAI
from ragas import evaluate
from ragas.dataset_schema import SingleTurnSample, EvaluationDataset
from ragas.metrics import faithfulness, context_recall
from ragas.llms import LangchainLLMWrapper
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.app.core.rag import get_rag_response, ChatMessage

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

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


# ============================================================
# UTIL: augment user_input dengan metadata untuk metrik
# ============================================================
def build_user_input(item: dict) -> str:
    forbidden_str = "|".join(item.get("forbidden", []))
    return (
        f"{item['question']} "
        f"[MODE:{item['feedback_mode']}] "
        f"[FORBIDDEN:{forbidden_str}] "
        f"[CATEGORY:{item.get('category', '')}] "
        f"[OUT_OF_CTX:{'1' if item.get('is_out_of_context') else '0'}]"
    )


# ============================================================
# BUILD CHAT HISTORY untuk multi-turn
# Mengumpulkan turn sebelumnya dari grup yang sama.
# ============================================================
def build_chat_history(item: dict, all_results: list[dict]) -> list[ChatMessage]:
    """
    Untuk item multi-turn, kumpulkan semua turn sebelumnya
    dari results yang sudah di-generate.
    """
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
# GENERATE RESPONSES
# Multi-turn: jalankan turn secara berurutan agar history terisi.
# ============================================================
def generate_responses(dataset: list[dict]) -> list[dict]:
    print(f"\n📚 Generating responses untuk {len(dataset)} sampel...\n")

    # Pisahkan multi-turn (perlu urutan) dari sisanya
    multi_turn_groups = {}
    regular_items     = []

    for item in dataset:
        if item.get("multi_turn_id"):
            tid = item["multi_turn_id"]
            multi_turn_groups.setdefault(tid, []).append(item)
        else:
            regular_items.append(item)

    for tid in multi_turn_groups:
        multi_turn_groups[tid].sort(key=lambda x: x.get("turn", 0))

    results: list[dict] = []

    # -- Regular items --
    for i, item in enumerate(regular_items, 1):
        tag = f"[{item['category']}]"
        print(f"  {i:>2}. {tag:<28} {item['question'][:55]}...")
        response = _call_rag(item, history=[])
        results.append({**item, "response": response})

    # -- Multi-turn groups (turn berurutan, history terakumulasi) --
    for tid, turns in multi_turn_groups.items():
        print(f"\n  🔁 Multi-turn group: {tid}")
        for item in turns:
            print(f"     turn {item['turn']}: {item['question'][:55]}...")
            history = build_chat_history(item, results)
            response = _call_rag(item, history=history)
            results.append({**item, "response": response})

    print(f"\n  ✅ {len(results)} respons berhasil di-generate.\n")
    return results


def _call_rag(item: dict, history: list) -> str:
    try:
        result = get_rag_response(
            question=item["question"],
            history=history,
            feedback_mode=item["feedback_mode"],
        )
        return result.get("answer", "")
    except Exception as e:
        print(f"    ⚠️  RAG error: {e}")
        return ""


# ============================================================
# BUILD RAGAS DATASET
# ============================================================
def build_ragas_dataset(results: list[dict]) -> EvaluationDataset:
    samples = [
        SingleTurnSample(
            user_input=build_user_input(item),
            response=item["response"],
            reference=item["ground_truth"],
            retrieved_contexts=item.get("contexts") or [],
        )
        for item in results
    ]
    return EvaluationDataset(samples=samples)


# ============================================================
# MAIN EVALUATION
# ============================================================
def run_evaluation(
    category_filter: str | None = None,
    mode_filter: str | None = None,
    use_ragas_standard: bool = True,
    output_path: str | None = None,
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

    # --- Generate respons ---
    results = generate_responses(dataset)

    # --- Ragas dataset ---
    ragas_dataset = build_ragas_dataset(results)

    # --- LLM judge ---
    llm_wrapper = LangchainLLMWrapper(
        ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=OPENAI_API_KEY)
    )

    # --- Metrik ---
    custom_metrics = [
        SocraticAdherence(llm=llm_wrapper),
        ModeConsistency(llm=llm_wrapper),
        QuestionPresence(llm=llm_wrapper),
        ForbiddenLeakage(llm=llm_wrapper),
        AntiHallucinationCompliance(llm=llm_wrapper),
    ]

    standard_metrics = []
    if use_ragas_standard:
        faithfulness.llm   = llm_wrapper
        context_recall.llm = llm_wrapper
        standard_metrics   = [faithfulness, context_recall]

    print("⚙️  Running evaluation metrics...\n")
    eval_result = evaluate(
        dataset=ragas_dataset,
        metrics=custom_metrics + standard_metrics,
    )

    # --- Konversi ke DataFrame ---
    df: pd.DataFrame = eval_result.to_pandas()

    metric_cols = [
        c for c in df.columns
        if c not in ("user_input", "response", "reference", "retrieved_contexts")
    ]

    df.insert(0, "category",       [d.get("category", "")      for d in results])
    df.insert(1, "feedback_mode",  [d["feedback_mode"]          for d in results])
    df.insert(2, "turn",           [d.get("turn", "-")          for d in results])
    df.insert(3, "question_short", [d["question"][:48]          for d in results])
    df.insert(4, "expected_status",[d.get("expected_status","") for d in results])

    display_cols = [
        "category", "feedback_mode", "turn", "question_short",
        "expected_status",
    ] + metric_cols

    # ============================================================
    # OUTPUT: per sampel
    # ============================================================
    print("\n" + "="*72)
    print("📊  HASIL PER SAMPEL")
    print("="*72)
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 200)
    pd.set_option("display.max_colwidth", 50)
    print(df[display_cols].to_string(index=False))

    # ============================================================
    # OUTPUT: rata-rata per kategori
    # ============================================================
    print("\n" + "="*72)
    print("📈  RATA-RATA PER KATEGORI")
    print("="*72)
    by_cat = df.groupby("category")[metric_cols].mean().round(3)
    print(by_cat.to_string())

    # ============================================================
    # OUTPUT: rata-rata per feedback_mode
    # ============================================================
    print("\n" + "="*72)
    print("📈  RATA-RATA PER FEEDBACK MODE")
    print("="*72)
    by_mode = df.groupby("feedback_mode")[metric_cols].mean().round(3)
    print(by_mode.to_string())

    # ============================================================
    # OUTPUT: keseluruhan + bar chart
    # ============================================================
    print("\n" + "="*72)
    print("🏆  RATA-RATA KESELURUHAN")
    print("="*72)
    overall = df[metric_cols].mean().round(3)
    for metric, score in overall.items():
        filled = int(score * 24)
        bar    = "█" * filled + "░" * (24 - filled)
        flag   = " ✅" if score >= THRESHOLDS.get(metric, 0.7) else " ⚠️"
        print(f"  {metric:<32} {bar}  {score:.3f}{flag}")

    # ============================================================
    # OUTPUT: interpretasi & rekomendasi
    # ============================================================
    print("\n" + "="*72)
    print("💡  INTERPRETASI & REKOMENDASI")
    print("="*72)
    _interpret(overall.to_dict())

    # ============================================================
    # Khusus: validasi confidence testing
    # ============================================================
    _validate_confidence_category(results)

    # ============================================================
    # Simpan CSV
    # ============================================================
    if not output_path:
        ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"eval_results_{ts}.csv"

    df.to_csv(output_path, index=False)
    print(f"\n💾  Disimpan ke: {output_path}\n")
    return df


# ============================================================
# THRESHOLDS per metrik
# ============================================================
THRESHOLDS = {
    "socratic_adherence":          0.80,
    "mode_consistency":            0.75,
    "question_presence":           0.80,
    "forbidden_leakage":           0.80,
    "anti_hallucination_compliance": 0.90,
    "faithfulness":                0.70,
    "context_recall":              0.60,
}

METRIC_DESCRIPTIONS = {
    "socratic_adherence":          "Tutor tidak membocorkan jawaban final pada mode belum_paham",
    "mode_consistency":            "Gaya respons sesuai feedback_mode (belum/mulai/paham)",
    "question_presence":           "Ada/tidak pertanyaan sesuai ekspektasi mode",
    "forbidden_leakage":           "Kata kunci jawaban tidak bocor ke respons Socratic",
    "anti_hallucination_compliance": "AI mengakui keterbatasan, tidak mengarang jawaban di luar konteks",
    "faithfulness":                "Klaim dalam respons didukung oleh konteks yang di-retrieve",
    "context_recall":              "Konteks mencakup informasi yang ada di ground_truth",
}

RECS = {
    "socratic_adherence": (
        "Perketat aturan ATURAN WAJIB di PROMPT_BELUM_PAHAM. "
        "Tambahkan contoh negatif (few-shot) tentang respons yang 'bocor'."
    ),
    "mode_consistency": (
        "Periksa apakah feedback_mode dikirim dengan benar dari frontend. "
        "Perjelas perbedaan instruksi antar mode di sistem prompt."
    ),
    "question_presence": (
        "Untuk mode belum_paham/mulai_paham: tambahkan instruksi eksplisit "
        "'WAJIB akhiri dengan satu pertanyaan'. "
        "Untuk mode paham: tambahkan 'JANGAN mengajukan pertanyaan lagi'."
    ),
    "forbidden_leakage": (
        "Tambahkan daftar topik yang tidak boleh disebutkan langsung "
        "di sistem prompt mode belum_paham."
    ),
    "anti_hallucination_compliance": (
        "Perkuat instruksi: 'Jika materi tidak ada di konteks, katakan terus terang. "
        "Jangan mengarang jawaban.' Tambahkan di semua template prompt."
    ),
    "faithfulness": (
        "Periksa kualitas konteks yang di-retrieve. "
        "Coba tingkatkan k (jumlah chunks) atau perbaiki chunking strategy."
    ),
    "context_recall": (
        "Pertimbangkan untuk menggunakan embedding model yang lebih baik, "
        "atau perbaiki cara dokumen di-chunking agar informasi kunci tidak terpotong."
    ),
}


def _interpret(scores: dict):
    issues = {
        m: s for m, s in scores.items()
        if s < THRESHOLDS.get(m, 0.7)
    }

    if not issues:
        print("  ✅ Semua metrik di atas threshold. Sistem berjalan dengan baik!\n")
        return

    print(f"  Ditemukan {len(issues)} metrik di bawah threshold:\n")
    for metric, score in sorted(issues.items(), key=lambda x: x[1]):
        threshold = THRESHOLDS.get(metric, 0.7)
        desc      = METRIC_DESCRIPTIONS.get(metric, "")
        rec       = RECS.get(metric, "")
        print(f"  ⚠️  {metric}")
        print(f"      Skor     : {score:.3f}  (threshold: {threshold})")
        print(f"      Artinya  : {desc}")
        print(f"      Rekomendasi: {rec}\n")


def _validate_confidence_category(results: list[dict]):
    """
    Validasi khusus: apakah item out_of_context mendapat
    expected_status = filtered_by_confidence?
    """
    out_of_ctx = [r for r in results if r.get("is_out_of_context")]
    if not out_of_ctx:
        return

    print("\n" + "="*72)
    print("🔍  VALIDASI ANTI-HALUSINASI & CONFIDENCE FILTER")
    print("="*72)
    passed = 0
    for item in out_of_ctx:
        response = item.get("response", "").lower()
        # Cek apakah respons mengandung sinyal penolakan
        rejection_signals = [
            "belum menemukan", "tidak tersedia", "tidak ada di materi",
            "tidak ditemukan", "materi tidak membahas", "kata lain",
            "di luar materi", "tidak bisa menjawab",
        ]
        rejected = any(sig in response for sig in rejection_signals)
        status   = "✅ PASS" if rejected else "❌ FAIL (mungkin halusinasi)"
        passed  += int(rejected)
        print(f"  {status} | {item['question'][:55]}")

    pct = passed / len(out_of_ctx) * 100
    print(f"\n  Hasil: {passed}/{len(out_of_ctx)} ({pct:.0f}%) pertanyaan OOC ditolak dengan benar.\n")


# ============================================================
# ENTRY POINT
# ============================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Evaluasi tutor Socratic IPA SD dengan RAGAS"
    )
    parser.add_argument(
        "--category",
        choices=CATEGORIES,
        default=None,
        help="Filter ke satu kategori saja",
    )
    parser.add_argument(
        "--mode",
        choices=["belum_paham", "mulai_paham", "paham"],
        default=None,
        help="Filter ke satu feedback_mode",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Path file CSV output",
    )
    parser.add_argument(
        "--no-ragas-standard",
        action="store_true",
        help="Lewati faithfulness & context_recall (hemat biaya API)",
    )
    args = parser.parse_args()

if __name__ == "__main__":
    ...
    run_evaluation(
        category_filter=args.category,
        mode_filter=args.mode,
        use_ragas_standard=not args.no_ragas_standard,
        output_path=args.output,
    )