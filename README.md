# Marvel Comics API

> An animated, interactive Marvel character search app built with vanilla JavaScript, powered by local JSON data and Marvel CDN imagery.

🔗 **[Live Demo → Try it here](https://anis151993.github.io/Marvel-Comics-API/)**

---

## Preview

The app features a dark Marvel-themed UI with animated floating particles, a live autocomplete search bar, spring-animated character cards, and a one-click image download.

---

## Features

- **Live Autocomplete Search** — Click the search bar to instantly browse all 30 characters sorted alphabetically with sticky letter headers (A, B, C…). Filter as you type with highlighted matches.
- **Full Character Card** — Displays the full uncropped Marvel CDN image, alignment badge (Good / Bad / Neutral), and a detailed info panel: Full Name, Publisher, Gender, Race, and First Appearance.
- **Download Button** — Saves the character image directly to your local disk using Canvas API + Blob URL — no new tab opened.
- **Animated Background** — 8 floating red radial-gradient particles rise continuously in the background.
- **Shimmer Loading State** — A skeleton screen appears for 400ms while the card renders, simulating a real API call.
- **Staggered Info Rows** — Each detail row slides in with a delay cascade for a polished entrance animation.
- **Spring Card Reveal** — Cards appear with a cubic-bezier spring bounce using `cardReveal` keyframe.

---

## How I Built It

### 1. Project Setup

The project uses **Vite** as a lightweight dev server for local development with hot reload:

```bash
npm create vite@latest marvel-json -- --template vanilla
cd marvel-json
npm install
npm run dev
```

### 2. Marvel Character Data (`marvel_characters.json`)

Instead of relying on the Marvel Comics API (which requires server-side MD5 hash authentication and has CORS restrictions), I curated a local JSON dataset of 30 iconic Marvel characters with verified image URLs from the official **Marvel CDN** (`i.annihil.us`):

```json
{
  "id": "717",
  "name": "Wolverine",
  "fullName": "James Logan Howlett",
  "publisher": "Marvel Comics",
  "alignment": "good",
  "gender": "Male",
  "race": "Mutant",
  "firstAppearance": "Incredible Hulk #181 (October, 1974)",
  "image": "https://i.annihil.us/u/prod/marvel/i/mg/2/60/537bcaef0f6cf.jpg"
}
```

Each image URL was verified against the Marvel API CDN to ensure the correct character is shown (the image hash in the URL is content-addressed, not sequential).

### 3. Autocomplete with Alphabet Headers

When the search bar is focused, `buildDropdownItems()` renders all characters alphabetically. After building the list, `addAlphabetHeaders()` walks the DOM and inserts sticky `<div class="alpha-header">` before the first item of each new letter:

```javascript
function addAlphabetHeaders() {
  const items = listContainer.querySelectorAll(".autocomplete-items");
  let lastLetter = "";
  items.forEach((item) => {
    const letter = item.getAttribute("data-letter");
    if (letter !== lastLetter) {
      const header = document.createElement("div");
      header.classList.add("alpha-header");
      header.textContent = letter;
      listContainer.insertBefore(header, item);
      lastLetter = letter;
    }
  });
}
```

### 4. Z-Index Stacking Fix

A critical CSS fix ensures the autocomplete dropdown always appears above the character card image:

```css
.search-wrapper { position: relative; z-index: 100; }
.list           { position: absolute; z-index: 999; }
.display-container { position: relative; z-index: 1; }
```

### 5. Image Download via Canvas API

The download button uses `crossOrigin = "anonymous"` to load the image into a `<canvas>`, then exports it as a JPEG Blob and triggers a programmatic click on a hidden `<a>` tag — saving the file to disk without opening a new tab:

```javascript
function downloadImage(url, filename) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename + ".jpg";
      a.click();
    }, "image/jpeg", 0.95);
  };
  img.src = url + "?_t=" + Date.now(); // cache-bust for CORS
}
```

If CORS blocks the canvas approach, a `fetch()` blob fallback kicks in automatically.

### 6. Animations

All animations are pure CSS `@keyframes`:

| Animation | Effect |
|-----------|--------|
| `float` | Particles rise from bottom, rotate 720°, fade in/out |
| `pulse-glow` | MARVEL badge red glow pulses |
| `slideDown` | Header and search bar enter from above |
| `cardReveal` | Card springs in with `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `fadeInRow` | Info rows slide in from left with staggered delays |
| `shimmer` | Skeleton loading gradient sweeps left-to-right |
| `spin` | Download spinner rotates during fetch |

### 7. Alignment Badges

Characters are colour-coded by moral alignment:

```css
.alignment-good    { color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
.alignment-bad     { color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
.alignment-neutral { color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
```

---

## Project Structure

```
Marvel-Comics-API/
├── docs/                      ← GitHub Pages static deployment
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── marvel_characters.json
├── marvel-json/               ← Local dev app (Vite)
├── marvel-api/                ← API-based variant
├── characters-server/         ← Express + MongoDB backend
└── mongodb/                   ← Seed scripts
```

---

## Run Locally

```bash
cd marvel-json
npm install
npm run dev
# Opens at http://localhost:3001
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| Fonts | Bebas Neue, Poppins (Google Fonts) |
| Dev Server | Vite 5 |
| Images | Marvel CDN (`i.annihil.us`) |
| Deployment | GitHub Pages (`/docs` folder) |

---

## Characters Included

Avengers · X-Men · Guardians of the Galaxy · Defenders · Fantastic Four

Iron Man · Captain America · Thor · Spider-Man · Hulk · Black Widow · Wolverine · Deadpool · Doctor Strange · Black Panther · Hawkeye · Loki · Vision · Scarlet Witch · Cyclops · Storm · Jean Grey · Magneto · Professor X · Gambit · Rogue · Daredevil · Luke Cage · Jessica Jones · Rocket Raccoon · Groot · Star-Lord · Gamora · Drax · Mister Fantastic

---

*Built with ❤️ and Marvel red.*
