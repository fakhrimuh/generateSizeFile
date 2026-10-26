# File Size Generator

**English** · [Bahasa Indonesia](#bahasa-indonesia)

Create dummy files with an **exact byte size** — handy for testing upload limits and file size validation. Runs entirely in the browser: no server, no dependencies, no build step.

## Features

- **10 file types:** TXT, CSV, JSON, PDF, PNG, JPG, GIF, ZIP, DOCX, XLSX.
- **Boundary mode:** creates 3 files at once — **−1 byte**, **exact**, **+1 byte** (suffixes `_minus1`, `_exact`, `_plus1`) to test limit validation.
- **Byte-exact and valid:** 100 KB → exactly 102,400 bytes, and the file still opens. Size is verified before download.

## Usage

1. Open [`index.html`](index.html) in a browser.
2. Enter a size (**KB** / **MB**) and pick a file type.
3. (Optional) Tick **Boundary mode**.
4. Click **Generate file**.

> **Units:** 1 KB = 1,024 bytes, 1 MB = 1,048,576 bytes. macOS Finder uses decimal (1 KB = 1,000), so 102,400 bytes shows as "102 KB". Use **Get Info** to see the real byte count.

## How it works

Padding is added until the target size is reached, without breaking the format:

| Type | Padding |
| ---- | ------- |
| TXT / CSV / JSON | Filler characters (JSON stays parseable) |
| PDF | Inside the content stream |
| PNG | `tEXt` chunk (valid CRC32) before `IEND` |
| JPG | `COM` segments after `SOI` |
| GIF | Comment Extension before the trailer |
| ZIP | Uncompressed archive with one `padding.txt` |
| DOCX / XLSX | Blank lines after the XML root element in an uncompressed Office package |

## Limitations

- Below each format's minimum size the app shows the required minimum instead of producing a broken file (e.g. JSON 48 B, GIF 43 B, ZIP 120 B, DOCX ~1.3 KB, XLSX ~2.3 KB).
- GIF cannot reach exactly 44, 45, or 47 bytes.
- PNG/JPG rely on the browser's `<canvas>` API.

---

# Bahasa Indonesia

Buat file dummy dengan **ukuran byte yang presisi** — berguna untuk menguji batas unggah (upload limit) dan validasi ukuran file. Berjalan sepenuhnya di browser: tanpa server, tanpa dependency, tanpa proses build.

## Fitur

- **10 tipe file:** TXT, CSV, JSON, PDF, PNG, JPG, GIF, ZIP, DOCX, XLSX.
- **Mode batas:** membuat 3 file sekaligus — **−1 byte**, **tepat**, **+1 byte** (akhiran `_minus1`, `_exact`, `_plus1`) untuk menguji validasi batas.
- **Presisi byte dan valid:** 100 KB → tepat 102.400 byte, dan file tetap bisa dibuka. Ukuran diverifikasi sebelum diunduh.

## Cara pakai

1. Buka [`index.html`](index.html) di browser.
2. Masukkan ukuran (**KB** / **MB**) dan pilih tipe file.
3. (Opsional) Centang **Mode batas**.
4. Klik **Generate file**.

> **Satuan:** 1 KB = 1.024 byte, 1 MB = 1.048.576 byte. Finder macOS memakai desimal (1 KB = 1.000), jadi 102.400 byte tampil sebagai "102 KB". Gunakan **Get Info** untuk melihat jumlah byte sebenarnya.

## Cara kerja

Padding ditambahkan sampai ukuran target tercapai, tanpa merusak format:

| Tipe | Padding |
| ---- | ------- |
| TXT / CSV / JSON | Karakter pengisi (JSON tetap bisa di-parse) |
| PDF | Di dalam content stream |
| PNG | Chunk `tEXt` (CRC32 valid) sebelum `IEND` |
| JPG | Segmen `COM` setelah `SOI` |
| GIF | Comment Extension sebelum trailer |
| ZIP | Arsip tanpa kompresi berisi satu `padding.txt` |
| DOCX / XLSX | Baris kosong setelah elemen root XML pada paket Office tanpa kompresi |

## Keterbatasan

- Di bawah ukuran minimum tiap format, aplikasi menampilkan ukuran minimum yang dibutuhkan alih-alih menghasilkan file rusak (mis. JSON 48 B, GIF 43 B, ZIP 120 B, DOCX ± 1,3 KB, XLSX ± 2,3 KB).
- GIF tidak bisa mencapai ukuran persis 44, 45, atau 47 byte.
- PNG/JPG bergantung pada API `<canvas>` browser.
