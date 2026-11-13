# YAHA TOUR AND TRAVELS — WhatsApp Notifications

This folder contains a **prepared backend source**, not a live/deployed service yet. The existing website remains unchanged. Do not expect notifications until the Worker is deployed and the required Meta/Firebase setup is complete.

## What it is designed to notify

- New eligible booking → both configured Admin WhatsApp numbers.
- Booking status changes to accepted / assigned / started / completed / cancelled → customer.
- New driver assignment → assigned driver.

It scans the latest five bookings every five minutes and records notification markers in each Firestore booking to reduce duplicate sends. It ignores bookings older than 48 hours so old historical bookings are not messaged during initial setup.

## Important requirements before deployment

1. Meta Business Verification must be approved and the production WhatsApp phone number must be registered/eligible. Do not migrate or remove the existing WhatsApp Business app number as part of this setup.
2. Create and get approval for a WhatsApp message template named in the Worker variable `META_TEMPLATE_NAME`. The template must have a BODY with exactly six text placeholders, in this order:
   1. Booking ID
   2. Update label
   3. Customer name / mobile
   4. Vehicle
   5. Pickup to destination
   6. Travel date / time

   Set `META_TEMPLATE_LANGUAGE` to the approved language code, e.g. `en_US` only if that is the template's actual language code.
3. Meta Cloud API may charge for delivered business-initiated template messages depending on the current WhatsApp pricing and recipient country/category. Check the price in WhatsApp Manager before enabling sends. This source code does not bypass Meta message charges.
4. A Meta test number can only message recipients permitted by Meta's test setup and is not a production sender.

## Free backend option

The Worker is configured for Cloudflare Workers Free with a five-minute Cron Trigger. Cloudflare currently documents a free allowance of 100,000 Worker requests/day and up to five Cron Triggers per account; Cron Triggers are supported on the Free plan. Limits can change, and the 10 ms CPU limit applies to each Free invocation. See:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/

This avoids Firebase Cloud Functions / Google Blaze deployment for the notification scheduler. It does **not** make WhatsApp template messaging free.

## Setup checklist (do not put secrets in GitHub)

1. Create/sign in to a Cloudflare account and open **Workers & Pages**.
2. Create a Worker named `yaha-whatsapp-notifications`. Deploy the contents of `worker.js` as its Worker code.
3. In the Worker settings, add the Cron Trigger `*/5 * * * *` (every five minutes), or deploy using this folder's `wrangler.toml`.
4. Add these non-secret variables:
   - `FIREBASE_PROJECT_ID` = `yaha-tour-and-travels`
   - `META_PHONE_NUMBER_ID` = the approved production WhatsApp Phone Number ID (not the test number ID unless deliberately testing)
   - `META_TEMPLATE_NAME` = the approved six-placeholder template name
   - `META_TEMPLATE_LANGUAGE` = the approved template language code
   - `ADMIN_PHONE_1` = first admin number in international format, digits only (91 + 10 digits)
   - `ADMIN_PHONE_2` = second admin number in international format, digits only (91 + 10 digits)
5. Add these as **Worker Secrets**, never as plain variables or GitHub files:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = the full JSON key of a dedicated Google service account
   - `META_ACCESS_TOKEN` = the Meta Cloud API access token
6. In Google Cloud IAM for project `yaha-tour-and-travels`, give that dedicated service account the least required Firestore data access role (`Cloud Datastore User`). Do not share its JSON key in chat or commit it to GitHub.
7. Test with a single controlled booking and verify the Worker logs and WhatsApp delivery before enabling real customer traffic.

## Safety

- Never paste the Meta access token or Google service-account JSON into ChatGPT, GitHub, screenshots, or public code.
- Do not enable paid Cloudflare usage or Google Billing for this setup without first reviewing the price and getting explicit approval.
- Do not add a webhook callback URL: this version uses scheduled Firestore polling, not a Meta webhook.
- This is a first implementation and must be tested with an approved template and permitted recipient numbers before production use.
