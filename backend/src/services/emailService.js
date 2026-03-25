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
    from: `"Golf Charity Platform" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });
};

const sendWelcomeEmail = async (email, firstName, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await sendEmail(email, 'Welcome to Golf Charity Platform! 🏌️', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0;">Welcome, ${firstName}! 🎉</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Thank you for joining the Golf Charity Platform. You're now part of a community that plays golf and gives back!</p>
        <p>Please verify your email to get started:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
        <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
      </div>
    </div>
  `);
};

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail(email, 'Password Reset Request', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0;">Reset Your Password</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi ${firstName}, we received a request to reset your password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `);
};

const sendPasswordOtpEmail = async (email, firstName, otpCode) => {
  await sendEmail(email, 'GolfPools Password OTP', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0;">Password Reset OTP</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi ${firstName || 'there'}, use this OTP to reset your password:</p>
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 20px 0; color: #1a1a2e;">${otpCode}</div>
        <p style="color: #666; font-size: 14px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    </div>
  `);
};

const sendWinnerNotification = async (email, firstName, category, amount, month, year) => {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const payoutChoices = [
    'UPI (PhonePe, GPay, Paytm)',
    'Bank Transfer (Account + IFSC)',
    'NFT payout (wallet address)'
  ];
  await sendEmail(email, `🎉 You won the ${monthNames[month-1]} ${year} Draw!`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">🏆 Congratulations, ${firstName}!</h1>
      </div>
      <div style="padding: 30px; text-align: center;">
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
    </div>
  `);
};

const sendSubscriptionConfirmation = async (email, firstName, planType, amount) => {
  await sendEmail(email, 'Subscription Confirmed ✅', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0;">Subscription Active!</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi ${firstName}, your ${planType} subscription is now active.</p>
        <p>Amount: <strong>₹${(amount/100).toFixed(2)}</strong> per ${planType === 'monthly' ? 'month' : 'year'}</p>
        <p>You can now enter monthly draws and track your charity contributions.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
      </div>
    </div>
  `);
};

const sendSubscriptionCancellation = async (email, firstName, endDate) => {
  await sendEmail(email, 'Subscription Cancellation Scheduled', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">Cancellation Confirmed</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi ${firstName || 'there'}, your subscription cancellation request is confirmed.</p>
        <p>Your benefits remain active until <strong>${endDate}</strong>.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/subscription" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Subscription</a>
      </div>
    </div>
  `);
};

const sendCharityContributionReceipt = async (email, firstName, amount, charityName, planType) => {
  await sendEmail(email, 'Your Charity Contribution Receipt', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0;">Contribution Confirmed</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi ${firstName || 'there'}, thank you for supporting ${charityName || 'your selected charity'}.</p>
        <p>Contribution amount: <strong>₹${Number(amount || 0).toFixed(2)}</strong></p>
        <p>Plan: <strong>${planType || 'subscription'}</strong></p>
        <a href="${process.env.FRONTEND_URL}/dashboard/charity" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Charity Dashboard</a>
      </div>
    </div>
  `);
};

const sendDrawResultAnnouncement = async (email, firstName, month, year, isWinner) => {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  await sendEmail(email, `Draw Results Published - ${monthNames[month - 1]} ${year}`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0;">Monthly Draw Results</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi ${firstName || 'there'}, the ${monthNames[month - 1]} ${year} draw results are now live.</p>
        <p>${isWinner ? 'Great news - you have a winning result in this draw.' : 'Check your dashboard to see your draw outcome and stats.'}</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/draws" style="display: inline-block; background: #00d4ff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Draw Results</a>
      </div>
    </div>
  `);
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
