"""
eval_dataset.py
---------------
Dataset evaluasi lengkap untuk tutor Socratic IPA SD kelas 5.
Topik: Permasalahan Flora dan Fauna di Indonesia.

Kategori:
  1. Pemahaman Dasar        (10 soal)
  2. HOTS / Analisis        (10 soal)
  3. Socratic Prompting     ( 5 soal — siswa bingung)
  4. Multi-turn Memory      ( 4 soal — percakapan berantai)
  5. Confidence Testing     ( 8 soal — dalam & luar konteks)
  6. Evaluasi Pemahaman     ( 6 soal — belum/mulai/paham)
  7. Roleplay Siswa SD      ( 5 soal)
  8. Anti-Halusinasi RAG    ( 3 soal)

Schema per item:
  question        : str   — pertanyaan siswa
  ground_truth    : str   — jawaban faktual (untuk faithfulness/recall)
  feedback_mode   : str   — belum_paham | mulai_paham | paham
  contexts        : list  — chunk relevan dari buku (simulasi retriever)
  expected_traits : list  — perilaku yang HARUS ada di respons
  forbidden       : list  — kata kunci yang TIDAK BOLEH bocor (belum_paham)
  category        : str   — label kategori untuk filtering
  multi_turn_id   : str   — ID grup percakapan (untuk kategori 4)
  turn            : int   — urutan turn dalam percakapan
  expected_status : str   — success | filtered_by_confidence
  is_out_of_context: bool — True = pertanyaan di luar materi
"""

# ============================================================
# KONTEKS DOKUMEN — simulasi chunk yang di-retrieve
# ============================================================
CTX_KEPUNAHAN = (
    "Kepunahan adalah kondisi di mana seluruh individu dari suatu spesies "
    "sudah tidak ada lagi di muka bumi. Spesies dinyatakan punah ketika "
    "tidak ada satupun individu yang masih hidup di alam liar maupun di penangkaran."
)
CTX_ANCAMAN = (
    "Flora dan fauna di Indonesia terancam punah akibat berbagai faktor. "
    "Faktor utamanya adalah ulah manusia, meliputi perburuan liar, eksploitasi hutan, "
    "penggunaan pestisida berlebihan, pencemaran lingkungan, dan pembangunan yang "
    "mengalihfungsikan habitat alami hewan dan tumbuhan."
)
CTX_EKSPLOITASI = (
    "Eksploitasi hutan adalah penggunaan sumber daya hutan secara berlebihan "
    "dan tidak terkendali, seperti penebangan liar (illegal logging). "
    "Akibatnya, hutan kehilangan fungsinya sebagai habitat bagi ribuan spesies "
    "flora dan fauna."
)
CTX_PESTISIDA = (
    "Penggunaan pestisida yang berlebihan dapat mencemari tanah dan air. "
    "Hewan-hewan kecil seperti serangga dan katak yang hidup di sawah atau sungai "
    "dapat mati akibat racun pestisida. Hal ini mengganggu rantai makanan "
    "dan mengancam keseimbangan ekosistem."
)
CTX_PERBURUAN = (
    "Perburuan liar adalah kegiatan menangkap atau membunuh hewan secara ilegal "
    "tanpa izin dari pemerintah. Perburuan liar dilakukan untuk mendapatkan kulit, "
    "tanduk, gading, atau menjual hewan hidup sebagai hewan peliharaan. "
    "Akibatnya, populasi hewan langka terus berkurang dan terancam punah."
)
CTX_HABITAT = (
    "Habitat adalah tempat hidup alami suatu makhluk hidup yang menyediakan "
    "makanan, air, tempat berlindung, dan tempat berkembang biak. "
    "Pembangunan perumahan, jalan, dan industri sering kali menghancurkan habitat "
    "hewan sehingga hewan kehilangan tempat tinggalnya."
)
CTX_PENCEMARAN = (
    "Pencemaran lingkungan adalah masuknya zat-zat berbahaya ke dalam lingkungan "
    "seperti air, udara, dan tanah sehingga merusak keseimbangan ekosistem. "
    "Limbah pabrik, sampah plastik, dan tumpahan minyak adalah contoh penyebab "
    "pencemaran yang dapat membunuh flora dan fauna."
)
CTX_HEWAN_LANGKA = (
    "Contoh hewan Indonesia yang hampir punah antara lain Harimau Sumatera, "
    "Orangutan Kalimantan, Badak Jawa, Komodo, Cendrawasih, dan Jalak Bali. "
    "Hewan-hewan ini dilindungi oleh pemerintah melalui undang-undang."
)
CTX_PERLINDUNGAN = (
    "Upaya perlindungan flora dan fauna dapat dilakukan melalui pembentukan "
    "kawasan konservasi seperti suaka margasatwa dan taman nasional. "
    "Selain itu, penegakan hukum terhadap perburuan liar dan penebangan ilegal "
    "juga sangat penting untuk mencegah kepunahan."
)
CTX_KOLEKTOR = (
    "Kolektor hewan langka adalah orang yang mengumpulkan atau memelihara "
    "hewan-hewan yang dilindungi secara ilegal. Permintaan dari kolektor "
    "mendorong perburuan liar semakin marak dan mempercepat kepunahan spesies."
)


EVAL_DATASET = [

    # ============================================================
    # KATEGORI 1: PEMAHAMAN DASAR
    # feedback_mode default: belum_paham (full Socratic)
    # ============================================================
    {
        "category": "pemahaman_dasar",
        "question": "Apa yang dimaksud dengan kepunahan?",
        "ground_truth": (
            "Kepunahan adalah kondisi ketika seluruh individu dari suatu spesies "
            "sudah tidak ada lagi di muka bumi, baik di alam liar maupun penangkaran."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_KEPUNAHAN],
        "expected_traits": [
            "mengajukan pertanyaan balik kepada siswa",
            "tidak mendefinisikan kepunahan secara langsung",
            "memberikan petunjuk atau analogi sederhana",
        ],
        "forbidden": ["seluruh individu tidak ada lagi", "tidak ada satupun yang masih hidup"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Mengapa flora dan fauna di Indonesia bisa terancam punah?",
        "ground_truth": (
            "Flora dan fauna Indonesia terancam punah terutama karena ulah manusia: "
            "perburuan liar, eksploitasi hutan, pestisida berlebihan, pencemaran, "
            "dan alih fungsi lahan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN],
        "expected_traits": [
            "memancing siswa menyebutkan penyebabnya sendiri",
            "tidak langsung menyebut semua faktor",
        ],
        "forbidden": ["perburuan liar", "eksploitasi hutan", "pestisida berlebihan"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Sebutkan 3 penyebab permasalahan flora dan fauna di Indonesia!",
        "ground_truth": (
            "Tiga penyebab utama: (1) perburuan liar, (2) eksploitasi/penebangan hutan, "
            "(3) penggunaan pestisida berlebihan. Penyebab lain: pencemaran lingkungan "
            "dan alih fungsi lahan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN, CTX_EKSPLOITASI, CTX_PERBURUAN],
        "expected_traits": [
            "memancing siswa mengingat sendiri",
            "memberi petunjuk satu per satu, bukan langsung 3 jawaban",
        ],
        "forbidden": ["perburuan liar", "eksploitasi hutan", "pestisida"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Apa yang dimaksud dengan eksploitasi hutan?",
        "ground_truth": (
            "Eksploitasi hutan adalah penggunaan sumber daya hutan secara berlebihan "
            "dan tidak terkendali, seperti penebangan liar, sehingga merusak fungsi "
            "hutan sebagai habitat flora dan fauna."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_EKSPLOITASI],
        "expected_traits": [
            "tidak langsung mendefinisikan eksploitasi",
            "menggunakan pertanyaan pemandu",
        ],
        "forbidden": ["penggunaan berlebihan dan tidak terkendali", "penebangan liar", "illegal logging"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Mengapa penggunaan pestisida dapat merusak lingkungan?",
        "ground_truth": (
            "Pestisida berlebihan mencemari tanah dan air, membunuh hewan-hewan kecil "
            "seperti serangga dan katak, mengganggu rantai makanan, dan mengancam "
            "keseimbangan ekosistem."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PESTISIDA],
        "expected_traits": [
            "bertanya tentang apa yang terjadi pada hewan jika tanah tercemar",
            "tidak langsung menyebut rantai makanan",
        ],
        "forbidden": ["mencemari tanah dan air", "rantai makanan", "ekosistem"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Apa dampak perburuan liar?",
        "ground_truth": (
            "Perburuan liar menyebabkan populasi hewan langka terus berkurang "
            "hingga terancam punah karena hewan dibunuh atau ditangkap untuk diambil "
            "kulit, tanduk, gading, atau dijual sebagai hewan peliharaan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PERBURUAN],
        "expected_traits": [
            "mengajukan pertanyaan tentang apa yang terjadi jika hewan terus diburu",
            "tidak menyebutkan semua dampak sekaligus",
        ],
        "forbidden": ["populasi berkurang", "terancam punah", "kulit, tanduk, gading"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Mengapa pembangunan perumahan bisa mengganggu habitat hewan?",
        "ground_truth": (
            "Pembangunan perumahan menghancurkan habitat alami hewan sehingga "
            "hewan kehilangan tempat tinggal, makanan, air, dan tempat berkembang biak."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_HABITAT],
        "expected_traits": [
            "memancing siswa berpikir tentang fungsi habitat",
            "pertanyaan balik seperti 'apa yang terjadi jika rumah hewan hilang?'",
        ],
        "forbidden": ["tempat tinggal, makanan, air", "tempat berkembang biak"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Apa yang dimaksud dengan pencemaran lingkungan?",
        "ground_truth": (
            "Pencemaran lingkungan adalah masuknya zat-zat berbahaya ke dalam "
            "lingkungan (air, udara, tanah) yang merusak keseimbangan ekosistem. "
            "Contohnya: limbah pabrik, sampah plastik, dan tumpahan minyak."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PENCEMARAN],
        "expected_traits": [
            "tidak langsung mendefinisikan pencemaran",
            "memancing dengan contoh konkret di sekitar siswa",
        ],
        "forbidden": ["zat-zat berbahaya", "limbah pabrik", "tumpahan minyak"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Mengapa manusia menjadi faktor utama kerusakan flora dan fauna?",
        "ground_truth": (
            "Manusia menjadi faktor utama karena hampir semua kerusakan flora dan fauna "
            "disebabkan oleh aktivitas manusia: perburuan, penebangan, pencemaran, "
            "dan pembangunan yang tidak mempertimbangkan kelestarian alam."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN, CTX_EKSPLOITASI, CTX_PERBURUAN],
        "expected_traits": [
            "memancing siswa berpikir tentang aktivitas manusia sehari-hari",
            "tidak langsung menyebut perburuan dan penebangan",
        ],
        "forbidden": ["aktivitas manusia", "perburuan, penebangan, pencemaran"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "pemahaman_dasar",
        "question": "Sebutkan contoh hewan Indonesia yang hampir punah!",
        "ground_truth": (
            "Contoh hewan Indonesia yang hampir punah: Harimau Sumatera, "
            "Orangutan Kalimantan, Badak Jawa, Komodo, Cendrawasih, dan Jalak Bali."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_HEWAN_LANGKA],
        "expected_traits": [
            "memancing siswa mengingat hewan langka yang pernah didengar",
            "tidak menyebutkan daftar lengkap",
        ],
        "forbidden": ["Harimau Sumatera", "Orangutan Kalimantan", "Badak Jawa", "Komodo"],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # ============================================================
    # KATEGORI 2: HOTS (ANALISIS)
    # feedback_mode: belum_paham — tetap Socratic, tapi pertanyaannya analitis
    # ============================================================
    {
        "category": "hots_analisis",
        "question": "Apa yang akan terjadi jika perburuan liar terus dilakukan?",
        "ground_truth": (
            "Jika perburuan liar terus dilakukan, populasi hewan langka akan terus "
            "berkurang hingga punah. Kepunahan satu spesies dapat mengganggu "
            "rantai makanan dan keseimbangan ekosistem secara keseluruhan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PERBURUAN, CTX_KEPUNAHAN],
        "expected_traits": [
            "mengajukan pertanyaan analitis tentang konsekuensi jangka panjang",
            "tidak langsung menyebutkan kepunahan dan gangguan ekosistem",
        ],
        "forbidden": ["kepunahan", "rantai makanan terganggu", "ekosistem"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Mengapa manusia harus menjaga keanekaragaman flora dan fauna?",
        "ground_truth": (
            "Keanekaragaman hayati menjaga keseimbangan ekosistem, menyediakan "
            "sumber pangan, obat-obatan, dan oksigen. Hilangnya satu spesies dapat "
            "berdampak berantai pada spesies lainnya."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN, CTX_PERLINDUNGAN],
        "expected_traits": [
            "memancing siswa berpikir tentang manfaat alam bagi manusia",
            "pertanyaan balik seperti 'apa yang kamu dapat dari alam?'",
        ],
        "forbidden": ["keseimbangan ekosistem", "sumber pangan", "oksigen"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Bagaimana cara masyarakat menjaga kekayaan alam Indonesia?",
        "ground_truth": (
            "Masyarakat dapat menjaga kekayaan alam dengan tidak memburu hewan liar, "
            "tidak menebang hutan sembarangan, mengurangi penggunaan pestisida, "
            "mendukung kawasan konservasi, dan melaporkan pelanggaran kepada pihak berwajib."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PERLINDUNGAN, CTX_PERBURUAN],
        "expected_traits": [
            "menjelaskan 1–2 cara konkret",
            "mengajukan pertanyaan konfirmasi",
            "apresiasi kemajuan siswa",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Apa dampak eksploitasi berlebihan terhadap alam?",
        "ground_truth": (
            "Eksploitasi berlebihan menyebabkan kerusakan habitat, hilangnya "
            "keanekaragaman hayati, erosi tanah, banjir, dan perubahan iklim. "
            "Spesies yang bergantung pada habitat tersebut terancam punah."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_EKSPLOITASI, CTX_HABITAT],
        "expected_traits": [
            "memancing siswa membayangkan hutan yang habis ditebang",
            "pertanyaan bertahap tentang apa yang terjadi pada hewan lalu pada tanah",
        ],
        "forbidden": ["kerusakan habitat", "erosi tanah", "perubahan iklim"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Mengapa habitat sangat penting bagi hewan dan tumbuhan?",
        "ground_truth": (
            "Habitat menyediakan semua kebutuhan dasar makhluk hidup: makanan, air, "
            "tempat berlindung, dan tempat berkembang biak. Tanpa habitat yang sesuai, "
            "hewan dan tumbuhan tidak bisa bertahan hidup."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_HABITAT],
        "expected_traits": [
            "analogi dengan kebutuhan manusia (rumah, makanan)",
            "pertanyaan balik tentang kebutuhan dasar hewan",
        ],
        "forbidden": ["makanan, air, tempat berlindung", "berkembang biak"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Bagaimana hubungan pencemaran lingkungan dengan kepunahan hewan?",
        "ground_truth": (
            "Pencemaran meracuni air, tanah, dan udara yang menjadi sumber kehidupan "
            "hewan. Hewan yang terpapar racun akan mati atau gagal berkembang biak, "
            "sehingga populasinya menurun hingga punah."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PENCEMARAN, CTX_KEPUNAHAN],
        "expected_traits": [
            "menjelaskan hubungan sebab-akibat pencemaran dan kematian hewan",
            "pertanyaan lanjutan tentang populasi",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Menurutmu, apakah penggunaan pupuk buatan selalu baik? Jelaskan.",
        "ground_truth": (
            "Penggunaan pupuk buatan tidak selalu baik. Jika berlebihan, pupuk kimia "
            "mencemari tanah dan air, merusak organisme tanah, dan mengganggu ekosistem. "
            "Penggunaan yang tepat dosis masih diperlukan untuk pertanian."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PESTISIDA, CTX_PENCEMARAN],
        "expected_traits": [
            "memancing siswa berpikir kritis tentang dua sisi penggunaan pupuk",
            "tidak langsung menyatakan baik atau buruk",
        ],
        "forbidden": ["mencemari tanah dan air", "merusak organisme tanah"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Apa akibat jika semua hutan ditebang?",
        "ground_truth": (
            "Jika semua hutan ditebang: hewan kehilangan habitat dan punah, "
            "terjadi erosi dan banjir, kadar CO₂ meningkat menyebabkan perubahan iklim, "
            "sumber air mengering, dan manusia kehilangan sumber pangan dan obat."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_EKSPLOITASI, CTX_HABITAT, CTX_KEPUNAHAN],
        "expected_traits": [
            "memancing imajinasi siswa tentang dunia tanpa hutan",
            "pertanyaan bertahap mulai dari hewan, lalu manusia",
        ],
        "forbidden": ["erosi dan banjir", "perubahan iklim", "sumber air mengering"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Mengapa kolektor hewan langka dapat mempercepat kepunahan?",
        "ground_truth": (
            "Kolektor hewan langka mendorong permintaan pasar gelap sehingga "
            "perburuan liar semakin marak. Semakin banyak permintaan, semakin "
            "banyak hewan yang diburu, dan populasi semakin cepat berkurang."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_KOLEKTOR, CTX_PERBURUAN],
        "expected_traits": [
            "memancing siswa berpikir tentang hubungan permintaan dan perburuan",
            "analogi ekonomi sederhana: permintaan tinggi → pasokan dicari",
        ],
        "forbidden": ["pasar gelap", "permintaan mendorong perburuan"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "hots_analisis",
        "question": "Bagaimana cara mencegah kepunahan flora dan fauna?",
        "ground_truth": (
            "Cara mencegah kepunahan: mendirikan kawasan konservasi (taman nasional, "
            "suaka margasatwa), menegakkan hukum terhadap perburuan liar, "
            "mengurangi pencemaran, melakukan reboisasi, dan edukasi masyarakat."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PERLINDUNGAN, CTX_KEPUNAHAN],
        "expected_traits": [
            "menjelaskan 1–2 cara pencegahan secara singkat",
            "pertanyaan konfirmasi tentang peran siswa sendiri",
            "apresiasi",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # ============================================================
    # KATEGORI 3: SOCRATIC PROMPTING — SISWA BINGUNG
    # Semua belum_paham. AI wajib: petunjuk + pertanyaan balik.
    # ============================================================
    {
        "category": "socratic_prompting",
        "question": "Aku belum paham apa itu kepunahan",
        "ground_truth": (
            "Kepunahan adalah kondisi ketika suatu spesies sudah tidak ada "
            "lagi di muka bumi."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_KEPUNAHAN],
        "expected_traits": [
            "tidak mendefinisikan kepunahan langsung",
            "menggunakan analogi sederhana",
            "pertanyaan balik seperti 'pernah mendengar hewan yang sudah tidak ada?'",
        ],
        "forbidden": ["tidak ada lagi di muka bumi", "seluruh individu"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "socratic_prompting",
        "question": "Kenapa hewan bisa punah?",
        "ground_truth": (
            "Hewan bisa punah karena habitatnya rusak, diburu berlebihan, "
            "populasinya terlalu sedikit, atau tidak mampu beradaptasi "
            "dengan perubahan lingkungan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_KEPUNAHAN, CTX_ANCAMAN, CTX_PERBURUAN],
        "expected_traits": [
            "memancing siswa berpikir tentang kebutuhan hewan untuk hidup",
            "pertanyaan seperti 'apa yang hewan butuhkan untuk tetap hidup?'",
        ],
        "forbidden": ["habitatnya rusak", "diburu berlebihan", "tidak mampu beradaptasi"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "socratic_prompting",
        "question": "Aku bingung maksud eksploitasi hutan",
        "ground_truth": (
            "Eksploitasi hutan adalah penggunaan hutan secara berlebihan "
            "tanpa kendali, seperti menebang pohon secara liar."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_EKSPLOITASI],
        "expected_traits": [
            "menggunakan kata 'eksploitasi' dalam konteks sederhana",
            "pertanyaan seperti 'pernah melihat pohon banyak ditebang?'",
            "tidak mendefinisikan langsung",
        ],
        "forbidden": ["penggunaan berlebihan tanpa kendali", "penebangan liar", "illegal logging"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "socratic_prompting",
        "question": "Apa hubungan manusia dengan kerusakan alam?",
        "ground_truth": (
            "Manusia adalah penyebab utama kerusakan alam melalui berbagai "
            "aktivitas seperti perburuan, penebangan, pencemaran, dan pembangunan "
            "yang tidak ramah lingkungan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN, CTX_EKSPLOITASI, CTX_PENCEMARAN],
        "expected_traits": [
            "memancing siswa mengingat aktivitas manusia yang merusak",
            "pertanyaan seperti 'menurutmu, apa yang manusia lakukan terhadap hutan?'",
        ],
        "forbidden": ["perburuan, penebangan, pencemaran", "penyebab utama kerusakan"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "socratic_prompting",
        "question": "Kenapa membangun rumah bisa merusak habitat?",
        "ground_truth": (
            "Pembangunan rumah menghancurkan lahan yang sebelumnya menjadi "
            "tempat tinggal, mencari makan, dan berkembang biak bagi hewan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_HABITAT],
        "expected_traits": [
            "pertanyaan seperti 'menurutmu, apa yang terjadi jika hewan kehilangan tempat tinggalnya?'",
            "analogi dengan rumah siswa sendiri",
        ],
        "forbidden": ["tempat tinggal, mencari makan, berkembang biak"],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # ============================================================
    # KATEGORI 4: MULTI-TURN MEMORY
    # Percakapan berantai tentang perburuan liar → perlindungan.
    # multi_turn_id dipakai runner untuk menyusun chat_history.
    # ============================================================
    {
        "category": "multi_turn",
        "multi_turn_id": "MT-001",
        "turn": 1,
        "question": "Apa itu perburuan liar?",
        "ground_truth": (
            "Perburuan liar adalah kegiatan menangkap atau membunuh hewan "
            "secara ilegal tanpa izin pemerintah."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PERBURUAN],
        "expected_traits": [
            "tidak mendefinisikan perburuan liar langsung",
            "pertanyaan pemandu tentang kata 'liar'",
        ],
        "forbidden": ["kegiatan menangkap atau membunuh", "tanpa izin pemerintah"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "multi_turn",
        "multi_turn_id": "MT-001",
        "turn": 2,
        "question": "Kenapa perburuan liar berbahaya?",
        "ground_truth": (
            "Perburuan liar berbahaya karena menyebabkan populasi hewan langka "
            "berkurang drastis hingga terancam punah."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PERBURUAN, CTX_KEPUNAHAN],
        "expected_traits": [
            "menjelaskan konsekuensi perburuan secara singkat",
            "mengaitkan dengan jawaban turn sebelumnya",
            "pertanyaan lanjutan",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "multi_turn",
        "multi_turn_id": "MT-001",
        "turn": 3,
        "question": "Jadi hewan bisa punah karena diburu terus?",
        "ground_truth": (
            "Ya, benar. Jika hewan terus diburu tanpa henti, populasinya "
            "akan terus berkurang hingga akhirnya tidak ada lagi, dan spesies itu punah."
        ),
        "feedback_mode": "paham",
        "contexts": [CTX_PERBURUAN, CTX_KEPUNAHAN],
        "expected_traits": [
            "apresiasi karena siswa mulai menyimpulkan sendiri",
            "konfirmasi dan penjelasan lengkap",
            "tidak ada pertanyaan baru",
        ],
        "forbidden": ["coba pikirkan", "menurutmu", "apa yang kamu pikirkan"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "multi_turn",
        "multi_turn_id": "MT-001",
        "turn": 4,
        "question": "Kalau begitu bagaimana cara melindungi hewan?",
        "ground_truth": (
            "Cara melindungi hewan: kawasan konservasi (taman nasional, suaka "
            "margasatwa), penegakan hukum perburuan liar, penangkaran, "
            "dan edukasi masyarakat."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PERLINDUNGAN],
        "expected_traits": [
            "menjelaskan 1–2 cara perlindungan",
            "mengaitkan dengan konteks percakapan sebelumnya tentang perburuan",
            "pertanyaan konfirmasi",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # ============================================================
    # KATEGORI 5: CONFIDENCE TESTING
    # Ada di konteks → confidence tinggi, source_found = True
    # Tidak ada di konteks → filtered_by_confidence
    # ============================================================

    # -- Dalam konteks --
    {
        "category": "confidence_in_context",
        "question": "Apa penyebab flora dan fauna di Indonesia terancam?",
        "ground_truth": (
            "Penyebab utama: perburuan liar, eksploitasi hutan, penggunaan pestisida "
            "berlebihan, pencemaran lingkungan, dan alih fungsi lahan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN],
        "expected_traits": ["confidence tinggi", "source_found = true"],
        "forbidden": ["perburuan liar", "eksploitasi hutan", "pestisida"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "confidence_in_context",
        "question": "Apa itu eksploitasi hutan?",
        "ground_truth": (
            "Eksploitasi hutan adalah penggunaan sumber daya hutan secara "
            "berlebihan dan tidak terkendali, seperti penebangan liar."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_EKSPLOITASI],
        "expected_traits": ["confidence tinggi", "source_found = true"],
        "forbidden": ["penggunaan berlebihan", "penebangan liar"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "confidence_in_context",
        "question": "Mengapa penggunaan pestisida berbahaya?",
        "ground_truth": (
            "Pestisida berbahaya karena mencemari tanah dan air, membunuh hewan "
            "kecil, dan mengganggu rantai makanan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PESTISIDA],
        "expected_traits": ["confidence tinggi", "source_found = true"],
        "forbidden": ["mencemari tanah dan air", "rantai makanan"],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # -- Luar konteks --
    {
        "category": "confidence_out_of_context",
        "question": "Apa ibu kota Indonesia?",
        "ground_truth": "Jakarta (akan pindah ke Nusantara).",
        "feedback_mode": "belum_paham",
        "contexts": [],
        "expected_traits": [
            "menyatakan materi tidak tersedia",
            "tidak mengarang jawaban",
            "menyarankan siswa bertanya dengan topik yang sesuai",
        ],
        "forbidden": [],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },
    {
        "category": "confidence_out_of_context",
        "question": "Jelaskan tata surya",
        "ground_truth": "Tata surya terdiri dari matahari dan benda-benda langit yang mengorbitnya.",
        "feedback_mode": "belum_paham",
        "contexts": [],
        "expected_traits": [
            "menyatakan materi tidak tersedia",
            "tidak mengarang penjelasan tata surya",
        ],
        "forbidden": [],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },
    {
        "category": "confidence_out_of_context",
        "question": "Siapa penemu lampu?",
        "ground_truth": "Thomas Edison adalah penemu lampu pijar.",
        "feedback_mode": "belum_paham",
        "contexts": [],
        "expected_traits": [
            "menyatakan materi tidak tersedia",
            "tidak menyebut nama penemu",
        ],
        "forbidden": [],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },
    {
        "category": "confidence_out_of_context",
        "question": "Apa itu gunung api?",
        "ground_truth": "Gunung api adalah gunung yang masih aktif dan dapat meletus.",
        "feedback_mode": "belum_paham",
        "contexts": [],
        "expected_traits": [
            "menyatakan materi tidak tersedia",
            "tidak mendefinisikan gunung api",
        ],
        "forbidden": [],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },

    # ============================================================
    # KATEGORI 6: EVALUASI PEMAHAMAN
    # Mencerminkan alur: belum → mulai → paham
    # ============================================================
    {
        "category": "eval_pemahaman",
        "question": "Aku masih bingung tentang semuanya",
        "ground_truth": "Permasalahan flora dan fauna disebabkan oleh aktivitas manusia.",
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN],
        "expected_traits": [
            "menyederhanakan bahasa",
            "memulai dari satu konsep paling dasar",
            "tidak memberikan semua informasi sekaligus",
        ],
        "forbidden": ["perburuan liar", "eksploitasi", "pestisida"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "eval_pemahaman",
        "question": "Bisa lebih sederhana?",
        "ground_truth": "Manusia merusak alam sehingga hewan kehilangan tempat tinggal.",
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN, CTX_HABITAT],
        "expected_traits": [
            "bahasa sangat sederhana",
            "analogi yang dekat dengan kehidupan anak SD",
            "satu pertanyaan sederhana",
        ],
        "forbidden": ["eksploitasi", "pencemaran", "perburuan"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "eval_pemahaman",
        "question": "Aku belum ngerti tentang habitat",
        "ground_truth": "Habitat adalah tempat hidup alami hewan yang menyediakan makanan, air, dan tempat berlindung.",
        "feedback_mode": "belum_paham",
        "contexts": [CTX_HABITAT],
        "expected_traits": [
            "analogi seperti 'bayangkan rumahmu'",
            "tidak mendefinisikan habitat langsung",
            "pertanyaan balik tentang kebutuhan hewan",
        ],
        "forbidden": ["tempat hidup alami", "makanan, air, tempat berlindung"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "eval_pemahaman",
        "question": "Jadi habitat itu tempat tinggal hewan ya?",
        "ground_truth": "Ya, habitat adalah tempat tinggal alami hewan yang menyediakan semua kebutuhannya.",
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_HABITAT],
        "expected_traits": [
            "konfirmasi bahwa siswa benar",
            "menambahkan informasi tentang fungsi habitat",
            "pertanyaan lanjutan",
            "apresiasi",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "eval_pemahaman",
        "question": "Berarti kalau hutan rusak, hewan kehilangan rumah?",
        "ground_truth": "Benar, kerusakan hutan menghancurkan habitat sehingga hewan kehilangan tempat hidup, makanan, dan tempat berkembang biak.",
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_HABITAT, CTX_EKSPLOITASI],
        "expected_traits": [
            "konfirmasi dan memperdalam pemahaman",
            "menambahkan konsekuensi lanjutan",
            "pertanyaan konfirmasi",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "eval_pemahaman",
        "question": "Oke sekarang aku paham kenapa hewan bisa punah",
        "ground_truth": (
            "Hewan punah karena habitatnya rusak, diburu, atau populasinya "
            "terlalu sedikit untuk berkembang biak."
        ),
        "feedback_mode": "paham",
        "contexts": [CTX_KEPUNAHAN, CTX_ANCAMAN],
        "expected_traits": [
            "apresiasi tulus",
            "kesimpulan lengkap dan jelas",
            "tidak ada pertanyaan baru",
            "rangkuman akhir",
        ],
        "forbidden": ["coba pikirkan", "menurutmu", "apa yang terjadi jika"],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # ============================================================
    # KATEGORI 7: ROLEPLAY SISWA SD
    # Bahasa informal/anak-anak. AI wajib menyesuaikan tone.
    # ============================================================
    {
        "category": "roleplay_sd",
        "question": "Kak, kenapa burung kakatua diburu orang?",
        "ground_truth": (
            "Burung kakatua diburu karena banyak orang ingin memeliharanya. "
            "Permintaan hewan peliharaan mendorong perburuan liar."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_PERBURUAN, CTX_KOLEKTOR],
        "expected_traits": [
            "tone ramah dan hangat seperti kakak ke adik",
            "tidak langsung menjawab lengkap",
            "pertanyaan balik yang sesuai usia SD",
        ],
        "forbidden": ["permintaan mendorong perburuan", "pasar gelap"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "roleplay_sd",
        "question": "Kalau semua hewan punah nanti bagaimana?",
        "ground_truth": (
            "Jika semua hewan punah, ekosistem akan hancur: tidak ada pollinator, "
            "rantai makanan putus, dan manusia pun akan kesulitan mendapat pangan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_KEPUNAHAN, CTX_ANCAMAN],
        "expected_traits": [
            "memancing imajinasi anak tentang dunia tanpa hewan",
            "pertanyaan balik yang mudah dipahami anak SD",
        ],
        "forbidden": ["ekosistem hancur", "pollinator", "rantai makanan putus"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "roleplay_sd",
        "question": "Kenapa manusia merusak alam?",
        "ground_truth": (
            "Manusia merusak alam karena kurangnya kesadaran, keserakahan, "
            "dan kebutuhan ekonomi yang tidak diimbangi dengan kepedulian lingkungan."
        ),
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN, CTX_EKSPLOITASI],
        "expected_traits": [
            "memancing siswa berpikir tentang motivasi manusia",
            "tidak menghakimi manusia secara negatif",
            "pertanyaan reflektif",
        ],
        "forbidden": ["keserakahan", "kurangnya kesadaran"],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "roleplay_sd",
        "question": "Aku ingin menjaga hewan, harus bagaimana?",
        "ground_truth": (
            "Anak SD bisa menjaga hewan dengan: tidak membeli hewan liar, "
            "tidak membuang sampah sembarangan, dan ikut program penghijauan."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PERLINDUNGAN],
        "expected_traits": [
            "apresiasi niat siswa",
            "memberikan 1–2 langkah konkret yang bisa dilakukan anak SD",
            "pertanyaan ringan",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },
    {
        "category": "roleplay_sd",
        "question": "Apa yang bisa dilakukan anak SD untuk menjaga lingkungan?",
        "ground_truth": (
            "Anak SD bisa: tidak membuang sampah sembarangan, menanam pohon, "
            "menghemat air dan listrik, serta memberi tahu orang dewasa jika melihat "
            "pelanggaran lingkungan."
        ),
        "feedback_mode": "mulai_paham",
        "contexts": [CTX_PERLINDUNGAN],
        "expected_traits": [
            "memberi contoh konkret dan relevan untuk usia SD",
            "apresiasi semangat siswa",
            "satu pertanyaan ringan tentang tindakan pribadi",
        ],
        "forbidden": [],
        "expected_status": "success",
        "is_out_of_context": False,
    },

    # ============================================================
    # KATEGORI 8: ANTI-HALUSINASI RAG
    # AI wajib mengakui keterbatasan dan TIDAK mengarang jawaban.
    # ============================================================
    {
        "category": "anti_halusinasi",
        "question": "Apa nama presiden pada materi ini?",
        "ground_truth": "Tidak ada informasi tentang presiden dalam materi ini.",
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN],   # konteks ada, tapi tidak relevan
        "expected_traits": [
            "menyatakan bahwa informasi tentang presiden tidak ada di materi",
            "tidak menyebut nama presiden manapun",
            "tidak mengarang jawaban",
        ],
        "forbidden": ["Jokowi", "Prabowo", "Soekarno", "nama presiden"],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },
    {
        "category": "anti_halusinasi",
        "question": "Ada pembahasan matematika tidak?",
        "ground_truth": "Tidak ada pembahasan matematika dalam materi ini.",
        "feedback_mode": "belum_paham",
        "contexts": [CTX_ANCAMAN],
        "expected_traits": [
            "menyatakan tidak ada pembahasan matematika",
            "mengarahkan ke topik materi yang sebenarnya",
            "tidak mengarang soal matematika",
        ],
        "forbidden": ["perkalian", "penjumlahan", "rumus", "matematika"],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },
    {
        "category": "anti_halusinasi",
        "question": "Berapa jumlah pulau di Indonesia menurut materi?",
        "ground_truth": "Materi tidak menyebutkan jumlah pulau di Indonesia.",
        "feedback_mode": "belum_paham",
        "contexts": [CTX_HEWAN_LANGKA],
        "expected_traits": [
            "menyatakan bahwa materi tidak menyebutkan jumlah pulau",
            "tidak menyebut angka pulau manapun (17.000, 13.000, dll.)",
            "tidak mengarang fakta",
        ],
        "forbidden": ["17.000", "13.000", "pulau", "jumlah pulau"],
        "expected_status": "filtered_by_confidence",
        "is_out_of_context": True,
    },
]


# ============================================================
# HELPER: filter per kategori
# ============================================================
def get_by_category(category: str) -> list[dict]:
    return [d for d in EVAL_DATASET if d.get("category") == category]


def get_by_mode(mode: str) -> list[dict]:
    return [d for d in EVAL_DATASET if d["feedback_mode"] == mode]


def get_multi_turn_groups() -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for item in EVAL_DATASET:
        tid = item.get("multi_turn_id")
        if tid:
            groups.setdefault(tid, []).append(item)
    for tid in groups:
        groups[tid].sort(key=lambda x: x.get("turn", 0))
    return groups


CATEGORIES = [
    "pemahaman_dasar",
    "hots_analisis",
    "socratic_prompting",
    "multi_turn",
    "confidence_in_context",
    "confidence_out_of_context",
    "eval_pemahaman",
    "roleplay_sd",
    "anti_halusinasi",
]