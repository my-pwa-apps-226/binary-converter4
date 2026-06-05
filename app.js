const sourceText = document.querySelector("#source-text");
const outputText = document.querySelector("#output-text");
const encodingMode = document.querySelector("#encoding-mode");
const separatorMode = document.querySelector("#separator-mode");
const textToBinaryButton = document.querySelector("#text-to-binary");
const binaryToTextButton = document.querySelector("#binary-to-text");
const clearButton = document.querySelector("#clear-input");
const copyButton = document.querySelector("#copy-output");
const downloadButton = document.querySelector("#download-output");
const installButton = document.querySelector("#install-app");
const charCount = document.querySelector("#char-count");
const byteCount = document.querySelector("#byte-count");
const bitCount = document.querySelector("#bit-count");
const toast = document.querySelector("#toast");
const canvas = document.querySelector("#bit-canvas");
const ctx = canvas.getContext("2d");

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: false });

let direction = "text-to-binary";
let toastTimer = 0;
let deferredInstallPrompt = null;

const sample = "こんにちは Codex 101";
sourceText.value = sample;

function toBinary(value, width) {
  return value.toString(2).padStart(width, "0");
}

function separatorValue() {
  if (separatorMode.value === "none") return "";
  if (separatorMode.value === "newline") return "\n";
  return " ";
}

function textToBinary(text) {
  const separator = separatorValue();

  if (encodingMode.value === "codepoint") {
    return Array.from(text)
      .map((char) => toBinary(char.codePointAt(0), 21))
      .join(separator);
  }

  return Array.from(textEncoder.encode(text))
    .map((byte) => toBinary(byte, 8))
    .join(separator);
}

function binaryToText(binary) {
  const chunks = extractBinaryChunks(binary);

  if (encodingMode.value === "codepoint") {
    return chunks
      .map((chunk) => {
        const point = Number.parseInt(chunk, 2);
        if (!Number.isFinite(point) || point < 0 || point > 0x10ffff) return "\uFFFD";
        try {
          return String.fromCodePoint(point);
        } catch {
          return "\uFFFD";
        }
      })
      .join("");
  }

  const bytes = chunks.map((chunk) => Number.parseInt(chunk, 2) & 0xff);
  return textDecoder.decode(new Uint8Array(bytes));
}

function extractBinaryChunks(value) {
  const compact = value.replace(/[^01]/g, "");
  const width = encodingMode.value === "codepoint" ? 21 : 8;

  if (/\s/.test(value.trim())) {
    return value
      .trim()
      .split(/\s+/)
      .filter((chunk) => /^[01]+$/.test(chunk));
  }

  const chunks = [];
  for (let i = 0; i < compact.length; i += width) {
    const chunk = compact.slice(i, i + width);
    if (chunk.length === width) chunks.push(chunk);
  }
  return chunks;
}

function updateTabs() {
  const isTextToBinary = direction === "text-to-binary";
  textToBinaryButton.classList.toggle("active", isTextToBinary);
  binaryToTextButton.classList.toggle("active", !isTextToBinary);
  textToBinaryButton.setAttribute("aria-selected", String(isTextToBinary));
  binaryToTextButton.setAttribute("aria-selected", String(!isTextToBinary));
  sourceText.placeholder = isTextToBinary ? "ここに文字を入力" : "01001000 01101001";
  outputText.placeholder = isTextToBinary ? "変換結果" : "復元された文字";
}

function updateCounts(source, output) {
  const bytes = textEncoder.encode(direction === "text-to-binary" ? source : output);
  const bits = direction === "text-to-binary"
    ? output.replace(/[^01]/g, "").length
    : source.replace(/[^01]/g, "").length;

  charCount.textContent = `${Array.from(direction === "text-to-binary" ? source : output).length} chars`;
  byteCount.textContent = `${bytes.length} bytes`;
  bitCount.textContent = `${bits} bits`;
}

function convert() {
  const source = sourceText.value;
  const output = direction === "text-to-binary" ? textToBinary(source) : binaryToText(source);
  outputText.value = output;
  updateCounts(source, output);
  drawBits(direction === "text-to-binary" ? output : source);
}

function drawBits(value) {
  const bits = value.replace(/[^01]/g, "").slice(0, 320);
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, rect.width, rect.height);

  const cell = 14;
  const gap = 4;
  const cols = Math.max(1, Math.floor((rect.width - 8) / (cell + gap)));
  const startX = 4;
  const startY = 14;

  bits.split("").forEach((bit, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cell + gap);
    const y = startY + row * (cell + gap);
    if (y + cell > rect.height - 16) return;

    ctx.fillStyle = bit === "1" ? "#2367d1" : "#d9e0e8";
    ctx.fillRect(x, y, cell, cell);
    if (bit === "1") {
      ctx.fillStyle = "rgba(29, 143, 104, 0.85)";
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
    }
  });

  ctx.fillStyle = "#687386";
  ctx.font = "12px Segoe UI, sans-serif";
  const label = bits.length ? `${bits.length} displayed bits` : "0 displayed bits";
  ctx.fillText(label, 4, rect.height - 5);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1500);
}

textToBinaryButton.addEventListener("click", () => {
  if (direction === "text-to-binary") return;
  direction = "text-to-binary";
  sourceText.value = outputText.value;
  updateTabs();
  convert();
});

binaryToTextButton.addEventListener("click", () => {
  if (direction === "binary-to-text") return;
  direction = "binary-to-text";
  sourceText.value = outputText.value;
  updateTabs();
  convert();
});

sourceText.addEventListener("input", convert);
encodingMode.addEventListener("change", convert);
separatorMode.addEventListener("change", convert);
window.addEventListener("resize", convert);

clearButton.addEventListener("click", () => {
  sourceText.value = "";
  convert();
  sourceText.focus();
});

copyButton.addEventListener("click", async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(outputText.value);
    } else {
      outputText.select();
      document.execCommand("copy");
      window.getSelection()?.removeAllRanges();
    }
    showToast("Copied");
  } catch {
    outputText.select();
    showToast("Select copied text");
  }
});

downloadButton.addEventListener("click", () => {
  const blob = new Blob([outputText.value], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = direction === "text-to-binary" ? "binary-output.txt" : "text-output.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Saved");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  showToast("Installed");
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      showToast("Offline setup failed");
    });
  });
}

updateTabs();
convert();
