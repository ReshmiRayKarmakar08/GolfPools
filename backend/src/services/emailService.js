const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const PLATFORM_NAME = 'GolfPools Platform';

const withEmailLayout = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f5f7fb; padding: 20px;">
    <div style="background: #0f1638; border-radius: 10px 10px 0 0; padding: 18px 24px;">
      <div style="color: #8fa9ff; font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase;">${PLATFORM_NAME}</div>
      <h1 style="color: #19d3ff; margin: 8px 0 0; font-size: 28px; line-height: 1.2;">${title}</h1>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; color: #101828;">
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #e6e8ee; margin: 24px 0 16px;" />
      <div style="font-size: 12px; color: #667085;">
        Sent by ${PLATFORM_NAME}
      </div>
    </div>
  </div>
`;

const sendEmail = async (to, subject, html) => {
  if (process.env.GMAIL_APPS_SCRIPT_URL) {
    try {
      const payload = {
        to,
        subject,
        html,
        token: process.env.GMAIL_APPS_SCRIPT_TOKEN || ''
      };

      const response = await fetch(process.env.GMAIL_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Apps Script email failed: ${response.status}`);
      }
      return;
    } catch (err) {
      console.error('[Email] Apps Script send failed, falling back to SMTP:', err.message);
    }
  }

  if (!process.env.SMTP_USER) {
    console.log('[Email] SMTP not configured, skipping:', subject);
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${PLATFORM_NAME}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });
};

const sendWelcomeEmail = async (email, firstName, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await sendEmail(email, 'Welcome to GolfPools', withEmailLayout('Welcome', `
    <p>Hello ${firstName || 'Member'},</p>
    <p>Welcome to GolfPools. Your account has been created successfully.</p>
    <p>Please verify your email to activate all features:</p>
    <a href="${verifyUrl}" style="display: inline-block; background: #19d3ff; color: #001018; padding: 12px 22px; text-decoration: none; border-radius: 8px; margin: 8px 0 16px;">Verify Email</a>
    <p style="font-size: 14px; color: #667085;">If you did not create this account, you can ignore this message.</p>
  `));
};

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail(email, 'Password Reset Request', withEmailLayout('Reset Password', `
    <p>Hello ${firstName || 'Member'},</p>
    <p>We received a request to reset your password.</p>
    <a href="${resetUrl}" style="display: inline-block; background: #19d3ff; color: #001018; padding: 12px 22px; text-decoration: none; border-radius: 8px; margin: 8px 0 16px;">Reset Password</a>
    <p style="font-size: 14px; color: #667085;">This link expires in 1 hour. If you did not request this, ignore this message.</p>
  `));
};

const sendPasswordOtpEmail = async (email, firstName, otpCode) => {
  await sendEmail(email, 'GolfPools Password OTP', withEmailLayout('Password OTP', `
    <p>Hello ${firstName || 'Member'},</p>
    <p>Use this OTP to reset your password:</p>
    <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 20px 0; color: #0f1638;">${otpCode}</div>
    <p style="font-size: 14px; color: #667085;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
  `));
};

const sendWinnerNotification = async (email, firstName, category, amount, month, year) => {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const payoutChoices = [
    'UPI (PhonePe, GPay, Paytm)',
    'Bank Transfer (Account + IFSC)',
    'NFT payout (wallet address)'
  ];
  await sendEmail(email, `Draw Winner Notification - ${monthNames[month-1]} ${year}`, withEmailLayout('Winner Notification', `
      <div style="text-align: center;">
        <p style="font-size: 18px;">You matched <strong>${category}</strong> in the ${monthNames[month-1]} ${year} monthly draw!</p>
        <div style="background: #f0fff4; border: 2px solid #00d4ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="font-size: 32px; font-weight: bold; color: #1a1a2e; margin: 0;">₹${amount.toFixed(2)}</p>
          <p style="color: #666; margin: 5px 0;">Prize Amount</p>
        </div>
        <p>Please log in to your account to upload your proof and claim your winnings.</p>
        <p style="margin-top: 12px; color: #444; font-size: 14px;">
          After proof verification, choose your payout method:
        </p>
        <ul style="text-align: left; display: inline-block; margin: 8px auto 0; color: #333; font-size: 14px;">
          ${payoutChoices.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <a href="${process.env.FRONTEND_URL}/dashboard/winnings" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Claim Your Prize</a>
      </div>
  `));
};

const sendSubscriptionConfirmation = async (email, firstName, planType, amount) => {
  await sendEmail(email, 'Subscription Confirmed', withEmailLayout('Subscription Active', `
        <p>Hi ${firstName}, your ${planType} subscription is now active.</p>
        <p>Amount: <strong>₹${(amount/100).toFixed(2)}</strong> per ${planType === 'monthly' ? 'month' : 'year'}</p>
        <p>You can now enter monthly draws and track your charity contributions.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
  `));
};

const sendSubscriptionCancellation = async (email, firstName, endDate) => {
  await sendEmail(email, 'Subscription Cancellation Scheduled', withEmailLayout('Cancellation Confirmed', `
        <p>Hi ${firstName || 'there'}, your subscription cancellation request is confirmed.</p>
        <p>Your benefits remain active until <strong>${endDate}</strong>.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/subscription" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Subscription</a>
  `));
};

const sendCharityContributionReceipt = async (email, firstName, amount, charityName, planType) => {
  await sendEmail(email, 'Charity Contribution Receipt', withEmailLayout('Contribution Confirmed', `
        <p>Hi ${firstName || 'there'}, thank you for supporting ${charityName || 'your selected charity'}.</p>
        <p>Contribution amount: <strong>₹${Number(amount || 0).toFixed(2)}</strong></p>
        <p>Plan: <strong>${planType || 'subscription'}</strong></p>
        <a href="${process.env.FRONTEND_URL}/dashboard/charity" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Charity Dashboard</a>
  `));
};

const sendDrawResultAnnouncement = async (email, firstName, month, year, isWinner) => {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  await sendEmail(email, `Draw Results Published - ${monthNames[month - 1]} ${year}`, withEmailLayout('Monthly Draw Results', `
        <p>Hi ${firstName || 'there'}, the ${monthNames[month - 1]} ${year} draw results are now live.</p>
        <p>${isWinner ? 'Great news - you have a winning result in this draw.' : 'Check your dashboard to see your draw outcome and stats.'}</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/draws" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Draw Results</a>
  `));
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordOtpEmail,
  sendWinnerNotification,
  sendSubscriptionConfirmation,
  sendSubscriptionCancellation,
  sendCharityContributionReceipt,
  sendDrawResultAnnouncement,
  sendEmail
};
