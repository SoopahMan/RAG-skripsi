import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { MessageSquare, Mail, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";

const API = import.meta.env.VITE_API_URL;

export default function LoginPage() {
  const [username, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); // ✅ harus di dalam component

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login gagal");
      }

      // ✅ simpan via auth.js
      login(data.access_token, data.user);

      // ✅ redirect berdasarkan role
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-2xl rounded-[2.5rem] bg-white/80 backdrop-blur-xl">

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-lg mb-6">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold mb-2">Mentora-ITS</h1>

            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
              <Sparkles className="w-3 h-3 text-orange-600" />
              <span className="text-[10px] font-bold text-orange-600">
                Login Sistem
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-xs font-bold text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUser(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-orange-500 rounded-xl text-lg font-bold"
            >
              {loading ? "Loading..." : "Login"}
            </Button>

          </form>
        </Card>
      </motion.div>
    </div>
  );
}