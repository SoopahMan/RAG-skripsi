const API = import.meta.env.VITE_API_URL;

export async function chatWithMentora(
  question,
  chatHistory = [],
  feedbackMode = "belum_paham"
) {

  const res = await fetch(`${API}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      chat_history: chatHistory,
      feedback_mode: feedbackMode
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("API Error: " + errText);
  }

  const data = await res.json();

  return {
    content: data.answer,
    confidenceScore: data.confidence_score,
    source: data.source_found
      ? "Buku Pembelajaran"
      : "Tidak ditemukan",

    learningStatus: data.source_found
      ? "Valid"
      : "Tidak ditemukan di konteks",

    feedbackMode: data.feedback_mode
  };
}