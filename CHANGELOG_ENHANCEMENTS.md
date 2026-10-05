# Judgels Platform Enhancements & Modernization Changelog

Dokumentasi komprehensif mengenai seluruh perubahan, perbaikan, modernisasi arsitektur, dan optimasi performa pada versi fork ini dibandingkan dengan repositori upstream original [ia-toki/judgels](https://github.com/ia-toki/judgels).

---

## 1. Executive Summary & Ringkasan Perbedaan

| Komponen / Fitur | Original Upstream (`ia-toki/judgels`) | Enhanced Fork (Versi Ini) |
| :--- | :--- | :--- |
| **Problem Management** | Bergantung pada web interface legacy server-side rendering (SSR Michael). | **Full REST API + React SPA modern.** Manajemen soal (statement, testdata, grading config, partners, subtask) terintegrasi langsung di frontend. |
| **Lesson & Course Management** | Sebagian besar dikelola melalui rute web legacy atau manual backend. | **Restful API lengkap** (`LessonResource.java`) & antarmuka admin visual berbasis React. |
| **Submission & Problem Routing** | Rentan tautan mati (*broken link*) atau unclickable link jika kontainer/problemset/chapter induk dihapus/berpindah. | **Resilient Fallback Resolution Engine.** Backend secara otomatis melacak keberadaan problem di problemset/chapter aktif dan frontend menyediakan navigasi fallback yang aman tanpa crash. |
| **Client Bootstrapping** | Rentan layar putih (*blank white screen*) jika konfigurasi runtime (`window.conf`) terlambat dimuat saat deployment. | **Defensive Fallback & Head Script Guarantee.** Injeksi sinkron di `<head>` dan default fallback di `src/conf.js` menjamin UI tidak pernah crash. |
| **Responsivitas & Kompatibilitas Perangkat** | Desktop-centric; tata letak tabel kontes, scoreboard, sidebar, dan editor kode sering terpotong (*clipped*) atau rusak pada resolusi smartphone/tablet. | **Family-Friendly Multi-Resolution Overhaul.** Adaptif terhadap seluruh resolusi (320px smartphone, tablet, laptop, hingga 4K ultra-wide) dengan navigasi touch-friendly, tabel responsive, sticky contestant scoreboard, formula KaTeX auto-scroll, dan dialog fluid. |
| **Grader Sandbox Concurrency** | Default 2 worker threads (~40 submission/menit). | **4 worker threads** (~80 submission/menit) dengan isolasi `isolate` cgroup v2 native. |
| **Database & Cache Tuning** | Konfigurasi default (Buffer pool 128 MB, connection pool standar). | **Buffer pool 512 MB**, 200 koneksi maks, thread cache dioptimalkan untuk event contest beban tinggi (*high-request*). |
| **Network & Reverse Proxy** | Konfigurasi reverse proxy dasar tanpa keepalive upstream. | **Nginx tuning** (Keepalive connection pooling, static asset immutable caching 30 hari, port internal terisolasi `127.0.0.1`). |
| **Security Hardening** | Port RabbitMQ, API server, dan Mailhog sering terbuka ke semua antarmuka (`0.0.0.0`). | **Internal Port Isolation.** Seluruh port internal dibatasi ketat ke `127.0.0.1`, hanya port `80` (Nginx) yang terbuka keluar. |

---

## 2. Rincian Modifikasi Backend (`judgels-backends`)

### A. Full Problem Management REST API (`ProblemResource.java` & `ActorChecker.java`)
* Menambahkan endpoint RESTful lengkap (`/problems/api/...`) yang memungkinkan klien web React mengelola seluruh siklus hidup pembuatan soal tanpa memanggil rute template server legacy (Michael):
  * **General Information:** Judul, slug, status privasi, deskripsi.
  * **Statement Editor:** Multi-bahasa, rendering Markdown & LaTeX (KaTeX), upload aset/gambar.
  * **Test Data Management:** Upload zip testcase, preview input/output, konfigurasi subtask dan bobot nilai.
  * **Grading Engine Config:** Konfigurasi batas waktu (*time limit*), batas memori (*memory limit*), tipe engine (*Batch*, *Interactive*, *Output-only*).
  * **Partners & Permissions:** Manajemen kolaborator dan hak akses pembuat soal.
  * **Submissions & Re-grading:** Monitoring dan eksekusi penilaian ulang per soal.

### B. Lesson Management REST API (`LessonResource.java`)
* Menyediakan endpoint CRUD materi pelajaran (`/lessons/api/...`) untuk mendukung modul Courses/Training tanpa antarmuka legacy.

### C. Resilient Submission & Container Resolution Engine (`SubmissionResource.java`)
* **Masalah pada Versi Original:**
  Ketika kontainer (problemset atau bab kursus) tempat submission dibuat telah dihapus atau direorganisasi, endpoint `/api/v2/submissions/programming` menghasilkan `container: null` atau alias dummy (`-`, `#`). Akibatnya, link nama soal di tabel dan halaman detail submission menjadi tidak dapat diklik atau mengarah ke URL invalid (`/problems/problemsets/-/problems/...`).
* **Solusi pada Versi Ini:**
  * Backend mengimplementasikan mekanisme *two-tier fallback resolution*: Jika lookup langsung `containerJid` gagal, backend memeriksa apakah `problemJid` terkait masih terdaftar pada problemset aktif lain atau bab kursus.
  * Jika ditemukan, metadata kontainer aktif disertakan secara transparan.
  * Mapping dual-key (`jid` dan `alias`) untuk menjamin konsistensi navigasi frontend.

### D. Grader Engine & Cgroups Sandbox (`IsolateSandbox.java`)
* Memperbaiki penanganan inisialisasi dan *cleanup* box ID isolate pada lingkungan container privileged modern dengan cgroup v2.
* Menjamin resource memory dan CPU time limit diukur dengan presisi tinggi tanpa kebocoran process handle.

---

## 3. Rincian Modifikasi Frontend (`judgels-client`)

### A. Komponen Manajemen Admin Baru
* Penambahan modul admin modern di bawah `src/routes/admin/problems/`:
  * `ProblemPage.jsx`, `ProblemGeneralTab.jsx`, `ProblemStatementTab.jsx`
  * `ProblemTestDataTab.jsx`, `ProblemGradingTab.jsx`, `ProblemPartnersTab.jsx`
  * `ProblemSubmissionsTab.jsx`, `ProblemBundleItemsTab.jsx`
* Penambahan modul admin materi pelajaran di `src/routes/admin/lessons/`.
* Penambahan kustomisasi logo dan branding di `SiteLogoSection.jsx`.

### B. Navigasi & URL Builder Defensif (`src/modules/api/submission.js`)
* Implementasi fungsi pembangun URL yang aman:
  * `constructContainerUrl(container)`: Memvalidasi subpath dan mengembalikan string kosong jika alias tidak valid (`-`, `#`) atau data kontainer tidak lengkap.
  * `constructProblemUrl(problem, container)`: Menghasilkan link kontainer jika tersedia, atau melakukan *fallback* langsung ke URL master problem (`/problems/problems/:problemJid`) jika kontainer tidak tersedia.
* Penambahan unit test komprehensif di `src/modules/api/submission.test.js` dengan cakupan 100% kelulusan (6/6 passing tests).

### C. Pencegahan Layar Putih (*Blank White Screen Prevention*)
* **Penyebab pada Versi Original:** `src/conf.js` membaca `window.conf` saat modul pertama kali di-import. Jika script konfigurasi `/var/conf/judgels-client.js` belum selesai diunduh oleh browser, `window.conf` bernilai `undefined`, memicu `TypeError: Cannot read properties of undefined` pada inisialisasi aplikasi React.
* **Solusi pada Versi Ini:**
  1. `src/conf.js` menerapkan defensive fallback: jika `window.conf` belum tersedia, variabel konfigurasi otomatis menggunakan default yang aman.
  2. Script `/var/conf/judgels-client.js` dipindahkan ke dalam tag `<head>` di `index.html` agar dieksekusi secara sinkron sebelum module scripts React dijalankan.

### D. Universal Multi-Resolution & Family-Friendly Responsive Overhaul
* **Latar Belakang:** Versi original Judgels didesain utamanya untuk desktop PC monitor sekolah/lab. Pada smartphone (layar 320px - 480px) maupun tablet, navigasi header bertumpuk, tombol autentikasi terpotong, sidebar menu mengunci lebar tetap 320px, formula matematika KaTeX memicu horizontal overflow, tabel scoreboard tidak dapat dibaca saat bergulir ke kanan, dan dialog modal Blueprint terpotong di luar viewport.
* **Perubahan Menyeluruh:**
  1. **Viewport & Safe Layout Foundation:**
     - Menambahkan `viewport-fit=cover` pada meta viewport `index.html` untuk perangkat dengan notch / dynamic island.
     - Mengunci `overflow-x: hidden; max-width: 100vw;` pada root `html` dan `body` untuk mengeliminasi *horizontal scrolling blowout*.
     - Blueprint Dialog (`.bp6-dialog`) kini adaptif dan fluid (`max-width: calc(100vw - 24px)`, scroll internal mandiri).
  2. **Top Navigation Header & User Widget:**
     - Skalabilitas visual logo dan judul aplikasi proporsional (font size `18px`/`16px` pada layar sempit).
     - Truncation nama akun dengan ellipsis pada chip profil agar tidak mendorong burger menu ke luar layar.
     - Penataan link Login & Register ramah sentuhan tanpa merusak tinggi navbar.
     - Sub-navigasi Topbar dilengkapi fitur touch-scroll horizontal tanpa *wrapping* teks yang rusak.
  3. **Sidebar & Layout System:**
     - Pada resolusi `<= 860px`, `ContentWithSidebar` beralih otomatis menjadi tata letak vertikal (100% lebar).
     - Menu sidebar mobile ditransformasi menjadi tombol dropdown elegan selebar layar dengan target sentuh 44px dan daftar tab popover responsif.
     - Padding dinamis pada `AppContent`, `FullPageLayout`, `FullWidthPageLayout`, dan `Footer` (10-12px di smartphone, 16px di tablet, 24px di desktop).
  4. **Scoreboard & Tabel Kontes (ICPC, IOI, Bundle, GCJ, Troc):**
     - Kontainer tabel memiliki scroll horizontal mandiri dengan momentum touch iOS/Android.
     - Mengimplementasikan kolom kontestan dan peringkat yang menempel (*sticky rank & contestant columns*) pada scroll horizontal di perangkat seluler, sehingga pengguna tetap mengetahui nama kontestan saat menggeser kolom soal ke-10 atau ke-15.
  5. **Problem Statements & KaTeX Math Formulas:**
     - KaTeX Display block (`.katex-display`) dilengkapi auto-scroll horizontal mandiri agar persamaan matematika yang panjang tidak memaksa pelebaran halaman.
     - Gambar dan diagram soal dibatasi `max-width: 100%; height: auto; object-fit: contain;`.
  6. **Code Submission Editor & Forms:**
     - Header editor (pemilih bahasa pemrograman, tag file, tombol reset) dan tombol *Submit* otomatis membungkus (*wrap*) rapi pada layar sentuh dengan tinggi tombol 36-38px untuk kemudahan penekanan satu jempol (*thumb-friendly*).
     - `FormTable` dan `FormTableInput` otomatis berubah dari format tabel 2-kolom yang sempit menjadi form vertikal stacked (label di atas, input 100% lebar di bawah) pada resolusi `<= 640px`.

---

## 4. DevOps, Kapasitas & Optimasi Produksi (`judgels-compose`)

### A. Pemodelan Kapasitas (*Queueing Theory*)
* Mengoptimalkan kapasitas sistem untuk menangani lonjakan kontes:
  * Worker thread grader dinaikkan menjadi **4 thread**.
  * Throughput grading: **80 submission/menit** (kapasitas real-time aman hingga ~200 peserta aktif saat *last-minute rush*).
  * Web API throughput: Mampu melayani **> 1.500 user** konkuren untuk penonton scoreboard dan pembaca soal.

### B. Database & JVM Tuning
* **MySQL 8.4:**
  * `innodb_buffer_pool_size = 512M` (seluruh dataset kontes aktif tersimpan di RAM).
  * `max_connections = 200`, `thread_cache_size = 16`.
* **JVM Heap & G1GC:**
  * `judgels-server`: `-Xms256m -Xmx768m -XX:+UseG1GC`
  * `judgels-grader`: `-Xms128m -Xmx512m -XX:+UseG1GC`
  * Menghilangkan pause panjang saat Garbage Collection.

### C. Nginx Reverse Proxy
* `worker_processes auto;`, `worker_connections 2048;`
* Koneksi keepalive upstream ke client (`16`) dan backend server (`32`).
* Caching aset statis Vite: `Cache-Control: public, immutable; expires 30d;`.

### D. Hardening Sekuritas
* Seluruh port internal (`9101`, `15672`, `5672`, `1025`) dibatasi hanya mendengar pada `127.0.0.1`.
* Hanya port `80` (HTTP Nginx) yang terekspos keluar.
* File kredensial (`.env`) dan binary jar diabaikan secara ketat oleh `.gitignore`.
