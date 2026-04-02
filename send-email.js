import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    to,
    bookingId,
    date,
    location,
    entry,
    exit,
    duration,
    rate,
    amount,
    qrImage
  } = req.body;

  // Validate required fields
  if (!to) {
    return res.status(400).json({ error: "Recipient email is required" });
  }

  try {
    // Build the HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="420" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; max-width: 420px;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 35px 30px; text-align: center;">
                  <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 16px; margin: 0 auto 15px; line-height: 60px; font-size: 28px; font-weight: bold; color: #ffffff;">P</div>
                  <h1 style="margin: 0 0 5px; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">FastPark Receipt</h1>
                  <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Smart Metro Parking</p>
                </td>
              </tr>

              <!-- Success Badge -->
              <tr>
                <td style="padding: 25px 30px 5px; text-align: center;">
                  <div style="display: inline-block; background: #dcfce7; color: #16a34a; padding: 10px 24px; border-radius: 30px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
                    ✅ Payment Successful
                  </div>
                </td>
              </tr>

              <!-- Receipt Details -->
              <tr>
                <td style="padding: 20px 30px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <!-- Booking ID -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="color: #94a3b8; font-size: 13px;">Booking ID</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                        <span style="color: #1e293b; font-size: 13px; font-weight: 600; font-family: 'Courier New', monospace;">${bookingId || 'N/A'}</span>
                      </td>
                    </tr>
                    <!-- Date -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="color: #94a3b8; font-size: 13px;">Date</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                        <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${date || 'N/A'}</span>
                      </td>
                    </tr>
                    <!-- Location -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="color: #94a3b8; font-size: 13px;">Location</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                        <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${location || 'N/A'}</span>
                      </td>
                    </tr>
                    <!-- Entry -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="color: #94a3b8; font-size: 13px;">Entry Time</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                        <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${entry || 'N/A'}</span>
                      </td>
                    </tr>
                    <!-- Exit -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="color: #94a3b8; font-size: 13px;">Exit Time</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                        <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${exit || 'N/A'}</span>
                      </td>
                    </tr>
                    <!-- Duration -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="color: #94a3b8; font-size: 13px;">Duration</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
                        <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${duration || 'N/A'}</span>
                      </td>
                    </tr>
                    <!-- Rate -->
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 2px dashed #e2e8f0;">
                        <span style="color: #94a3b8; font-size: 13px;">Rate</span>
                      </td>
                      <td style="padding: 12px 0; border-bottom: 2px dashed #e2e8f0; text-align: right;">
                        <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${rate || '₹80/hr'}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Total Amount -->
              <tr>
                <td style="padding: 5px 30px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px;">
                    <tr>
                      <td style="padding: 0 20px;">
                        <span style="color: #92400e; font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Total Paid</span>
                      </td>
                      <td style="padding: 0 20px; text-align: right;">
                        <span style="color: #92400e; font-size: 32px; font-weight: 900;">₹${amount || 0}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- QR Code Section -->
              ${qrImage ? `
              <tr>
                <td style="padding: 0 30px 25px; text-align: center;">
                  <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 25px;">
                    <p style="margin: 0 0 15px; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">QR Entry / Exit Pass</p>
                    <img src="${qrImage}" width="180" height="180" style="display: block; margin: 0 auto 15px; border-radius: 8px;" alt="QR Code" />
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">Scan this QR for entry/exit verification</p>
                  </div>
                </td>
              </tr>
              ` : ''}

              <!-- Footer -->
              <tr>
                <td style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px;">Thank you for using FastPark 🚗</p>
                  <p style="margin: 0; color: #cbd5e1; font-size: 11px;">This is an automated receipt. Please do not reply to this email.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: to,
      subject: "Parking Receipt",
      html: htmlContent
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
}

