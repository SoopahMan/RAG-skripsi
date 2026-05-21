import { useState, useRef, useEffect } from 'react';
import { useRBAC } from '../services/useRBAC';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, User, Sparkles, MessageSquare, AlertCircle, HelpCircle, FileText } from 'lucide-react';
import { chatWithMentora } from '../services/api'; 
import ReactMarkdown from 'react-markdown';

export default function ChatbotPage() {
  const { user } = useRBAC();
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([
    { 
      id: '1', 
      role: 'bot', 
      text: `Halo! Aku EduBot. Ada yang bisa kubantu hari ini? Kamu bisa menanyakan materi pelajaran atau latihan soal denganku!`,
      allowFeedback: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State manajemen feedback
  const [feedbackMode, setFeedbackMode] = useState("belum_paham");
  const [feedbackLocked, setFeedbackLocked] = useState(false);

  // Auto scroll ke bawah
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || feedbackLocked) return;

    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: input 
    };
    const currentInput = input;

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await chatWithMentora(
        currentInput,
        messages.map(msg => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.text
        })),
        feedbackMode
      );

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: res.content,
        allowFeedback: true, 
        feedbackGiven: false
      };

      setMessages(prev => [...prev, botMsg]);
      
      // Kunci input teks sampai user memberikan feedback
      setFeedbackLocked(true);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'bot', 
        text: "Waduh, koneksinya terputus. Coba kirim pesan lagi ya!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId, feedback) => {
    setFeedbackMode(feedback);

    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedbackGiven: true } : msg
      )
    );

    setFeedbackLocked(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header Utama */}
      <header className="bg-brand-blue bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between shadow-md text-white shrink-0 sticky top-0 z-50 rounded-b-[24px]">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-wide">EduBot Asisten AI</h1>
              <Sparkles className="w-4 h-4 text-amber-300 fill-current animate-pulse" />
            </div>
            <p className="text-xs font-semibold opacity-90 tracking-wider">Ruang Konsultasi Belajar Siswa</p>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold border border-white/10">
          Kelas V
        </div>
      </header>

      {/* Area Chat / Pesan */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            {/* Avatar Bot */}
            {msg.role === 'bot' && (
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}

            {/* Bubble Chat */}
            <div className={`max-w-[85%] md:max-w-[75%] rounded-[24px] p-5 shadow-sm transition-all ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none font-medium' 
                : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
            }`}>
              {/* Nama Pengirim kecil di dalam bubble */}
              <div className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
              }`}>
                {msg.role === 'user' ? (
                  <>
                    <User className="w-3 h-3" />
                    <span>Kamu (Siswa)</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3 h-3 text-blue-500" />
                    <span>EduBot Smart AI</span>
                  </>
                )}
              </div>
              
              {/* Konten Teks Markdown */}
              <div className={`text-[16px] md:text-[17px] font-semibold leading-relaxed prose max-w-none ${
                msg.role === 'user' ? 'prose-invert text-white' : 'prose-slate text-slate-700'
              }`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {/* Box Tombol Feedback Interaktif */}
              {msg.role === 'bot' && msg.allowFeedback && !msg.feedbackGiven && (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-indigo-500" /> 
                    Pilih kelanjutan interaksi belajarmu:
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                    <button
                      onClick={() => handleFeedback(msg.id, "belum_paham")}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-2 border-slate-200 hover:border-rose-300 rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition-all active:scale-95 text-left"
                    >
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>😵 Aku ingin pertanyaan</span>
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, "mulai_paham")}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-600 border-2 border-slate-200 hover:border-amber-300 rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition-all active:scale-95 text-left"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>🙂 Beri pertanyaan dan penjelasan</span>
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, "paham")}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border-2 border-slate-200 hover:border-emerald-300 rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition-all active:scale-95 text-left"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>😎 Kasih aku penjelasan dong</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar User */}
            {msg.role === 'user' && (
              <div className="w-10 h-10 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm shrink-0 border border-slate-300">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {/* Indikator Animasi AI Mengetik */}
        {isLoading && (
          <div className="flex items-start gap-3 justify-start animate-fadeIn">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-[24px] rounded-tl-none p-5 shadow-sm flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Bagian Bawah: Box Input Pengiriman Pesan */}
      <div className="p-4 md:p-6 bg-white border-t border-slate-200/80 shrink-0 shadow-xl rounded-t-[32px]">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* Banner Pemberitahuan Status Feedback (Sangat Bagus untuk Riset Skripsi) */}
          {feedbackLocked && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-amber-800 text-xs font-bold animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Kolom chat terkunci otomatis. Silakan klik salah satu tombol umpan balik (feedback) di atas terlebih dahulu untuk melanjutkan pengerjaan.</span>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading || feedbackLocked}
              placeholder={
                feedbackLocked
                  ? "Pilih opsi evaluasi di atas terlebih dahulu..."
                  : "Ketik di sini untuk bertanya materi atau soal..."
              }
              className="flex-1 bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-[24px] px-6 py-4.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-base md:text-lg shadow-inner disabled:bg-slate-100 disabled:opacity-60 transition-all placeholder:text-slate-400 text-slate-700"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim() || feedbackLocked}
              className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:opacity-95 active:scale-95 transition-all disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-6 h-6 transform translate-x-0.5 -translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}