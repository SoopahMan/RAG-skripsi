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

  // 1. Pesan pertama disetel Socratic Prompting murni tanpa opsi feedback
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      role: 'bot', 
      text: `alo! Aku EduBot. Ada yang bisa kubantu hari ini? Kamu bisa menanyakan materi pelajaran atau latihan soal denganku! Jika kamu bingung aku bisa menjawab apa saja, bisa tanyakan materi apa saja yang aku punya yaa.`, 
      allowFeedback: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State manajemen feedback
  const [feedbackLocked, setFeedbackLocked] = useState(false);
  
  // State tambahan untuk menyimpan sementara pesan user yang sedang menunggu pemilihan feedback
  const [pendingUserMessage, setPendingUserMessage] = useState(null);

  // Auto scroll ke bawah
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, pendingUserMessage]);

  // Langkah 1: Ketika user menekan tombol kirim pesan
  const sendMessage = () => {
    if (!input.trim() || isLoading || feedbackLocked) return;

    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: input,
      requiresFeedbackMode: true, // Menandai bahwa pesan user ini butuh konfirmasi opsi feedback
      feedbackChosen: false
    };

    // Tampilkan pesan user di layar
    setMessages(prev => [...prev, userMsg]);
    
    // Simpan teks ke state pending untuk dieksekusi setelah tombol feedback diklik
    setPendingUserMessage(input);
    
    // Reset kolom input & kunci agar tidak mengetik pesan baru dulu
    setInput('');
    setFeedbackLocked(true);
  };

  // Langkah 2: Ketika user memilih salah satu tombol feedback di bawah pesannya
  const handleSelectFeedbackAndReply = async (userMessageId, chosenFeedbackMode) => {
    if (!pendingUserMessage) return;

    setIsLoading(true);
    
    // Tandai pada pesan user bahwa opsi feedback sudah dipilih (untuk menyembunyikan tombol)
    setMessages(prev =>
      prev.map(msg =>
        msg.id === userMessageId ? { ...msg, feedbackChosen: true } : msg
      )
    );

    try {
      // Ambil seluruh riwayat pesan terkini sebelum memanggil API
      const historyPayload = messages.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));

      // Kirim ke API dengan menyertakan mode feedback yang baru saja diklik siswa
      const res = await chatWithMentora(
        pendingUserMessage,
        historyPayload,
        chosenFeedbackMode
      );

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: res.content,
        allowFeedback: false // Jawaban bot sekarang tidak perlu memunculkan tombol lagi
      };

      // Tampilkan balasan bot ke layar
      setMessages(prev => [...prev, botMsg]);
      
      // Buka kembali kunci input chat & bersihkan state pending
      setFeedbackLocked(false);
      setPendingUserMessage(null);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'bot', 
        text: "Waduh, koneksinya terputus. Coba pilih lagi opsi di atas ya!" 
      }]);
    } finally {
      setIsLoading(false);
    }
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
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2 animate-fadeIn`}
          >
            <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
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
                {/* Nama Pengirim */}
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
                
                {/* Teks Konten */}
                <div className={`text-[16px] md:text-[17px] font-semibold leading-relaxed prose max-w-none ${
                  msg.role === 'user' ? 'prose-invert text-white' : 'prose-slate text-slate-700'
                }`}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>

              {/* Avatar User */}
              {msg.role === 'user' && (
                <div className="w-10 h-10 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm shrink-0 border border-slate-300">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* DIBALIK: Pilihan Feedback Sekarang Muncul di Bawah Chat Siswa Terakhir */}
            {msg.role === 'user' && msg.requiresFeedbackMode && !msg.feedbackChosen && (
              <div className="w-full max-w-[85%] md:max-w-[75%] pr-13 mt-2 space-y-3 animate-fadeIn">
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 shadow-inner">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-3 h-3 text-blue-500" /> 
                    Bagaimana kamu ingin EduBot menanggapi pertanyaanmu di atas?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleSelectFeedbackAndReply(msg.id, "belum_paham")}
                      className="flex items-center gap-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-2 border-slate-200 hover:border-rose-300 rounded-xl px-4 py-2.5 text-xs md:text-sm font-black shadow-sm transition-all active:scale-95 text-left"
                    >
                      <HelpCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>😵 Uji aku dengan pertanyaan terkait ini</span>
                    </button>
                    <button
                      onClick={() => handleSelectFeedbackAndReply(msg.id, "mulai_paham")}
                      className="flex items-center gap-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-600 border-2 border-slate-200 hover:border-amber-300 rounded-xl px-4 py-2.5 text-xs md:text-sm font-black shadow-sm transition-all active:scale-95 text-left"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>🙂 Beri aku pertanyaan sekaligus penjelasan singkat</span>
                    </button>
                    <button
                      onClick={() => handleSelectFeedbackAndReply(msg.id, "paham")}
                      className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border-2 border-slate-200 hover:border-emerald-300 rounded-xl px-4 py-2.5 text-xs md:text-sm font-black shadow-sm transition-all active:scale-95 text-left"
                    >
                      <FileText className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>😎 Berikan aku materi penjelasan yang lengkap</span>
                    </button>
                  </div>
                </div>
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
          
          {/* Banner Status Penguncian */}
          {feedbackLocked && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-amber-800 text-xs font-bold animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Sistem menunggu pilihan belajarmu. Silakan pilih salah satu opsi di bawah pesan terakhirmu agar EduBot bisa menjawab.</span>
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
                  ? "Pilih opsi di atas terlebih dahulu..."
                  : "Ketik jawaban atau pertanyaanmu di sini..."
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