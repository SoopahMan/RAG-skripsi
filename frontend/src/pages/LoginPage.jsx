import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, User } from 'lucide-react';
import { useRBAC } from '../services/useRBAC';

const API = import.meta.env.VITE_API_URL;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useRBAC();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      return alert('Isi nama dan passwordmu ya!');
    }
    
    setLoading(true);

    try {
      // Menggunakan fetch API riil dari backend lama
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login gagal, periksa kembali akunmu ya!");
      }

      // Sinkronkan ke RBAC (yang dipakai RequireAuth)
      // Simpan token juga supaya useRBAC (guard) tidak menganggap user null saat load ulang
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }

      login({
        role: data.user?.role,
        username: data.user?.username
      });


      // Redirect dinamis dan valid berdasarkan property role dari backend
      if (data.user.role === "admin") {
        navigate("/home-admin");
      } else if (data.user.role === "user") {
        navigate("/home-user");
      } else {
        navigate("/login");
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-secondary/10">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border-b-8 border-slate-200">
        
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-brand-primary rounded-3xl flex items-center justify-center mx-auto shadow-lg mb-4 rotate-3">
            <Sparkles className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-slate-800">
            Halo <span className="text-brand-primary">Sobat!</span>
          </h1>
          <p className="text-slate-500 font-bold mt-2">Ayo masuk untuk mulai belajar!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Input Username / Email */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-400 uppercase ml-2 tracking-widest">Siapa Namamu / Email-mu?</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
              <input
                id="username"
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border-4 border-slate-100 rounded-3xl px-12 py-4 outline-none focus:border-brand-blue font-bold text-lg transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-400 uppercase ml-2 tracking-widest">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
              <input
                id="password"
                type="password"
                placeholder="Rahasia ya..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border-4 border-slate-100 rounded-3xl px-12 py-4 outline-none focus:border-brand-blue font-bold text-lg transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Tombol Masuk dengan Status Loading */}
          <button 
            id="btn-masuk" 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                <span>Tunggu sebentar...</span>
              </div>
            ) : (
              "Ayo Masuk! 🚀"
            )}
          </button>
          
        </form>
      </div>
    </div>
  );
}