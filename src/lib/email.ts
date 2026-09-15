import "server-only";

import { SITE } from "@/lib/constants";

/*
 * Enquiry email delivery via Cloudflare Email Service (Email Sending).
 *
 * This runs as a plain Node server rather than a Worker, so it uses the REST
 * API rather than the `send_email` binding. Note the REST field names differ
 * from the binding: `from` takes `address` (not `email`) and the reply address
 * is `reply_to` (not `replyTo`).
 *
 * Requires CLOUDFLARE_ACCOUNT_ID plus CLOUDFLARE_EMAIL_TOKEN (an API token with
 * the email sending permission), and the sending domain must be onboarded onto
 * Email Sending. When either is unset this no-ops with a log, so the enquiry is
 * still saved and the form still works.
 */

const ENDPOINT = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`;

type EnquiryEmail = {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  listingTitle?: string | null;
  listingUrl?: string | null;
};

type Address = { address: string; name?: string };

/** Parse `Name <addr@host>` (or a bare address) into the REST `from` shape. */
function parseAddress(value: string): Address {
  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match && match[2]) {
    const name = match[1].replace(/^"|"$/g, "").trim();
    return name ? { address: match[2], name } : { address: match[2] };
  }
  return { address: value.trim() };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SendPayload = {
  to: string | string[];
  from: Address;
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Post one message to Cloudflare. Retries only on 429/500 — a 400 is a
 * validation error that will never succeed on retry.
 */
async function send(
  accountId: string,
  token: string,
  payload: SendPayload,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT(accountId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[email] network error sending to", payload.to, err);
      return;
    }

    if (res.ok) {
      const body = (await res.json().catch(() => null)) as {
        result?: { permanent_bounces?: string[] };
      } | null;
      const bounced = body?.result?.permanent_bounces ?? [];
      if (bounced.length) {
        console.error("[email] permanent bounce for", bounced);
      }
      return;
    }

    if (res.status !== 429 && res.status !== 500) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] send failed (${res.status}) for`, payload.to, detail);
      return;
    }

    // Retryable — back off before trying again.
    await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
  }
  console.error("[email] giving up after retries for", payload.to);
}

/**
 * Notify the agency of a new enquiry, and send the enquirer an acknowledgement.
 * No-ops (with a log) when Cloudflare email isn't configured, so local dev and
 * pre-launch environments still work — the enquiry is always saved regardless.
 */
export async function sendEnquiryEmails(e: EnquiryEmail): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_EMAIL_TOKEN;
  const to = process.env.ENQUIRY_NOTIFY_TO || SITE.email;

  if (!accountId || !token) {
    console.log(
      `[email] Cloudflare email not configured (need CLOUDFLARE_ACCOUNT_ID and ` +
        `CLOUDFLARE_EMAIL_TOKEN) — would notify ${to} of enquiry from ${e.name} <${e.email}>`,
    );
    return;
  }

  const from = parseAddress(
    process.env.ENQUIRY_FROM || `${SITE.name} <noreply@example.com>`,
  );

  const subjectSuffix = e.listingTitle ? ` · ${e.listingTitle}` : "";
  const safeMsg = escapeHtml(e.message).replace(/\n/g, "<br>");

  const adminHtml = `
    <h2 style="font-family:Georgia,serif;color:#1f4434;">New enquiry${escapeHtml(subjectSuffix)}</h2>
    <p><strong>Name:</strong> ${escapeHtml(e.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(e.email)}</p>
    ${e.phone ? `<p><strong>Phone:</strong> ${escapeHtml(e.phone)}</p>` : ""}
    ${e.listingTitle ? `<p><strong>Property:</strong> ${escapeHtml(e.listingTitle)}${e.listingUrl ? ` — <a href="${e.listingUrl}">view</a>` : ""}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p>${safeMsg}</p>
  `;

  // Plain-text alternatives matter for deliverability, not just for clients
  // that can't render HTML.
  const adminText = [
    `New enquiry${subjectSuffix}`,
    ``,
    `Name: ${e.name}`,
    `Email: ${e.email}`,
    e.phone ? `Phone: ${e.phone}` : null,
    e.listingTitle
      ? `Property: ${e.listingTitle}${e.listingUrl ? ` (${e.listingUrl})` : ""}`
      : null,
    ``,
    `Message:`,
    e.message,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const ackHtml = `
    <p>Hi ${escapeHtml(e.name)},</p>
    <p>Thank you for your enquiry${e.listingTitle ? ` about <strong>${escapeHtml(e.listingTitle)}</strong>` : ""}. A member of our team will be in touch shortly.</p>
    <p>Warm regards,<br>${escapeHtml(SITE.name)}</p>
  `;

  const ackText =
    `Hi ${e.name},\n\n` +
    `Thank you for your enquiry${e.listingTitle ? ` about ${e.listingTitle}` : ""}. ` +
    `A member of our team will be in touch shortly.\n\n` +
    `Warm regards,\n${SITE.name}`;

  try {
    await Promise.allSettled([
      send(accountId, token, {
        to,
        from,
        reply_to: e.email,
        subject: `New enquiry from ${e.name}${subjectSuffix}`,
        html: adminHtml,
        text: adminText,
      }),
      send(accountId, token, {
        to: e.email,
        from,
        subject: `We received your enquiry — ${SITE.name}`,
        html: ackHtml,
        text: ackText,
      }),
    ]);
  } catch (err) {
    // Never let an email failure break the enquiry flow.
    console.error("[email] Failed to send enquiry emails:", err);
  }
}
