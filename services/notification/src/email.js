const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getStatusDetails(status) {
  switch (status) {
    case "CREATED":
      return { color: "#d97706", text: "Order Received", description: "We have received your order and are getting it ready." };
    case "PAID":
      return { color: "#16a34a", text: "Payment Successful", description: "Your payment has been confirmed. The seller will begin processing your order soon." };
    case "PROCESSING":
      return { color: "#2563eb", text: "Processing", description: "The seller is currently preparing your items for shipment." };
    case "SHIPPED":
      return { color: "#4f46e5", text: "Shipped", description: "Great news! Your order has been shipped and is on its way to you." };
    case "OUT_FOR_DELIVERY":
      return { color: "#ea580c", text: "Out for Delivery", description: "Your package is out for delivery and will arrive today." };
    case "DELIVERED":
      return { color: "#10b981", text: "Delivered", description: "Your order has been delivered. We hope you enjoy your purchase!" };
    case "CANCELLED":
      return { color: "#dc2626", text: "Cancelled", description: "Your order has been cancelled. If you have any questions, please contact support." };
    default:
      return { color: "#44403c", text: status, description: "Your order status has been updated." };
  }
}

async function sendOrderStatusEmail(toEmail, orderId, status) {
  // If credentials aren't set, log it and return (useful for dev without credentials)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Mock Email] To: ${toEmail} | Order: ${orderId} | Status: ${status}`);
    return;
  }

  const details = getStatusDetails(status);

  const html = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f7; padding: 40px 20px;">
      <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #e5e5e5;">
        <h1 style="color: #1c1917; font-size: 24px; margin-bottom: 8px; font-weight: 700;">CloudCommerceX</h1>
        <p style="color: #78716c; font-size: 16px; margin-bottom: 32px;">Order Update</p>
        
        <div style="background-color: #fafaf9; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
          <p style="color: #78716c; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order #${orderId}</p>
          <p style="color: ${details.color}; font-size: 28px; margin: 0; font-weight: 700;">${details.text}</p>
        </div>

        <p style="color: #44403c; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
          ${details.description}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
        
        <p style="color: #a8a29e; font-size: 14px; margin: 0;">
          Thank you for shopping on CloudCommerceX!
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"CloudCommerceX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Order Update: ${details.text} (Order #${orderId})`,
    html,
  });
}

module.exports = { sendOrderStatusEmail };
