# Marvel Comics API

Animated Marvel character explorer built with vanilla JavaScript and Vite. Authentication uses Firebase Auth, and the app now reads Marvel character data from Cloud Firestore after the user signs in.

Live demo: https://anis151993.github.io/Marvel-Comics-API/

## Features

- Search + autocomplete dropdown with alphabet headers.
- Full character card with image, metadata, and alignment badge.
- Download character image button.
- Firebase Authentication gate before app access.
- Cloud Firestore as the active database for character data.
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

## Firebase Setup

This project uses two Firebase services:

- Firebase Authentication for email/password login
- Cloud Firestore for Marvel character storage

### Step 1: Create the Firebase project

1. Create a Firebase project in the Firebase console.
2. Inside that project, add a Web app and copy the Firebase config values.
3. Paste your Firebase web config into:
   - `js/firebase-config.js`
   - `docs/firebase-config.js` if you also deploy the GitHub Pages copy

### Step 2: Enable Authentication

1. In Firebase Console -> Authentication -> Sign-in method, enable `Email/Password`.
2. Start the app locally:

```bash
npm run dev
```

3. Open the app and create your first account from the auth screen.

### Step 3: Create Cloud Firestore

1. In Firebase Console -> Build -> Firestore Database, click `Create database`.
2. Choose `Production mode`.
3. Choose the Firebase region closest to your users.

### Step 4: Publish Firestore rules

Use the rules from `firestore.rules`:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /marvelCharacters/{characterId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

These rules allow signed-in users to read characters, but they block direct browser writes.

### Step 5: Seed Firestore with Marvel characters

1. In Firebase Console -> Project settings -> Service accounts, generate a new private key.
2. Save that JSON file somewhere local, for example:

```bash
./firebase-service-account.json
```

3. Seed Firestore from the root project folder:

```bash
npm run seed:firestore -- --service-account ./firebase-service-account.json --delete-first
```

Optional flags:

- `--input ./some-file.json` to upload a different JSON file
- `--collection someCollectionName` to change the Firestore collection name
- `--delete-first` to wipe the existing collection before uploading fresh data

The script uploads data into the `marvelCharacters` collection.

### Step 6: Use the app

1. Keep `npm run dev` running.
2. Sign in with the account you created.
3. The app loads characters from Cloud Firestore.
4. If the collection is empty or Firestore rules are wrong, the app shows a setup error message.

Important:

- Firebase config values for web apps are safe to expose in frontend code; access control still depends on Firebase Authentication and Firebase Security Rules.
- The browser app reads from Firestore only after authentication.
- The seed script uses the Firebase Admin SDK, so it bypasses Firestore rules. That is why a service account key is required.
- `characters-server/` and `mongodb/` are legacy MongoDB experiments and are no longer required for the active app flow.

## Deployment

GitHub Pages serves from the `docs/` folder.  
Pushing updated `docs/*` files to `main` updates the live demo page.

## Project Structure

```text
Marvel-Comics-API/
├── docs/                  # GitHub Pages live site
├── public/                # Root JSON source used for Firestore seeding
├── scripts/               # Data pull + Firestore seed automation
├── firestore.rules        # Firestore security rules
├── marvel-json/           # Matching local variant
└── marvel-generator/      # API key source / legacy variant
```

## Tech

- Vanilla JavaScript (ES6+), HTML5, CSS3
- Firebase Authentication
- Cloud Firestore
- Vite 5
- GitHub Pages (`docs/`)
