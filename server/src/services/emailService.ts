import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Escapes unsafe HTML characters to prevent HTML/XSS injection in emails.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface WelcomeEmailOptions {
  email: string;
  name?: string | null;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: 'resend' | 'simulated';
  error?: string;
}

/**
 * Generates the royal Ethniz Couture luxury welcome email HTML.
 */
export function generateWelcomeEmailHtml(customerName?: string | null): string {
  const safeName = customerName?.trim() ? escapeHtml(customerName.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const shopUrl = `${storefrontUrl}/shop`;
  const contactUrl = `${storefrontUrl}/contact`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ethniz Couture</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  
  <!-- Preheader preview text (hidden in display) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FAF7F2; opacity: 0;">
    A little elegance, a lot of heritage. We're delighted you're here.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 30px 15px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #DFC89D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.08);">
          
          <!-- Deep Burgundy Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #3E1A1E 0%, #2B0C10 100%); background-color: #3E1A1E; padding: 40px 30px 32px; border-bottom: 3px solid #C6A15D;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, Garamond, 'Times New Roman', serif; font-size: 30px; font-weight: bold; letter-spacing: 0.15em; color: #FFFFFF; text-transform: uppercase; display: inline-block;">
                      ETHNIZ<span style="color: #DFC89D; font-weight: 300; font-style: italic; text-transform: lowercase; font-size: 26px;">Couture</span>
                    </span>
                    <div style="width: 48px; height: 1px; background-color: #C6A15D; margin: 12px auto 10px;"></div>
                    <span style="font-size: 10px; font-weight: 600; letter-spacing: 0.25em; color: #DFC89D; text-transform: uppercase; display: block;">
                      Wear Your Heritage. Own Your Style.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Body Content -->
          <tr>
            <td style="padding: 42px 36px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Salutation -->
                <tr>
                  <td style="font-family: Georgia, Garamond, 'Times New Roman', serif; font-size: 20px; font-weight: bold; color: #3E1A1E; padding-bottom: 20px;">
                    Dear ${safeName},
                  </td>
                </tr>

                <!-- Paragraph 1 -->
                <tr>
                  <td style="font-size: 15px; line-height: 1.7; color: #3F3F46; padding-bottom: 16px;">
                    Welcome to Ethniz Couture.
                  </td>
                </tr>

                <!-- Paragraph 2 -->
                <tr>
                  <td style="font-size: 15px; line-height: 1.7; color: #3F3F46; padding-bottom: 16px;">
                    We're delighted to have you with us.
                  </td>
                </tr>

                <!-- Paragraph 3 -->
                <tr>
                  <td style="font-size: 15px; line-height: 1.7; color: #3F3F46; padding-bottom: 16px;">
                    We believe every outfit tells a story — of heritage, individuality and the confidence to express who you are.
                  </td>
                </tr>

                <!-- Paragraph 4 -->
                <tr>
                  <td style="font-size: 15px; line-height: 1.7; color: #3F3F46; padding-bottom: 22px;">
                    From everyday elegance to celebrations worth remembering, we invite you to discover styles thoughtfully chosen to make every moment feel special.
                  </td>
                </tr>

                <!-- Paragraph 5 -->
                <tr>
                  <td style="font-size: 15px; line-height: 1.7; color: #3F3F46; font-style: italic; font-family: Georgia, Garamond, serif; padding-bottom: 30px;">
                    Your journey with us begins here.
                  </td>
                </tr>

                <!-- Call To Action Button -->
                <tr>
                  <td align="center" style="padding-bottom: 34px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${shopUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="18%" strokecolor="#C6A15D" fillcolor="#3E1A1E">
                      <w:anchorlock/>
                      <center style="color:#DFC89D;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">EXPLORE THE COLLECTION</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${shopUrl}" target="_blank" style="display: inline-block; background-color: #3E1A1E; color: #DFC89D; border: 1px solid #C6A15D; padding: 16px 36px; border-radius: 8px; font-size: 12px; font-weight: bold; letter-spacing: 0.18em; text-transform: uppercase; text-decoration: none; box-shadow: 0 4px 14px rgba(62, 26, 30, 0.25); mso-hide: all;">
                      EXPLORE THE COLLECTION
                    </a>
                  </td>
                </tr>

                <!-- Closing Signature -->
                <tr>
                  <td style="font-size: 14px; line-height: 1.7; color: #52525B; padding-top: 10px; border-top: 1px solid #F4EBE1;">
                    Thank you for becoming part of our world.
                    <br><br>
                    With warmth,<br>
                    <strong style="color: #3E1A1E;">Team Ethniz Couture</strong>
                    <br><br>
                    <span style="font-size: 11px; letter-spacing: 0.15em; color: #84642C; text-transform: uppercase; font-weight: 600;">
                      Wear Your Heritage. Own Your Style.
                    </span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #FAF7F2; padding: 24px 30px; border-top: 1px solid #DFC89D;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 11px; color: #71717A; line-height: 1.6;">
                    <strong style="color: #3E1A1E;">Ethniz Couture Atelier</strong>
                    <br>
                    Handcrafted Varanasi Silks &bull; Royal Bridal Lehengas &bull; Heritage Sherwanis
                    <br><br>
                    <a href="${storefrontUrl}" target="_blank" style="color: #84642C; text-decoration: none; font-weight: 600;">Visit Boutique</a>
                    &nbsp;&bull;&nbsp;
                    <a href="${shopUrl}" target="_blank" style="color: #84642C; text-decoration: none; font-weight: 600;">Handloom Catalog</a>
                    &nbsp;&bull;&nbsp;
                    <a href="${contactUrl}" target="_blank" style="color: #84642C; text-decoration: none; font-weight: 600;">Atelier Concierge</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Generates the clean plain-text fallback for the welcome email.
 */
export function generateWelcomeEmailText(customerName?: string | null): string {
  const safeName = customerName?.trim() ? customerName.trim() : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const shopUrl = `${storefrontUrl}/shop`;

  return `Dear ${safeName},

Welcome to Ethniz Couture.

We're delighted to have you with us.

We believe every outfit tells a story — of heritage, individuality and the confidence to express who you are.

From everyday elegance to celebrations worth remembering, we invite you to discover styles thoughtfully chosen to make every moment feel special.

Your journey with us begins here.

Explore the Collection: ${shopUrl}

Thank you for becoming part of our world.

With warmth,
Team Ethniz Couture

Wear Your Heritage. Own Your Style.

---
Ethniz Couture Atelier
Visit: ${storefrontUrl}
Concierge: ${storefrontUrl}/contact
`;
}

class EmailService {
  /**
   * Dispatches the luxury welcome email to a newly created customer.
   */
  async sendWelcomeEmail(options: WelcomeEmailOptions): Promise<EmailSendResult> {
    const { email, name } = options;
    const subject = 'Welcome to Ethniz Couture — Your Style Story Begins';
    const html = generateWelcomeEmailHtml(name);
    const text = generateWelcomeEmailText(name);

    // If Resend API key is configured, send via Resend REST API
    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [email],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend email delivery error response', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Luxury welcome email sent successfully via Resend to ${email} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send welcome email via Resend to ${email}:`, err.message);
        throw err;
      }
    }

    // In local development or testing without live API keys, perform simulated verified dispatch
    logger.info(`[EMAIL SIMULATOR] Luxury welcome email rendered for ${email} (Name: ${name || 'Patron'})`);
    logger.info(`[EMAIL SIMULATOR] Subject: "${subject}" | From: ${config.emailFrom}`);

    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the luxury order confirmation receipt email to the patron.
   */
  async sendOrderConfirmationEmail(options: OrderConfirmationEmailOptions): Promise<EmailSendResult> {
    const { customerEmail, customerName, orderNumber } = options;
    const subject = `Order Confirmed: ${orderNumber} — Ethniz Couture`;
    const html = generateOrderConfirmationEmailHtml(options);
    const text = generateOrderConfirmationEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [customerEmail],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend order confirmation delivery error response', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Luxury order confirmation email sent successfully via Resend to ${customerEmail} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send order confirmation email via Resend to ${customerEmail}:`, err.message);
        throw err;
      }
    }

    // In local development or testing without live API keys, perform simulated verified dispatch
    logger.info(`[EMAIL SIMULATOR] Luxury order confirmation email rendered for ${customerEmail} (Name: ${customerName}, Order: ${orderNumber}, Total: ₹${options.totalAmount})`);
    logger.info(`[EMAIL SIMULATOR] Subject: "${subject}" | From: ${config.emailFrom}`);

    return {
      success: true,
      messageId: `sim_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the 6-digit OTP email for password recovery.
   */
  async sendPasswordResetOtpEmail(options: PasswordResetEmailOptions): Promise<EmailSendResult> {
    const { email, name, otp } = options;
    const subject = `Your Ethniz Couture Verification Code: ${otp}`;
    const html = generatePasswordResetOtpEmailHtml(options);
    const text = generatePasswordResetOtpEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [email],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend password reset OTP delivery error', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Password reset OTP email sent successfully via Resend to ${email} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send password reset OTP via Resend to ${email}:`, err.message);
        throw err;
      }
    }

    logger.info(`[EMAIL SIMULATOR] Password reset OTP email rendered for ${email} (Name: ${name || 'Patron'}, OTP: ${otp})`);
    logger.info(`[EMAIL SIMULATOR] Subject: "${subject}" | From: ${config.emailFrom}`);

    return {
      success: true,
      messageId: `sim_otp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the security confirmation email after password has been successfully reset.
   */
  async sendPasswordResetSuccessEmail(options: PasswordResetSuccessEmailOptions): Promise<EmailSendResult> {
    const { email, name } = options;
    const subject = 'Your Ethniz Couture Password Has Been Successfully Updated';
    const html = generatePasswordResetSuccessEmailHtml(options);
    const text = generatePasswordResetSuccessEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [email],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend password reset confirmation error', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Password reset confirmation sent successfully via Resend to ${email} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send password reset confirmation to ${email}:`, err.message);
        throw err;
      }
    }

    logger.info(`[EMAIL SIMULATOR] Password reset confirmation email rendered for ${email}`);
    return {
      success: true,
      messageId: `sim_reset_ok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the cancellation confirmation email to the patron.
   */
  async sendOrderCancellationEmail(options: OrderCancellationEmailOptions): Promise<EmailSendResult> {
    const { customerEmail, customerName, orderNumber } = options;
    const subject = `Order Cancelled: ${orderNumber} — Ethniz Couture`;
    const html = generateOrderCancellationEmailHtml(options);
    const text = generateOrderCancellationEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [customerEmail],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend order cancellation email delivery error', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Order cancellation email sent successfully via Resend to ${customerEmail} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send order cancellation email via Resend to ${customerEmail}:`, err.message);
        throw err;
      }
    }

    logger.info(`[EMAIL SIMULATOR] Order cancellation email rendered for ${customerEmail} (Order: ${orderNumber})`);
    return {
      success: true,
      messageId: `sim_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the return / exchange request receipt email to the patron.
   */
  async sendReturnRequestEmail(options: ReturnRequestEmailOptions): Promise<EmailSendResult> {
    const { customerEmail, customerName, orderNumber } = options;
    const subject = `Return Request Received: ${orderNumber} — Ethniz Couture`;
    const html = generateReturnRequestEmailHtml(options);
    const text = generateReturnRequestEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [customerEmail],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend return request email delivery error', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Return request email sent successfully via Resend to ${customerEmail} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send return request email via Resend to ${customerEmail}:`, err.message);
        throw err;
      }
    }

    logger.info(`[EMAIL SIMULATOR] Return request email rendered for ${customerEmail} (Order: ${orderNumber}, Resolution: ${options.resolution})`);
    return {
      success: true,
      messageId: `sim_return_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the return decision (approval with reverse pickup or polite rejection) email to the patron.
   */
  async sendReturnDecisionEmail(options: ReturnDecisionEmailOptions): Promise<EmailSendResult> {
    const { customerEmail, orderNumber, decision } = options;
    const isApproved = decision === 'APPROVED';
    const subject = isApproved
      ? `Return Request Approved: Order ${orderNumber} — Reverse Pickup Scheduled`
      : `Update Regarding Return Request: Order ${orderNumber} — Ethniz Couture`;
    const html = generateReturnDecisionEmailHtml(options);
    const text = generateReturnDecisionEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [customerEmail],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend return decision email delivery error', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Return decision (${decision}) email sent successfully via Resend to ${customerEmail} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send return decision email via Resend to ${customerEmail}:`, err.message);
        throw err;
      }
    }

    logger.info(`[EMAIL SIMULATOR] Return decision (${decision}) email rendered for ${customerEmail} (Order: ${orderNumber})`);
    return {
      success: true,
      messageId: `sim_return_decision_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }

  /**
   * Dispatches the official atelier response email to a patron's contact inquiry.
   */
  async sendContactReplyEmail(options: ContactReplyEmailOptions): Promise<EmailSendResult> {
    const { customerEmail, originalSubject } = options;
    const subject = `Re: ${originalSubject} — Ethniz Couture Atelier`;
    const html = generateContactReplyEmailHtml(options);
    const text = generateContactReplyEmailText(options);

    if (config.emailApiKey && config.nodeEnv !== 'test') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [customerEmail],
            subject,
            html,
            text
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (!response.ok) {
          logger.error('Resend contact reply email delivery error', { status: response.status, data });
          throw new Error(data?.message || `Resend email delivery failed with status ${response.status}`);
        }

        logger.info(`Contact reply email sent successfully via Resend to ${customerEmail} [ID: ${data.id}]`);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend'
        };
      } catch (err: any) {
        logger.error(`Failed to send contact reply email via Resend to ${customerEmail}:`, err.message);
        if (config.nodeEnv !== 'production') {
          logger.warn(`Falling back to simulated email dispatch in ${config.nodeEnv} environment`);
          return {
            success: true,
            messageId: `sim_contact_reply_fallback_${Date.now()}`,
            provider: 'simulated'
          };
        }
        throw err;
      }
    }

    logger.info(`[EMAIL SIMULATOR] Contact inquiry reply email rendered for ${customerEmail} (Subject: Re: ${originalSubject})`);
    return {
      success: true,
      messageId: `sim_contact_reply_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: 'simulated'
    };
  }
}

export interface OrderConfirmationEmailItem {
  productName: string;
  productImage?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderConfirmationEmailOptions {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingApartment?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry?: string;
  subtotal: number;
  discountAmount?: number;
  shippingFee?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: string;
  couponCode?: string | null;
  estimatedDeliveryDate?: string | Date | null;
  items: OrderConfirmationEmailItem[];
}

const formatInrAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export function generateOrderConfirmationEmailHtml(options: OrderConfirmationEmailOptions): string {
  const safeName = options.customerName?.trim() ? escapeHtml(options.customerName.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const trackingUrl = `${storefrontUrl}/order-tracking?orderId=${options.orderId}`;
  const addressLines = [
    escapeHtml(options.shippingStreet),
    options.shippingApartment ? escapeHtml(options.shippingApartment) : '',
    `${escapeHtml(options.shippingCity)}, ${escapeHtml(options.shippingState)} - ${escapeHtml(options.shippingPincode)}`,
    escapeHtml(options.shippingCountry || 'India')
  ].filter(Boolean).join('<br>');

  const itemsHtml = options.items.map((item) => `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #F0EAE1; vertical-align: top;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width: 56px; vertical-align: top; padding-right: 14px;">
              ${item.productImage ? `
                <img src="${escapeHtml(item.productImage)}" alt="${escapeHtml(item.productName)}" width="56" height="70" style="object-fit: cover; border-radius: 6px; border: 1px solid #DFC89D; display: block;" />
              ` : `
                <div style="width: 56px; height: 70px; background-color: #FAF7F2; border: 1px solid #DFC89D; border-radius: 6px; text-align: center; line-height: 70px; font-size: 10px; color: #84642C; font-weight: bold;">ETHNIZ</div>
              `}
            </td>
            <td style="vertical-align: top;">
              <div style="font-size: 14px; font-weight: 600; color: #3E1A1E; line-height: 1.35;">${escapeHtml(item.productName)}</div>
              <div style="font-size: 11px; color: #71717A; margin-top: 4px;">
                ${item.size ? `Size: <strong>${escapeHtml(item.size)}</strong>` : ''}
                ${item.color ? ` &bull; Color: <strong>${escapeHtml(item.color)}</strong>` : ''}
              </div>
              <div style="font-size: 12px; color: #84642C; margin-top: 4px; font-weight: 500;">
                Qty: ${item.quantity} &times; ${formatInrAmount(item.price)}
              </div>
            </td>
            <td align="right" style="vertical-align: top; font-weight: bold; font-size: 14px; color: #3E1A1E;">
              ${formatInrAmount(item.total)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — ${escapeHtml(options.orderNumber)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #27272A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #DFC89D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.08);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #3E1A1E 0%, #2B0C10 100%); background-color: #3E1A1E; padding: 36px 30px 28px; border-bottom: 3px solid #C6A15D;">
              <span style="font-family: Georgia, Garamond, serif; font-size: 28px; font-weight: bold; letter-spacing: 0.15em; color: #FFFFFF; text-transform: uppercase; display: inline-block;">
                ETHNIZ<span style="color: #DFC89D; font-weight: 300; font-style: italic; text-transform: lowercase; font-size: 24px;">Couture</span>
              </span>
              <div style="width: 44px; height: 1px; background-color: #C6A15D; margin: 10px auto 8px;"></div>
              <span style="font-size: 10px; font-weight: 600; letter-spacing: 0.25em; color: #DFC89D; text-transform: uppercase; display: block;">
                Order Confirmation Receipt
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <div style="font-family: Georgia, Garamond, serif; font-size: 20px; font-weight: bold; color: #3E1A1E; margin-bottom: 12px;">
                Thank you for your order, ${safeName}
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #52525B; margin: 0 0 24px;">
                Your order <strong style="color: #3E1A1E;">${escapeHtml(options.orderNumber)}</strong> has been confirmed. Our master karigars and atelier specialists are preparing your garments with artisanal care.
              </p>

              <!-- Order Snapshot Banner -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; border: 1px solid #DFC89D; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; color: #71717A; line-height: 1.6;">
                          Order: <strong style="color: #3E1A1E;">${escapeHtml(options.orderNumber)}</strong><br>
                          Payment: <strong style="color: #3E1A1E;">${escapeHtml(options.paymentMethod === 'COD' ? 'Cash on Delivery (Pay on Arrival)' : options.paymentMethod)}</strong>
                        </td>
                        <td align="right" style="font-size: 12px; color: #71717A; line-height: 1.6;">
                          Amount: <strong style="color: #3E1A1E; font-size: 16px;">${formatInrAmount(options.totalAmount)}</strong><br>
                          Status: <span style="color: #047857; font-weight: bold;">CONFIRMED</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Itemized Items -->
              <div style="font-family: Georgia, serif; font-size: 15px; font-weight: bold; color: #3E1A1E; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #DFC89D;">
                Order Summary
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                ${itemsHtml}
              </table>

              <!-- Pricing Calculation -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; font-size: 13px; color: #52525B;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal</td>
                  <td align="right" style="padding: 4px 0;">${formatInrAmount(options.subtotal)}</td>
                </tr>
                ${options.discountAmount && options.discountAmount > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #047857;">Coupon Discount ${options.couponCode ? `(${escapeHtml(options.couponCode)})` : ''}</td>
                    <td align="right" style="padding: 4px 0; color: #047857;">-${formatInrAmount(options.discountAmount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">Insured Express Shipping</td>
                  <td align="right" style="padding: 4px 0;">${options.shippingFee && options.shippingFee > 0 ? formatInrAmount(options.shippingFee) : 'Complimentary'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; font-weight: bold; color: #3E1A1E; border-top: 1px solid #E4E4E7;">Total</td>
                  <td align="right" style="padding: 10px 0; font-size: 16px; font-weight: bold; color: #3E1A1E; border-top: 1px solid #E4E4E7;">${formatInrAmount(options.totalAmount)}</td>
                </tr>
              </table>

              <!-- Shipping Destination -->
              <div style="background-color: #FAF7F2; border-left: 3px solid #C6A15D; padding: 14px 18px; border-radius: 4px; margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #84642C; margin-bottom: 4px;">
                  Delivering To
                </div>
                <div style="font-size: 13px; color: #3E1A1E; font-weight: 600;">${safeName} &bull; ${escapeHtml(options.customerPhone)}</div>
                <div style="font-size: 12px; color: #52525B; line-height: 1.5; margin-top: 2px;">${addressLines}</div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${trackingUrl}" style="display: inline-block; background-color: #3E1A1E; color: #FFFFFF; font-size: 13px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 9999px; border: 1px solid #C6A15D; box-shadow: 0 4px 12px rgba(62, 26, 30, 0.2);">
                      Track Your Order Live &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- WhatsApp Concierge Callout -->
              <p style="font-size: 12px; line-height: 1.6; color: #71717A; text-align: center; margin: 0; padding-top: 16px; border-top: 1px solid #F4F4F5;">
                Need custom sleeve length, blouse alterations, or urgent delivery date? Reply to this email or contact our atelier team on WhatsApp at <strong>+91 98200 12345</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #FAF7F2; padding: 24px 30px; border-top: 1px solid #DFC89D; font-size: 11px; color: #71717A;">
              <p style="margin: 0 0 6px; font-weight: 600; color: #3E1A1E;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0 0 6px;">Wear Your Heritage. Own Your Style.</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Visit Storefront</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateOrderConfirmationEmailText(options: OrderConfirmationEmailOptions): string {
  const safeName = options.customerName?.trim() || 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const trackingUrl = `${storefrontUrl}/order-tracking?orderId=${options.orderId}`;

  const itemsList = options.items.map((item) =>
    `- ${item.productName} (Qty: ${item.quantity}${item.size ? `, Size: ${item.size}` : ''}${item.color ? `, Color: ${item.color}` : ''}) — ${formatInrAmount(item.total)}`
  ).join('\n');

  return `Dear ${safeName},

Thank you for choosing Ethniz Couture.

Your order ${options.orderNumber} has been successfully confirmed.

ORDER SUMMARY:
${itemsList}

Subtotal: ${formatInrAmount(options.subtotal)}
Discount: ${options.discountAmount && options.discountAmount > 0 ? `-${formatInrAmount(options.discountAmount)}` : '₹0'}
Shipping: ${options.shippingFee && options.shippingFee > 0 ? formatInrAmount(options.shippingFee) : 'Complimentary'}
Total Amount: ${formatInrAmount(options.totalAmount)}
Payment Method: ${options.paymentMethod}

DELIVERING TO:
${safeName} (${options.customerPhone})
${options.shippingStreet}${options.shippingApartment ? `, ${options.shippingApartment}` : ''}
${options.shippingCity}, ${options.shippingState} - ${options.shippingPincode}

TRACK YOUR ORDER LIVE:
${trackingUrl}

Have questions or custom fitting inquiries?
Contact our atelier team on WhatsApp at +91 98200 12345 or reply to this email.

With warmth,
Team Ethniz Couture
Wear Your Heritage. Own Your Style.
`;
}

export interface PasswordResetEmailOptions {
  email: string;
  name?: string | null;
  otp: string;
  expiresMinutes?: number;
}

export interface PasswordResetSuccessEmailOptions {
  email: string;
  name?: string | null;
}

/**
 * Generates the royal luxury OTP verification email HTML.
 */
export function generatePasswordResetOtpEmailHtml(options: PasswordResetEmailOptions): string {
  const safeName = options.name?.trim() ? escapeHtml(options.name.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const expires = options.expiresMinutes || 15;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code — Ethniz Couture</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FAF7F2; opacity: 0;">
    Your Ethniz Couture verification code is ${options.otp}. Valid for ${expires} minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 36px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.06); border: 1px solid #EBE4D8;">
          
          <!-- Atelier Header Banner -->
          <tr>
            <td style="background-color: #3E1A1E; padding: 36px 30px; text-align: center; border-bottom: 3px solid #C5A262;">
              <h1 style="margin: 0; color: #FAF7F2; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
                ETHNIZ COUTURE
              </h1>
              <p style="margin: 8px 0 0 0; color: #D4AF37; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;">
                ROYAL ATELIER &bull; SECURITY VERIFICATION
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px 36px 30px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #27272A;">
                Dear <strong>${safeName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #52525B;">
                We received a request to recover access to your Ethniz Couture patron account. Please use the one-time verification code below to set your new password:
              </p>

              <!-- Luxury OTP Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #FDFBF7; border: 2px solid #C5A262; border-radius: 12px; padding: 22px 32px; text-align: center; max-width: 320px; box-shadow: 0 6px 20px rgba(197, 162, 98, 0.12);">
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.35em; color: #3E1A1E; padding-left: 0.35em;">
                        ${options.otp}
                      </div>
                      <div style="margin-top: 10px; font-size: 12px; font-weight: 600; color: #84642C; letter-spacing: 0.05em; text-transform: uppercase;">
                        Valid for ${expires} minutes
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information Note -->
              <div style="background-color: #FAF8F5; border-left: 3px solid #C5A262; padding: 14px 18px; border-radius: 4px; margin: 24px 0 20px 0;">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #71717A;">
                  <strong>Security Reminder:</strong> Never share this code with anyone. Ethniz Couture concierge or atelier team will never ask for your verification code.
                </p>
              </div>

              <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.6; color: #71717A;">
                If you did not request a password reset, you can safely ignore this email. Your current password remains active and secure.
              </p>

              <div style="border-top: 1px solid #F4EFE6; padding-top: 24px; margin-top: 10px;">
                <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #3E1A1E; font-style: italic;">
                  Wear Your Heritage. Own Your Style.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #84642C; font-weight: 600;">
                  Team Ethniz Couture
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #EBE4D8; font-size: 11px; color: #A1A1AA; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #71717A;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Visit Storefront</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for OTP verification email.
 */
export function generatePasswordResetOtpEmailText(options: PasswordResetEmailOptions): string {
  const safeName = options.name?.trim() || 'Patron';
  const expires = options.expiresMinutes || 15;

  return `Dear ${safeName},

We received a request to recover access to your Ethniz Couture patron account.

YOUR VERIFICATION CODE: ${options.otp}
(Valid for ${expires} minutes)

For your security, never share this code with anyone. Ethniz Couture staff will never ask for your verification code.

If you did not request this recovery code, please ignore this email. Your account remains secure.

With warmth,
Team Ethniz Couture
Wear Your Heritage. Own Your Style.
`;
}

/**
 * Generates the security confirmation email HTML after successful password reset.
 */
export function generatePasswordResetSuccessEmailHtml(options: PasswordResetSuccessEmailOptions): string {
  const safeName = options.name?.trim() ? escapeHtml(options.name.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const loginUrl = `${storefrontUrl}/login`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Updated — Ethniz Couture</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 36px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.06); border: 1px solid #EBE4D8;">
          
          <tr>
            <td style="background-color: #3E1A1E; padding: 36px 30px; text-align: center; border-bottom: 3px solid #C5A262;">
              <h1 style="margin: 0; color: #FAF7F2; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
                ETHNIZ COUTURE
              </h1>
              <p style="margin: 8px 0 0 0; color: #D4AF37; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;">
                ACCOUNT SECURITY CONFIRMATION
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 36px 30px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #27272A;">
                Dear <strong>${safeName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #52525B;">
                This email confirms that the password for your Ethniz Couture atelier account (<strong>${escapeHtml(options.email)}</strong>) was successfully updated.
              </p>

              <div style="background-color: #F0FDF4; border-left: 3px solid #22C55E; padding: 14px 18px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #166534; font-weight: 500;">
                  &check; Your account is secure and you can now sign in using your new credentials.
                </p>
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background-color: #3E1A1E; color: #FAF7F2; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;">
                      Sign In To Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #71717A;">
                If you did NOT perform this action, please contact our Atelier Concierge immediately to secure your account.
              </p>

              <div style="border-top: 1px solid #F4EFE6; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #3E1A1E; font-style: italic;">
                  Wear Your Heritage. Own Your Style.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #84642C; font-weight: 600;">
                  Team Ethniz Couture
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F8F5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #EBE4D8; font-size: 11px; color: #A1A1AA; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #71717A;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Visit Storefront</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for password reset confirmation.
 */
export function generatePasswordResetSuccessEmailText(options: PasswordResetSuccessEmailOptions): string {
  const safeName = options.name?.trim() || 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');

  return `Dear ${safeName},

This email confirms that the password for your Ethniz Couture atelier account (${options.email}) was successfully updated.

If you made this change, no further action is required.
If you did not perform this change, please immediately contact our Atelier Concierge at ${storefrontUrl}/contact.

With warmth,
Team Ethniz Couture
Wear Your Heritage. Own Your Style.
`;
}

export interface OrderCancellationEmailOptions {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  reason?: string | null;
  paymentMethod: string;
  paymentStatus: string;
}

export interface ReturnRequestEmailOptions {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  resolution: string;
  comments?: string | null;
}

export interface ReturnDecisionEmailOptions {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  decision: 'APPROVED' | 'REJECTED';
  resolution?: string;
  carrierName?: string;
  trackingNumber?: string;
  notes?: string;
  reason?: string;
}

export interface ContactReplyEmailOptions {
  customerName: string;
  customerEmail: string;
  originalSubject: string;
  originalMessage: string;
  replyMessage: string;
  senderName?: string;
}

/**
 * Generates the royal order cancellation notice HTML email.
 */
export function generateOrderCancellationEmailHtml(options: OrderCancellationEmailOptions): string {
  const safeName = options.customerName?.trim() ? escapeHtml(options.customerName.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const isPrepaid = options.paymentStatus === 'PAID' || (options.paymentMethod !== 'COD' && options.paymentStatus !== 'FAILED');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancelled — Ethniz Couture</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 36px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.06); border: 1px solid #EBE4D8;">
          
          <tr>
            <td style="background-color: #3E1A1E; padding: 36px 30px; text-align: center; border-bottom: 3px solid #C5A262;">
              <h1 style="margin: 0; color: #FAF7F2; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
                ETHNIZ COUTURE
              </h1>
              <p style="margin: 8px 0 0 0; color: #D4AF37; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;">
                ORDER CANCELLATION NOTICE
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 36px 30px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #27272A;">
                Dear <strong>${safeName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #52525B;">
                Your order <strong>${escapeHtml(options.orderNumber)}</strong> has been successfully cancelled as requested. The reserved garments have been returned to our atelier inventory.
              </p>

              <!-- Order Summary Box -->
              <div style="background-color: #FAF8F5; border: 1px solid #EBE4D8; border-radius: 10px; padding: 18px 22px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #27272A;">
                  <strong>Order Reference:</strong> ${escapeHtml(options.orderNumber)}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #27272A;">
                  <strong>Total Value:</strong> ₹${options.totalAmount.toLocaleString('en-IN')}
                </p>
                ${options.reason ? `
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #52525B;">
                  <strong>Reason:</strong> ${escapeHtml(options.reason)}
                </p>` : ''}
                <p style="margin: 0; font-size: 13px; color: #27272A;">
                  <strong>Payment Mode:</strong> ${escapeHtml(options.paymentMethod)} (${escapeHtml(options.paymentStatus)})
                </p>
              </div>

              <!-- Refund Notice -->
              <div style="background-color: ${isPrepaid ? '#F0FDF4' : '#F4F4F5'}; border-left: 3px solid ${isPrepaid ? '#22C55E' : '#71717A'}; padding: 14px 18px; border-radius: 4px; margin: 24px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${isPrepaid ? '#166534' : '#3F3F46'};">
                  ${isPrepaid 
                    ? `<strong>Refund Initiated:</strong> Your payment of ₹${options.totalAmount.toLocaleString('en-IN')} will be credited back to your original payment method / UPI within 5-7 business banking days.`
                    : '<strong>No Charges Incurred:</strong> Since this order was placed with Cash on Delivery, no payment was collected.'}
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.6; color: #71717A;">
                We hope to welcome you back to our atelier soon. If you have any questions, our concierge team is always at your service.
              </p>

              <div style="border-top: 1px solid #F4EFE6; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #3E1A1E; font-style: italic;">
                  Wear Your Heritage. Own Your Style.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #84642C; font-weight: 600;">
                  Team Ethniz Couture
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F8F5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #EBE4D8; font-size: 11px; color: #A1A1AA; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #71717A;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Explore Collections</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for cancellation notice.
 */
export function generateOrderCancellationEmailText(options: OrderCancellationEmailOptions): string {
  const safeName = options.customerName?.trim() || 'Patron';
  const isPrepaid = options.paymentStatus === 'PAID' || (options.paymentMethod !== 'COD' && options.paymentStatus !== 'FAILED');

  return `Dear ${safeName},

Your order ${options.orderNumber} (Value: ₹${options.totalAmount.toLocaleString('en-IN')}) has been cancelled as requested.

${options.reason ? `Cancellation Reason: ${options.reason}\n` : ''}
${isPrepaid 
  ? `Refund Initiated: Your payment of ₹${options.totalAmount.toLocaleString('en-IN')} will be credited back to your original source within 5-7 business banking days.`
  : 'Since this order was Cash on Delivery, no payment was collected.'}

Thank you for choosing Ethniz Couture. We hope to serve you again soon.

With warmth,
Team Ethniz Couture
Wear Your Heritage. Own Your Style.
`;
}

/**
 * Generates the royal return / exchange request receipt HTML email.
 */
export function generateReturnRequestEmailHtml(options: ReturnRequestEmailOptions): string {
  const safeName = options.customerName?.trim() ? escapeHtml(options.customerName.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Request Received — Ethniz Couture</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 36px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.06); border: 1px solid #EBE4D8;">
          
          <tr>
            <td style="background-color: #3E1A1E; padding: 36px 30px; text-align: center; border-bottom: 3px solid #C5A262;">
              <h1 style="margin: 0; color: #FAF7F2; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
                ETHNIZ COUTURE
              </h1>
              <p style="margin: 8px 0 0 0; color: #D4AF37; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;">
                RETURN &bull; EXCHANGE REQUEST
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 36px 30px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #27272A;">
                Dear <strong>${safeName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #52525B;">
                We have received your return request for Order <strong>${escapeHtml(options.orderNumber)}</strong>. Our atelier concierge has initiated the review process.
              </p>

              <!-- Request Details Box -->
              <div style="background-color: #FAF8F5; border: 1px solid #EBE4D8; border-radius: 10px; padding: 18px 22px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #27272A;">
                  <strong>Order ID:</strong> ${escapeHtml(options.orderNumber)}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #27272A;">
                  <strong>Preferred Resolution:</strong> ${escapeHtml(options.resolution)}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #52525B;">
                  <strong>Reason:</strong> ${escapeHtml(options.reason)}
                </p>
                ${options.comments ? `
                <p style="margin: 0; font-size: 13px; color: #71717A;">
                  <strong>Notes:</strong> ${escapeHtml(options.comments)}
                </p>` : ''}
              </div>

              <!-- Next Steps Timeline -->
              <div style="background-color: #FDF8EE; border-left: 3px solid #C5A262; padding: 14px 18px; border-radius: 4px; margin: 24px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #84642C;">
                  <strong>What happens next?</strong><br />
                  1. Our concierge team reviews your request within 24 hours.<br />
                  2. A complimentary reverse pickup will be scheduled at your doorstep via Delhivery / BlueDart.<br />
                  3. Upon inspection at our atelier, your exchange or refund will be executed promptly.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #71717A;">
                <em>Please ensure the garments remain in their original unworn condition with all designer tags and authenticity ribbons attached.</em>
              </p>

              <div style="border-top: 1px solid #F4EFE6; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #3E1A1E; font-style: italic;">
                  Wear Your Heritage. Own Your Style.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #84642C; font-weight: 600;">
                  Team Ethniz Couture
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F8F5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #EBE4D8; font-size: 11px; color: #A1A1AA; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #71717A;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Visit Storefront</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for return request.
 */
export function generateReturnRequestEmailText(options: ReturnRequestEmailOptions): string {
  const safeName = options.customerName?.trim() || 'Patron';

  return `Dear ${safeName},

We have received your return/exchange request for Order ${options.orderNumber}.

Resolution Requested: ${options.resolution}
Reason: ${options.reason}
${options.comments ? `Notes: ${options.comments}\n` : ''}
Our atelier team will review your request within 24 hours and arrange reverse pickup at your doorstep.

With warmth,
Team Ethniz Couture
Wear Your Heritage. Own Your Style.
`;
}

/**
 * Generates royal return decision email HTML.
 */
export function generateReturnDecisionEmailHtml(options: ReturnDecisionEmailOptions): string {
  const safeName = options.customerName?.trim() ? escapeHtml(options.customerName.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const trackUrl = `${storefrontUrl}/track-order?orderNumber=${encodeURIComponent(options.orderNumber)}`;
  const isApproved = options.decision === 'APPROVED';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isApproved ? 'Return Approved' : 'Return Request Update'} — Ethniz Couture</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 36px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.06); border: 1px solid #EBE4D8;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #3E1A1E; padding: 32px 30px; text-align: center; border-bottom: 2px solid #C6A15D;">
              <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #DFC89D; letter-spacing: 0.15em; text-transform: uppercase; display: block;">
                ETHNIZ COUTURE
              </span>
              <span style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #C6A15D; display: block; margin-top: 4px;">
                HAUTE FASHION HOUSE &bull; ATELIER CONCIERGE
              </span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; background-color: ${isApproved ? '#ECFDF5; color: #047857; border: 1px solid #A7F3D0;' : '#FEF2F2; color: #B91C1C; border: 1px solid #FECACA;'}">
                ${isApproved ? '&#10003; Return & Exchange Approved' : 'Return Request Declined'}
              </div>

              <h1 style="margin: 18px 0 10px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #3E1A1E; font-weight: 700;">
                ${isApproved ? 'Reverse Pickup Scheduled' : 'Update on Your Return Request'}
              </h1>

              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #52525B;">
                Dear ${safeName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #52525B;">
                ${isApproved
                  ? `Your return/exchange request for Order <strong>#${escapeHtml(options.orderNumber)}</strong> has been approved by our master karigari concierge team.`
                  : `Thank you for reaching out regarding Order <strong>#${escapeHtml(options.orderNumber)}</strong>. Following our atelier quality appraisal, we are unable to process this return request.`
                }
              </p>

              <!-- Resolution / Details Box -->
              <div style="background-color: #FAF7F2; border: 1px solid #EBE4D8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #84642C; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${isApproved ? 'Atelier Resolution Details' : 'Concierge Decision Notes'}
                </p>
                ${isApproved ? `
                <p style="margin: 4px 0; font-size: 13px; color: #3F3F46;">
                  <strong>Resolution:</strong> ${escapeHtml(options.resolution || 'Refund to Source')}
                </p>
                <p style="margin: 4px 0; font-size: 13px; color: #3F3F46;">
                  <strong>Carrier:</strong> ${escapeHtml(options.carrierName || 'Blue Dart Express Reverse Logistics')}
                </p>
                ${options.trackingNumber ? `
                <p style="margin: 4px 0; font-size: 13px; color: #3F3F46;">
                  <strong>Reverse AWB:</strong> ${escapeHtml(options.trackingNumber)}
                </p>` : ''}
                ` : `
                <p style="margin: 4px 0; font-size: 13px; color: #3F3F46;">
                  <strong>Reason:</strong> ${escapeHtml(options.reason || 'Does not qualify under 7-day atelier policy')}
                </p>
                `}
                ${options.notes ? `
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #71717A; font-style: italic; border-top: 1px solid #EBE4D8; padding-top: 8px;">
                  "${escapeHtml(options.notes)}"
                </p>` : ''}
              </div>

              <!-- Button CTA -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${trackUrl}" style="display: inline-block; background-color: #3E1A1E; color: #DFC89D; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 14px 28px; border-radius: 8px; border: 1px solid #C6A15D;">
                  Track Order Status
                </a>
              </div>

              <div style="border-top: 1px solid #F4EFE6; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #3E1A1E; font-style: italic;">
                  Wear Your Heritage. Own Your Style.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #84642C; font-weight: 600;">
                  Team Ethniz Couture
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #EBE4D8; font-size: 11px; color: #A1A1AA; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #71717A;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Visit Storefront</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain text fallback for return decision.
 */
export function generateReturnDecisionEmailText(options: ReturnDecisionEmailOptions): string {
  const safeName = options.customerName?.trim() || 'Patron';
  const isApproved = options.decision === 'APPROVED';

  return `Dear ${safeName},

This is an update regarding your return/exchange request for Order #${options.orderNumber}.

Status: ${isApproved ? 'APPROVED — Reverse Pickup Scheduled' : 'DECLINED'}
${isApproved ? `Resolution: ${options.resolution || 'Refund to Source'}\nCarrier: ${options.carrierName || 'Blue Dart Express Reverse Logistics'}` : `Reason: ${options.reason || 'Does not meet 7-day atelier return guidelines'}`}
${options.notes ? `Concierge Notes: ${options.notes}\n` : ''}

Track your order anytime: ${config.frontendUrl}/track-order?orderNumber=${options.orderNumber}

With warmth,
Team Ethniz Couture
`;
}

/**
 * Generates royal contact inquiry reply email HTML.
 */
export function generateContactReplyEmailHtml(options: ContactReplyEmailOptions): string {
  const safeName = options.customerName?.trim() ? escapeHtml(options.customerName.trim()) : 'Patron';
  const storefrontUrl = config.frontendUrl.replace(/\/+$/, '');
  const sender = options.senderName ? escapeHtml(options.senderName) : 'Atelier Concierge Team';

  const formattedReply = escapeHtml(options.replyMessage).replace(/\n/g, '<br>');
  const formattedOriginal = escapeHtml(options.originalMessage).replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response to Your Inquiry — Ethniz Couture</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #27272A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; padding: 36px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #DFC89D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(62, 26, 30, 0.08);">
          
          <!-- Burgundy Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #3E1A1E 0%, #2B0C10 100%); background-color: #3E1A1E; padding: 36px 30px; border-bottom: 3px solid #C6A15D;">
              <span style="font-family: Georgia, Garamond, serif; font-size: 26px; font-weight: bold; letter-spacing: 0.15em; color: #FFFFFF; text-transform: uppercase;">
                ETHNIZ<span style="color: #DFC89D; font-weight: 300; font-style: italic; text-transform: lowercase; font-size: 24px;">Couture</span>
              </span>
              <p style="margin: 8px 0 0; color: #DFC89D; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">Atelier Concierge Response</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <p style="font-size: 16px; font-weight: 600; color: #3E1A1E; margin: 0 0 14px 0;">
                Dear ${safeName},
              </p>
              <p style="font-size: 13px; line-height: 1.7; color: #52525B; margin: 0 0 22px 0;">
                Thank you for reaching out to the Ethniz Couture Atelier regarding <strong>&ldquo;${escapeHtml(options.originalSubject)}&rdquo;</strong>. Our concierge team has reviewed your inquiry and prepared the following response:
              </p>

              <!-- Atelier Official Response Card -->
              <div style="background-color: #FDFBF7; border-left: 4px solid #C6A15D; border-radius: 0 8px 8px 0; padding: 20px 22px; margin-bottom: 26px;">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #84642C; margin-bottom: 8px;">
                  Official Atelier Message
                </div>
                <div style="font-size: 13px; line-height: 1.8; color: #27272A; font-family: Georgia, serif;">
                  ${formattedReply}
                </div>
                <div style="margin-top: 14px; font-size: 11px; color: #71717A;">
                  &mdash; <strong>${sender}</strong>, Ethniz Couture
                </div>
              </div>

              <!-- Quoted Patron Inquiry -->
              <div style="background-color: #F4F4F5; border-radius: 8px; padding: 14px 18px; margin-bottom: 26px;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #71717A; margin-bottom: 6px;">
                  Your Original Inquiry
                </div>
                <div style="font-size: 12px; line-height: 1.6; color: #52525B; font-style: italic;">
                  &ldquo;${formattedOriginal}&rdquo;
                </div>
              </div>

              <!-- Contact Concierge Actions -->
              <div style="text-align: center; padding: 10px 0 16px;">
                <a href="${storefrontUrl}/shop" style="display: inline-block; background: linear-gradient(135deg, #3E1A1E 0%, #2B0C10 100%); color: #DFC89D; border: 1px solid #C6A15D; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">
                  Explore The Collection
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.6; color: #71717A; text-align: center; margin: 16px 0 0 0;">
                If you have further questions or require bespoke alterations, you can also reach our styling team directly on WhatsApp at <strong>+91 98200 12345</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F5EE; padding: 22px 30px; text-align: center; border-top: 1px solid #EBE4D8; font-size: 11px; color: #A1A1AA; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #71717A;">ETHNIZ COUTURE ATELIER</p>
              <p style="margin: 0;"><a href="${storefrontUrl}" style="color: #84642C; text-decoration: none;">Visit Storefront</a> &bull; <a href="${storefrontUrl}/contact" style="color: #84642C; text-decoration: none;">Concierge Support</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain text fallback for contact reply.
 */
export function generateContactReplyEmailText(options: ContactReplyEmailOptions): string {
  const safeName = options.customerName?.trim() || 'Patron';
  const sender = options.senderName || 'Atelier Concierge Team';

  return `Dear ${safeName},

Thank you for reaching out to the Ethniz Couture Atelier regarding "${options.originalSubject}".

Atelier Response:
${options.replyMessage}

— ${sender}, Ethniz Couture

---
Your Original Inquiry:
"${options.originalMessage}"
---

Explore our collections: ${config.frontendUrl}/shop
WhatsApp Concierge: +91 98200 12345

With warmth,
Team Ethniz Couture
Wear Your Heritage. Own Your Style.
`;
}

export const emailService = new EmailService();

