const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getHtml(subject, body, button) {
  const btnLink = button?.link || button?.url;
  const btnText = button?.text || button?.label;
  const buttonHtml = btnText && btnLink
    ? `<div style="margin: 28px 0; text-align: center;">
         <a href="${btnLink}" style="background: #000000; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: 800; font-size: 14px; border-radius: 4px; display: inline-block;">
           ${btnText}
         </a>
       </div>`
    : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 20px auto; padding: 24px; border: 2px solid #000000; border-radius: 8px; background: #ffffff;">
      <h2 style="margin: 0 0 6px 0; font-size: 18px; text-transform: uppercase; letter-spacing: -0.02em;">BoxCalc</h2>
      <p style="margin: 0 0 16px 0; font-size: 11px; color: #71717a; text-transform: uppercase; font-family: monospace;">Corrugated Packaging Suite</p>
      <hr style="border: none; border-top: 2px solid #000000; margin: 0 0 20px 0;" />
      
      <h3 style="margin: 0 0 14px 0; font-size: 18px; color: #000000;">${subject}</h3>
      <div style="font-size: 14.5px; line-height: 1.6; color: #18181b;">${body}</div>
      ${buttonHtml}
      
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0 12px 0;" />
      <p style="font-size: 11px; color: #71717a; margin: 0;">© BoxCalc. Automated system notification. Please do not reply to this mail.</p>
    </div>
  `;
}

function getText(subject, body, button) {
  const btnLink = button?.link || button?.url;
  const btnText = button?.text || button?.label;

  const cleanBody = (body || "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();

  let text = `BOXCALC - Corrugated Packaging Suite\n\n${subject}\n\n${cleanBody}`;

  if (btnText && btnLink) {
    text += `\n\n${btnText}: ${btnLink}`;
  }

  text += `\n\n---\n© BoxCalc. Automated system notification. Please do not reply to this email.`;

  return text;
}

async function sendEmail(toEmail, subject, body, button) {
  // Support both object argument sendEmail({ toEmail, subject, body, button }) or positional
  if (typeof toEmail === "object" && toEmail !== null) {
    ({ toEmail, subject, body, button } = toEmail);
  }

  const html = getHtml(subject, body, button);
  const text = getText(subject, body, button);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[mailer dev mode] To: ${toEmail} | Subject: ${subject}`);
    const link = button?.link || button?.url;
    if (link) console.log(`[mailer dev mode] Action Link: ${link}`);
    return { ok: true, devMode: true };
  }

  return transporter.sendMail({
    from: `BoxCalc <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;
