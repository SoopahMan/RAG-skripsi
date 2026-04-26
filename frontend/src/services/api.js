const API = import.meta.env.VITE_API_URL;

// Kirim pertanyaan ke FastAPI
export async function chatWithMentora(question) {
  const res = await fetch(`${API}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("API Error: " + errText);
  }

  const data = await res.json();

  // mapping ke format frontend kamu
  return {
    content: data.answer,
    confidenceScore: data.confidence_score,
    source: data.source_found ? "Buku Pembelajaran" : "Tidak ditemukan",
    learningStatus: data.source_found ? "Valid" : "Tidak ditemukan di konteks"
  };
}