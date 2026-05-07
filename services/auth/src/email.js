const nodemailer = require("nodemailer");

// Create reusable transporter object using the default SMTP transport
// Falls back to a dummy sender if credentials aren't provided
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "dummy@gmail.com",
    pass: process.env.EMAIL_PASS || "dummy-pass",
  },
});

/**
 * Send an OTP email to the user
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
async function sendOTPEmail(to, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[Mock Email] To: ${to} | OTP: ${otp}`);
    return;
  }

  const mailOptions = {
    from: `"CloudCommerceX" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: "Verify Your CloudCommerceX Account",
    text: `Your verification code is: ${otp}\n\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #1c1917; text-align: center;">Welcome to CloudCommerceX!</h2>
        <p style="color: #44403c; font-size: 16px;">To complete your registration, please enter the following verification code:</p>
        <div style="background-color: #f5f5f4; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <strong style="font-size: 24px; letter-spacing: 4px; color: #1c1917;">${otp}</strong>
        </div>
        <p style="color: #78716c; font-size: 14px; text-align: center;">This code will expire in 15 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail };
