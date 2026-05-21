import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Send, Search, FileText, Video, HelpCircle, FileStack } from 'lucide-react';
import { chatWithMentora } from '../services/api'
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function ChatPanel({ module, viewMode = 'read' }) {
  const [messages, setMessages] = useState([]);
  const [feedbackMode, setFeedbackMode] = useState("belum_paham");
  const [feedbackLocked, setFeedbackLocked] = useState(false);
  
  useEffect(() => {
    const initialText = viewMode === 'practice' 
      ? `Halo hebat! 👋 Yuk perhatikan soal IPA di sebelah kiri. Ada bagian yang membingungkan? Kamu bisa tanya Mentora lho, nanti kita cari tahu petunjuknya bareng-bareng ya! ✨`
      : `Halo! Saya Mentora-ITS. Senang sekali bertemu denganmu hari ini. 👋\n\nKita sedang mempelajari **${module.title}**. Bagaimana perasaanmu hari ini? Apakah ada yang ingin kamu tanyakan atau diskusikan dari modul ini?`;
      
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: initialText,
        timestamp: new Date()
      }
    ]);
  }, [module.id, viewMode]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
  if (!input.trim() || isLoading || feedbackLocked) return;

  const userMsg = {
    id: Date.now().toString(),
    role: 'user',
    content: input,
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMsg]);
  setInput('');
  setIsLoading(true);

  try {
    const res = await chatWithMentora(
      input,
      messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      feedbackMode
    );

    const assistantMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: res.content,
      confidenceScore: res.confidenceScore,
      source: res.source,
      learningStatus: res.learningStatus,
      timestamp: new Date(),

      // ✅ hanya pesan utama boleh feedback
      allowFeedback: true,
      feedbackGiven: false
    };

        setMessages(prev => [...prev, assistantMsg]);


    // 🔒 lock sampai feedback dipilih
    setFeedbackLocked(true);

  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};

const handleFeedback = (messageId, feedback) => {

  // ✅ update mode pembelajaran
  setFeedbackMode(feedback);

  setMessages(prev =>
    prev.map(msg =>
      msg.id === messageId
        ? { ...msg, feedbackGiven: true }
        : msg
    )
  );

  setFeedbackLocked(false);

  const feedbackReply = {
    id: Date.now().toString(),
    role: 'assistant',
    content:
      feedback === "belum_paham"
        ? "Terima kasih ya 😊 Mentora akan membantu pelan-pelan sampai kamu paham."
        : feedback === "mulai_paham"
        ? "Wah bagus! 🌟 Sedikit lagi kamu pasti makin mengerti."
        : "Hebat sekali! 🎉 Terima kasih atas feedbacknya, kamu sudah belajar dengan baik.",

    timestamp: new Date(),
    allowFeedback: false
  };

  setMessages(prev => [...prev, feedbackReply]);
};

  return (
    <div className="w-[480px] bg-white border-l h-screen flex flex-col shadow-2xl relative z-10">
      <div className="p-6 shrink-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl leading-tight">Good to see you!</h3>
            <p className="text-sm font-bold text-orange-500">How can I be an assistance?</p>
            <p className="text-[10px] text-gray-400 mt-1">I'm available 24/7 for you, ask me anything.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs font-semibold gap-1.5 border-gray-100 bg-gray-50">
            <HelpCircle className="w-3.5 h-3.5" /> Quiz Generation
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs font-semibold gap-1.5 border-gray-100 bg-gray-50">
            <FileStack className="w-3.5 h-3.5" /> Flashcards
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs font-semibold gap-1.5 border-gray-100 bg-gray-50">
            <Search className="w-3.5 h-3.5" /> Search
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs font-semibold gap-1.5 border-gray-100 bg-gray-50">
           <Video className="w-3.5 h-3.5" /> Videos
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-6 pb-6">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {m.role === 'assistant' && (
                  <Avatar className="w-8 h-8 border">
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-xs font-bold">M</AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col gap-1.5 max-w-[85%] ${m.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-orange-500 text-white rounded-tr-none shadow-md shadow-orange-100' 
                      : 'bg-[#F3F4F6] text-gray-700 rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm prose-p:leading-relaxed prose-orange max-w-none dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    
                      {m.role === 'assistant' &&
                      m.allowFeedback &&
                      !m.feedbackGiven && (                    
                      <div className="mt-4 flex gap-2 flex-wrap">
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleFeedback(m.id, "belum_paham")}
                      >
                        😵 Belum Paham
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleFeedback(m.id, "mulai_paham")}
                      >
                        🙂 Mulai Paham
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleFeedback(m.id, "paham")}
                      >
                        😎 Sudah Paham
                      </Button>

                    </div>
                  )}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
             <div className="flex gap-3">
              <Avatar className="w-8 h-8 border animate-pulse">
                <AvatarFallback className="bg-orange-100 text-orange-600 text-xs font-bold">M</AvatarFallback>
              </Avatar>
              <div className="bg-[#F3F4F6] p-4 rounded-2xl rounded-tl-none max-w-[85%] flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-6 bg-white shrink-0">
        <div className="relative group">
          <Input
            placeholder={
              feedbackLocked
                ? "Pilih feedback dulu sebelum lanjut bertanya..."
                : "I'm available 24/7 for you, ask me anything..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading || feedbackLocked}
            className="pr-12 h-14 rounded-xl border-gray-100 bg-gray-50"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={isLoading || !input.trim() || feedbackLocked}
            className="absolute right-2 top-2 h-10 w-10 bg-orange-500 hover:bg-orange-600 rounded-lg shadow-lg shadow-orange-200 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>  
        <div className="flex justify-center mt-3">
          <p className="text-[9px] text-gray-300 font-medium uppercase tracking-[0.2em]">Mentora AI Engine 2026</p>
        </div>
      </div>
    </div>
  );
}
