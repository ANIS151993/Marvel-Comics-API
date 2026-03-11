import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_INPUT = "public/marvel_characters.json";
const DEFAULT_COLLECTION = "marvelCharacters";
const MAX_BATCH_SIZE = 400;

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    collection: DEFAULT_COLLECTION,
    serviceAccount: "",
    deleteFirst: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      options.input = argv[index + 1] || DEFAULT_INPUT;
      index += 1;
      continue;
    }

    if (arg === "--collection") {
      options.collection = argv[index + 1] || DEFAULT_COLLECTION;
      index += 1;
      continue;
    }

    if (arg === "--service-account") {
      options.serviceAccount = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--delete-first") {
      options.deleteFirst = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  npm run seed:firestore -- --service-account ./firebase-service-account.json

Options:
  --service-account  Path to the Firebase service account JSON file.
  --input            JSON file to upload. Defaults to public/marvel_characters.json
  --collection       Firestore collection name. Defaults to marvelCharacters
  --delete-first     Delete existing documents in the target collection before seeding
  --help, -h         Show this help text
`);
}

async function readJsonFile(relativeOrAbsolutePath) {
  const fullPath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.resolve(repoRoot, relativeOrAbsolutePath);
  const content = await readFile(fullPath, "utf8");
  return JSON.parse(content);
}

function normalizeCharacters(data) {
  const records = Array.isArray(data) ? data : data?.characters;
  if (!Array.isArray(records)) {
    throw new Error(
      "Input JSON must be either an array or an object with a characters array."
    );
  }

  return records
    .map((record) => {
      const name = String(record?.name || "").trim();
      const id = String(record?.id ?? "").trim();

      return {
        id,
        name,
        fullName: String(record?.fullName || name || "Unknown").trim() || "Unknown",
        publisher: String(record?.publisher || "Marvel Comics").trim() || "Marvel Comics",
        alignment: normalizeAlignment(record?.alignment),
        gender: String(record?.gender || "Unknown").trim() || "Unknown",
        race: String(record?.race || "Unknown").trim() || "Unknown",
        firstAppearance:
          String(record?.firstAppearance || "Unknown").trim() || "Unknown",
        image: String(record?.image || "").trim(),
      };
    })
    .filter((record) => record.name.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeAlignment(value) {
  const alignment = String(value || "neutral").trim().toLowerCase();
  if (alignment === "good" || alignment === "bad" || alignment === "neutral") {
    return alignment;
  }

  return "neutral";
}

function buildDocId(character) {
  const base = character.id.length > 0 ? `char_${character.id}` : character.name;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || `character_${Date.now()}`;
}

function chunk(array, size) {
  const chunks = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

async function deleteExistingDocuments(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`[DELETE] Collection "${collectionName}" is already empty.`);
    return;
  }

  const docs = snapshot.docs;
  for (const docGroup of chunk(docs, MAX_BATCH_SIZE)) {
    const batch = db.batch();
    docGroup.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  console.log(`[DELETE] Removed ${docs.length} existing documents from "${collectionName}".`);
}

async function seedCharacters(db, collectionName, characters) {
  for (const characterGroup of chunk(characters, MAX_BATCH_SIZE)) {
    const batch = db.batch();

    characterGroup.forEach((character) => {
      const docRef = db.collection(collectionName).doc(buildDocId(character));
      batch.set(docRef, character, { merge: true });
    });

    await batch.commit();
  }

  console.log(
    `[SEED] Uploaded ${characters.length} Marvel characters to "${collectionName}".`
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.serviceAccount) {
    printHelp();
    throw new Error("Missing required --service-account argument.");
  }

  const serviceAccount = await readJsonFile(options.serviceAccount);
  const rawData = await readJsonFile(options.input);
  const characters = normalizeCharacters(rawData);

  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = getFirestore();

  console.log(`[INFO] Project: ${serviceAccount.project_id}`);
  console.log(`[INFO] Collection: ${options.collection}`);
  console.log(`[INFO] Input records: ${characters.length}`);

  if (options.deleteFirst) {
    await deleteExistingDocuments(db, options.collection);
  }

  await seedCharacters(db, options.collection, characters);
  console.log("[DONE] Firestore seeding completed successfully.");
}

main().catch((error) => {
  console.error("[ERROR]", error.message);
  process.exit(1);
});
