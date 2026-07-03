const BACKEND_URL = "http://localhost:8000";
const KEY_STORAGE_NAME = "viral_slicer_gemini_key";

const keyModal = document.getElementById("key-modal");
const keyInput = document.getElementById("key-input");
const keySaveBtn = document.getElementById("key-save-btn");
const changeKeyBtn = document.getElementById("change-key-btn");

const videoUrlInput = document.getElementById("video-url");
const analyzeBtn = document.getElementById("analyze-btn");
const analyzeBtnText = document.getElementById("analyze-btn-text");
const statusText = document.getElementById("status-text");

const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const resultsEl = document.getElementById("results");

function getStoredKey() {
  return sessionStorage.getItem(KEY_STORAGE_NAME) || "";
}

function setStoredKey(key) {
  sessionStorage.setItem(KEY_STORAGE_NAME, key);
}

function showKeyModal() {
  keyModal.classList.remove("hidden");
  keyModal.classList.add("flex");
}

function hideKeyModal() {
  keyModal.classList.add("hidden");
  keyModal.classList.remove("flex");
}

function ensureKeyPresent() {
  if (!getStoredKey()) {
    showKeyModal();
  }
}

keySaveBtn.addEventListener("click", () => {
  const val = keyInput.value.trim();
  if (!val) return;
  setStoredKey(val);
  keyInput.value = "";
  hideKeyModal();
  statusText.textContent = "Key saved for this session.";
});

changeKeyBtn.addEventListener("click", () => {
  showKeyModal();
});

function setLoading(isLoading) {
  loadingState.classList.toggle("hidden", !isLoading);
  analyzeBtn.disabled = isLoading;
  analyzeBtnText.textContent = isLoading ? "Slicing..." : "Slice It";
}

function showError(message) {
  errorState.textContent = message;
  errorState.classList.remove("hidden");
}

function clearError() {
  errorState.classList.add("hidden");
  errorState.textContent = "";
}

function renderSegments(segments) {
  resultsEl.innerHTML = "";
  if (!segments.length) {
    resultsEl.innerHTML = `<p class="text-zinc-500 text-sm text-center py-6">No segments returned.</p>`;
    return;
  }

  segments
    .sort((a, b) => b.hook_score - a.hook_score)
    .forEach((seg, i) => {
      const card = document.createElement("div");
      card.className = "bg-zinc-900/60 neon-border rounded-xl p-4 fade-in";
      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-mono text-cyan-400">${seg.start_time} → ${seg.end_time}</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Hook ${seg.hook_score}/100
          </span>
        </div>
        <p class="text-sm text-zinc-300 leading-relaxed">${seg.retention_reason}</p>
      `;
      resultsEl.appendChild(card);
    });
}

async function analyze() {
  clearError();
  resultsEl.innerHTML = "";

  const videoUrl = videoUrlInput.value.trim();
  if (!videoUrl) {
    showError("Paste a video URL first.");
    return;
  }

  const apiKey = getStoredKey();
  if (!apiKey) {
    showKeyModal();
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: videoUrl,
        gemini_api_key: apiKey,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Something went wrong on the backend.");
    }

    renderSegments(data.segments || []);
    statusText.textContent = `Found ${data.segments.length} segments.`;
  } catch (err) {
    showError(err.message || "Request failed. Is the backend running?");
  } finally {
    setLoading(false);
  }
}

analyzeBtn.addEventListener("click", analyze);
videoUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") analyze();
});

ensureKeyPresent();
