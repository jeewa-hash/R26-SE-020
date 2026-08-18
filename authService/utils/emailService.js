const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send Verification Pending email to provider after registration
 */
async function sendVerificationPendingEmail(to, providerName) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: 'Verification Pending - Work Wave',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #4f46e5;">Hi ${providerName || 'Provider'},</h2>
        <p>Thank you for joining <strong>Work Wave</strong>!</p>
        <p>Your profile is currently under review by our admin team. We are verifying your NIC and details to ensure a secure community. You will receive an email notification as soon as your account is approved.</p>
        <p>Thank you for your patience!</p>
        <br>
        <p>Best Regards,<br><strong>The Work Wave Team</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Verification pending sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send verification pending email:', err.message);
    throw err;
  }
}

/**
 * Send Approval email to provider after admin approval
 */
async function sendApprovalEmail(to, providerName) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: 'Account Approved - Work Wave',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #10b981;">Congratulations ${providerName || 'Provider'}!</h2>
        <p>Your Work Wave account has been <strong>approved</strong> by our admin team.</p>
        <p>You can now log in to the app and start offering your services to customers in your area.</p>
        <p>Welcome aboard!</p>
        <br>
        <p>Best Regards,<br><strong>The Work Wave Team</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Approval sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send approval email:', err.message);
    throw err;
  }
}

/**
 * Send Rejection email to provider after admin rejection
 */
async function sendRejectionEmail(to, providerName, adminNote) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: 'Verification Unsuccessful - Work Wave',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #ef4444;">Hi ${providerName || 'Provider'},</h2>
        <p>We regret to inform you that your Work Wave account verification could not be approved at this time.</p>
        ${adminNote ? `<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Reason:</strong><br>${adminNote}
        </div>` : ''}
        <p>If you believe this was a mistake, please contact our support team or re-register with accurate information.</p>
        <br>
        <p>Best Regards,<br><strong>The Work Wave Team</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Rejection sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send rejection email:', err.message);
    throw err;
  }
}

/**
 * Send High Demand Alert to provider
 */
async function sendHighDemandEmail(to, providerName, category, district, avgDemand, confidence) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: `WorkWave Opportunity: High Demand for ${category} Services!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Hello ${providerName || 'Provider'},</h2>
        <p>We have some exciting news for you!</p>
        <p>Our <strong>WorkWave AI Forecasting System</strong> has detected a significant spike in demand for <strong>${category}</strong> services in your area (<strong>${district}</strong>) for tomorrow.</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111827;">Insight Details:</h3>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;"><strong>Service Category:</strong> ${category}</li>
            <li style="margin-bottom: 8px;"><strong>Predicted Demand Level:</strong> High (${avgDemand})</li>
            <li style="margin-bottom: 0;"><strong>Prediction Confidence:</strong> ${confidence}%</li>
          </ul>
        </div>
        
        <h3 style="color: #111827;">What should you do?</h3>
        <p>We recommend you keep your application open and stay ready to accept incoming service requests. This is a great chance to boost your performance score and earnings.</p>
        <br>
        <p>Best of luck,<br><strong>Team WorkWave</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] High Demand Alert sent to ${to}:`, info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send High Demand Alert:', err.message);
    throw err;
  }
}

module.exports = {
  sendVerificationPendingEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendHighDemandEmail,
};
