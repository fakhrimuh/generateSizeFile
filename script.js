const form = document.getElementById("fileForm");
const statusEl = document.getElementById("status");
const generateBtn = document.getElementById("generateBtn");
const fileSizeInput = document.getElementById("fileSize");
const unitSelect = document.getElementById("unit");
const boundaryInput = document.getElementById("boundaryMode");

// Jeda antar unduhan agar browser tidak memblokir unduhan beruntun.
const DOWNLOAD_DELAY_MS = 400;

function targetBytes() {
  const value = parseFloat(fileSizeInput.value);
  if (!value || value <= 0) return null;
  return unitSelect.value === "kb"
    ? Math.round(value * 1024)
    : Math.round(value * 1024 * 1024);
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const fileType = document.querySelector('input[name="fileType"]:checked').value;
  const targetSizeBytes = targetBytes();
  const type = FILE_TYPES[fileType];

  if (!targetSizeBytes) {
    return setStatus("Enter a valid file size.", "err");
  }
  if (!type) {
    return setStatus("Unsupported file type.", "err");
  }

  const variants = boundaryInput.checked
    ? [
        { suffix: "_minus1", bytes: targetSizeBytes - 1 },
        { suffix: "_exact", bytes: targetSizeBytes },
        { suffix: "_plus1", bytes: targetSizeBytes + 1 },
      ]
    : [{ suffix: "", bytes: targetSizeBytes }];

  generateBtn.disabled = true;
  setStatus("Generating file…");

  const done = [];
  const failed = [];

  for (const [index, variant] of variants.entries()) {
    const fileName = `generated_file${variant.suffix}.${type.ext}`;
    try {
      if (variant.bytes < 1) throw new Error("Size must be at least 1 byte.");
      const blob = await type.build(variant.bytes);
      if (blob.size !== variant.bytes) {
        throw new Error(
          `Generated size (${blob.size.toLocaleString("en-US")} bytes) does not match the target.`
        );
      }
      if (index > 0) await sleep(DOWNLOAD_DELAY_MS);
      downloadFile(blob, fileName);
      done.push(`${fileName} — ${blob.size.toLocaleString("en-US")} bytes`);
    } catch (err) {
      failed.push(`${fileName}: ${err.message}`);
    }
  }

  generateBtn.disabled = false;

  if (failed.length === 0) {
    setStatus(
      done.length === 1
        ? `Done! ${done[0]} downloaded.`
        : `Done! ${done.length} files downloaded:\n${done.join("\n")}`,
      "ok"
    );
  } else if (done.length === 0) {
    setStatus(failed.join("\n"), "err");
  } else {
    setStatus(
      `${done.length} files downloaded:\n${done.join("\n")}\n\nFailed:\n${failed.join("\n")}`,
      "err"
    );
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  // Beri waktu browser memulai unduhan sebelum URL dicabut.
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}
