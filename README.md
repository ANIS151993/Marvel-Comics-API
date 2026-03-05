# Marvel Comics API

Animated Marvel character explorer built with vanilla JavaScript and Vite, using a local JSON dataset that is refreshable from API sources.

Live demo: https://anis151993.github.io/Marvel-Comics-API/

## Features

- Search + autocomplete dropdown with alphabet headers.
- Full character card with image, metadata, and alignment badge.
- Download character image button.
- Local JSON data for stable UI performance.
- One-command bulk refresh for Marvel dataset.

## Data Pull Workflow

This project now includes an automated pull script:

```bash
npm run pull:marvel
```

Script file:

- `scripts/pull-marvel-characters.mjs`

Behavior:

1. Tries official Marvel API keys from `marvel-generator/api-data.js`.
2. If Marvel API fails, falls back to free source `https://akabab.github.io/superhero-api/api/all.json`.
3. Filters Marvel-only records.
4. Deduplicates records.
5. Writes synced JSON files to:
   - `public/marvel_characters.json`
   - `docs/marvel_characters.json`
   - `marvel-json/marvel_characters.json`
   - `marvel-json/public/marvel_characters.json`
   - `mongodb/marvel_characters.json`
6. Generates change report at:
   - `state/marvel-pull-report.json`

As of March 5, 2026, the latest pull produced **270 Marvel characters**.

## Run Locally

Root app:

```bash
npm install
npm run dev
```

`marvel-json` app:

```bash
cd marvel-json
npm install
npm run dev
```

## Deployment

GitHub Pages serves from the `docs/` folder.  
Pushing updated `docs/*` files to `main` updates the live demo page.

## Project Structure

```text
Marvel-Comics-API/
├── docs/                  # GitHub Pages live site
├── public/                # Root app data
├── marvel-json/           # Matching local variant
├── scripts/               # Data pull automation
├── marvel-generator/      # API key source / legacy variant
└── mongodb/               # Seed dataset target
```

## Tech

- Vanilla JavaScript (ES6+), HTML5, CSS3
- Vite 5
- GitHub Pages (`docs/`)
