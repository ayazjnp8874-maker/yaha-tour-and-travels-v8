/**
 * YAHA TOUR AND TRAVELS — WhatsApp notification worker
 *
 * Runs on a scheduled trigger. It reads Firestore bookings using a Google
 * service account, sends approved WhatsApp message templates, then records
 * notification state back to Firestore. No secrets belong in this file.
 *
 * Required Worker secrets:
 * GOOGLE_SERVICE_ACCOUNT_JSON, META_ACCESS_TOKEN
 *
 * Required Worker variables:
 * FIREBASE_PROJECT_ID, META_PHONE_NUMBER_ID, META_TEMPLATE_NAME,
 * META_TEMPLATE_LANGUAGE, ADMIN_PHONE_1, ADMIN_PHONE_2
 */

const GRAPH_VERSION = "v24.0";

function b64url(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function googleAccessToken(env) {
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + "." + claim;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)
  );
  const assertion = unsigned + "." + b64url(new Uint8Array(signature));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error("Google token error: " + JSON.stringify(data));
  }
  return data.access_token;
}

function fieldValue(value) {
  if (!value) return "";
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return String(value.integerValue);
  if (value.doubleValue !== undefined) return String(value.doubleValue);
  if (value.booleanValue !== undefined) return String(value.booleanValue);
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  return "";
}

function docData(doc) {
  const out = {};
  for (const [key, value] of Object.entries(doc.fields || {})) {
    out[key] = fieldValue(value);
  }
  return out;
}

function fsString(value) {
  return { stringValue: String(value ?? "") };
}

async function listBookings(env, token) {
  const url = "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(env.FIREBASE_PROJECT_ID) +
    "/databases/(default)/documents:runQuery";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "bookings_v8" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: 5
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("Firestore query error: " + JSON.stringify(data));
  return (data || []).map(row => row.document).filter(Boolean);
}

async function readUser(env, token, uid) {
  if (!uid) return null;
  const url = "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(env.FIREBASE_PROJECT_ID) +
    "/databases/(default)/documents/users/" + encodeURIComponent(uid);
  const response = await fetch(url, { headers: { authorization: "Bearer " + token } });
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error("Driver profile read error: " + JSON.stringify(data));
  return docData(data);
}

async function patchBooking(env, token, docName, fields) {
  const mask = Object.keys(fields).map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  const url = docName + "?" + mask;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fsString(v)]))
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("Firestore update error: " + JSON.stringify(data));
  return data;
}

function phoneDigits(value) {
  let digits = String(value || "").replace(/\\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.slice(1);
  return digits;
}

async function sendTemplate(env, to, values) {
  const recipient = phoneDigits(to);
  if (!recipient) throw new Error("Recipient phone number is missing.");
  const url = "https://graph.facebook.com/" + GRAPH_VERSION + "/" +
    encodeURIComponent(env.META_PHONE_NUMBER_ID) + "/messages";
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: env.META_TEMPLATE_NAME,
      language: { code: env.META_TEMPLATE_LANGUAGE || "en_US" },
      components: [{
        type: "body",
        parameters: values.map(text => ({ type: "text", text: String(text || "-").slice(0, 500) }))
      }]
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.META_ACCESS_TOKEN,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error("WhatsApp API error: " + JSON.stringify(data));
  return data;
}

function messageValues(b, label) {
  const route = (b.pickup || "-") + " to " + (b.destination || "-");
  const dateTime = (b.travelDate || "-") + " " + (b.travelTime || "");
  return [
    b.bookingId || "-",
    label,
    (b.name || "-") + " / " + (b.mobile || "-"),
    b.vehicle || "-",
    route,
    dateTime
  ];
}

async function processBooking(env, googleToken, doc) {
  const b = docData(doc);
  const docName = doc.name;
  const adminPhones = [env.ADMIN_PHONE_1, env.ADMIN_PHONE_2].filter(Boolean);
  const notificationState = b.whatsappNotificationState || "";
  const currentStatus = b.status || "new";
  const currentDriverUid = b.driverUid || "";

  // New booking: notify both configured admins once per booking.
  if (!b.adminWhatsAppNotifiedAt && currentStatus !== "awaiting_fare") {
    for (const phone of adminPhones) {
      await sendTemplate(env, phone, messageValues(b, "New booking received"));
    }
    await patchBooking(env, googleToken, docName, {
      adminWhatsAppNotifiedAt: new Date().toISOString(),
      whatsappNotificationState: "admin_notified"
    });
  }

  // Status changes: notify customer using the same approved template.
  if (b.customerWhatsAppNotifiedStatus !== currentStatus && b.mobile &&
      ["accepted", "assigned", "started", "completed", "cancelled"].includes(currentStatus)) {
    await sendTemplate(env, b.mobile, messageValues(b, "Booking status: " + currentStatus));
    await patchBooking(env, googleToken, docName, {
      customerWhatsAppNotifiedStatus: currentStatus,
      whatsappNotificationState: "customer_status_notified"
    });
  }

  // New driver assignment: notify the assigned driver once per UID.
  if (currentDriverUid && b.driverWhatsAppNotifiedUid !== currentDriverUid) {
    const driver = await readUser(env, googleToken, currentDriverUid);
    if (driver && driver.phone) {
      await sendTemplate(env, driver.phone, messageValues(b, "You have a new assigned trip"));
      await patchBooking(env, googleToken, docName, {
        driverWhatsAppNotifiedUid: currentDriverUid,
        whatsappNotificationState: "driver_notified"
      });
    }
  }
}

export default {
  async scheduled(controller, env, ctx) {
    const googleToken = await googleAccessToken(env);
    const docs = await listBookings(env, googleToken);
    const results = [];
    for (const doc of docs) {
      try {
        await processBooking(env, googleToken, doc);
        results.push({ booking: doc.name, ok: true });
      } catch (error) {
        results.push({ booking: doc.name, ok: false, error: String(error.message || error) });
      }
    }
    console.log(JSON.stringify({
      event: "yaha-whatsapp-scan",
      checked: docs.length,
      results
    }));
  },

  async fetch() {
    return new Response("YAHA WhatsApp notification worker is running. Scheduled processing only.", {
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
