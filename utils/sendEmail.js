import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    throw new Error("Email credentials are not configured");
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();

  return transporter.sendMail({
    from: `"Blood Donation System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
