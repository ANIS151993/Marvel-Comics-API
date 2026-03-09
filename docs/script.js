let input = document.getElementById("input-box");
let button = document.getElementById("submit-button");
let showContainer = document.getElementById("show-container");
let listContainer = document.getElementById("autocomplete-list");

let characters = [];
let currentCharacter = null;
let debounceTimer = null;

const BROWSE_LIMIT = 80; // max items shown when browsing (no search term)

// Load local JSON data
fetch("marvel_characters.json")
  .then((response) => response.json())
  .then((data) => {
    characters = data.sort((a, b) => a.name.localeCompare(b.name));
    const random = characters[Math.floor(Math.random() * characters.length)];
    input.value = random.name;
  });

function displayWords(value) {
  input.value = value;
  removeElements();
}

function removeElements() {
  listContainer.innerHTML = "";
}

// Build dropdown using DocumentFragment for fast batch insert
function buildDropdownItems(list, searchTerm) {
  removeElements();
  const fragment = document.createDocumentFragment();
  let lastLetter = "";

  const slice = searchTerm ? list : list.slice(0, BROWSE_LIMIT);

  slice.forEach((character) => {
    const name = character.name;
    const letter = name[0].toUpperCase();

    // Alphabet header (browse mode only)
    if (!searchTerm && letter !== lastLetter) {
      const header = document.createElement("div");
      header.className = "alpha-header";
      header.textContent = letter;
      fragment.appendChild(header);
      lastLetter = letter;
    }

    const div = document.createElement("div");
    div.className = "autocomplete-items";
    div.setAttribute("data-letter", letter);
    div.addEventListener("click", () => displayWords(name));

    let word = name;
    if (searchTerm) {
      const idx = name.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (idx !== -1) {
        word = name.substring(0, idx) +
               "<b>" + name.substring(idx, idx + searchTerm.length) + "</b>" +
               name.substring(idx + searchTerm.length);
      }
    }

    div.innerHTML = `<p class="item">${word}</p>`;
    fragment.appendChild(div);
  });

  // Footer hint when browsing full list
  if (!searchTerm && list.length > BROWSE_LIMIT) {
    const footer = document.createElement("div");
    footer.className = "dropdown-footer";
    footer.textContent = `Type to search all ${list.length} characters`;
    fragment.appendChild(footer);
  }

  listContainer.appendChild(fragment);
}

// Show browse list on focus / click
input.addEventListener("focus", () => {
  if (listContainer.innerHTML === "") {
    buildDropdownItems(characters, "");
  }
});

input.addEventListener("click", () => {
  if (listContainer.innerHTML === "") {
    buildDropdownItems(characters, "");
  }
});

// Debounced filter while typing
input.addEventListener("keyup", (e) => {
  if (e.key === "Enter") return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const searchTerm = input.value.trim();
    if (searchTerm.length === 0) {
      buildDropdownItems(characters, "");
      return;
    }
    const lower = searchTerm.toLowerCase();
    const matches = characters.filter((c) => c.name.toLowerCase().includes(lower));
    if (matches.length > 0) {
      buildDropdownItems(matches, searchTerm);
    } else {
      removeElements();
    }
  }, 120);
});

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) removeElements();
});

// ── Helpers ──────────────────────────────────────────────

function getAlignmentClass(alignment) {
  if (alignment === "good") return "alignment-good";
  if (alignment === "bad") return "alignment-bad";
  return "alignment-neutral";
}

function buildInlineFallbackSvg(name) {
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

  const safeName = name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 520">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a1d2b"/>
          <stop offset="100%" stop-color="#0f1119"/>
        </linearGradient>
      </defs>
      <rect width="640" height="520" fill="url(#bg)"/>
      <circle cx="520" cy="90" r="140" fill="#e01a38" opacity="0.25"/>
      <circle cx="120" cy="460" r="160" fill="#f43f5e" opacity="0.2"/>
      <text x="50%" y="46%" text-anchor="middle" fill="#f8fafc" font-size="132" font-family="Arial, sans-serif" font-weight="700">${initials}</text>
      <text x="50%" y="62%" text-anchor="middle" fill="#cbd5e1" font-size="28" font-family="Arial, sans-serif">${safeName}</text>
      <text x="50%" y="72%" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif">Image unavailable</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function setInlineFallback(imgEl, name) {
  imgEl.onerror = null;
  imgEl.src = buildInlineFallbackSvg(name);
}

// ── Online image search (Wikipedia API) ──────────────────

const IMG_CACHE_PREFIX = "marvel_img_";

async function fetchImageOnline(name) {
  const cacheKey = IMG_CACHE_PREFIX + name.toLowerCase();

  // Return cached result (even if it's "" meaning not found)
  const cached = localStorage.getItem(cacheKey);
  if (cached !== null) return cached;

  // Try search queries: exact name first, then "Marvel Comics {name}"
  const queries = [
    `${name} (comics)`,
    `${name} Marvel Comics`,
    name,
  ];

  for (const q of queries) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&format=json&origin=*`;
      const res = await fetch(url);
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        const thumb = page?.thumbnail?.source;
        if (thumb) {
          localStorage.setItem(cacheKey, thumb);
          return thumb;
        }
      }
    } catch (_) { /* network error, try next query */ }
  }

  // Not found — cache empty string to avoid re-fetching
  localStorage.setItem(cacheKey, "");
  return "";
}

// Called when character has no image — shows spinner then fetches online
async function loadImageForCard(character) {
  const wrapper = document.querySelector(".card-image-wrapper");
  const imgEl   = document.getElementById("char-img");
  if (!wrapper || !imgEl) return;

  // Show spinner while searching
  imgEl.style.opacity = "0.15";
  const spinner = document.createElement("div");
  spinner.className = "img-searching";
  spinner.innerHTML = `<div class="img-spinner"></div><p>Searching image…</p>`;
  wrapper.appendChild(spinner);

  const found = await fetchImageOnline(character.name);

  // Remove spinner
  spinner.remove();
  imgEl.style.opacity = "";

  if (found) {
    imgEl.onerror = () => setInlineFallback(imgEl, character.name);
    imgEl.src = found;
    // Persist to in-memory character so re-opens are instant
    character.image = found;
  } else {
    setInlineFallback(imgEl, character.name);
  }
}

function showLoading() {
  showContainer.innerHTML = `
    <div class="loading-card">
      <div class="shimmer-img"></div>
      <div class="shimmer-lines">
        <div class="shimmer-line" style="width:70%"></div>
        <div class="shimmer-line" style="width:35%"></div>
        <div class="shimmer-line" style="width:90%"></div>
        <div class="shimmer-line" style="width:80%"></div>
        <div class="shimmer-line" style="width:60%"></div>
        <div class="shimmer-line" style="width:75%"></div>
      </div>
    </div>`;
}

// ── Download image ────────────────────────────────────────

function downloadImage(url, filename) {
  // Show downloading feedback
  const btn = document.querySelector(".download-btn");
  if (btn) {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-4.88"/></svg> Downloading...`;
    btn.disabled = true;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename + ".jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);

      if (btn) {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Downloaded!`;
        setTimeout(() => {
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`;
          btn.disabled = false;
        }, 2000);
      }
    }, "image/jpeg", 0.95);
  };

  img.onerror = () => {
    // Last resort: direct fetch as blob
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename + ".jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      })
      .catch(() => window.open(url, "_blank"));

    if (btn) { btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`; btn.disabled = false; }
  };

  // Add timestamp to avoid cached no-CORS version
  img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
}

// ── Show Card ─────────────────────────────────────────────

function showCard(character) {
  currentCharacter = character;
  const alignClass = getAlignmentClass(character.alignment);
  const safeName = character.name.replace(/'/g, "\\'");

  showContainer.innerHTML = `
    <div class="card-container">

      <!-- Image (full width, full picture) -->
      <div class="card-image-wrapper">
        <img id="char-img"
             src="${character.image || buildInlineFallbackSvg(character.name)}"
             alt="${character.name}"
             onerror="setInlineFallback(this, '${safeName}')" />
        <div class="card-image-id">ID: ${character.id}</div>

        <!-- Name + badge overlaid on gradient -->
        <div class="card-name-overlay">
          <div class="character-name" title="${character.name}">${character.name}</div>
          <span class="alignment-badge ${alignClass}">${character.alignment || 'unknown'}</span>
        </div>
      </div>

      <!-- Info grid + download -->
      <div class="card-body">
        <div class="info-grid">
          <div class="info-cell">
            <span class="info-label">Full name</span>
            <span class="info-value">${character.fullName || '—'}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Gender</span>
            <span class="info-value">${character.gender || '—'}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Publisher</span>
            <span class="info-value">${character.publisher || '—'}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Race</span>
            <span class="info-value">${character.race || '—'}</span>
          </div>
          <div class="info-cell full">
            <span class="info-label">First appearance</span>
            <span class="info-value">${character.firstAppearance || '—'}</span>
          </div>
        </div>

        <button class="download-btn" onclick="downloadImage(document.getElementById('char-img').src, '${safeName}')" title="Download Image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Image
        </button>
      </div>
    </div>`;

  // If no image stored, search online
  if (!character.image) {
    loadImageForCard(character);
  }
}

// ── Submit ────────────────────────────────────────────────

button.addEventListener("click", () => {
  const val = input.value.trim();
  if (!val) {
    alert("Input cannot be blank");
    return;
  }
  removeElements();
  showLoading();

  setTimeout(() => {
    const character = characters.find(
      (c) => c.name.toLowerCase() === val.toLowerCase()
    );

    if (!character) {
      showContainer.innerHTML = `
        <div class="not-found">
          <span>&#128269;</span>
          Character not found.<br>Click the search bar to browse all heroes.
        </div>`;
      return;
    }

    showCard(character);
  }, 400);
});

// Enter key submits
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") button.click();
});
