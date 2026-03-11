import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const input = document.getElementById("input-box");
const button = document.getElementById("submit-button");
const showContainer = document.getElementById("show-container");
const listContainer = document.getElementById("autocomplete-list");
const appShell = document.getElementById("app-shell");
const authShell = document.getElementById("auth-shell");
const authTitle = document.getElementById("auth-title");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authConfirmPassword = document.getElementById("auth-confirm-password");
const confirmPasswordField = document.getElementById("confirm-password-field");
const authSubmitButton = document.getElementById("auth-submit-button");
const authFeedback = document.getElementById("auth-feedback");
const authModeButtons = document.querySelectorAll("[data-auth-mode]");
const firebaseSetupNote = document.getElementById("firebase-setup-note");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");

const BROWSE_LIMIT = 80;
const IMG_CACHE_PREFIX = "marvel_img_";

const state = {
  auth: null,
  db: null,
  authMode: "signin",
  characters: [],
  charactersLoaded: false,
  charactersPromise: null,
  currentCharacter: null,
  debounceTimer: null,
};

window.setInlineFallback = setInlineFallback;
window.downloadImage = downloadImage;

setAuthMode("signin");
setAuthFeedback("Checking your authentication session...", "muted");
setAuthControlsDisabled(true);
initializeFirebaseAuthentication();

authModeButtons.forEach((modeButton) => {
  modeButton.addEventListener("click", () => setAuthMode(modeButton.dataset.authMode));
});

authForm.addEventListener("submit", handleAuthSubmit);

logoutButton.addEventListener("click", async () => {
  if (!state.auth) {
    return;
  }

  try {
    await signOut(state.auth);
    setAuthMode("signin");
    setAuthFeedback("Signed out. Sign in again to enter the app.", "success");
  } catch (error) {
    setAuthFeedback(formatAuthError(error), "error");
  }
});

input.addEventListener("focus", () => {
  if (listContainer.innerHTML === "") {
    buildDropdownItems(state.characters, "");
  }
});

input.addEventListener("click", () => {
  if (listContainer.innerHTML === "") {
    buildDropdownItems(state.characters, "");
  }
});

input.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    return;
  }

  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    const searchTerm = input.value.trim();

    if (searchTerm.length === 0) {
      buildDropdownItems(state.characters, "");
      return;
    }

    const lower = searchTerm.toLowerCase();
    const matches = state.characters.filter((character) =>
      character.name.toLowerCase().includes(lower)
    );

    if (matches.length > 0) {
      buildDropdownItems(matches, searchTerm);
    } else {
      removeElements();
    }
  }, 120);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrapper")) {
    removeElements();
  }
});

button.addEventListener("click", () => {
  const value = input.value.trim();

  if (!value) {
    alert("Input cannot be blank");
    return;
  }

  if (state.characters.length === 0) {
    showContainer.innerHTML = `
      <div class="not-found">
        <span>&#9203;</span>
        Character data is still loading. Please try again in a moment.
      </div>`;
    return;
  }

  removeElements();
  showLoading();

  setTimeout(() => {
    const character = state.characters.find(
      (item) => item.name.toLowerCase() === value.toLowerCase()
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

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    button.click();
  }
});

function initializeFirebaseAuthentication() {
  if (!isFirebaseConfigured(firebaseConfig)) {
    firebaseSetupNote.classList.remove("hidden");
    setAuthFeedback(
      "Firebase is not configured yet. Paste your project values into js/firebase-config.js first.",
      "error"
    );
    return;
  }

  firebaseSetupNote.classList.add("hidden");

  try {
    const app = initializeApp(firebaseConfig);
    state.auth = getAuth(app);
    state.db = getFirestore(app);

    onAuthStateChanged(
      state.auth,
      (user) => {
        if (user) {
          showAuthenticatedApp(user);
          return;
        }

        showAuthScreen();
        setAuthFeedback(
          state.authMode === "signup"
            ? "Create your account with email and password to continue."
            : "Sign in with the account you created to continue.",
          "muted"
        );
      },
      (error) => {
        firebaseSetupNote.classList.remove("hidden");
        setAuthControlsDisabled(true);
        setAuthFeedback(formatAuthError(error), "error");
      }
    );
  } catch (error) {
    firebaseSetupNote.classList.remove("hidden");
    setAuthFeedback(formatAuthError(error), "error");
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!state.auth) {
    setAuthFeedback(
      "Firebase is not configured yet. Add your Firebase web app values before signing in.",
      "error"
    );
    return;
  }

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const confirmPassword = authConfirmPassword.value;

  if (!email) {
    setAuthFeedback("Enter an email address.", "error");
    return;
  }

  if (!password || password.length < 6) {
    setAuthFeedback("Password must be at least 6 characters.", "error");
    return;
  }

  if (state.authMode === "signup" && password !== confirmPassword) {
    setAuthFeedback("Password and confirm password must match.", "error");
    return;
  }

  setAuthControlsDisabled(true);
  setAuthFeedback(
    state.authMode === "signup" ? "Creating your account..." : "Signing you in...",
    "muted"
  );

  try {
    if (state.authMode === "signup") {
      await createUserWithEmailAndPassword(state.auth, email, password);
      setAuthFeedback("Account created. Opening the app...", "success");
    } else {
      await signInWithEmailAndPassword(state.auth, email, password);
      setAuthFeedback("Signed in. Opening the app...", "success");
    }
  } catch (error) {
    setAuthControlsDisabled(false);
    setAuthFeedback(formatAuthError(error), "error");
  }
}

function setAuthMode(mode) {
  state.authMode = mode === "signup" ? "signup" : "signin";

  authModeButtons.forEach((buttonElement) => {
    buttonElement.classList.toggle(
      "is-active",
      buttonElement.dataset.authMode === state.authMode
    );
  });

  const isSignup = state.authMode === "signup";
  authTitle.textContent = isSignup
    ? "Create an account to enter the app"
    : "Sign in to enter the app";
  authSubmitButton.textContent = isSignup ? "Create Account" : "Sign In";
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  confirmPasswordField.classList.toggle("hidden", !isSignup);
  authConfirmPassword.required = isSignup;
  authConfirmPassword.disabled = !isSignup || authSubmitButton.disabled;

  if (!authSubmitButton.disabled) {
    setAuthFeedback(
      isSignup
        ? "Create your account with email and password to continue."
        : "Sign in with the account you created to continue.",
      "muted"
    );
  }
}

function setAuthControlsDisabled(disabled) {
  authEmail.disabled = disabled;
  authPassword.disabled = disabled;
  authSubmitButton.disabled = disabled;
  authConfirmPassword.disabled = disabled || state.authMode !== "signup";

  authModeButtons.forEach((buttonElement) => {
    buttonElement.disabled = disabled;
  });
}

function setAuthFeedback(message, tone = "muted") {
  authFeedback.textContent = message;
  authFeedback.className = `auth-feedback ${tone}`;
}

function showAuthScreen() {
  authShell.classList.remove("hidden");
  appShell.classList.add("hidden");
  setAuthControlsDisabled(false);
}

function showAuthenticatedApp(user) {
  userEmail.textContent = user.email || "authenticated user";
  authForm.reset();
  setAuthMode("signin");
  appShell.classList.remove("hidden");
  authShell.classList.add("hidden");
  loadCharactersFromFirestore();
}

async function loadCharactersFromFirestore(force = false) {
  if (!state.db) {
    renderFirestoreMessage(
      "Cloud Firestore is not initialized yet. Check your Firebase setup."
    );
    return [];
  }

  if (state.charactersLoaded && !force) {
    return state.characters;
  }

  if (state.charactersPromise && !force) {
    return state.charactersPromise;
  }

  showLoading();

  state.charactersPromise = (async () => {
    try {
      const charactersQuery = query(
        collection(state.db, "marvelCharacters"),
        orderBy("name")
      );
      const snapshot = await getDocs(charactersQuery);

      state.characters = snapshot.docs
        .map((doc) => normalizeCharacterFromFirestore(doc.id, doc.data()))
        .filter((character) => character.name.length > 0);
      state.charactersLoaded = true;

      if (state.characters.length === 0) {
        renderFirestoreMessage(
          "The Firestore collection is empty. Run npm run seed:firestore and then reload the app."
        );
        return [];
      }

      const currentInput = input.value.trim().toLowerCase();
      const exactMatch = state.characters.find(
        (character) => character.name.toLowerCase() === currentInput
      );

      if (!exactMatch) {
        const random =
          state.characters[Math.floor(Math.random() * state.characters.length)];
        input.value = random.name;
      }

      if (!state.currentCharacter) {
        showContainer.innerHTML = "";
      }

      return state.characters;
    } catch (error) {
      state.characters = [];
      state.charactersLoaded = false;
      renderFirestoreMessage(formatDataError(error));
      return [];
    } finally {
      state.charactersPromise = null;
    }
  })();

  return state.charactersPromise;
}

function displayWords(value) {
  input.value = value;
  removeElements();
}

function removeElements() {
  listContainer.innerHTML = "";
}

function buildDropdownItems(list, searchTerm) {
  removeElements();

  if (list.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastLetter = "";
  const slice = searchTerm ? list : list.slice(0, BROWSE_LIMIT);

  slice.forEach((character) => {
    const name = character.name;
    const letter = name[0].toUpperCase();

    if (!searchTerm && letter !== lastLetter) {
      const header = document.createElement("div");
      header.className = "alpha-header";
      header.textContent = letter;
      fragment.appendChild(header);
      lastLetter = letter;
    }

    const option = document.createElement("div");
    option.className = "autocomplete-items";
    option.setAttribute("data-letter", letter);
    option.addEventListener("click", () => displayWords(name));

    let highlightedName = name;
    if (searchTerm) {
      const index = name.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (index !== -1) {
        highlightedName =
          name.substring(0, index) +
          "<b>" +
          name.substring(index, index + searchTerm.length) +
          "</b>" +
          name.substring(index + searchTerm.length);
      }
    }

    option.innerHTML = `<p class="item">${highlightedName}</p>`;
    fragment.appendChild(option);
  });

  if (!searchTerm && list.length > BROWSE_LIMIT) {
    const footer = document.createElement("div");
    footer.className = "dropdown-footer";
    footer.textContent = `Type to search all ${list.length} characters`;
    fragment.appendChild(footer);
  }

  listContainer.appendChild(fragment);
}

function getAlignmentClass(alignment) {
  if (alignment === "good") {
    return "alignment-good";
  }

  if (alignment === "bad") {
    return "alignment-bad";
  }

  return "alignment-neutral";
}

function buildInlineFallbackSvg(name) {
  const initials =
    name
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

function setInlineFallback(imgElement, name) {
  imgElement.onerror = null;
  imgElement.src = buildInlineFallbackSvg(name);
}

async function fetchImageOnline(name) {
  const cacheKey = IMG_CACHE_PREFIX + name.toLowerCase();
  const cached = localStorage.getItem(cacheKey);

  if (cached !== null) {
    return cached;
  }

  const queries = [`${name} (comics)`, `${name} Marvel Comics`, name];

  for (const query of queries) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        query
      )}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&format=json&origin=*`;
      const response = await fetch(url);
      const data = await response.json();
      const pages = data?.query?.pages;

      if (pages) {
        const page = Object.values(pages)[0];
        const thumbnail = page?.thumbnail?.source;

        if (thumbnail) {
          localStorage.setItem(cacheKey, thumbnail);
          return thumbnail;
        }
      }
    } catch (_) {
      // Ignore lookup failure and continue to the next query.
    }
  }

  localStorage.setItem(cacheKey, "");
  return "";
}

async function loadImageForCard(character) {
  const wrapper = document.querySelector(".card-image-wrapper");
  const imageElement = document.getElementById("char-img");

  if (!wrapper || !imageElement) {
    return;
  }

  imageElement.style.opacity = "0.15";

  const spinner = document.createElement("div");
  spinner.className = "img-searching";
  spinner.innerHTML = `<div class="img-spinner"></div><p>Searching image...</p>`;
  wrapper.appendChild(spinner);

  const foundImage = await fetchImageOnline(character.name);
  spinner.remove();
  imageElement.style.opacity = "";

  if (foundImage) {
    imageElement.onerror = () => setInlineFallback(imageElement, character.name);
    imageElement.src = foundImage;
    character.image = foundImage;
    return;
  }

  setInlineFallback(imageElement, character.name);
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

function renderFirestoreMessage(message) {
  showContainer.innerHTML = `
    <div class="not-found">
      <span>&#9888;</span>
      ${message}
    </div>`;
}

function normalizeCharacterFromFirestore(docId, data = {}) {
  const name = toDisplayText(data.name, "");

  return {
    id: toDisplayText(data.id ?? docId, docId),
    name,
    fullName: toDisplayText(data.fullName, name || "Unknown"),
    publisher: toDisplayText(data.publisher, "Marvel Comics"),
    alignment: normalizeAlignmentValue(data.alignment),
    gender: toDisplayText(data.gender),
    race: toDisplayText(data.race),
    firstAppearance: toDisplayText(data.firstAppearance),
    image: typeof data.image === "string" ? data.image.trim() : "",
  };
}

function toDisplayText(value, fallback = "Unknown") {
  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function normalizeAlignmentValue(value) {
  const alignment = String(value || "neutral").trim().toLowerCase();
  if (alignment === "good" || alignment === "bad" || alignment === "neutral") {
    return alignment;
  }

  return "neutral";
}

function downloadImage(url, filename) {
  const downloadButton = document.querySelector(".download-btn");

  if (downloadButton) {
    downloadButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-4.88"/></svg> Downloading...`;
    downloadButton.disabled = true;
  }

  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);

    canvas.toBlob((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${filename}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);

      if (downloadButton) {
        downloadButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Downloaded!`;
        setTimeout(() => {
          downloadButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`;
          downloadButton.disabled = false;
        }, 2000);
      }
    }, "image/jpeg", 0.95);
  };

  image.onerror = () => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${filename}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      })
      .catch(() => window.open(url, "_blank"));

    if (downloadButton) {
      downloadButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`;
      downloadButton.disabled = false;
    }
  };

  image.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
}

function showCard(character) {
  state.currentCharacter = character;
  const alignmentClass = getAlignmentClass(character.alignment);
  const safeName = character.name.replace(/'/g, "\\'");

  showContainer.innerHTML = `
    <div class="card-container">
      <div class="card-image-wrapper">
        <img id="char-img"
             src="${character.image || buildInlineFallbackSvg(character.name)}"
             alt="${character.name}"
             onerror="setInlineFallback(this, '${safeName}')" />
        <div class="card-image-id">ID: ${character.id}</div>

        <div class="card-name-overlay">
          <div class="character-name" title="${character.name}">${character.name}</div>
          <span class="alignment-badge ${alignmentClass}">${character.alignment || "unknown"}</span>
        </div>
      </div>

      <div class="card-body">
        <div class="info-grid">
          <div class="info-cell">
            <span class="info-label">Full name</span>
            <span class="info-value">${character.fullName || "—"}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Gender</span>
            <span class="info-value">${character.gender || "—"}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Publisher</span>
            <span class="info-value">${character.publisher || "—"}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Race</span>
            <span class="info-value">${character.race || "—"}</span>
          </div>
          <div class="info-cell full">
            <span class="info-label">First appearance</span>
            <span class="info-value">${character.firstAppearance || "—"}</span>
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

  if (!character.image) {
    loadImageForCard(character);
  }
}

function formatAuthError(error) {
  const messages = {
    "auth/email-already-in-use":
      "This email already has an account. Switch to Sign In instead.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/too-many-requests":
      "Too many attempts. Wait a moment and try again.",
    "auth/user-disabled":
      "This Firebase account has been disabled.",
    "auth/weak-password": "Password must be at least 6 characters.",
  };

  return messages[error?.code] || error?.message || "Authentication failed.";
}

function formatDataError(error) {
  const messages = {
    "failed-precondition":
      "Create a Cloud Firestore database in Firebase Console before loading characters.",
    "permission-denied":
      "Cloud Firestore blocked the read. Publish the rules from firestore.rules and sign in again.",
    unauthenticated:
      "You must be signed in before the app can read Cloud Firestore.",
    unavailable:
      "Cloud Firestore is temporarily unavailable. Try again in a moment.",
  };

  return messages[error?.code] || error?.message || "Cloud Firestore data could not be loaded.";
}
