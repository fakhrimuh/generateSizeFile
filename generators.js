/* ---------- Registry tipe file ---------- */
// Tiap generator menerima ukuran target (byte) dan mengembalikan Blob
// (atau Promise<Blob>) dengan ukuran persis sama dengan target.
const FILE_TYPES = {
  txt: { ext: "txt", build: generateTXT },
  csv: { ext: "csv", build: generateCSV },
  json: { ext: "json", build: generateJSON },
  pdf: { ext: "pdf", build: generatePDF },
  png: { ext: "png", build: generatePNG },
  jpg: { ext: "jpg", build: generateJPG },
  gif: { ext: "gif", build: generateGIF },
  zip: { ext: "zip", build: generateZIP },
  docx: { ext: "docx", build: generateDOCX },
  xlsx: { ext: "xlsx", build: generateXLSX },
};

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

/* ---------- CSV ---------- */
function generateCSV(targetSize) {
  const header = textBytes("data\n");
  if (targetSize < header.length) {
    return new Blob([lineFill(targetSize)], { type: "text/csv" });
  }
  return new Blob([header, lineFill(targetSize - header.length)], {
    type: "text/csv",
  });
}

/* ---------- JSON ---------- */
function generateJSON(targetSize) {
  const prefix = textBytes('{"generator":"File Size Generator","padding":"');
  const suffix = textBytes('"}');
  const minSize = prefix.length + suffix.length;

  if (targetSize < minSize) {
    throw new Error(
      `Ukuran terlalu kecil untuk JSON. Minimal ${formatBytes(minSize)}.`
    );
  }
  const padding = new Uint8Array(targetSize - minSize).fill(0x30);
  return new Blob([prefix, padding, suffix], { type: "application/json" });
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
  // Semua karakter ASCII sehingga 1 char = 1 byte. Nilai /Length ikut memanjang
  // saat jumlah digitnya bertambah, jadi padding dikoreksi sampai ukuran pas.
  let padding = targetSize - baseLen;
  for (let attempt = 0; attempt < 4; attempt++) {
    const content = buildMinimalPDF(buildPadding(padding));
    const diff = encoder.encode(content).length - targetSize;
    if (diff === 0) return new Blob([content], { type: "application/pdf" });
    padding -= diff;
    if (padding < 0) break;
  }
  throw new Error("Ukuran ini tidak bisa dicapai persis untuk PDF. Coba ukuran lain.");
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

/* ---------- GIF ---------- */
// GIF 1×1 piksel (43 byte): header, logical screen, palet 2 warna,
// graphic control, image descriptor, data LZW, lalu trailer 0x3B.
const GIF_BASE = hexToBytes(
  "47494638396101000100800000" + // "GIF89a" + layar 1×1 + flag palet
    "4f46e5ffffff" + // palet: indigo & putih
    "21f90400000000" + // graphic control extension
    "002c00000000010001000002024401" + // image descriptor + data LZW
    "00" + // akhir data gambar
    "3b" // trailer
);

function generateGIF(targetSize) {
  const gap = targetSize - GIF_BASE.length;

  if (gap < 0) {
    throw new Error(
      `Ukuran terlalu kecil untuk GIF. Minimal ${formatBytes(GIF_BASE.length)}.`
    );
  }
  if (gap === 0) return new Blob([GIF_BASE], { type: "image/gif" });
  // Comment extension: 0x21 0xFE, sub-blok (1 byte panjang + data), terminator 0x00.
  // Ukuran terkecil 3 byte (kosong); 1, 2, dan 4 byte tidak bisa dibentuk.
  if (gap === 1 || gap === 2 || gap === 4) {
    throw new Error(
      "Ukuran ini tidak bisa dicapai persis untuk GIF. Coba ukuran lain."
    );
  }

  const comment = buildGifComment(gap);
  const trailerAt = GIF_BASE.length - 1;
  const out = new Uint8Array(targetSize);
  out.set(GIF_BASE.subarray(0, trailerAt), 0);
  out.set(comment, trailerAt);
  out[targetSize - 1] = 0x3b;
  return new Blob([out], { type: "image/gif" });
}

function buildGifComment(totalBytes) {
  // total = 2 (0x21 0xFE) + k data + m sub-blok (1 byte panjang tiap blok) + 1 terminator
  const n = totalBytes - 3; // k + m
  const m = Math.max(1, Math.ceil(n / 256));
  const k = n - m; // m <= k <= 255*m, kecuali totalBytes == 3 (k = 0)

  const out = new Uint8Array(totalBytes);
  out[0] = 0x21;
  out[1] = 0xfe;
  if (totalBytes === 3) return out; // komentar kosong: hanya terminator 0x00

  const base = Math.floor(k / m);
  const extra = k % m;
  let offset = 2;
  for (let i = 0; i < m; i++) {
    const len = base + (i < extra ? 1 : 0);
    out[offset++] = len;
    out.fill(0x20, offset, offset + len);
    offset += len;
  }
  out[offset] = 0x00; // terminator
  return out;
}

/* ---------- ZIP / DOCX / XLSX ---------- */
function generateZIP(targetSize) {
  const name = "padding.txt";
  const base = buildZip([{ name, data: new Uint8Array(0) }]).length;

  if (targetSize < base) {
    throw new Error(
      `Ukuran terlalu kecil untuk ZIP. Minimal ${formatBytes(base)}.`
    );
  }
  const data = lineFill(targetSize - base);
  return new Blob([buildZip([{ name, data }])], { type: "application/zip" });
}

const OFFICE_XML_HEADER =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function generateDOCX(targetSize) {
  const parts = [
    {
      name: "[Content_Types].xml",
      text:
        OFFICE_XML_HEADER +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      text:
        OFFICE_XML_HEADER +
        `<Relationships xmlns="${REL_NS}">` +
        `<Relationship Id="rId1" Type="${DOC_REL}/officeDocument" Target="word/document.xml"/>` +
        "</Relationships>",
    },
    {
      name: "word/document.xml",
      text:
        OFFICE_XML_HEADER +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        "<w:body><w:p><w:r><w:t>File Size Generator</w:t></w:r></w:p></w:body>" +
        "</w:document>",
      padded: true,
    },
  ];
  return buildOfficeBlob(parts, targetSize, "DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

function generateXLSX(targetSize) {
  const parts = [
    {
      name: "[Content_Types].xml",
      text:
        OFFICE_XML_HEADER +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      text:
        OFFICE_XML_HEADER +
        `<Relationships xmlns="${REL_NS}">` +
        `<Relationship Id="rId1" Type="${DOC_REL}/officeDocument" Target="xl/workbook.xml"/>` +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      text:
        OFFICE_XML_HEADER +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${DOC_REL}">` +
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' +
        "</workbook>",
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text:
        OFFICE_XML_HEADER +
        `<Relationships xmlns="${REL_NS}">` +
        `<Relationship Id="rId1" Type="${DOC_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
        "</Relationships>",
    },
    {
      name: "xl/worksheets/sheet1.xml",
      text:
        OFFICE_XML_HEADER +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>File Size Generator</t></is></c></row></sheetData>' +
        "</worksheet>",
      padded: true,
    },
  ];
  return buildOfficeBlob(parts, targetSize, "XLSX", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

// Padding berupa spasi/newline setelah elemen root XML — sah menurut spesifikasi XML
// dan diabaikan oleh Word/Excel. Part ditandai `padded: true`.
function buildOfficeBlob(parts, targetSize, label, mimeType) {
  const toEntries = (padBytes) =>
    parts.map((p) => {
      const data = textBytes(p.text);
      if (!p.padded) return { name: p.name, data };
      const out = new Uint8Array(data.length + padBytes);
      out.set(data, 0);
      out.fill(0x0a, data.length);
      return { name: p.name, data: out };
    });

  const base = buildZip(toEntries(0)).length;
  if (targetSize < base) {
    throw new Error(
      `Ukuran terlalu kecil untuk ${label}. Minimal ${formatBytes(base)}.`
    );
  }
  return new Blob([buildZip(toEntries(targetSize - base))], { type: mimeType });
}

// ZIP tanpa kompresi (method 0 / stored) sehingga ukuran bisa dihitung persis.
function buildZip(entries) {
  const files = entries.map((e) => ({
    nameBytes: textBytes(e.name),
    data: e.data,
    crc: crc32(e.data),
  }));

  let localSize = 0;
  let centralSize = 0;
  for (const f of files) {
    localSize += 30 + f.nameBytes.length + f.data.length;
    centralSize += 46 + f.nameBytes.length;
  }
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  const DOS_DATE = 0x0021; // 1980-01-01, supaya hasil deterministik

  let offset = 0;
  const localOffsets = [];
  for (const f of files) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true); // versi minimum
    view.setUint16(offset + 6, 0, true); // flag
    view.setUint16(offset + 8, 0, true); // method: stored
    view.setUint16(offset + 10, 0, true); // waktu
    view.setUint16(offset + 12, DOS_DATE, true);
    view.setUint32(offset + 14, f.crc, true);
    view.setUint32(offset + 18, f.data.length, true);
    view.setUint32(offset + 22, f.data.length, true);
    view.setUint16(offset + 26, f.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true); // extra field
    out.set(f.nameBytes, offset + 30);
    out.set(f.data, offset + 30 + f.nameBytes.length);
    offset += 30 + f.nameBytes.length + f.data.length;
  }

  const centralStart = offset;
  files.forEach((f, i) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true); // dibuat oleh
    view.setUint16(offset + 6, 20, true); // versi minimum
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, DOS_DATE, true);
    view.setUint32(offset + 16, f.crc, true);
    view.setUint32(offset + 20, f.data.length, true);
    view.setUint32(offset + 24, f.data.length, true);
    view.setUint16(offset + 28, f.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // extra field
    view.setUint16(offset + 32, 0, true); // komentar
    view.setUint16(offset + 34, 0, true); // nomor disk
    view.setUint16(offset + 36, 0, true); // atribut internal
    view.setUint32(offset + 38, 0, true); // atribut eksternal
    view.setUint32(offset + 42, localOffsets[i], true);
    out.set(f.nameBytes, offset + 46);
    offset += 46 + f.nameBytes.length;
  });

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, files.length, true);
  view.setUint16(offset + 10, files.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true); // komentar
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

function textBytes(str) {
  return new TextEncoder().encode(str);
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// Teks "0" sepanjang `count` byte, dipecah per baris agar nyaman dibuka di editor.
function lineFill(count, lineLength = 80) {
  const out = new Uint8Array(count).fill(0x30);
  for (let i = lineLength - 1; i < count - 1; i += lineLength) out[i] = 0x0a;
  return out;
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

// Memungkinkan pengujian di Node tanpa mengganggu pemakaian di browser.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FILE_TYPES, formatBytes };
}
