import nodemailer from "nodemailer";

function getSmtpTransporter() {
  const user = (
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    process.env.SMTP_USER
  )?.trim();
  const pass = (
    process.env.EMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS
  )?.trim();

  if (!user || !pass) {
    const error = new Error("SMTP email credentials are not configured.");
    error.code = "EMAIL_CONFIG_MISSING";
    throw error;
  }

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);

  if (
    (process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE || "").toLowerCase() === "gmail" ||
    host === "smtp.gmail.com"
  ) {
    return nodemailer.createTransport({
      service: "gmail",
      family: 4,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    family: 4,
    secure:
      process.env.EMAIL_SECURE === "true" ||
      process.env.SMTP_SECURE === "true" ||
      port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  // Render Free blocks outbound SMTP ports. Resend uses HTTPS (port 443).
  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Blood Needer <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      const error = new Error(`Resend rejected the email (${response.status}): ${details}`);
      error.code = `RESEND_${response.status}`;
      throw error;
    }

    return response.json();
  }

  return getSmtpTransporter().sendMail({
    from: `"Blood Donation System" <${process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
}
