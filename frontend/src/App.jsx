import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import ChatPanel from './components/ChatPanel';
import LoginPage from './components/LoginPage';

const SAMPLE_MODULES = [
  {
    id: 'm1',
    title: 'Sistem Organ Manusia',
    subject: 'IPAS (Sains)',
    grade: '5',
    content: `
# Mengenal Sistem Organ Tubuh Manusia

Tubuh manusia adalah sistem yang sangat kompleks dan menakjubkan. Untuk menjalankan fungsinya dengan baik, tubuh kita memiliki berbagai sistem organ yang bekerja sama.

## 1. Sistem Pencernaan
Sistem ini bertugas mengolah makanan menjadi energi. Prosesnya dimulai dari mulut, kerongkongan, lambung, usus halus, hingga usus besar.

## 2. Sistem Pernapasan
Bertugas mengambil oksigen dari udara dan mengeluarkan karbon dioksida. Organ utamanya adalah paru-paru.

## 3. Sistem Peredaran Darah
Jantung memompa darah ke seluruh tubuh melalui pembuluh darah untuk membawa nutrisi dan oksigen ke setiap sel.

### Mengapa Kita Harus Belajar Ini?
Memahami cara kerja tubuh membantu kita menjaga kesehatan. Misalnya, kita tahu mengapa makan makanan bergizi penting bagi sistem pencernaan kita.

---
*Konteks: SDN Bandungrejosari 1 - Modul Digital Semester 2*
    `
  },
  {
    id: 'm2',
    title: 'Perkalian Desimal',
    subject: 'Matematika',
    grade: '5',
    content: `
# Mari Belajar Perkalian Desimal!

Pernahkah kamu pergi ke toko dan melihat harga barang yang menggunakan koma? Itulah bilangan desimal.

## Langkah-langkah Perkalian Desimal:
1. Kalikan bilangan tersebut seolah-olah tidak ada koma (seperti perkalian biasa).
2. Hitung total angka di belakang koma dari kedua bilangan yang dikalikan.
3. Letakkan koma pada hasil perkalian sesuai dengan total jumlah angka di belakang koma tadi.

### Contoh:
**0.5 x 0.2**
- Anggap saja 5 x 2 = 10.
- 0.5 (1 angka belakang koma) + 0.2 (1 angka belakang koma) = 2 angka belakang koma.
- Jadi hasil akhirnya adalah **0.10** atau **0.1**.

### Ayo Berlatih!
Coba hitung berapa hasil dari 0.3 x 4? Ingat langkah-langkahnya ya!
    `
  },
  {
    id: 'm3',
    title: 'Ekosistem dan Jaring Makanan',
    subject: 'IPAS (Lingkungan)',
    grade: '5',
    content: `
# Ekosistem di Sekitar Kita

Ekosistem adalah hubungan timbal balik antara makhluk hidup dengan lingkungannya.

## Komponen Ekosistem:
- **Biotik**: Makhluk hidup (hewan, tumbuhan, manusia).
- **Abiotik**: Benda tak hidup (air, tanah, udara, cahaya matahari).

## Apa itu Jaring-jaring Makanan?
Jaring-jaring makanan adalah gabungan dari banyak rantai makanan yang saling berhubungan. Di dalamnya ada:
- **Produsen**: Tumbuhan hijau yang bisa membuat makanan sendiri.
- **Konsumen**: Hewan yang memakan produsen atau hewan lain.
- **Pengurai**: Jamur atau bakteri yang mengurai sisa makhluk hidup.

*Ingat: Jika salah satu bagian terganggu, seluruh jaring makanan bisa ikut terganggu!*
    `
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('read');
  const [selectedModuleId, setSelectedModuleId] = useState(SAMPLE_MODULES[0].id);

  const selectedModule = SAMPLE_MODULES.find(m => m.id === selectedModuleId) || SAMPLE_MODULES[0];

  const handleLogin = (name, className) => {
    setUser({ name, class: className });
    setViewMode('read');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Sidebar - Fixed width */}
      <Sidebar 
        user={user}
        modules={SAMPLE_MODULES} 
        selectedModuleId={selectedModuleId} 
        onSelectModule={setSelectedModuleId}
        currentView={viewMode}
        onViewChange={(v) => setViewMode(v)}
      />
      
      {/* Main Layout Area - Flexible */}
      <div className="flex-1 flex overflow-hidden">
        {/* Module Content / Quiz - Large middle area */}
        <MainContent 
          key={`content-${selectedModuleId}-${viewMode}`} 
          module={selectedModule} 
          viewMode={viewMode}
          onAskClick={() => {
            // Logic to focus chat or scroll
          }}
        />
        
        {/* Chat Panel - Fixed width (480px) */}
        <ChatPanel 
          key={`chat-${selectedModuleId}-${viewMode}`} 
          module={selectedModule} 
          viewMode={viewMode}
        />
      </div>
    </div>
  );
}
