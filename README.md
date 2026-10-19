# Nova OS Website

Responsive, animated landing page for Nova OS.

## Links
- GitHub: https://github.com/NovaOS-original
- Join the Nova OS Team: https://forms.gle/rGAzMnBBdgNcSPeW9

## Files
- `index.html` — page structure/content
- `style.css` — responsive styling and animations
- `script.js` — interactions, scroll reveals, counters, parallax, navigation and motion

Open `index.html` in a modern browser to preview locally.

## Firebase cloud features (setup required)

The repository includes a Firebase integration scaffold for Google sign-in, per-user account profiles, consent to the Terms & Privacy Notice, privacy-limited activity metadata, and a Gemini-backed NOVA chatbot.

- [Firebase setup and deployment guide](FIREBASE_SETUP.md)
- [Terms & Privacy Notice](TERMS.md)
- [Cloud Functions API](functions/index.js)
- [Firestore security rules](firestore.rules)

These features remain inactive until a Firebase project is configured in firebase-config.js, Google sign-in is enabled, Firestore rules and Cloud Functions are deployed, and the Gemini API key is stored as a server-side secret. Do not commit secrets. Activity logs are metadata-only and intended for 90-day expiration once Firestore TTL is enabled.
