# Katalog Skill

Direktori web interaktif untuk semua **plugin, skill, agent, dan command** Claude Code yang terinstall. Bisa dicari, difilter per kategori dan jenis, dan setiap perintah bisa disalin dengan satu klik.

| Plugin | Skill | Agent | Command |
|-------:|------:|------:|--------:|
| 106 | 246 | 94 | 132 |

> Angka di atas diambil saat katalog terakhir dibuat. Sumber kebenarannya adalah `data/catalog.json`.

## Fitur

- **Pencarian teks penuh** di nama dan deskripsi plugin maupun item di dalamnya, dengan kata yang cocok di-highlight. Tekan <kbd>/</kbd> untuk langsung ke kotak pencarian.
- **Filter** per jenis (skill / agent / command) dan 13 kategori, plus pengurutan (nama, jumlah item, kategori).
- **Panel detail** per plugin: daftar lengkap skill, agent, dan command, masing-masing dengan tombol salin perintah (mis. `/pw:fix`, `/commit-craft:commit-craft`).
- **URL bisa dibagikan**: pencarian, filter, dan panel yang terbuka tersimpan di hash URL.
- **Tema terang/gelap** (ikut sistem, bisa diganti manual), responsif sampai lebar 320px, bisa dipakai penuh dengan keyboard.

## Menjalankan secara lokal

Tidak ada langkah build. Situs ini cuma HTML, CSS, dan JavaScript biasa, tapi harus dibuka lewat server, karena `fetch()` tidak jalan di `file://`.

```bash
python3 -m http.server 8000
```

Lalu buka http://localhost:8000.

## Memperbarui katalog

`scripts/extract_catalog.py` membaca front-matter `SKILL.md`, file agent/command, dan `plugin.json` dari setiap plugin terinstall, lalu menulis `data/catalog.json`. Yang disimpan hanya metadata publik (nama, deskripsi, versi, jumlah). Path lokal tidak ikut disimpan.

```bash
npm run catalog
```

Pemetaan plugin ke kategori ada di `scripts/categories.json`. Plugin baru yang belum dipetakan akan masuk ke kategori **Other**.

## Tes

Tes end-to-end memakai Playwright dan dijalankan di viewport desktop dan mobile.

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm test
```

## Deploy

`.github/workflows/pages.yml` menjalankan tes di setiap push dan pull request, lalu men-deploy situs ke GitHub Pages saat ada push ke `main`. Aktifkan sekali di **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Struktur

```
index.html              markup halaman
styles.css              token desain (terang/gelap) dan layout
app.js                  pencarian, filter, panel detail, state di URL
data/catalog.json       data katalog hasil generate
scripts/                extractor dan pemetaan kategori
tests/                  tes Playwright
```

## Kualitas

Sebelum rilis, halaman ini diperiksa dengan plugin yang ada di katalognya sendiri:

- **design-qa**: audit halaman hasil render di lebar 320px dan 1280px. Hasilnya 0 blocker dan 0 high.
- **a11y-audit**: pengecekan kontras WCAG 2.2. Semua pasangan warna teks lolos AA di tema terang dan gelap.
- **pw** (Playwright): 16 tes end-to-end.
- **security-guidance**: semua rendering memakai DOM API yang aman. Tidak ada `innerHTML`.
