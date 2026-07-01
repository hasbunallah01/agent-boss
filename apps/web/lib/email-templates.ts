// OTP email template — plain HTML, branded with the Agent Boss logo.
//
// Design choices:
// - White background body, simple black accents (per your direction)
// - Logo at the top, large and unmissable
// - Big black code box with white monospace digits — the user needs to read
//   this accurately, so it gets visual weight
// - Mobile-responsive (single column, tappable, ~16px base font)
// - No external CSS (email clients strip <style> blocks aggressively)
// - No background images (poor Outlook/Gmail support)
// - Plain-text fallback for accessibility + spam score

const LOGO_URL =
  process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "") + "/agent-boss-logo.jpg"
    : "https://agent-boss-web.vercel.app/agent-boss-logo.jpg";

export interface OtpEmailInput {
  code: string;
  expiresInMinutes: number;
}

export function otpEmailHtml({ code, expiresInMinutes }: OtpEmailInput): string {
  // Render each digit in its own slot for visual separation. Big, monospace.
  const digitBoxes = code
    .split("")
    .map(
      (d) =>
        `<td style="width:44px;height:64px;background:#000000;color:#FFFFFF;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:36px;font-weight:700;text-align:center;vertical-align:middle;border-radius:8px;">${d}</td>`
    )
    .join('<td style="width:8px;"></td>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Your Agent Boss sign-in code</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0A0A0A;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F4F5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E4E4E7;">

        <!-- Logo header -->
        <tr>
          <td align="center" style="padding:32px 24px 16px 24px;background:#0A0A0A;">
            <img src="${LOGO_URL}" alt="Agent Boss" width="120" height="120" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>

        <!-- Heading -->
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">Your sign-in code</h1>
          </td>
        </tr>

        <!-- Body copy -->
        <tr>
          <td style="padding:8px 32px 24px 32px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#3F3F46;">
              Use this code to sign in to Agent Boss. It expires in ${expiresInMinutes} minutes.
            </p>
          </td>
        </tr>

        <!-- Code box -->
        <tr>
          <td align="center" style="padding:8px 24px 24px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>${digitBoxes}</tr>
            </table>
          </td>
        </tr>

        <!-- Security note -->
        <tr>
          <td style="padding:8px 32px 32px 32px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#71717A;">
              If you didn't request this code, you can safely ignore this email. Someone else may have entered your address by mistake.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 32px;">
            <hr style="border:0;border-top:1px solid #E4E4E7;margin:0;">
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 32px 32px 32px;">
            <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#0A0A0A;letter-spacing:0.5px;">AGENT BOSS</p>
            <p style="margin:0;font-size:11px;color:#A1A1AA;letter-spacing:1px;">AI AGENTS · CREATE · EARN · HIRE · GET PAID</p>
          </td>
        </tr>

      </table>

      <!-- Sub-footer (outside the card) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td align="center" style="padding:16px 24px 0 24px;">
            <p style="margin:0;font-size:11px;color:#A1A1AA;line-height:1.5;">
              You received this because someone entered your email at Agent Boss.
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}

export function otpEmailText({ code, expiresInMinutes }: OtpEmailInput): string {
  return [
    "Your Agent Boss sign-in code",
    "",
    "Use this code to sign in to Agent Boss. It expires in " + expiresInMinutes + " minutes.",
    "",
    "    " + code,
    "",
    "If you didn't request this code, you can safely ignore this email.",
    "",
    "— Agent Boss",
    "AI Agents. Create. Earn. Hire. Get paid.",
  ].join("\n");
}