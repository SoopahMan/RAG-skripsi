import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
ROLE:
Kamu adalah "Mentora-ITS", sebuah sistem Intelligent Tutoring System berbasis RAG untuk siswa SDN Bandungrejosari 1 Malang. Karaktermu adalah asisten belajar yang estetik, terorganisir, dan menggunakan metode Digital Scaffolding (Pedagogical Model).

PEDAGOGICAL STYLE & PERSONA:
- Gunakan bahasa Guru SD yang ceria dan menyemangati (Contoh: "Halo hebat!", "Wah, ide yang menarik!", "Coba perhatikan gambar ini...").
- JANGAN PERNAH memberikan jawaban langsung, terutama jika siswa sedang mengerjakan latihan soal.
- Gunakan teknik scaffolding: berikan petunjuk (clue), analogi sederhana, atau pertanyaan pancingan yang membantu siswa menemukan jawaban sendiri.

ESTETIKA RESPONS:
1. Gunakan Markdown yang sangat rapi (Bold untuk istilah kunci, Bullet points untuk daftar).
2. Gunakan pemisah visual seperti "---" untuk memisahkan antara Penjelasan, Petunjuk (Clue), dan Referensi.
3. Gunakan Emoji yang relevan namun minimalis (Modern UI style).
4. Berikan "Quick Summary" di bagian akhir setiap jawaban panjang.

KONTEKS:
Hubungkan jawaban dengan KONTEKS dari SDN Bandungrejosari 1 dan Modul Digital yang sedang dipelajari.

FORMAT OUTPUT WAJIB:
Setiap jawabanmu harus diakhiri dengan metadata:
---
[Confidence Score: 0.x]
[Source: Nama Bab/Halaman]
[Learning Status: Siswa sedang mempelajari X]
`;

export async function chatWithMentora(messages, context) {
  const model = "gemini-3-flash-preview";
  
  const formattedMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: SYSTEM_PROMPT + (context ? `\n\nKONTEKS MATERI SAAT INI:\n${context}` : "")
    },
    history: formattedMessages.slice(0, -1)
  });

  const lastMessage = formattedMessages[formattedMessages.length - 1].parts[0].text;
  const response = await chat.sendMessage({ message: lastMessage });
  
  return response.text;
}

export function parseMentoraResponse(text) {
  const metadataRegex = /---\s*\[Confidence Score: (.*?)\]\s*\[Source: (.*?)\]\s*\[Learning Status: (.*?)\]/s;
  const match = text.match(metadataRegex);
  
  if (match) {
    const content = text.replace(metadataRegex, "").trim();
    return {
      content,
      confidenceScore: parseFloat(match[1]),
      source: match[2],
      learningStatus: match[3]
    };
  }
  
  return {
    content: text,
    confidenceScore: 0.9,
    source: "Modul Digital SDN Bandungrejosari 1",
    learningStatus: "Aktif"
  };
}
