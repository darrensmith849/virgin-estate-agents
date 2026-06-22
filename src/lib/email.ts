import "server-only";
import { Resend } from "resend";

import { SITE } from "@/lib/constants";

type EnquiryEmail = {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  listingTitle?: string | null;
  listingUrl?: string | null;
};

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = () =>
  process.env.ENQUIRY_FROM || `${SITE.name} <noreply@example.com>`;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Notify the agency of a new enquiry, and send the enquirer an acknowledgement.
 * No-ops (with a log) when RESEND_API_KEY isn't configured, so local dev and
 * pre-launch environments still work — the enquiry is always saved regardless.
 */
export async function sendEnquiryEmails(e: EnquiryEmail): Promise<void> {
  const resend = getResend();
  const to = process.env.ENQUIRY_NOTIFY_TO || SITE.email;

  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY not set — would notify ${to} of enquiry from ${e.name} <${e.email}>`,
    );
    return;
  }

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

  const ackHtml = `
    <p>Hi ${escapeHtml(e.name)},</p>
    <p>Thank you for your enquiry${e.listingTitle ? ` about <strong>${escapeHtml(e.listingTitle)}</strong>` : ""}. A member of our team will be in touch shortly.</p>
    <p>Warm regards,<br>${escapeHtml(SITE.name)}</p>
  `;

  try {
    await Promise.allSettled([
      resend.emails.send({
        from: FROM(),
        to,
        replyTo: e.email,
        subject: `New enquiry from ${e.name}${subjectSuffix}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: FROM(),
        to: e.email,
        subject: `We received your enquiry — ${SITE.name}`,
        html: ackHtml,
      }),
    ]);
  } catch (err) {
    // Never let an email failure break the enquiry flow.
    console.error("[email] Failed to send enquiry emails:", err);
  }
}
