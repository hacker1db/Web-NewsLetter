export function welcomeEmailHtml(confirmUrl: string, unsubscribeUrl: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Confirm your subscription</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1d21; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1a1d21;">
<tr>
<td align="center" style="padding: 40px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">

<!-- Header -->
<tr>
<td style="padding: 24px 32px; border-bottom: 1px solid #374151;">
<span style="font-family: Monaco, Menlo, 'Courier New', monospace; font-size: 16px; color: #6FC1FF;">$ mail --to hacker1db</span>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding: 40px 32px;">
<h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">Thanks for subscribing!</h1>
<p style="margin: 0 0 32px 0; font-size: 16px; color: #d1d5db; line-height: 1.6;">Click the button below to confirm your subscription and start receiving security posts, dev notes, and hacker stuff.</p>

<!-- CTA Button -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
<tr>
<td style="border-radius: 8px; background-color: #6FC1FF;">
<a href="${confirmUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #1a1d21; text-decoration: none; border-radius: 8px;">Confirm Subscription</a>
</td>
</tr>
</table>

<p style="margin: 32px 0 0 0; font-size: 14px; color: #9ca3af; line-height: 1.6;">If you didn't subscribe to this newsletter, you can safely ignore this email.</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding: 24px 32px; border-top: 1px solid #374151;">
<p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
You're receiving this because you signed up at newsletter.hacker1db.dev<br>
<a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
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
