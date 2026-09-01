import { Resend } from 'resend';
import { env } from '@/env';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('[Email] Unexpected error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Email verification code
export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0e17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">NEXTORX</h1>
        </div>
        
        <div style="background-color: #141926; border: 1px solid #1e2536; border-radius: 16px; padding: 32px;">
          <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">Verify your email</h2>
          
          <p style="color: #8892a7; font-size: 14px; margin: 0 0 24px 0;">
            ${name ? `Hi ${name},` : 'Hello,'}<br><br>
            Use the code below to verify your email address. This code expires in 15 minutes.
          </p>
          
          <div style="background-color: #0a0e17; border: 1px solid #1e2536; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="color: #00c365; font-size: 32px; font-weight: 800; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #8892a7; font-size: 12px; margin: 0;">
            If you didn't request this, please ignore this email or contact support.
          </p>
        </div>
        
        <p style="color: #5c677f; font-size: 11px; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} NextOrx. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify your email - NextOrx',
    html,
  });
}

// Password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${env.BETTER_AUTH_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0e17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">NEXTORX</h1>
        </div>
        
        <div style="background-color: #141926; border: 1px solid #1e2536; border-radius: 16px; padding: 32px;">
          <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">Reset your password</h2>
          
          <p style="color: #8892a7; font-size: 14px; margin: 0 0 24px 0;">
            ${name ? `Hi ${name},` : 'Hello,'}<br><br>
            Click the button below to reset your password. This link expires in 1 hour.
          </p>
          
          <a href="${resetUrl}" style="display: block; background-color: #00c365; color: #ffffff; font-size: 14px; font-weight: 700; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 12px; margin-bottom: 24px;">
            Reset Password
          </a>
          
          <p style="color: #8892a7; font-size: 12px; margin: 0;">
            If you didn't request this, please ignore this email. Your password won't be changed until you create a new one.
          </p>
        </div>
        
        <p style="color: #5c677f; font-size: 11px; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} NextOrx. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset your password - NextOrx',
    html,
  });
}

// Login notification email
export async function sendLoginNotificationEmail(
  email: string,
  device: string,
  location: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0e17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">NEXTORX</h1>
        </div>
        
        <div style="background-color: #141926; border: 1px solid #1e2536; border-radius: 16px; padding: 32px;">
          <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">New login detected</h2>
          
          <p style="color: #8892a7; font-size: 14px; margin: 0 0 24px 0;">
            ${name ? `Hi ${name},` : 'Hello,'}<br><br>
            We detected a new login to your account:
          </p>
          
          <div style="background-color: #0a0e17; border: 1px solid #1e2536; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #8892a7; font-size: 12px; margin: 0 0 8px 0;">Device</p>
            <p style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">${device}</p>
            
            <p style="color: #8892a7; font-size: 12px; margin: 0 0 8px 0;">Location</p>
            <p style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0;">${location}</p>
          </div>
          
          <p style="color: #8892a7; font-size: 12px; margin: 0;">
            If this wasn't you, please change your password immediately and contact support.
          </p>
        </div>
        
        <p style="color: #5c677f; font-size: 11px; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} NextOrx. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'New login detected - NextOrx',
    html,
  });
}

// Welcome email
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0e17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">NEXTORX</h1>
        </div>
        
        <div style="background-color: #141926; border: 1px solid #1e2536; border-radius: 16px; padding: 32px;">
          <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">Welcome to NextOrx!</h2>
          
          <p style="color: #8892a7; font-size: 14px; margin: 0 0 24px 0;">
            ${name ? `Hi ${name},` : 'Hello,'}<br><br>
            Your account has been created successfully. Start trading with a free demo account to practice your strategies.
          </p>
          
          <a href="${env.BETTER_AUTH_URL}/trade/demo" style="display: block; background-color: #00c365; color: #ffffff; font-size: 14px; font-weight: 700; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 12px; margin-bottom: 24px;">
            Start Trading
          </a>
          
          <p style="color: #8892a7; font-size: 12px; margin: 0;">
            Remember to verify your email and enable 2FA for extra security.
          </p>
        </div>
        
        <p style="color: #5c677f; font-size: 11px; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} NextOrx. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to NextOrx!',
    html,
  });
}
