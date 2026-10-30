// SMS delivery. No provider is wired yet, so OTPs run in clearly-labelled DEMO
// mode: the code is shown on screen instead of being sent. Plug in MSG91 /
// Twilio here and set SMS_PROVIDER to turn demo mode off.
export const SMS_DEMO_MODE = !process.env.SMS_PROVIDER;

export async function sendSms(phone: string, text: string) {
  if (SMS_DEMO_MODE) {
    console.info(`[SMS DEMO] to ${phone}: ${text}`);
    return { delivered: false, demo: true };
  }
  throw new Error(`SMS provider "${process.env.SMS_PROVIDER}" is not implemented yet`);
}
