import { Resend } from 'resend';
import { env } from '../lib/env.js';

let resendClient: Resend | null = null;
if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 're_dummy_resend_api_key') {
  try {
    resendClient = new Resend(env.RESEND_API_KEY);
  } catch (err) {
    console.warn('Could not initialize Resend client:', err);
  }
}

export interface SendReminderEmailParams {
  toEmail?: string;
  customerName: string;
  shopName: string;
  amount: number;
  message?: string;
}

export async function sendReminderEmail(
  params: SendReminderEmailParams
): Promise<{ ok: boolean; messageId?: string; to: string; error?: string }> {
  const targetEmail = params.toEmail || env.DEMO_EMAIL;

  const subject = `[BolBahi] ${params.shopName} se hisaab ka reminder`;
  const formattedAmount = params.amount.toLocaleString('en-IN');
  const customMsg = params.message || 'Kripya apna baaki udhaar chukane ka kasht karein.';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #E9E2D6; border-radius: 16px; padding: 24px; background-color: #FBF7F0;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #E8731A; margin: 0;">बोलबही (BolBahi)</h2>
        <p style="color: #8A7F72; font-size: 14px; margin-top: 4px;">Digital Khata for Kirana Stores</p>
      </div>

      <div style="background: #FFFFFF; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <p style="font-size: 16px; color: #1F1B16; margin: 0 0 10px 0;"><strong>नमस्ते ${params.customerName} ji,</strong></p>
        <p style="font-size: 14px; color: #1F1B16; margin: 0 0 16px 0;"><strong>${params.shopName}</strong> ki taraf se aapka khata hisaab:</p>
        
        <div style="background: #FBE6E1; border-left: 4px solid #C23B22; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #8A7F72;">Kul Baaki Rashi (Total Outstanding)</div>
          <div style="font-size: 24px; font-weight: bold; color: #C23B22;">₹ ${formattedAmount}</div>
        </div>

        <p style="font-size: 13px; color: #8A7F72; margin: 0;">${customMsg}</p>
      </div>

      <p style="font-size: 11px; color: #8A7F72; text-align: center; margin-top: 20px;">
        Yeh reminder ${params.shopName} ke BolBahi voice system dwara bheja gaya hai.
      </p>
    </div>
  `;

  try {
    if (resendClient) {
      const { data, error } = await resendClient.emails.send({
        from: env.MAIL_FROM,
        to: targetEmail,
        subject,
        html,
      });

      if (error) {
        console.warn('[Mailer] Resend API returned error:', error);
        return { ok: false, to: targetEmail, error: error.message };
      }

      console.log(`📧 [Mailer] Sent real email via Resend to ${targetEmail}, id: ${data?.id}`);
      return { ok: true, messageId: data?.id, to: targetEmail };
    } else {
      // Free-tier local simulated real email
      console.log(`📧 [Mailer Simulated/Test] Email dispatched to ${targetEmail} for ${params.customerName}: ₹ ${formattedAmount}`);
      return { ok: true, messageId: `mock_${Date.now()}`, to: targetEmail };
    }
  } catch (err: any) {
    console.error('[Mailer] Send exception:', err);
    return { ok: false, to: targetEmail, error: err.message };
  }
}

