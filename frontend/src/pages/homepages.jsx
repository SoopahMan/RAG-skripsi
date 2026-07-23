import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, MessageCircle, Star, Sparkles } from 'lucide-react';
import { useRBAC } from '../services/useRBAC';

export default function Homepage() {
  const navigate = useNavigate();
  const { user, logout } = useRBAC();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-brand-soft flex flex-col">
      {/* Dynamic Header */}
      <header className="bg-white px-8 py-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-md rotate-3">
            <Star className="text-white w-7 h-7 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">EduBot Pintar</h1>
            <p className="text-sm text-slate-400 font-bold">Selamat datang, {user?.name}!</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-red-50 hover:text-red-500 transition-all border-b-4 border-slate-200 hover:border-red-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Keluar</span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-8 flex flex-col justify-center">
        <div className="text-center mb-12">
          <div className="inline-block p-2 px-6 bg-brand-secondary/20 rounded-full text-brand-primary font-black text-sm uppercase tracking-widest mb-4">
            Menu Utama
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight">
            Apa yang ingin kamu <br />
            <span className="text-brand-blue">pelajari</span> hari ini?
          </h2>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div 
            onClick={() => navigate('/chatbot')}
            className="card-menu group"
          >
            <div className="w-20 h-20 bg-brand-blue/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-10 h-10 text-brand-blue" />
            </div>
            <h3 className="text-3xl font-black mb-2">Chatbot Edukasi</h3>
            <p className="text-slate-500 font-bold leading-relaxed">
              Tanya apa saja tentang PR-mu, EduBot siap bantu jawab dengan mudah!
            </p>
            <div className="mt-8 flex items-center text-brand-blue font-black text-lg">
              Mulai Chat <Sparkles className="ml-2 w-5 h-5 animate-bounce" />
            </div>
          </div>

          <div 
            onClick={() => navigate('/latihan')}
            className="card-menu group hover:border-brand-accent"
          >
            <div className="w-20 h-20 bg-brand-accent/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-10 h-10 text-brand-accent" />
            </div>
            <h3 className="text-3xl font-black mb-2">Latihan Soal</h3>
            <p className="text-slate-500 font-bold leading-relaxed">
              Uji kemampuanmu dengan soal-soal seru dan kumpulkan poin prestasi!
            </p>
            <div className="mt-8 flex items-center text-brand-accent font-black text-lg">
              Ayo Latihan! 🏆
            </div>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="mt-12 p-8 bg-slate-800 rounded-[40px] text-white flex items-center justify-between shadow-xl">
            <div>
              <h3 className="text-xl font-black">Khusus Guru 👩‍🏫</h3>
              <p className="text-slate-400 font-bold">Pantau perkembangan seluruh siswa di kelasmu.</p>
            </div>
            <button onClick={() => navigate('/document')} className="bg-white text-slate-800 px-6 py-3 rounded-2xl font-black hover:scale-105 transition-transform">
              Buka Dasbor
            </button>
          </div>
        )}
      </main>

      <footer className="p-8 text-center text-slate-400 font-bold text-sm">
        EduBot © 2026 - Sahabat Pintar Kelas 5 SD
      </footer>
    </div>
  );
}
