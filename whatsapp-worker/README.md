# YAHA TOUR AND TRAVELS — WhatsApp Notifications

This folder contains the notification backend source. It is **not live yet**. The existing website is unchanged.

## What it is designed to do

- New eligible booking → send a WhatsApp template to both admin numbers.
- Booking status becomes accepted / assigned / started / completed / cancelled → send a template to the customer.
- A driver is assigned → send a template to that driver.

The backend reads the latest 50 documents from Firestore collection `bookings_v8`, checks only bookings created in the last 48 hours, and writes notification markers back to the booking to reduce duplicate sends. It is scheduled every 15 minutes. GitHub scheduled runs can sometimes be delayed.

## No Cloudflare account needed

The repository includes a GitHub Actions workflow at `.github/workflows/whatsapp-notifications.yml`. It runs the Node.js notification script automatically and can also be started manually from the GitHub Actions tab using **Run workflow**.

The GitHub Actions runner is intended for this public repository and uses GitHub-hosted standard runners. Do not switch the repository to a paid plan or add a payment method for this setup.

## Requirements before messages can be sent

1. Meta Business Verification must be approved and the production WhatsApp phone number must be eligible/registered for the Cloud API. Do not migrate or remove the existing WhatsApp Business app number as part of this setup.
2. Create and get approval for a WhatsApp message template. The template name and language code must match the GitHub secrets below. Its BODY must have exactly six text placeholders in this order:
   1. Booking ID
   2. Update label
   3. Customer name / mobile
   4. Vehicle
   5. Pickup to destination
   6. Travel date / time
3. Meta Cloud API may charge for delivered business-initiated template messages depending on current pricing and category. Check WhatsApp Manager before enabling sends. This backend does not make Meta messages free.
4. A Meta test number can only message recipients permitted by Meta's test setup; it is not a production sender.

## GitHub repository secrets to add

Open the repository **Settings → Secrets and variables → Actions → New repository secret**. Add these exact names. Never put their values in source code or send them in ChatGPT.

- `GOOGLE_SERVICE_ACCOUNT_JSON` — full JSON key for a dedicated Google service account with Firestore data access.
- `META_ACCESS_TOKEN` — Meta Cloud API access token.
- `META_PHONE_NUMBER_ID` — approved production WhatsApp Phone Number ID (not the test number unless deliberately testing).
- `META_TEMPLATE_NAME` — exact approved six-placeholder template name.
- `META_TEMPLATE_LANGUAGE` — exact approved template language code.
- `ADMIN_PHONE_1` — first admin phone, digits only, with country code (India: 91 + 10 digits).
- `ADMIN_PHONE_2` — second admin phone, digits only, with country code (India: 91 + 10 digits).

In Google Cloud IAM for project `yaha-tour-and-travels`, give the dedicated service account the least required Firestore data access role (for example, Cloud Datastore User). Do not share its JSON key in chat or commit it to GitHub.

## Testing

After the prerequisites and secrets are ready, open **GitHub → Actions → YAHA WhatsApp Notifications → Run workflow**. Check the run logs and test with one controlled booking before relying on customer notifications.

## Safety

- Never paste the Meta access token or Google service-account JSON into ChatGPT, GitHub source files, screenshots, or public code.
- Do not enable Firebase Blaze / Google Billing or any paid hosting plan for this GitHub Actions route.
- Do not add a Meta webhook callback URL: this version uses scheduled Firestore polling, not a webhook.
- The code is a first implementation and must be tested with an approved template and permitted recipient numbers before production use.
