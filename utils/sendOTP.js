// utils/sendOTP.js
import nodemailer from "nodemailer";
import twilio from "twilio";

// Generate numeric OTP
export const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function toE164(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("92")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+92" + cleaned.slice(1);
  return "+92" + cleaned;
}

// Send OTP via email and SMS
export const sendOTP = async (phone, email, otp) => {
  let smsResult = { sent: false };
  let emailResult = { sent: false };

  // Send email if provided
  if (email) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Blood Donation System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Blood Donation OTP",
        text: `Your OTP for registration is: ${otp}. It will expire in 10 minutes.`,
      });

      console.log(`✅ OTP sent to email: ${email}`);
      emailResult.sent = true;
    } catch (err) {
      console.error("❌ Failed to send OTP email:", err);
    }
  }

  // Send SMS if provided
  if (phone) {
    try {
      const client = getTwilioClient();
      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toE164(phone),
        body: `Your Blood Donation System OTP is: ${otp}. It expires in 10 minutes.`,
      });

      console.log(`✅ OTP sent to phone: ${phone}`);
      smsResult.sent = true;
    } catch (err) {
      console.error("❌ Failed to send OTP SMS:", err.message);
    }
  }

  return { sms: smsResult, email: emailResult };
};