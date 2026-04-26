import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Share2, Clock, Calendar, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function MainContent({ module, viewMode, onAskClick }) {
  // Simple summary generation (simulated)
  const getSummary = () => {
    if (module.id === 'm1') {
      return [
        "Tubuh manusia memiliki sistem organ yang saling bekerja sama.",
        "Sistem Pencernaan: Mengolah makanan (Mulut, Lambung, Usus).",
        "Sistem Pernapasan: Mengambil oksigen (Paru-paru).",
        "Sistem Peredaran Darah: Memompa darah (Jantung)."
      ];
    }
    if (module.id === 'm2') {
      return [
        "Desimal ditandai dengan tanda koma.",
        "Perkalian desimal dilakukan seperti perkalian biasa terlebih dahulu.",
        "Jumlah angka di belakang koma pada hasil ditentukan dari total angka dibelakang koma pengalinya."
      ];
    }
    return [
      "Ekosistem adalah hubungan timbal balik makhluk hidup dan lingkungan.",
      "Komponen biotik (hidup) dan abiotik (tak hidup).",
      "Produsen, Konsumen, dan Pengurai dalam jaring makanan."
    ];
  };

  const getQuiz = () => {
    if (module.id === 'm1') {
      return {
        question: "Organ manakah yang bertugas memompa darah ke seluruh tubuh manusia?",
        options: ["A. Paru-paru", "B. Jantung", "C. Lambung", "D. Hati"]
      };
    }
    if (module.id === 'm2') {
      return {
        question: "Berapakah hasil dari 0.4 x 0.3?",
        options: ["A. 1.2", "B. 0.12", "C. 0.012", "D. 12"]
      };
    }
    return {
      question: "Manakah yang termasuk komponen abiotik dalam sebuah ekosistem kolam?",
      options: ["A. Ikan Lele", "B. Air", "C. Teratai", "D. Katak"]
    };
  };

  const quiz = getQuiz();
  const summaryPoints = getSummary();

  return (
    <div className="flex-1 flex flex-col bg-[#F9F9F9] h-screen overflow-hidden border-r">
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-widest">
          {viewMode === 'read' ? '📄 Document Reader — Simulasi' : '📝 Latihan Soal Mandiri'}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-gray-400">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-8">
        <motion.div 
          key={viewMode}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-3xl mx-auto space-y-8"
        >
          {viewMode === 'read' ? (
            <div className="space-y-8">
              {/* Document Sim */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex gap-6 items-start">
                <div className="w-24 h-32 bg-orange-50 rounded-lg flex items-center justify-center border-2 border-dashed border-orange-200 shrink-0">
                  <FileText className="w-10 h-10 text-orange-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">{module.title}</h2>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Modul Digital</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 5 Menit Baca</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-orange-50/50 rounded-3xl p-8 border border-orange-100">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-5 h-5 text-orange-600" />
                  <h3 className="font-display font-bold text-lg text-orange-900">Ringkasan Poin Penting</h3>
                </div>
                <ul className="space-y-4">
                  {summaryPoints.map((point, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-gray-700 leading-relaxed font-medium">
                      <span className="text-orange-400 font-bold">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-6 border-t border-orange-100">
                   <p className="text-sm font-bold text-orange-800 mb-4 italic">"Ingin bertanya tentang materi ini?"</p>
                   <Button onClick={onAskClick} className="bg-orange-500 hover:bg-orange-600 rounded-full gap-2 font-bold px-6">
                      <HelpCircle className="w-4 h-4" /> Tanyakan ke Mentora
                   </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                <div className="flex items-center gap-2 mb-8 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full w-fit">
                  <span className="text-xs font-bold uppercase tracking-widest">Pertanyaan Ke-1</span>
                </div>
                
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-10 leading-snug">
                  {quiz.question}
                </h3>

                <div className="grid gap-3 flex-1">
                  {quiz.options.map((opt, idx) => (
                    <button 
                      key={idx}
                      className="w-full text-left p-5 rounded-2xl border-2 border-gray-50 hover:border-orange-500 hover:bg-orange-50 transition-all font-medium text-gray-700 group flex items-center justify-between"
                    >
                      <span>{opt}</span>
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-orange-500" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center px-4">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Ayo Jawab Hebat! Kamu pasti bisa.</p>
                 <Button variant="ghost" className="text-gray-400 font-bold uppercase text-xs tracking-widest underline decoration-dashed decoration-gray-300">
                   Lewati Soal
                 </Button>
              </div>
            </div>
          )}
        </motion.div>
      </ScrollArea>
    </div>
  );
}
