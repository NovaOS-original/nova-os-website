// Copy your Firebase web app configuration from Firebase Console > Project settings.
// These values identify your Firebase project; never put service-account keys here.
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_WEB_API_KEY",
  authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_PROJECT_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID"
};
export const FIREBASE_CONFIGURED = !Object.values(firebaseConfig).some(v => String(v).startsWith("REPLACE_"));
