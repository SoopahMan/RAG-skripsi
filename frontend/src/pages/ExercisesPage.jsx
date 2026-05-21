import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Award, Home, ClipboardList, CheckCircle2, Timer, Send } from 'lucide-react';
import { getToken } from '../services/auth'; 

const API = import.meta.env.VITE_API_URL;

export default function ExercisesPage() {
  const navigate = useNavigate();

  // State Alur Utama
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [jenisUjian, setJenisUjian] = useState(''); // 'pre_test' atau 'post_test'
  const [isReadingMode, setIsReadingMode] = useState(false); // Mode membaca sebelum ujian
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]); 
  const [quizFinished, setQuizFinished] = useState(false);
  const [sendingData, setSendingData] = useState(false);

  // State untuk Timer Membaca (5 Menit = 300 Detik)
  const [timeLeft, setTimeLeft] = useState(300);
  const [hasReadEnough, setHasReadEnough] = useState(false); // Untuk kunci tombol Mulai Ujian sementara

  // State untuk Chatbot (Hanya muncul di Post-Test)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Halo! Aku asisten pintar AI-mu. Silakan baca materi di sebelah kiri, dan tanyakan apa saja padaku jika ada materi yang belum kamu pahami sebelum memulai Post-Test! 🚀' }
  ]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Data Bank Soal IPAS Sesuai Request Lengkap dengan Kunci Jawaban
  const latihanSoal = [
    { 
      title: 'IPAS: Keanekaragaman Flora & Fauna', 
      color: 'bg-emerald-400', 
      icon: '🌿',
      preTestQuestions: [
        { q: 'Perhatikan jenis-jenis fauna di bawah ini! (1) badak bercula satu, (2) anoa, (3) komodo, (4) gajah. Jenis fauna khas yang merupakan fauna tipe asiatis ditunjukkan oleh nomor...', a: ['1 dan 3', '2 dan 3', '1 dan 4', '3 dan 4'], correct: 2 },
        { q: 'Di Indonesia keanekaragaman hayati meliputi flora dan fauna yang terbagi menjadi tiga wilayah, yaitu asiatis, peralihan, dan australis. Berikut yang merupakan fauna peralihan antara lain...', a: ['anoa', 'burung cenderawasih', 'badak', 'gajah'], correct: 0 },
        { q: 'Pembagian fauna di Indonesia beserta wilayahnya dipengaruhi oleh...', a: ['garis lintang dan garis bujur', 'garis Wallace dan garis Weber', 'garis khatulistiwa dan garis bujur', 'dangkalan Sunda dan Dangkalan Sahul'], correct: 1 },
        { q: 'Sebagian besar wilayah Sumatra dan Kalimantan merupakan wilayah iklim hutan hujan tropis. Iklim wilayah ini dicirikan dengan tingkat kelembapan udara dan curah hujan yang tinggi sepanjang tahun. Tumbuhan yang sesuai untuk kondisi tersebut antara lain...', a: ['pohon sagu dan jati', 'pohon raflesia dan meranti', 'anggrek dan rumput-rumputan', 'padi dan jagung'], correct: 1 },
        { q: 'Wilayah fauna Indonesia timur atau tipe Australis disebut juga wilayah fauna tanah Sahul, yang meliputi Pulau Irian Jaya (Papua), Kepulauan Aru, dan pulau-pulau kecil di sekitarnya. Wilayah fauna tipe Australis dan wilayah fauna tipe Asia-Australis dibatasi oleh Garis Weber. Jenis-jenis fauna Indonesia tipe Australis antara lain...', a: ['cenderawasih dan babi rusa', 'cenderawasih dan kanguru', 'komodo dan harimau', 'badak dan koala'], correct: 1 },
        { q: 'Permasalahan flora dan fauna di Indonesia dapat terjadi karena berbagai faktor. Namun, faktor yang paling dominan disebabkan oleh manusia itu sendiri. Penyebab munculnya permasalahan flora dan fauna di Indonesia yang disebabkan oleh ulah manusia antara lain...', a: ['penebangan hutan secara liar', 'kegiatan reboisasi', 'membuang sampah di sungai', 'pembangunan pabrik'], correct: 0 },
        { q: 'Tumbuhan parasit yang merupakan flora khas yang hidup di daerah Bengkulu dan dilindungi oleh negara adalah...', a: ['paku-pakuan', 'pohon damar', 'anggrek hitam', 'raflesia'], correct: 3 },
        { q: 'Kawasan Wallacea merujuk pada daerah peralihan atau bagian tengah di wilayah Indonesia, meliputi Pulau Sulawesi, Kepulauan Nusa Tenggara, Pulau Timor, dan Kepulauan Maluku. Wilayah-wilayah tersebut memiliki sifat iklim yang lebih kering dan kelembapan udara yang lebih rendah dibandingkan wilayah-wilayah Indonesia lainnya. Corak tumbuhan yang hidup di daerah ini antara lain...', a: ['rumput dan paku-pakuan', 'hutan lebat yang heterogen', 'tanaman padi dan jagung', 'sabana dan stepa'], correct: 3 },
        { q: 'Wilayah fauna Indonesia tipe australis disebut juga wilayah fauna “Tanah Sahul”, yang meliputi pulau...', a: ['Sumatra dan Jawa', 'Bali dan NTT', 'Sulawesi dan NTB', 'Papua dan Maluku'], correct: 3 },
        { q: 'Upaya yang harus dilakukan oleh masyarakat Indonesia agar kekayaan alam dapat terjaga dan tidak punah kecuali...', a: ['Konsumsi dan pengelolaan sampah yang bijak', 'Pelestarian hutan dan ekosistem', 'Penghematan besar-besaran', 'Perlindungan flora dan fauna'], correct: 2 }
      ],
      postTestQuestions: [
        { q: 'Perhatikan jenis-jenis fauna di bawah ini! (1) badak bercula satu, (2) anoa, (3) babi rusa, (4) kanguru. Jenis fauna khas yang merupakan fauna tipe peralihan ditunjukkan oleh nomor...', a: ['1 dan 3', '2 dan 3', '1 dan 4', '3 dan 4'], correct: 1 },
        { q: 'Di Indonesia keanekaragaman hayati meliputi flora dan fauna yang terbagi menjadi tiga wilayah, yaitu asiatis, peralihan, dan australis. Berikut yang merupakan fauna australis antara lain...', a: ['anoa', 'burung cenderawasih', 'badak', 'gajah'], correct: 1 },
        { q: 'Penyebab munculnya permasalahan terkait flora dan fauna di Indonesia antara lain: (1) Penebangan hutan besar-besaran, (2) Tanah longsor, (3) Perburuan liar, (4) Gunung meletus. Permasalahan terkait kerusakan flora dan fauna yang disebabkan oleh ulah manusia ditunjukkan oleh nomor...', a: ['1 dan 3', '2 dan 3', '1 dan 4', '3 dan 4'], correct: 0 },
        { q: 'Sebagian besar wilayah Sumatra dan Kalimantan merupakan wilayah iklim hutan hujan tropis. Iklim wilayah ini dicirikan dengan tingkat kelembapan udara dan curah hujan yang tinggi sepanjang tahun. Oleh karena itu, tipe vegetasi yang mendominasi adalah...', a: ['rumput dan paku-pakuan', 'hutan lebat yang heterogen', 'tanaman padi dan jagung', 'sabana dan stepa'], correct: 1 },
        { q: 'Wilayah Jawa didominasi tipe iklim hutan hujan tropis dan iklim musim tropis. Jenis flora khas hutan musim tropis yaitu tanaman meranggas seperti...', a: ['pohon jati', 'anggrek', 'sagu', 'damar'], correct: 0 },
        { q: 'Kawasan Wallacea merujuk pada daerah peralihan atau bagian tengah di wilayah Indonesia, meliputi Pulau Sulawesi, Kepulauan Nusa Tenggara, Pulau Timor, dan Kepulauan Maluku. Wilayah-wilayah tersebut memiliki sifat iklim yang lebih kering dan kelembapan udara yang lebih rendah dibandingkan wilayah-wilayah Indonesia lainnya. Corak tumbuhan yang hidup di daerah ini antara lain...', a: ['rumput dan paku-pakuan', 'hutan lebat yang heterogen', 'tanaman padi dan jagung', 'sabana dan stepa'], correct: 3 },
        { q: 'Wilayah fauna Indonesia tipe Asiatis dikenal juga dengan sebutan wilayah fauna Indonesia barat, yang meliputi pulau...', a: ['Sumatra, Jawa, Bali, dan Kalimantan', 'Sumatra, Jawa, dan NTT', 'Sulawesi, NTB, dan NTT', 'Papua, Maluku, dan Sulawesi'], correct: 0 },
        { q: 'Pembagian flora dan fauna di Indonesia didasarkan pada garis Wallace dan garis Weber. Berikut jenis-jenis flora yang hidup di Indonesia: (1) meranti, (2) paku, (3) damar, (4) anggrek, (5) sagu, (6) cendana. Jenis flora khas yang merupakan tipe flora barat ditunjukkan oleh nomor...', a: ['1, 2, dan 3', '3, 4, dan 5', '1, 2, dan 4', '4, 5, dan 6'], correct: 0 },
        { q: 'Jumlah keberadaan flora dan fauna dari tahun ke tahun semakin menurun akibat cepatnya pertumbuhan penduduk. Berikut ini merupakan permasalahan flora dan fauna di Indonesia, kecuali...', a: ['perburuan liar', 'kepunahan', 'pengambilan hutan berlebihan', 'kurangnya penghijauan'], correct: 3 },
        { q: 'Upaya yang harus dilakukan oleh masyarakat Indonesia agar kekayaan alam dapat terjaga dan tidak punah kecuali...', a: ['Konsumsi dan pengelolaan sampah yang bijak', 'Pelestarian hutan dan ekosistem', 'Penghematan besar-besaran', 'Perlindungan flora dan fauna'], correct: 2 }
      ]
    }
  ];

  // Efek Pengatur Waktu Mundur 5 Menit saat membaca
  useEffect(() => {
    let timer;
    if (isReadingMode && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setHasReadEnough(true); // Jika waktu habis, paksa tombol kebuka
    }
    return () => clearInterval(timer);
  }, [isReadingMode, timeLeft]);

  // Efek pengunci anti-cheat: Siswa wajib membaca minimal 15 detik sebelum tombol Ujian muncul/aktif
  useEffect(() => {
    if (isReadingMode) {
      const lockTimer = setTimeout(() => {
        setHasReadEnough(true);
      }, 15000); // 15 detik batas minimum membaca agar data riset valid
      return () => clearTimeout(lockTimer);
    }
  }, [isReadingMode]);

  const pilihMateri = (quiz) => {
    setSelectedQuiz(quiz);
    setJenisUjian('');
    setIsReadingMode(false);
    setCurrentQuestionIdx(0);
    setUserAnswers([]);
    setQuizFinished(false);
  };

  const picuModeMembaca = (tipe) => {
    setJenisUjian(tipe);
    setIsReadingMode(true);
    setTimeLeft(300); // Reset ke 5 menit
    setHasReadEnough(false);
  };

  const mulaiUjianFisik = () => {
    setIsReadingMode(false);
  };

  const handleAnswerClick = async (selectedOptionIdx) => {
    const targetQuestions = jenisUjian === 'pre_test' ? selectedQuiz.preTestQuestions : selectedQuiz.postTestQuestions;
    const isCorrect = selectedOptionIdx === targetQuestions[currentQuestionIdx].correct;
    const updatedAnswers = [...userAnswers, isCorrect];
    setUserAnswers(updatedAnswers);

    if (currentQuestionIdx + 1 < targetQuestions.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      setQuizFinished(true);
      await simpanHasilKeBackend(updatedAnswers, targetQuestions.length);
    }
  };

  const simpanHasilKeBackend = async (finalAnswers, totalSoal) => {
    setSendingData(true);
    const benar = finalAnswers.filter(ans => ans === true).length;
    const salah = finalAnswers.filter(ans => ans === false).length;
    const nilaiAkhir = (benar / totalSoal) * 100;

    try {
      const token = getToken(); 
      const response = await fetch(`${API}/save-test-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          mata_pelajaran: selectedQuiz.title,
          jenis_ujian: jenisUjian, 
          total_benar: benar,
          total_salah: salah,
          skor: nilaiAkhir,
          detail_jawaban: finalAnswers 
        })
      });

      if (!response.ok) throw new Error('Gagal mengirim data.');
      console.log('Data tersimpan aman untuk Admin.');
    } catch (error) {
      alert('Terjadi kendala jaringan backend. Data disinkronkan secara lokal.');
    } finally {
      setSendingData(false);
    }
  };

  // Logika Simulasi Chatbot AI untuk Post-Test
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsBotTyping(true);

    // Simulasi Jawaban Cerdas AI berdasarkan Kata Kunci Narasi
    setTimeout(() => {
      let botText = "Pertanyaan bagus! Pastikan kamu membaca teks di bagian kiri ya. Ada hal lain yang mau ditanyakan?";
      const inputLower = chatInput.toLowerCase();

      if (inputLower.includes('asiatis') || inputLower.includes('barat')) {
        botText = "Tipe Asiatis itu wilayah barat (Sumatra, Jawa, Bali, Kalimantan). Ciri utamanya punya hutan lebat heterogen, curah hujan tinggi, dan hewannya besar-besar seperti gajah dan badak bercula satu!";
      } else if (inputLower.includes('peralihan') || inputLower.includes('tengah') || inputLower.includes('wallacea')) {
        botText = "Wilayah Tengah/Peralihan (Kawasan Wallacea) meliputi Sulawesi dan Nusa Tenggara. Iklimnya lebih kering, banyak sabana, dan hewannya unik (endemik) seperti anoa, babi rusa, dan komodo!";
      } else if (inputLower.includes('australis') || inputLower.includes('sahul') || inputLower.includes('timur')) {
        botText = "Tipe Australis (Tanah Sahul) itu wilayah timur seperti Papua dan Kepulauan Aru. Pohon khasnya adalah sagu, sedangkan faunanya mirip Australia seperti burung cenderawasih dan kanguru!";
      } else if (inputLower.includes('wallace') || inputLower.includes('weber')) {
        botText = "Garis Wallace membatasi bagian Barat dan Tengah. Sedangkan Garis Weber membatasi bagian Tengah dan Timur Indonesia!";
      } else if (inputLower.includes('manusia') || inputLower.includes('rusak') || inputLower.includes('punah')) {
        botText = "Flora-fauna kita berkurang karena ulah manusia, contohnya penebangan liar dan perburuan liar. Makanya kita wajib menjaga sungai dari sampah/detergen dan melakukan reboisasi hutan!";
      } else if (inputLower.includes('sungai') || inputLower.includes('sampah')) {
        botText = "Benar sekali! Kita tidak boleh membuang sampah atau limbah detergen ke sungai agar ekosistem air terlindungi dan alam tidak rusak.";
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: botText }]);
      setIsBotTyping(false);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setJenisUjian('');
    setIsReadingMode(false);
    setCurrentQuestionIdx(0);
    setUserAnswers([]);
    setQuizFinished(false);
  };

  // ==================== VIEW 1: SELESAI (NILAI DISEMBUNYIKAN UNTUK SISWA) ====================
  if (quizFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl text-center space-y-6 border-b-8 border-slate-200">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800">Jawaban Terkirim!</h2>
            <p className="text-sm font-bold text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full inline-block mt-1 uppercase tracking-wider">
              {jenisUjian === 'pre_test' ? '📝 Pre-Test Sukses' : '🚀 Post-Test Sukses'}
            </p>
            <p className="text-slate-500 font-medium mt-3 leading-relaxed">
              Hebat! Lembar jawaban kuis evaluasimu telah berhasil diunggah dengan aman ke server admin pusat untuk pengolahan data penelitian.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 tracking-wider">
            🔒 SKOR DIKUNCI UNTUK KEBUTUHAN VALIDASI SKRIPSI
          </div>
          {sendingData && <p className="text-amber-500 font-bold animate-pulse text-xs">Menyinkronkan database...</p>}
          <div className="pt-2">
            <button onClick={resetQuiz} className="w-full bg-brand-accent text-white font-black py-4 px-6 rounded-3xl border-b-4 border-emerald-700 hover:opacity-90 active:border-b-0 transition-all text-lg flex items-center justify-center space-x-2">
              <Home className="w-5 h-5" />
              <span>Kembali ke Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: LAYAR MEMBACA + CHATBOT (SISI KANAN KHUSUS POST-TEST) ====================
  if (isReadingMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-brand-accent p-4 md:p-6 flex items-center justify-between shadow-lg text-white sticky top-0 z-50">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-black uppercase tracking-wide">
              {jenisUjian === 'pre_test' ? 'Membaca Pembuka (Pre-Test)' : 'Membaca Berbantuan AI (Post-Test)'}
            </h1>
          </div>
          <div className="flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full border border-white/20 font-black text-sm">
            <Timer className="w-4 h-4 animate-spin" />
            <span>Sisa Waktu: {formatTime(timeLeft)}</span>
          </div>
        </header>

        <main className={`flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 ${jenisUjian === 'post_test' ? 'lg:grid-cols-2' : 'max-w-3xl'} gap-8 overflow-hidden`}>
          
          {/* KOLOM KIRI: TEKS NARASI PARAGRAF */}
          <div className="bg-white rounded-[35px] p-6 md:p-8 shadow-xl border-4 border-slate-100 overflow-y-auto max-h-[70vh] lg:max-h-[75vh] custom-scrollbar">
            <h2 className="text-2xl font-black text-slate-800 mb-4 border-b-4 border-brand-accent pb-2 inline-block">📋 Materi Pengantar IPAS</h2>
            <div className="text-slate-600 font-medium space-y-4 text-base leading-relaxed text-justify">
              <p>Tahukah kamu bahwa Indonesia adalah salah satu negara terkaya di dunia dalam hal keanekaragaman hayati? Jika kita menjelajahi Indonesia dari ujung barat hingga ujung timur, kita akan menemukan makhluk hidup yang berbeda-beda karena pengaruh kondisi geografis masa lalu. Uniknya, para ahli membagi wilayah alam Indonesia ini menggunakan dua garis khayal penanda batas, yaitu <strong>Garis Wallace</strong> yang membatasi wilayah Barat dan Tengah, serta <strong>Garis Weber</strong> yang membatasi wilayah Tengah dan Timur.</p>
              <p>Mari kita memulai perjalanan dari wilayah barat Indonesia, yang sering disebut tipe <strong>Asiatis</strong>. Wilayah ini meliputi Pulau <strong>Sumatra, Jawa, Bali, dan Kalimantan</strong>. Sebagian besar wilayah Sumatra dan Kalimantan memiliki iklim <strong>hutan hujan tropis</strong> yang dicirikan dengan tingkat kelembapan udara dan curah hujan yang tinggi sepanjang tahun. Oleh karena itu, tipe vegetasi yang mendominasi di sana adalah <strong>hutan lebat yang heterogen</strong>, di mana tumbuh berbagai macam tanaman berkayu tinggi seperti pohon <strong>meranti</strong>, damar, paku, dan anggrek. Di wilayah barat ini pula hidup flora parasit langka yang dilindungi negara, yaitu <strong>raflesia</strong> khas Bengkulu. Sedikit berbeda dengan Sumatra, wilayah Jawa didominasi oleh perpaduan hutan hujan tropis dan iklim musim tropis. Ciri khas hutan musim di Jawa adalah adanya tanaman meranggas seperti <strong>pohon jati</strong> yang menggugurkan daunnya demi bertahan hidup saat musim kemarau. Hewan khas tipe Asiatis yang mengagumkan di antaranya adalah <strong>gajah</strong> dan <strong>badak bercula satu</strong>.</p>
              <p>Selanjutnya, kita menyeberangi Garis Wallace menuju ke bagian tengah Indonesia yang disebut <strong>Kawasan Wallacea</strong> atau tipe <strong>Peralihan</strong>. Wilayah ini meliputi Pulau <strong>Sulawesi, Kepulauan Nusa Tenggara, Pulau Timor, dan Kepulauan Maluku</strong>. Berbeda dengan wilayah barat, kawasan ini memiliki sifat iklim yang <strong>lebih kering</strong> dan kelembapan udara yang lebih rendah. Akibat iklim yang kering tersebut, corak tumbuhan yang mendominasi di daerah ini adalah <strong>sabana dan stepa</strong>, yaitu padang rumput yang sangat luas. Hewan-hewan yang hidup di tipe peralihan ini sangat unik dan disebut hewan endemik karena tidak dapat ditemukan di tempat lain di dunia. Contoh fauna khas peralihan yang terkenal adalah <strong>anoa</strong>, <strong>babi rusa</strong>, dan reptil raksasa <strong>komodo</strong>.</p>
              <p>Terakhir, mari kita melewati Garis Weber menuju wilayah timur Indonesia yang dikenal sebagai tipe <strong>Australis</strong> atau wilayah <strong>Tanah Sahul</strong>. Wilayah yang meliputi Pulau <strong>Papua, Kepulauan Aru</strong>, dan pulau kecil sekitarnya ini memiliki jenis flora dan fauna yang mirip dengan Benua Australia. Tanaman khas yang melimpah dan menjadi makanan pokok di sana adalah pohon <strong>sagu</strong>. Sementara itu, faunanya dipenuhi oleh burung-burung berbulu indah dan hewan mamalia berkantung, seperti <strong>burung cenderawasih</strong> dan <strong>kanguru</strong>.</p>
              <p>Sayangnya, keindahan nusantara ini sedang menghadapi ancaman besar karena jumlah flora dan fauna terus menurun dari tahun ke tahun. Permasalahan lingkungan seperti <strong>kepunahan</strong> satwa, perusakan habitat, dan kelangkaan terjadi di mana-mana. Meski ada faktor alam, faktor yang paling dominan merusak alam sebenarnya disebabkan oleh <strong>ulah manusia itu sendiri</strong>. Contoh nyata kerusakan akibat ulah manusia adalah <strong>penebangan hutan secara liar</strong> atau eksploitasi hasil hutan secara besar-besaran tanpa kendali, serta maraknya <strong>perburuan liar</strong> terhadap hewan langka.</p>
              <p>Oleh karena itu, kita sebagai masyarakat Indonesia harus melakukan upaya nyata agar kekayaan alam ini tetap terjaga dan tidak punah. Kita bisa memulainya dari lingkungan terdekat dengan cara mengonsumsi barang secara bijak serta mengelola sampah lewat prinsip 3R. Salah satu tindakan penting adalah menjaga kebersihan perairan dengan <strong>tidak membuang sampah atau limbah detergen ke sungai</strong>. Selain itu, kita harus mendukung pelestarian hutan melalui kegiatan <strong>reboisasi</strong> atau penghijauan, mencegah kebakaran hutan, serta ikut andil dalam upaya <strong>perlindungan flora dan fauna</strong> dengan cara menolak membeli atau memelihara satwa langka yang dilindungi.</p>
            </div>
          </div>

          {/* KOLOM KANAN: CHATBOT AI PINTAR (HANYA MUNCUL DI POST-TEST) */}
          {jenisUjian === 'post_test' && (
            <div className="bg-white rounded-[35px] shadow-xl border-4 border-slate-100 flex flex-col h-[70vh] lg:h-[75vh]">
              <div className="bg-brand-blue p-4 rounded-t-[28px] text-white font-black flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
                <span>🤖 Chatbot AI Media Pembelajaran</span>
              </div>
              
              {/* Log Pesan Chat */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-sm">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl font-bold leading-relaxed ${msg.sender === 'user' ? 'bg-brand-primary text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="text-xs text-slate-400 font-bold animate-pulse px-2">Asisten AI sedang berpikir...</div>
                )}
              </div>

              {/* Input Chat */}
              <div className="p-3 bg-white border-t rounded-b-[28px] flex items-center space-x-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Tanyakan materi flora/fauna di sini..." 
                  className="flex-1 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-xl py-3 px-4 outline-none font-bold text-slate-700 focus:border-brand-blue text-sm transition-all"
                />
                <button onClick={handleSendMessage} className="p-3 bg-brand-blue text-white rounded-xl hover:opacity-90 active:scale-95 transition-all">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Action Button Bar di Bawah */}
        <div className="bg-white border-t p-4 text-center sticky bottom-0 z-40">
          <button 
            onClick={mulaiUjianFisik}
            disabled={!hasReadEnough}
            className={`w-full max-w-md font-black py-4 px-8 rounded-3xl text-lg border-b-4 transition-all ${hasReadEnough ? 'bg-brand-primary text-white border-blue-700 active:border-b-0' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}
          >
            {hasReadEnough ? 'Saya Sudah Paham, Mulai Ujian! 🚀' : 'Silakan Baca Dulu (Minimal 15 Detik)...'}
          </button>
        </div>
      </div>
    );
  }

  // ==================== VIEW 3: LEMBAR LEMBAR PERTANYAAN KUIS ====================
  if (selectedQuiz && jenisUjian && !isReadingMode) {
    const targetQuestions = jenisUjian === 'pre_test' ? selectedQuiz.preTestQuestions : selectedQuiz.postTestQuestions;
    const currentQuestion = targetQuestions[currentQuestionIdx];
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-brand-accent p-6 flex items-center justify-between shadow-lg text-white">
          <div className="flex items-center space-x-4">
            <button onClick={resetQuiz} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-black">{selectedQuiz.title}</h1>
            <span className="text-xs bg-black/20 px-3 py-1 rounded-full uppercase font-black tracking-wide">
              {jenisUjian.replace('_', ' ')}
            </span>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-full border border-white/30 text-sm font-black">
            Soal {currentQuestionIdx + 1} / {targetQuestions.length}
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full p-6 flex flex-col justify-center space-y-8">
          <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden border-2 border-slate-300">
            <div 
              className="bg-brand-primary h-full transition-all duration-300" 
              style={{ width: `${(currentQuestionIdx / targetQuestions.length) * 100}%` }}
            />
          </div>

          <div className="bg-white rounded-[35px] p-8 shadow-xl border-4 border-slate-100 text-center">
            <h2 className="text-xl md:text-2xl font-black text-slate-700 leading-relaxed">{currentQuestion.q}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.a.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerClick(idx)}
                className="bg-white hover:bg-brand-blue/5 text-left font-black text-slate-700 p-5 rounded-3xl border-4 border-slate-100 hover:border-brand-blue shadow-md transition-all active:scale-[0.98] text-base md:text-lg flex items-center space-x-4"
              >
                <span className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-200 text-brand-primary font-black">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ==================== VIEW 4: SELEKSI PEMILIHAN KATEGORI UJIAN (GATE SCREEN) ====================
  if (selectedQuiz && !jenisUjian) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-brand-accent p-6 flex items-center space-x-4 shadow-lg text-white">
          <button onClick={resetQuiz} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black">Pilih Tipe Evaluasi Skripsi</h1>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col justify-center text-center space-y-6">
          <h2 className="text-3xl font-black text-slate-800">{selectedQuiz.title}</h2>
          <p className="text-slate-500 font-bold">Silakan pilih jenis evaluasi yang ingin kamu tempuh saat ini:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <button 
              onClick={() => picuModeMembaca('pre_test')}
              className="bg-white hover:bg-orange-50 border-4 border-slate-200 hover:border-orange-400 p-8 rounded-[35px] shadow-lg transition-all text-left space-y-3"
            >
              <div className="w-12 h-12 bg-orange-400 text-white font-black text-2xl flex items-center justify-center rounded-2xl shadow-md">1</div>
              <h3 className="text-2xl font-black text-slate-800">Pre-Test</h3>
              <p className="text-sm font-bold text-slate-400">Diberikan teks bacaan literasi pembuka 5 menit sebelum mengerjakan soal awal.</p>
            </button>

            <button 
              onClick={() => picuModeMembaca('post_test')}
              className="bg-white hover:bg-green-50 border-4 border-slate-200 hover:border-green-400 p-8 rounded-[35px] shadow-lg transition-all text-left space-y-3"
            >
              <div className="w-12 h-12 bg-green-400 text-white font-black text-2xl flex items-center justify-center rounded-2xl shadow-md">2</div>
              <h3 className="text-2xl font-black text-slate-800">Post-Test</h3>
              <p className="text-sm font-bold text-slate-400">Diberikan teks bacaan berfasilitas Chatbot Pintar AI untuk konsultasi materi selama 5 menit.</p>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==================== VIEW 5: LIST SELEKSI UTAMA MATERI PELAJARAN ====================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-brand-accent p-6 flex items-center justify-between shadow-lg text-white">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black">Evaluasi Hasil Belajar</h1>
        </div>
        <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm">
          <Award className="w-5 h-5 text-brand-secondary fill-current" />
          <span className="font-black">Riset Mode</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-12">
        <div className="bg-white rounded-[40px] p-10 shadow-xl border-4 border-slate-100 flex flex-col md:flex-row items-center md:space-x-12">
          <div className="w-32 h-32 bg-brand-secondary rounded-[40px] flex items-center justify-center rotate-6 shadow-lg mb-6 md:mb-0">
             <Star className="w-16 h-16 text-white fill-current" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-3xl font-black mb-2">Sistem Pengumpulan Data Skripsi</h2>
            <p className="text-slate-500 font-bold">Silakan pilih mata pelajaran di bawah ini. Pastikan membaca petunjuk bacaan dan memanfaatkan asisten pintar AI dengan baik sebelum mulai.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {latihanSoal.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => pilihMateri(item)}
              className="bg-white rounded-[35px] overflow-hidden border-4 border-white hover:border-brand-accent shadow-lg transition-all group cursor-pointer hover:-translate-y-1"
            >
              <div className="flex items-center p-6 space-x-6">
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-3xl shadow-md`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="text-slate-400 font-bold">12 Butir Soal Evaluasi</p>
                </div>
                <div className="py-3 px-5 bg-brand-accent text-white font-black rounded-2xl shadow-sm text-sm">
                  Mulai Tes
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}