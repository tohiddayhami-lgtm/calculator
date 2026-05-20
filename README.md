# Tohid Dayhami Export⁺

This app now supports:
- online hosting on Firebase Hosting
- authentication with email/password (and Google popup)
- per-user data isolation in Firestore (`users/{uid}/projects`)
- per-user file storage in Firebase Storage (`users/{uid}/uploads`)
- master dashboard for user creation, subscription expiry, feature permissions, disabled users, and user workspace access

## Local setup

1. Install dependencies:
   `npm install`
2. Copy env template:
   - Windows PowerShell: `Copy-Item .env.example .env.local`
   - Git Bash: `cp .env.example .env.local`
3. Fill values in `.env.local` from your Firebase project settings.
   - Set `VITE_MASTER_EMAIL` to your own admin email.
4. Start app:
   `npm run dev`

## Firebase requirements

1. In Firebase Console, enable **Authentication** providers:
   - Email/Password
   - (optional) Google
2. Create the first master user once in Firebase Authentication (or sign up once before disabling self-signup policy).
3. Log in with the same email as `VITE_MASTER_EMAIL` and use the in-app **Master Dashboard** to create users, set subscription time, and assign feature access.
4. Create Firestore database.
5. Enable Firebase Storage (Build > Storage > Get Started).
6. Deploy Firestore + Storage rules from this repo:
   `firebase deploy --only firestore:rules,storage`
7. Deploy Cloud Functions so the Master Dashboard can list/delete Authentication users and reset passwords:
   `firebase deploy --only functions`

For a production commercial release, set an `admin` or `master` custom claim on the master account. The Cloud Functions in `functions/` use Firebase Admin SDK for listing Authentication users, deleting Auth accounts, disabling users, and resetting passwords.

If the Firebase Console shows **"An unknown error occurred"** when enabling Storage, wait a few minutes after upgrading to Blaze, try another browser, and ensure the **Cloud Storage API** is enabled for the project in Google Cloud Console. The app will still save using **compressed Firestore-only** mode until Storage works.

Current rules already restrict access so each user can only read/write their own projects and their own uploaded files.

## Deploy online

1. Build app:
   `npm run build`
2. Deploy hosting:
   `firebase deploy --only hosting`

After deploy, share your Firebase Hosting URL with users.
