import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  Upload, 
  Plus, 
  Users, 
  FileText, 
  CheckCircle2, 
  GraduationCap, 
  BookOpen,
  Trash2,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TeacherPortal({ activeTab, modules, onAddModule, questions, onAddQuestion, students, onAddStudent }) {
  const [newModule, setNewModule] = useState({ title: '', subject: '', grade: '', content: '' });
  const [newQuestion, setNewQuestion] = useState({ moduleId: '', question: '', options: ['', '', '', ''], correct: 0 });
  const [newStudent, setNewStudent] = useState({ name: '', class: '' });

  const handleAddModule = (e) => {
    e.preventDefault();
    if (newModule.title && newModule.subject) {
      onAddModule({ ...newModule, id: 'm' + Date.now() });
      setNewModule({ title: '', subject: '', grade: '', content: '' });
    }
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (newQuestion.moduleId && newQuestion.question) {
      onAddQuestion({ ...newQuestion, id: 'q' + Date.now() });
      setNewQuestion({ moduleId: '', question: '', options: ['', '', '', ''], correct: 0 });
    }
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (newStudent.name && newStudent.class) {
      onAddStudent({ ...newStudent, id: 's' + Date.now() });
      setNewStudent({ name: '', class: '' });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen overflow-hidden">
      <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h2 className="font-display font-bold text-xl uppercase tracking-widest text-gray-400 text-[10px]">
             Teacher Hub &raquo; <span className="text-gray-900 text-lg normal-case tracking-normal">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
          </h2>
        </div>
      </header>

      <ScrollArea className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'materi' && (
              <motion.div
                key="materi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-sm rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Upload className="w-5 h-5 text-orange-500" /> Upload Materi Baru
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddModule} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          placeholder="Judul Materi" 
                          value={newModule.title}
                          onChange={e => setNewModule({...newModule, title: e.target.value})}
                          required
                        />
                        <Input 
                          placeholder="Mata Pelajaran" 
                          value={newModule.subject}
                          onChange={e => setNewModule({...newModule, subject: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          placeholder="Kelas (contoh: 5)" 
                          value={newModule.grade}
                          onChange={e => setNewModule({...newModule, grade: e.target.value})}
                        />
                      </div>
                      <textarea 
                        className="w-full min-h-[200px] p-4 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        placeholder="Tempel isi materi di sini (format Markdown didukung)..."
                        value={newModule.content}
                        onChange={e => setNewModule({...newModule, content: e.target.value})}
                        required
                      />
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 rounded-xl font-bold">
                        Publish Materi
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-6">
                  {modules.map(module => (
                    <Card key={module.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-2 bg-orange-500" />
                      <CardContent className="p-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">{module.subject}</span>
                        <h4 className="font-bold text-lg mb-2">{module.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4">{module.content}</p>
                        <div className="flex gap-2">
                           <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg">Edit</Button>
                           <Button variant="ghost" size="sm" className="text-xs h-8 rounded-lg text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'soal' && (
              <motion.div
                key="soal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-sm rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Buat Pertanyaan Baru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddQuestion} className="space-y-4">
                      <select 
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        value={newQuestion.moduleId}
                        onChange={e => setNewQuestion({...newQuestion, moduleId: e.target.value})}
                        required
                      >
                        <option value="">Pilih Modul Materi...</option>
                        {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                      
                      <Input 
                        placeholder="Kalimat Pertanyaan" 
                        value={newQuestion.question}
                        onChange={e => setNewQuestion({...newQuestion, question: e.target.value})}
                        required
                      />

                      <div className="grid grid-cols-2 gap-4">
                        {newQuestion.options.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-xs font-bold w-4">{String.fromCharCode(65 + i)}</span>
                            <Input 
                              placeholder={`Opsi ${i+1}`}
                              value={opt}
                              onChange={e => {
                                const next = [...newQuestion.options];
                                next[i] = e.target.value;
                                setNewQuestion({...newQuestion, options: next});
                              }}
                              required
                            />
                            <input 
                              type="radio" 
                              name="correct" 
                              checked={newQuestion.correct === i}
                              onChange={() => setNewQuestion({...newQuestion, correct: i})}
                            />
                          </div>
                        ))}
                      </div>

                      <Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 rounded-xl font-bold">
                        Simpan Pertanyaan
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                   <h3 className="font-bold text-lg px-2">Daftar Pertanyaan Aktif</h3>
                   {questions.map(q => (
                     <Card key={q.id} className="border-none shadow-sm rounded-2xl p-6">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                              Modul: {modules.find(m => m.id === q.moduleId)?.title || 'Unknown'}
                           </span>
                           <Button variant="ghost" size="sm" className="text-red-500 h-6 w-6 p-0"><Trash className="w-3.5 h-3.5" /></Button>
                        </div>
                        <p className="font-bold mb-4">{q.question}</p>
                        <div className="grid grid-cols-2 gap-2">
                           {q.options.map((opt, i) => (
                             <div key={i} className={`text-xs p-2 rounded-lg border ${q.correct === i ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100'}`}>
                                {opt}
                             </div>
                           ))}
                        </div>
                     </Card>
                   ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'siswa' && (
              <motion.div
                key="siswa"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-sm rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Tambah Siswa Baru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddStudent} className="flex gap-4">
                      <Input 
                        placeholder="Nama Siswa" 
                        value={newStudent.name}
                        onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                        required
                        className="flex-1"
                      />
                      <Input 
                        placeholder="Kelas" 
                        value={newStudent.class}
                        onChange={e => setNewStudent({...newStudent, class: e.target.value})}
                        required
                        className="w-32"
                      />
                      <Button className="bg-orange-500 hover:bg-orange-600 h-12 rounded-xl font-bold px-8">
                        Tambah
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Nama Siswa</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Kelas</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status Belajar</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-700">{s.name}</td>
                          <td className="px-6 py-4 text-gray-500">{s.class}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold">
                               <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                             </div>
                          </td>
                          <td className="px-6 py-4 text-red-500 cursor-pointer hover:underline text-xs font-bold">Hapus</td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic font-medium">Belum ada siswa yang terdaftar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
