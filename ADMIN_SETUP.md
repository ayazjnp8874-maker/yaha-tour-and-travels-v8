# YAHA TOUR AND TRAVELS V8 — Admin Setup

Admin access is intentionally not available through public self-registration. Create the first Admin account in the Firebase Console using the project owner's access.

## 1. Enable Email/Password sign-in
1. Open Firebase Console: https://console.firebase.google.com/
2. Select project `yaha-tour-and-travels`.
3. Open **Authentication → Sign-in method** (or **Sign-in providers**).
4. Enable **Email/Password** and save.

## 2. Create the Admin authentication account
1. Open **Authentication → Users → Add user**.
2. Enter the Admin email and a strong password, then create the user.
3. Copy the new user's **UID**. Keep the password private.

## 3. Give that UID the Admin role in Firestore
1. Open **Firestore Database → Data → users**.
2. Create a document whose document ID is exactly the copied Authentication UID.
3. Add these fields:
   - `role` — string — `admin`
   - `active` — boolean — `true`
   - `email` — string — the same Admin email (optional but useful)
4. Save the document.

## 4. Sign in
Open the published app: https://ayazjnp8874-maker.github.io/yaha-tour-and-travels-v8/
Choose Admin Login and use the exact email/password created in Authentication.

## Important security notes
- Never put an Admin password or service-account key in this repository or website code.
- Do not create an Admin role from the public Customer registration form.
- The Firestore rules require both `role = admin` and `active = true` on `users/{UID}`.
- If login says access is not active, verify the document ID is the exact Authentication UID and both field types/values are correct.
- The app's Firebase rules are stored in `firestore.rules`; `firebase.json` only points the Firebase CLI to that file and does not deploy it by itself.