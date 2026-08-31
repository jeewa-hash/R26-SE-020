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

/**
 * Send Account Suspension Email when 3 consecutive inquiries are rejected
 */
async function sendConsecutiveRejectionPenaltyEmail(to, providerName, adminNote) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: '⚠️ Account Suspended: 3 Consecutive Inquiries Rejected - Work Wave',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; border: 1px solid #fee2e2; border-radius: 12px;">
        <h2 style="color: #ef4444; margin-top: 0;">Account Temporarily Suspended</h2>
        <p>Dear <strong>${providerName || 'Service Provider'}</strong>,</p>
        <p>This is an automated notice regarding your Work Wave service provider account.</p>
        <p>Your recent service cancellation inquiries (3 consecutive inquiries) have been <strong>REJECTED</strong> by the Administration due to insufficient or invalid justification for missed/cancelled services.</p>
        
        <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
          <strong>Latest Admin Note:</strong><br/>
          <span>${adminNote || 'No valid proof or acceptable explanation was submitted for consecutive service cancellations.'}</span>
        </div>

        <h3 style="color: #b91c1c; margin-bottom: 8px;">Suspension Policy Enforcement:</h3>
        <ul style="padding-left: 20px; line-height: 1.6;">
          <li>Your account has been <strong>automatically suspended for 1 Month (30 Days)</strong>.</li>
          <li>You cannot send new proposals or accept new bookings during this suspension.</li>
        </ul>

        <div style="background-color: #f3f4f6; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px dashed #d1d5db;">
          <h4 style="margin-top: 0; color: #111827;">Action Required to Appeal Suspension:</h4>
          <p style="margin-bottom: 8px;">If you have valid justifications, official medical documentation, or emergency evidence to appeal this suspension, please email your explanation and evidence directly to our governance team:</p>
          <p style="font-size: 16px; font-weight: bold; color: #4f46e5; margin: 10px 0;">
            📧 nethmiumaya5@gmail.com
          </p>
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">The administration will review your appeal and may manually reinstate your account if your justification is valid.</p>
        </div>

        <p style="font-size: 13px; color: #6b7280;">If no appeal is approved, your account will automatically be reinstated after the 1-month penalty period expires.</p>
        <br/>
        <p>Best regards,<br/><strong>Work Wave Governance & Reliability Team</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Consecutive rejection penalty email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send consecutive rejection penalty email:', err.message);
    throw err;
  }
}

/**
 * Send Password Reset OTP email to Administrator
 */
async function sendAdminPasswordResetOTPEmail(to, adminName, otp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: '🔐 Admin Password Reset Verification Code - WorkWave',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">WorkWave</h2>
          <span style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Admin Security Portal</span>
        </div>

        <div style="background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <h3 style="color: #1e1b4b; margin: 0 0 8px 0; font-size: 18px;">Password Reset Request</h3>
          <p style="color: #475569; font-size: 14px; margin: 0;">Hi <strong>${adminName || 'Administrator'}</strong>, we received a request to reset your WorkWave admin portal password.</p>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6;">Use the 6-digit verification code below to authorize your password change. This code is valid for <strong>10 minutes</strong>.</p>

        <div style="background-color: #0f172a; border-radius: 12px; padding: 22px; text-align: center; margin: 26px 0; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', Courier, monospace;">${otp}</span>
        </div>

        <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 12.5px; color: #9f1239; margin: 0; line-height: 1.5;">
            <strong>Security Warning:</strong> Never share this code with anyone. WorkWave support personnel will never ask for your verification code. If you did not request this, please contact the security governance team immediately.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-top: 28px; line-height: 1.5;">
          Best regards,<br>
          <strong style="color: #1e1b4b;">WorkWave Security & Governance Team</strong>
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Admin Password Reset OTP sent to ${to}:`, info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send Admin Password Reset OTP email:', err.message);
    throw err;
  }
}

/**
 * Send Password Reset Success notification email to Administrator
 */
async function sendAdminPasswordResetSuccessEmail(to, adminName) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to,
    subject: '✅ Admin Password Reset Successful - WorkWave',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #10b981; margin: 0; font-size: 26px; font-weight: 800;">Password Changed</h2>
          <span style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">WorkWave Admin Security</span>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hi <strong>${adminName || 'Administrator'}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your WorkWave Administrator account password has been <strong>successfully reset</strong>. You can now sign in to the administrative portal with your new password.</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            <strong>Time:</strong> ${new Date().toUTCString()}<br/>
            <strong>Action:</strong> Password Reset via Verified Email OTP
          </p>
        </div>

        <p style="font-size: 12.5px; color: #e11d48; margin-top: 20px;">
          If you did not perform this change, your administrator account may be compromised. Please take immediate action.
        </p>

        <p style="font-size: 13px; color: #64748b; margin-top: 24px; line-height: 1.5;">
          Best regards,<br>
          <strong style="color: #1e1b4b;">WorkWave Security & Governance Team</strong>
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Admin Password Reset Success sent to ${to}:`, info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send Admin Password Reset Success email:', err.message);
  }
}

module.exports = {
  sendVerificationPendingEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendHighDemandEmail,
  sendConsecutiveRejectionPenaltyEmail,
  sendAdminPasswordResetOTPEmail,
  sendAdminPasswordResetSuccessEmail,
  transporter,
};
