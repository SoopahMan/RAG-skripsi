import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { MessageSquare, User, School, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && className) {
      onLogin(name, className);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-orange-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-orange-300/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 shadow-2xl border-none bg-white/80 backdrop-blur-xl rounded-[2.5rem]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200 mb-6 transform -rotate-6">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Mentora-ITS</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
              <Sparkles className="w-3 h-3 text-orange-600" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600">SDN Bandungrejosari 1</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <p className="text-gray-600 font-medium italic">"Selamat Datang di Mentora. Silakan masukkan identitas siswa untuk memulai petualangan belajarmu."</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-orange-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Kelas</label>
                <div className="relative">
                  <School className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Contoh: 5-A"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-orange-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-orange-500 hover:bg-orange-600 rounded-xl text-lg font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 mt-4"
                disabled={!name || !className}
              >
                Mulai Belajar
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">Intelligent Tutoring System v2.0</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
