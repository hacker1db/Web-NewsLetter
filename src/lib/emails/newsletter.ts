export function newsletterEmailHtml(body: string, unsubscribeUrl: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>hacker1db newsletter</title>
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

<!-- Content -->
<tr>
<td style="padding: 32px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
${body}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding: 24px 32px; border-top: 1px solid #374151;">
<p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
You're receiving this because you subscribed at newsletter.hacker1db.dev<br>
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
