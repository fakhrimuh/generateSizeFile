# File Size Generator

Aplikasi web sederhana untuk membuat file dummy dengan **ukuran byte yang presisi**. Berguna untuk menguji batas unggah (upload limit), validasi ukuran file, atau kebutuhan pengujian lainnya.

Berjalan sepenuhnya di browser — tanpa server, tanpa dependency, dan tanpa proses build.

## Fitur

- **4 tipe file:** TXT, PDF, PNG, dan JPG.
- **Presisi byte:** ukuran file hasil persis sama dengan target (mis. 100 KB → tepat 102.400 byte).
- File gambar (PNG/JPG) dan PDF yang dihasilkan tetap **valid** dan bisa dibuka.
- Antarmuka terang & minimalis, responsif, tanpa framework.

## Cara pakai

1. Buka [`index.html`](index.html) langsung di browser (cukup klik dua kali, atau drag ke jendela browser).
2. Masukkan **ukuran file** dan pilih satuan (**KB** / **MB**).
3. Pilih **tipe file** (TXT / PDF / PNG / JPG).
4. Klik **Generate file** — file akan otomatis terunduh.

## Catatan tentang satuan ukuran

Aplikasi memakai definisi **biner**:

| Satuan | Jumlah byte |
| ------ | ----------- |
| 1 KB   | 1.024 byte  |
| 1 MB   | 1.048.576 byte |

> **Penting:** Finder di macOS menampilkan ukuran dengan basis **desimal** (1 KB = 1.000 byte), jadi file 102.400 byte akan terlihat sebagai "102 KB", bukan "100 KB". Untuk melihat jumlah byte yang sebenarnya, klik kanan file → **Get Info** dan lihat angka dalam tanda kurung. Aplikasi juga menampilkan jumlah byte persis di layar setelah file dibuat.

## Cara kerja

Setiap tipe file dibuat dengan menambahkan padding hingga mencapai ukuran target, tanpa merusak struktur format:

- **TXT** — teks header + padding karakter.
- **PDF** — PDF minimal yang valid, padding disisipkan di dalam content stream.
- **PNG** — gambar 1×1 dari `<canvas>`, lalu disisipkan chunk `tEXt` (dengan CRC32 yang benar) tepat sebelum chunk `IEND`.
- **JPG** — gambar 1×1 JPEG, disisipkan segmen `COM` (marker `0xFFFE`) setelah marker `SOI`; otomatis dipecah menjadi beberapa segmen jika padding melebihi ~64 KB.

## Struktur proyek

```
.
├── index.html   # Struktur halaman
├── style.css    # Tampilan (terang & minimalis)
├── script.js    # Logika pembuatan file
└── README.md
```

## Keterbatasan

- Untuk ukuran yang sangat kecil (lebih kecil dari overhead minimum format gambar/PDF), aplikasi menampilkan pesan berisi ukuran minimum yang dibutuhkan alih-alih menghasilkan file rusak.
- Pembuatan gambar mengandalkan API `<canvas>` browser, sehingga membutuhkan browser modern.
