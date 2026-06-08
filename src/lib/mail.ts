import "server-only";

/** Whether outbound email is configured (Resend). When false we fall back to
 * surfacing links on-screen so the flow still works in development. */
export function mailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send a transactional email via Resend's HTTP API. No SDK dependency — just a
 * fetch. Returns true on success, false if unconfigured or the send failed.
 */
export async function sendEmail({ to, subject, text, html }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.MAIL_FROM ?? "Worldie <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    if (!res.ok) {
      console.error("sendEmail failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail error", err);
    return false;
  }
}
