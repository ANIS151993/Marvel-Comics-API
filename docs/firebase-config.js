export const firebaseConfig = {
  apiKey: "AIzaSyBbMBcGyI69U8flGuKuXqjVUVTdk2ioCwE",
  authDomain: "marvel-82b19.firebaseapp.com",
  projectId: "marvel-82b19",
  storageBucket: "marvel-82b19.firebasestorage.app",
  messagingSenderId: "1002621041816",
  appId: "1:1002621041816:web:3cac319a7b1d222f0f24ed",
};

export function isFirebaseConfigured(config = firebaseConfig) {
  return Object.values(config).every(
    (value) =>
      typeof value === "string" &&
      value.trim() !== "" &&
      !value.startsWith("PASTE_YOUR_")
  );
}
