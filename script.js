document
  .getElementById("fileForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    // Ambil input dari form
    const fileSize = parseFloat(document.getElementById("fileSize").value);
    const unit = document.getElementById("unit").value; // Satuan (KB atau MB)
    const fileType = document.getElementById("fileType").value;

    // Konversi ukuran file ke byte
    let targetSizeBytes =
      unit === "kb"
        ? Math.round(fileSize * 1024)
        : Math.round(fileSize * 1024 * 1024);

    // Pesan utama
    const message = `File ini berisikan ${fileSize} ${unit.toUpperCase()}\n`;
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message).length; // Ukuran pesan dalam byte

    // Validasi ukuran file
    if (messageBytes > targetSizeBytes) {
      alert("Ukuran pesan lebih besar dari ukuran file yang diminta!");
      return;
    }

    // Buat dummy content untuk memenuhi ukuran
    let dummyContentSize = targetSizeBytes - messageBytes;
    let dummyContent = "0".repeat(dummyContentSize);
    let finalFileSize = encoder.encode(message + dummyContent).length;

    while (finalFileSize > targetSizeBytes) {
      dummyContentSize--;
      dummyContent = "0".repeat(dummyContentSize);
      finalFileSize = encoder.encode(message + dummyContent).length;
    }

    // Generate file berdasarkan tipe
    if (fileType === "pdf") {
      const pdfData = createMinimalPDF(message + dummyContent);
      const blob = new Blob([pdfData], { type: "application/pdf" });
      downloadFile(blob, "generated_file.pdf");
    } else {
      alert("File type not supported in this process!");
    }
  });

// Fungsi untuk membuat PDF minimal
function createMinimalPDF(content) {
  const encoder = new TextEncoder();
  const encodedContent = encoder.encode(content);

  // Struktur dasar PDF
  const pdfHeader = `%PDF-1.4\n`;
  const pdfCatalog = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const pdfPages = `2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n`;
  const pdfPage = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n`;

  // Konten halaman (stream data)
  const pdfContentStream = `4 0 obj\n<< /Length ${encodedContent.length} >>\nstream\n${content}\nendstream\nendobj\n`;

  // Trailer PDF
  const pdfTrailer = `xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000211 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n311\n%%EOF`;

  return (
    pdfHeader + pdfCatalog + pdfPages + pdfPage + pdfContentStream + pdfTrailer
  );
}

// Fungsi untuk mengunduh file
function downloadFile(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
