# Kasku — MVP backlog

Disusun dengan skill **agile-product-owner** (INVEST, Given-When-Then, Fibonacci, prioritas 40/30/15/15).
Persona utama: **Bu Sri** — warung sembako + jualan Shopee, HP Android murah, sering bersihkan cache.

Sprint goal MVP: *Bu Sri bisa mencatat kasbon dalam 2 ketukan, menagih lewat WhatsApp dalam 1 ketukan, dan tidak pernah kehilangan data.*

## Epic A — Kasbon (piutang) per pelanggan · 18 pts

| ID | Story | Pts | Prio |
|---|---|---|---|
| A1 | Sebagai pemilik warung, saya ingin **menambah pelanggan** cukup dengan nama (nomor WA opsional) agar bisa langsung mencatat utangnya. | 2 | Critical |
| A2 | Sebagai pemilik warung, saya ingin **mencatat kasbon baru dalam 2 ketukan** (pilih pelanggan → nominal cepat) agar tidak memperlambat antrean. | 5 | Critical |
| A3 | Sebagai pemilik warung, saya ingin **mencatat pembayaran** (sebagian atau lunas) agar sisa utang selalu benar. | 3 | Critical |
| A4 | Sebagai pemilik warung, saya ingin **melihat total piutang dan daftar pelanggan terurut dari utang terbesar/terlama** agar tahu siapa yang perlu ditagih. | 3 | High |
| A5 | Sebagai pemilik warung, saya ingin **riwayat transaksi per pelanggan** agar bisa menunjukkan rincian saat ditanya. | 5 | High |

**AC A2**
1. Given ada pelanggan, When saya ketuk pelanggan lalu ketuk tombol nominal cepat (5rb/10rb/20rb/50rb/100rb) atau isi nominal, Then kasbon tersimpan dan saldo pelanggan bertambah.
2. Given nominal kosong / ≤ 0 / bukan angka, When disimpan, Then tampil pesan "Nominal harus lebih dari 0" dan tidak ada yang tersimpan.
3. Given kasbon tersimpan, Then muncul toast "Kasbon dicatat" dengan tombol **Batalkan** selama 5 detik.
4. Tersimpan < 100 ms (lokal, tanpa jaringan); semua kontrol bisa dipakai dengan keyboard dan target sentuh ≥ 44px.

**AC A3**
1. Given pelanggan punya utang Rp 50.000, When saya catat bayar Rp 20.000, Then sisa Rp 30.000.
2. Given saya ketuk "Lunas", Then nominal terisi otomatis sebesar sisa utang.
3. Given bayar melebihi sisa utang, Then tampil peringatan dan pembayaran dibatasi ke sisa utang (tidak ada saldo negatif).
4. Riwayat menampilkan pembayaran dengan tanggal.

## Epic B — Tagih lewat WhatsApp · 5 pts

| ID | Story | Pts | Prio |
|---|---|---|---|
| B1 | Sebagai pemilik warung, saya ingin **tombol "Tagih via WA"** yang membuka WhatsApp dengan pesan sopan berisi sisa utang agar tidak canggung menagih. | 3 | Critical |
| B2 | Sebagai pemilik warung, saya ingin **mengubah template pesan** agar sesuai gaya bicara saya. | 2 | Medium |

**AC B1**
1. Given pelanggan punya nomor WA, When saya ketuk "Tagih via WA", Then terbuka `https://wa.me/62…?text=…` dengan nama, sisa utang (format Rp Indonesia), dan nama toko.
2. Given nomor diawali `0` atau `+62`, Then dinormalisasi ke `62…`.
3. Given pelanggan tanpa nomor, Then tombol tetap ada dan membuka WA tanpa nomor tujuan (pilih kontak manual).
4. Given utang = 0, Then tombol tagih disembunyikan.

## Epic C — Kas harian · 8 pts

| ID | Story | Pts | Prio |
|---|---|---|---|
| C1 | Sebagai pemilik warung, saya ingin **mencatat uang masuk/keluar** dengan kategori sederhana agar tahu untung hari ini. | 3 | High |
| C2 | Sebagai pemilik warung, saya ingin **ringkasan hari ini dan 7 hari** (masuk, keluar, selisih) dalam grafik sederhana agar tahu apakah cukup untuk belanja stok Senin. | 5 | High |

## Epic D — Data aman (backup) · 10 pts

| ID | Story | Pts | Prio |
|---|---|---|---|
| D1 | Sebagai pemilik warung, saya ingin **mengunduh backup** satu file agar data aman walau cache terhapus. | 2 | Critical |
| D2 | Sebagai pemilik warung, saya ingin **membagikan backup ke WhatsApp** (Web Share API, fallback unduh) agar tersimpan di chat saya sendiri. | 3 | Critical |
| D3 | Sebagai pemilik warung, saya ingin **memulihkan dari file backup** dengan pratinjau sebelum menimpa agar tidak salah file. | 3 | Critical |
| D4 | Sebagai pemilik warung, saya ingin **peringatan jika backup terakhir > 7 hari** agar ingat mem-backup. | 2 | High |

**AC D3**
1. Given file backup valid, When dipilih, Then tampil ringkasan (jumlah pelanggan, transaksi, tanggal backup) dan tombol konfirmasi.
2. Given file bukan backup Kasku / rusak, Then tampil "File ini bukan backup Kasku" dan data lama tidak berubah.
3. Given dikonfirmasi, Then data diganti dan tampil toast sukses.
4. Aplikasi meminta `navigator.storage.persist()` saat pertama kali dipakai.

## Epic E — Enabler · 8 pts

| ID | Story | Pts | Prio |
|---|---|---|---|
| E1 | Sebagai developer, saya perlu **PWA (manifest + service worker)** agar aplikasi bisa dipasang dan jalan offline. | 3 | High |
| E2 | Sebagai developer, saya perlu **i18n id/en** dengan format Rupiah & tanggal Indonesia. | 3 | Medium |
| E3 | Sebagai developer, saya perlu **lapisan penyimpanan teruji** (localStorage + skema berversi) agar migrasi aman. | 2 | Critical |

## Sprint loading (kapasitas 1 orang ≈ 40 pts, komit 85%)

**Komitmen (34 pts):** A1, A2, A3, A4, B1, C1, D1, D2, D3, D4, E1, E3
**Stretch (6 pts):** E2, B2 · **Berikutnya:** A5, C2

## Di luar MVP (sengaja)
Sinkronisasi multi-perangkat, akun/login, invoice bermerek, laporan pajak, integrasi pemberi pinjaman — lihat `docs/strategy/verdict.md`.
