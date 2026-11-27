# Privasi & Perlindungan Data — Kasku

Disusun dengan skill **compliance-os:gdpr-audit-prep** (enam pertanyaan DPO), disesuaikan ke **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**, yang strukturnya mirip GDPR. Pasal UU PDP yang dirujuk perlu dikonfirmasi oleh penasihat hukum sebelum dipakai sebagai dasar kepatuhan formal. **Ini bukan nasihat hukum.**

## Keputusan yang diambil
**Arsitektur:** semua data pribadi diproses hanya di perangkat pemilik warung. Pembuat aplikasi tidak menerima, menyimpan, atau melihat data apa pun.

## Peran
| Pihak | Peran | Alasan |
|---|---|---|
| Pemilik warung | **Pengendali data** (controller) | Menentukan tujuan (mencatat dan menagih kasbon) dan cara pemrosesan. |
| Pelanggan warung | **Subjek data** | Nama, nomor WA opsional, dan riwayat utang mereka dicatat. |
| Pembuat Kasku | **Bukan prosesor** | Tidak ada server, akun, analitik, atau telemetri. Kode statis dari GitHub Pages; tidak ada permintaan jaringan selain mengambil file aplikasi itu sendiri. |
| WhatsApp (Meta) | Di luar Kasku | Pesan tagihan dibuka di aplikasi WhatsApp milik pemilik warung. Kasku hanya membuat tautan `wa.me`. |

## Enam pertanyaan DPO

**1. Catatan pemrosesan (GDPR Art. 30 / UU PDP Pasal 31).**
Satu aktivitas pemrosesan:
- **Tujuan:** mencatat dan menagih kasbon.
- **Data:** nama, nomor WA (opsional), nominal dan tanggal utang/bayar, catatan bebas.
- **Penyimpanan:** `localStorage` di peramban.
- **Penerima:** tidak ada.
- **Retensi:** sampai pemilik menghapus pelanggan atau datanya.
- **Pengamanan:** data tidak pernah meninggalkan perangkat, kecuali pemilik sendiri mengekspor file cadangan.

Kewajiban pencatatan ada pada pemilik warung. Kasku menyediakan ringkasan di atas sebagai templat.

**2. Dasar pemrosesan (GDPR Art. 6 / UU PDP Pasal 20).** Pelaksanaan perjanjian: utang-piutang jual beli antara warung dan pelanggan. Pemrosesan untuk menagih utang yang memang ada wajar dan sesuai harapan pelanggan. Tidak ada data sensitif/spesifik (GDPR Art. 9 / UU PDP Pasal 4 ayat 2).

**3. Penilaian dampak/DPIA (GDPR Art. 35 / UU PDP Pasal 34).** **Tidak wajib.** Skalanya kecil, tidak ada profiling atau keputusan otomatis, tidak ada data spesifik, dan tidak ada pemantauan sistematis. Risiko utama justru **kehilangan data** (ketersediaan), yang dimitigasi dengan:
- `navigator.storage.persist()`,
- cadangan satu ketukan,
- peringatan jika cadangan lebih tua dari 7 hari,
- pemulihan dengan pratinjau dan validasi ketat (`app/js/backup.js`).

**4. Hak subjek data (GDPR Art. 15–17 / UU PDP Pasal 5–15).** Dipenuhi oleh pemilik warung langsung di aplikasi:
- **Akses:** lihat riwayat per pelanggan.
- **Perbaikan:** "Ubah" pelanggan.
- **Penghapusan:** "Hapus pelanggan" menghapus pelanggan beserta semua catatannya.

Catatan: file cadangan yang sudah dikirim ke WhatsApp/Drive berada di luar aplikasi, dan pemilik perlu menghapusnya sendiri.

**5. Transfer lintas negara (GDPR Art. 44–49 / UU PDP Pasal 56).** **Tidak ada** dari Kasku. Jika pemilik membagikan file cadangan ke layanan cloud, itu pilihan dan tanggung jawab pemilik.

**6. Kegagalan pelindungan / pelanggaran data (GDPR Art. 33 / UU PDP Pasal 46, 3×24 jam).** Kasku tidak menyimpan data terpusat, jadi tidak ada basis data yang bisa bocor dari sisi pembuat. Risiko tersisa ada di level perangkat (HP hilang atau dipinjam orang). Rekomendasi bagi pengguna: kunci layar HP. Kunci PIN di dalam aplikasi masuk backlog.

## Langkah teknis yang menjaga klaim "data tidak keluar dari HP"
- Tidak ada `fetch`/XHR ke domain lain. Service worker hanya melayani origin sendiri (`app/sw.js`).
- Tidak ada font, analitik, atau skrip pihak ketiga di aplikasi.
- Rendering memakai DOM API (tanpa `innerHTML`), sehingga nama pelanggan tidak bisa menyuntikkan skrip.

## Verdict
🟢 **Siap** untuk lingkup alat lokal. Tiga tindakan berikutnya:
1. Tambahkan kunci PIN opsional di dalam aplikasi (mitigasi HP dipinjam).
2. Opsi enkripsi file cadangan dengan kata sandi (Web Crypto AES-GCM) sebelum dibagikan ke WhatsApp.
3. Jika suatu saat ada sinkronisasi atau server, **ulangi penilaian ini**: Kasku akan menjadi prosesor dan wajib punya perjanjian pemrosesan serta prosedur notifikasi 3×24 jam.

## Perlu penasihat hukum
- Konfirmasi nomor pasal UU PDP dan peraturan pelaksananya (PP turunan) yang berlaku saat rilis.
