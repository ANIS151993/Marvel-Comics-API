# Codex Agent Guide for MARVEL

## Mission

You are working on the `MARVEL` web app. Your job is to improve, maintain, and deploy a polished Marvel character explorer that uses:

- Vanilla JavaScript
- HTML/CSS
- Vite
- Firebase Authentication
- Cloud Firestore
- GitHub Pages

This is a static frontend-first app. Do not introduce unnecessary backend complexity unless the user explicitly asks for it.

## Product Goal

Build and maintain a Marvel character web app where:

- Users must create an account or sign in with email/password before entering the app
- Auth is powered by Firebase Authentication
- Character data is loaded from Cloud Firestore
- The app remains visually polished and mobile-friendly
- The live GitHub Pages deployment stays in sync with the local app

## Current Architecture

### Active app files

- `index.html`
- `css/style.css`
- `js/script.js`
- `js/firebase-config.js`

### GitHub Pages deployment copy

- `docs/index.html`
- `docs/style.css`
- `docs/script.js`
- `docs/firebase-config.js`

### Firestore and Firebase support

- `firestore.rules`
- `scripts/seed-firestore.mjs`
- `scripts/pull-marvel-characters.mjs`

### Data source

- Firestore collection: `marvelCharacters`
- Authenticated frontend reads from Firestore after login
- Local JSON is still used as the seeding source and refresh source, not as the live production database

## Important Project Rules

1. Keep the root app and the `docs/` deployment copy aligned.
2. When changing the live user experience, update both the root files and the `docs/` files unless there is a deliberate reason not to.
3. Do not commit Firebase Admin private keys or service account JSON files.
4. Do not replace the active Firebase configuration with placeholders unless the user explicitly asks for that.
5. Prefer Firebase and static hosting patterns over adding Express, MongoDB, or server-side infrastructure.
6. Treat `characters-server/` and `mongodb/` as legacy code paths unless the user explicitly wants to revive or migrate them.
7. Before finishing implementation work, run `npm run build` from the repo root.
8. If a change affects deployment, preserve GitHub Pages compatibility.

## Firebase Requirements

### Authentication

- Use Firebase Authentication with email/password
- The app must stay locked until the user is authenticated
- Signed-in users should be able to log out cleanly

### Firestore

- Use Cloud Firestore, not Realtime Database
- The app reads from `marvelCharacters`
- Frontend Firestore reads should happen only after auth state is confirmed
- Firestore security rules should support authenticated reads and block direct browser writes unless the user explicitly requests write features

### Existing Firestore rules intent

Current rules model:

- authenticated users can read `marvelCharacters`
- browser writes are blocked
- admin seeding is done through the Firebase Admin SDK

## Data Workflow

### Refresh source data

Use:

```bash
npm run pull:marvel
```

This refreshes local JSON files from external Marvel-related sources.

### Seed Firestore

Use:

```bash
npm run seed:firestore -- --service-account ./YOUR_SERVICE_ACCOUNT.json --delete-first
```

Notes:

- This uploads the local JSON dataset into Firestore
- `--delete-first` replaces the current collection content
- The seed target collection is `marvelCharacters`

## Development Workflow

### Standard commands

Install dependencies:

```bash
npm install
```

Run local dev server:

```bash
npm run dev
```

Build before completion:

```bash
npm run build
```

### Deployment workflow

GitHub Pages serves from the `docs/` folder on the `main` branch.

When preparing a deploy:

1. Update root app files if needed
2. Mirror deployment-facing changes into `docs/`
3. Validate with `npm run build`
4. Commit cleanly
5. Push to `origin main`
6. Allow GitHub Pages time to propagate

## UI and UX Expectations

Maintain a deliberate, polished UI. Avoid generic or broken-looking output.

Preserve these qualities:

- Strong Marvel-inspired visual direction
- Mobile-friendly layout
- Smooth auth gate experience
- Clear loading and error states
- Search and card browsing that feel responsive

When adding features:

- Match the existing visual language
- Keep interactions simple and readable
- Do not introduce clashing fonts, colors, or layout systems

## Coding Expectations

- Prefer small, targeted changes over unnecessary rewrites
- Keep code readable and practical
- Add comments only when they explain non-obvious logic
- Preserve the vanilla JS structure unless a larger architecture shift is explicitly requested
- Do not add frameworks unless the user asks

## When Editing This Repo

### If changing authentication

- Update both root and `docs/`
- Verify Firebase config usage still works
- Verify signed-out and signed-in states

### If changing Firestore behavior

- Update frontend reads carefully
- Keep `marvelCharacters` collection usage consistent unless a migration is requested
- Update `firestore.rules` if access behavior changes
- Update README instructions if setup steps change

### If changing data model

- Keep the seeded JSON shape and Firestore document shape compatible
- Preserve fields used by the UI:
  - `id`
  - `name`
  - `fullName`
  - `publisher`
  - `alignment`
  - `gender`
  - `race`
  - `firstAppearance`
  - `image`

### If changing deployment

- Assume GitHub Pages is a required target
- Do not break `docs/` relative paths
- Do not rely on server-only features for the live site

## Files That Matter Most

- `index.html`
- `css/style.css`
- `js/script.js`
- `js/firebase-config.js`
- `docs/index.html`
- `docs/style.css`
- `docs/script.js`
- `docs/firebase-config.js`
- `firestore.rules`
- `scripts/seed-firestore.mjs`
- `scripts/pull-marvel-characters.mjs`
- `README.md`

## What To Avoid

- Do not commit private service account keys
- Do not switch to Realtime Database unless explicitly requested
- Do not reintroduce MongoDB as the active runtime database
- Do not update only the root app and forget `docs/`
- Do not finish without validation when making functional changes

## Definition of Done

A task is complete only when:

1. The code change is implemented
2. Root and `docs/` copies are consistent when needed
3. The app still builds with `npm run build`
4. Firebase-related changes preserve the auth + Firestore flow
5. README or setup docs are updated if the workflow changed

## Prompt To Follow

When working on this repo, act like the maintainer of a production static app with Firebase services. Keep the app authenticated, Firestore-backed, GitHub Pages-compatible, visually polished, and easy to maintain. Favor direct fixes, validate your work, protect secrets, and keep deployment files in sync with the local app.
