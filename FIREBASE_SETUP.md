# Firebase setup for NOVA OS

The website is static GitHub Pages. Firebase is the hosted identity/database/backend layer. The source scaffold is committed, but **Google login, logging, and chatbot will not be live until a Firebase project and Gemini API key are configured and deployed**.

## 1. Create/configure a Firebase project
1. Open https://console.firebase.google.com/ and create a project.
2. Add a Web app and save its web config for later. Do not commit it to firebase-config.js until after the backend is deployed and tested; committing a valid config activates the Google sign-in/terms gate across the website. Web config values identify the project; never put service-account credentials or private API secrets in this file.
3. In Authentication → Sign-in method, enable Google and choose a support email.
4. In Authentication → Settings → Authorized domains, add novaos-original.github.io and any custom domain used by the website.
5. Create a Cloud Firestore database in production mode.

## 2. Deploy the backend first
Install Node.js 20 and Firebase CLI, then from the repository root run:
~~~sh
npm install -g firebase-tools
firebase login
firebase use --add
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
~~~
Select the project you created. Cloud Functions deployment may require the Blaze billing plan and a linked billing account. Set budget alerts before enabling production traffic.

## 3. Configure the chatbot secret
Create a Gemini API key at https://aistudio.google.com/apikey, then set it as a server-side Firebase secret:
~~~sh
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
~~~
Paste the key only into the CLI prompt. Do not commit it, put it in firebase-config.js, or send it to the browser. Google AI API free quotas and availability can change; this is not an unlimited guarantee.

## 4. Activate the web client after backend deployment
After the functions and secret are deployed, copy the Web app configuration into the root firebase-config.js and replace every REPLACE_ value. Commit this file to GitHub. This activates Google sign-in and the terms gate across the website. Keep this file free of private keys and service-account credentials.

## 5. Enable 90-day activity retention
In Google Cloud Console → Firestore → TTL, create TTL policies for collection groups activity and privateRateLimits on the expiresAt field. The backend adds that field 90 days after each activity event and rate-limit bucket. TTL deletion is asynchronous and may take additional time.

## 6. Test before public use
- Test Google login on Android and desktop.
- Confirm the user must accept the current terms version before the app/chat functions work.
- Confirm one user cannot read another user's profile/activity.
- Test chatbot rate limits and the Gemini secret.
- Check Firebase Authentication and Cloud Functions logs; do not enable verbose logging of request bodies.
- Publish a privacy contact and account deletion process before collecting production account data.

## Data and security design
- Google passwords are handled by Firebase Authentication and are never stored in Firestore by NOVA.
- Firestore client rules deny writes to account profiles and activity records. Trusted Cloud Functions write these records.
- Activity events use a fixed allowlist and store event metadata, not page text, prompts, chat messages, passwords, or tokens.
- Chat is processed by the backend and Gemini; message contents are not written to the activity log.
- Keep Firebase App Check and stronger abuse protection on the deployment roadmap before scaling.
