// Resend email client — thin wrapper with logging + graceful failure.
// In dev, logs to console instead of calling Resend. In production, sends.
//
// The "send and don't block the response" pattern matters here: if Resend is
// slow, we don't want the user to wait on a timeout. We await it for ~5s and
// if it fails, the OTP row in the DB is still there and the user can retry.

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Agent Boss <onboarding@resend.dev>";
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO;

let _resend: Resend | null = null;
function client(): Resend {
  if (!_resend) {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(RESEND_API_KEY);
  }
  return _resend;
}

export interface SendOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend.
 * - Always resolves (never throws) so the caller can wrap in try/catch safely.
 * - In dev without RESEND_API_KEY, logs to console and returns ok:true with a fake id.
 * - Logs the Resend message id on success so we can correlate with the Resend dashboard.
 */
export async function sendEmail(opts: SendOpts): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    // Dev mode — log to console, pretend success.
    console.log("\n[resend dev] email not sent (no RESEND_API_KEY):");
    console.log("  to:      " + opts.to);
    console.log("  from:    " + RESEND_FROM);
    console.log("  subject: " + opts.subject);
    console.log("  -- text --");
    console.log(opts.text.split("\n").map((l) => "  | " + l).join("\n"));
    console.log("");
    return { ok: true, id: "dev-" + Date.now() };
  }

  try {
    const res = await client().emails.send({
      from: RESEND_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(RESEND_REPLY_TO ? { replyTo: RESEND_REPLY_TO } : {}),
    });
    if (res.error) {
      console.error("[resend] send failed:", res.error);
      return { ok: false, error: String(res.error.message ?? res.error) };
    }
    console.log("[resend] sent message id=" + (res.data?.id ?? "?") + " to=" + opts.to);
    return { ok: true, id: res.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[resend] threw:", msg);
    return { ok: false, error: msg };
  }
}

export const RESEND_FROM_ADDRESS = RESEND_FROM;
export const IS_RESEND_CONFIGURED = Boolean(RESEND_API_KEY);