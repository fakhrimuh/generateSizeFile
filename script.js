const form = document.getElementById("fileForm");
const statusEl = document.getElementById("status");
const generateBtn = document.getElementById("generateBtn");
const fileSizeInput = document.getElementById("fileSize");
const unitSelect = document.getElementById("unit");
const byteHint = document.getElementById("byteHint");

function targetBytes() {
  const value = parseFloat(fileSizeInput.value);
  if (!value || value <= 0) return null;
  return unitSelect.value === "kb"
    ? Math.round(value * 1024)
    : Math.round(value * 1024 * 1024);
}

function updateByteHint() {
  const bytes = targetBytes();
  byteHint.textContent = bytes
    ? `= ${bytes.toLocaleString("id-ID")} byte`
    : "";
}

fileSizeInput.addEventListener("input", updateByteHint);
unitSelect.addEventListener("change", updateByteHint);

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const fileType = document.querySelector('input[name="fileType"]:checked').value;
  const targetSizeBytes = targetBytes();

  if (!targetSizeBytes) {
    return setStatus("Masukkan ukuran file yang valid.", "err");
  }

  generateBtn.disabled = true;
  setStatus("Membuat file…");

  try {
    let blob, fileName;

    switch (fileType) {
      case "txt":
        blob = generateTXT(targetSizeBytes);
        fileName = "generated_file.txt";
        break;
      case "pdf":
        blob = generatePDF(targetSizeBytes);
        fileName = "generated_file.pdf";
        break;
      case "png":
        blob = await generatePNG(targetSizeBytes);
        fileName = "generated_file.png";
        break;
      case "jpg":
        blob = await generateJPG(targetSizeBytes);
        fileName = "generated_file.jpg";
        break;
      default:
        throw new Error("Tipe file tidak didukung.");
    }

    downloadFile(blob, fileName);
    const exact = blob.size === targetSizeBytes ? "" : " (mendekati)";
    setStatus(
      `Berhasil! ${fileName} — ${blob.size.toLocaleString("id-ID")} byte${exact} diunduh.`,
      "ok"
    );
  } catch (err) {
    setStatus(err.message, "err");
  } finally {
    generateBtn.disabled = false;
  }
});

/* ---------- TXT ---------- */
function generateTXT(targetSize) {
  const header = "File ini dibuat dengan File Size Generator.\n";
  const encoder = new TextEncoder();
  const headerLen = encoder.encode(header).length;

  if (headerLen > targetSize) {
    // Untuk ukuran sangat kecil, isi dengan padding saja.
    return new Blob([buildPadding(targetSize)], { type: "text/plain" });
  }
  const content = header + buildPadding(targetSize - headerLen);
  return new Blob([content], { type: "text/plain" });
}

function buildPadding(byteCount) {
  // Karakter ASCII "0" = 1 byte, jadi panjang string == jumlah byte.
  return "0".repeat(Math.max(0, byteCount));
}

/* ---------- PDF ---------- */
function generatePDF(targetSize) {
  const base = buildMinimalPDF("");
  const encoder = new TextEncoder();
  const baseLen = encoder.encode(base).length;

  if (targetSize < baseLen) {
    throw new Error(
      `Ukuran terlalu kecil untuk PDF. Minimal ${formatBytes(baseLen)}.`
    );
  }
  const content = buildMinimalPDF(buildPadding(targetSize - baseLen));
  // Semua karakter ASCII sehingga 1 char = 1 byte, ukuran tepat sesuai target.
  return new Blob([content], { type: "application/pdf" });
}

function buildMinimalPDF(padding) {
  const content = `BT /F1 12 Tf 72 720 Td (File Size Generator) Tj ET\n${padding}`;
  const encoder = new TextEncoder();
  const streamLen = encoder.encode(content).length;

  return (
    `%PDF-1.4\n` +
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n` +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n` +
    `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n` +
    `trailer\n<< /Root 1 0 R >>\n%%EOF`
  );
}

/* ---------- PNG ---------- */
async function generatePNG(targetSize) {
  const base = new Uint8Array(await tinyImageBytes("image/png"));
  const gap = targetSize - base.length;

  if (gap < 0) {
    throw new Error(
      `Ukuran terlalu kecil untuk PNG. Minimal ${formatBytes(base.length)}.`
    );
  }
  if (gap === 0) return new Blob([base], { type: "image/png" });
  if (gap < 14) {
    throw new Error(
      `Ukuran terlalu kecil. Minimal ${formatBytes(base.length + 14)} untuk PNG.`
    );
  }

  // Sisipkan chunk tEXt (padding) tepat sebelum chunk IEND agar PNG tetap valid.
  const textChunk = buildPngTextChunk(gap); // panjang total == gap
  const iendStart = base.length - 12; // 12 byte terakhir = chunk IEND

  const out = new Uint8Array(targetSize);
  out.set(base.subarray(0, iendStart), 0);
  out.set(textChunk, iendStart);
  out.set(base.subarray(iendStart), iendStart + textChunk.length);

  return new Blob([out], { type: "image/png" });
}

function buildPngTextChunk(totalBytes) {
  // Struktur chunk: length(4) + "tEXt"(4) + data + crc(4) = 12 + data
  const dataLen = totalBytes - 12;
  const data = new Uint8Array(dataLen);
  data[0] = 0x43; // keyword "C"
  data[1] = 0x00; // null separator
  data.fill(0x20, 2); // spasi sebagai padding teks

  const type = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"
  const crcInput = new Uint8Array(type.length + data.length);
  crcInput.set(type, 0);
  crcInput.set(data, type.length);
  const crc = crc32(crcInput);

  const chunk = new Uint8Array(totalBytes);
  writeUint32(chunk, 0, dataLen);
  chunk.set(type, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc);
  return chunk;
}

/* ---------- JPG ---------- */
async function generateJPG(targetSize) {
  const base = new Uint8Array(await tinyImageBytes("image/jpeg", 0.92));
  const gap = targetSize - base.length;

  if (gap < 0) {
    throw new Error(
      `Ukuran terlalu kecil untuk JPG. Minimal ${formatBytes(base.length)}.`
    );
  }
  if (gap === 0) return new Blob([base], { type: "image/jpeg" });
  if (gap < 4) {
    throw new Error(
      `Ukuran terlalu kecil. Minimal ${formatBytes(base.length + 4)} untuk JPG.`
    );
  }

  // Sisipkan segmen COM (0xFFFE) setelah marker SOI (0xFFD8) untuk padding.
  const segments = buildJpegComSegments(gap); // total panjang == gap
  const out = new Uint8Array(targetSize);
  out.set(base.subarray(0, 2), 0); // SOI
  out.set(segments, 2);
  out.set(base.subarray(2), 2 + segments.length);

  return new Blob([out], { type: "image/jpeg" });
}

function buildJpegComSegments(totalBytes) {
  const MAX_SEG = 65537; // 4 byte overhead + 65533 byte data
  const MIN_SEG = 4;
  const sizes = [];
  let remaining = totalBytes;

  while (remaining > 0) {
    let seg;
    if (remaining <= MAX_SEG) {
      seg = remaining;
    } else if (remaining - MAX_SEG < MIN_SEG) {
      seg = remaining - MIN_SEG; // pastikan segmen terakhir tetap valid
    } else {
      seg = MAX_SEG;
    }
    sizes.push(seg);
    remaining -= seg;
  }

  const out = new Uint8Array(totalBytes);
  let offset = 0;
  for (const seg of sizes) {
    const length = seg - 2; // field length JPEG termasuk 2 byte length itu sendiri
    out[offset] = 0xff;
    out[offset + 1] = 0xfe; // marker COM
    out[offset + 2] = (length >> 8) & 0xff;
    out[offset + 3] = length & 0xff;
    out.fill(0x20, offset + 4, offset + seg);
    offset += seg;
  }
  return out;
}

/* ---------- Helpers ---------- */
function tinyImageBytes(mimeType, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#6366f1";
    ctx.fillRect(0, 0, 1, 1);
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Gagal membuat gambar."));
        blob.arrayBuffer().then(resolve, reject);
      },
      mimeType,
      quality
    );
  });
}

function writeUint32(arr, offset, value) {
  arr[offset] = (value >>> 24) & 0xff;
  arr[offset + 1] = (value >>> 16) & 0xff;
  arr[offset + 2] = (value >>> 8) & 0xff;
  arr[offset + 3] = value & 0xff;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function downloadFile(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
