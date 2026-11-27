# Uji ide — Roast panel (skill: roast)

**Brief:** "Kasku" — web app local-first untuk UMKM mencatat kas, membuat invoice, melihat arus kas/runway; gratis + tier Rp 29.000/bulan untuk sync multi-perangkat. Pembuat: solo, tanpa audiens, target rupiah pertama ≤ 60 hari.

| Panelis | Skor | Inti temuan |
|---|---|---|
| Critic | 2/10 | Arsitektur lokal bertentangan dengan fitur berbayar (sync butuh server). Penyimpanan browser = risiko kehilangan data. Tanpa distribusi. |
| Champion | 7/10 | Lokal-first cocok untuk Indonesia ("data tidak keluar dari HP"). Invoice/pesan WA sebagai mesin pertumbuhan. Potensi laporan untuk akses kredit. |
| Analyst | 3/10 | Nilai dan pendapatan menunjuk ke arsitektur berlawanan. "Runway" bukan bahasa warung — mereka berpikir kas harian dan kasbon. |
| Investigator | 3/10 | BukuKas/Lummo (pendanaan Rp 1,14 T) menutup aplikasinya Mei 2023; BukuWarung menggratiskan pembukuan dan cari uang dari pembayaran/pinjaman; BI punya SIAPIK gratis. ~64 jt UMKM, 58% tidak mencatat. |
| Customer | 3/10 | "Saya tidak pusing soal pembukuan. Saya pusing soal **uang yang diutang pelanggan** dan **takut catatan hilang**." |

`verdict_synthesizer.py` → **KILL** (komposit 3,15/10, keyakinan sedang). Gerbang *demand* dan *fatal flaw* terpicu. Ketegangan terbesar: Champion 7 vs Critic 2.

## THE VERDICT: KILL (sebagai bisnis langganan) → RESHAPE (sebagai alat gratis)
Confidence: medium

**The call in one line:** Jangan bangun aplikasi pembukuan berbayar; bangun **buku kasbon digital gratis dan open-source** yang menyelesaikan dua rasa sakit nyata.

**Why:** Champion benar bahwa lokal-first adalah keunggulan kepercayaan, tapi Critic, Analyst, Investigator, dan Customer sepakat bahwa langganan pembukuan untuk warung sudah ditolak pasar — bahkan pemain berdana ratusan juta dolar gagal. Yang tersisa dan tidak dilayani dengan baik: menagih kasbon tanpa canggung, dan rasa aman bahwa data tidak hilang. Keduanya bisa dibangun tanpa server.

**Biggest risk:** Data hilang karena cache dibersihkan → dimitigasi dengan `navigator.storage.persist()`, backup 1 ketukan ke WhatsApp, dan peringatan backup > 7 hari (Epic D).
**Biggest upside:** Setiap pesan tagihan WA membawa nama Kasku ke pelanggan lain — distribusi gratis tanpa iklan.

**Money read:** Tidak ada target pendapatan di MVP. Biaya hosting Rp 0 (GitHub Pages). Jika retensi terbukti, opsi berikutnya: kemitraan koperasi/BUMDes, bukan langganan per warung.

**The cheapest 48-hour test** (`cheapest_test_designer.py --risk retention`): berikan Kasku ke 5 pemilik warung yang punya buku kasbon, minta mereka pakai seminggu. **LULUS** jika ≥ 3 masih mencatat di hari ke-7 tanpa diingatkan. **GAGAL** jika hanya dicoba sekali.

## Ukuran pasar (skill: market-research)
`market_sizer.py` — model awal untuk langganan Rp 29.000/bulan: TAM top-down Rp 4,8 T vs bottoms-up Rp 8,7 T → **triangulasi gagal (selisih 81%)**; sumber top-down tidak tersedia. Kami **tidak mengutip angka TAM**. Karena verdict menghapus langganan, ukuran pasar tidak menjadi dasar keputusan; yang relevan adalah jumlah pengguna (~25 jt UMKM yang sudah digital) untuk alat gratis. Input: `docs/research/market.json`.
