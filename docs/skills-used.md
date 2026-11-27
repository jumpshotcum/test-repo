# Jejak skill: bagaimana Kasku dibangun

Kasku dibuat dengan memakai skill/plugin Claude Code yang terinstall sebagai alat kerja. Sekitar 250 skill terinstall, dan banyak yang bidangnya sangat spesifik (hibah NIH, CMMC, alat medis, Unreal Engine). Yang dipakai hanya skill yang **relevan dengan project ini**. Setiap baris di bawah menunjuk ke hasil nyata di repo.

| # | Skill | Dipakai untuk | Hasil yang mengubah keputusan | Artefak |
|---|---|---|---|---|
| 1 | **roast** | Uji ide: panel 5 sudut pandang + verdict | Skor 3,15/10 → **KILL** untuk langganan, dibentuk ulang jadi alat kasbon gratis | `docs/strategy/verdict.md` |
| 2 | **research-ops-skills: market-research** | TAM/SAM/SOM top-down vs bottom-up | Triangulasi gagal (selisih 81%), jadi tidak ada angka TAM yang dikutip | `docs/research/market.json` |
| 3 | **agile-product-owner** | Epic, user story INVEST, Given-When-Then | Janji "2 ketukan" dan backup jadi Critical | `docs/product/backlog.md` |
| 4 | **design: ux-copy** | Semua teks UI (tombol, error, empty state, template WA) | Pesan error = apa yang terjadi + cara memperbaiki | `app/locales/id.js` |
| 5 | **dataviz** | Grafik 7 hari: bentuk, tanda, tabel alternatif | Hijau/merah **gagal** uji buta warna, diganti biru/oranye yang lulus semua cek | `app/app.css`, `weekChart()` |
| 6 | **security-guidance** (hook) | Memblokir `innerHTML` | Semua UI dibangun dengan DOM API, kebal injeksi nama pelanggan | `app/js/main.js` |
| 7 | **pw** (Playwright) | Tes e2e desktop + mobile | Menemukan bug: quick-add tidak kembali ke daftar | `tests/e2e/` (32 tes) |
| 8 | **i18n-localization** | `locale_sync.py`, `hardcoded_strings.py` | 3 teks lolos dari `t()` (aria-label nav, skip link, tooltip grafik), sudah diperbaiki | `app/locales/*.js` |
| 9 | **a11y-audit** | Pemindai WCAG + cek kontras | `role=status` tanpa `aria-live` diperbaiki; 16/16 pasangan warna lulus AA | `app/index.html` |
| 10 | **design-qa** | Audit render di 320px/1280px, 3 layar | Fokus keyboard di grafik tak terlihat; input file tertutup → diperbaiki, hasil akhir CLEAN | `app/app.css` |
| 11 | **compliance-os: gdpr-audit-prep** | Enam pertanyaan DPO, disesuaikan ke UU PDP | Penilaian dampak (DPIA) tidak wajib; risiko utama = ketersediaan data, dimitigasi lewat backup | `docs/privacy.md` |
| 12 | **landing** | Halaman depan (hero, fitur, CTA, GSAP) | Validator lulus semua cek; animasi bersifat tambahan, halaman tetap utuh tanpa CDN | `index.html` |
| 13 | **aeo** | JSON-LD, FAQ, fakta bersumber, robots.txt | Skor 49 → 54. Dimensi *Experience* sengaja dibiarkan 0, tidak dikarang | `index.html`, `robots.txt` |
| 14 | **linkedin: linkedin-content** | Post peluncuran + linter | 96/100 SHIP, tanpa angka atau pengguna fiktif | `docs/launch/linkedin-post.md` |
| 15 | **video-content-strategist** | Naskah Reels/Shorts 30 detik + takarir | Satu ide per video: menagih tanpa canggung | `docs/launch/video-script.md` |
| 16 | **docker-development** | Dockerfile nginx non-root + CSP | Analyzer 100/100; CSP diuji di browser tanpa pelanggaran | `Dockerfile`, `deploy/nginx.conf` |
| 17 | **karpathy-coder** | Pemeriksa kompleksitas | Duplikasi tampilan error → helper `showFieldError()` | `app/js/main.js` |
| 18 | **code-tour** | Tur onboarding 12 langkah, baris diverifikasi | — | `.tours/new-joiner-kasku.tour` |
| 19 | **readme-polish** | README + lint gate | Badge hanya untuk yang benar-benar ada; batasan ditulis jujur | `README.md` |
| 20 | **security-review** | Review keamanan seluruh perubahan | Lihat bagian di bawah | — |
| 21 | **commit-craft** | Rencana commit + pemindaian rahasia | — | riwayat git |

## Yang sengaja tidak dipakai
- **Skill domain lain:** hibah NIH, paten, CMMC, DORA, NIS2, CRA, ISO 13485/FDA, Unreal Engine, Kubernetes, Helm, dan tutor Deep Learning. Tidak relevan untuk alat kasbon warung.
- **pricing-strategist / deal-desk:** verdict menghapus model berbayar, jadi tidak ada harga untuk dirancang.
- **Konektor data** (Amplitude, BigQuery, Figma, Slack, Notion, dll.): gagal terhubung di sesi ini, dan Kasku memang tidak memakai analitik.
