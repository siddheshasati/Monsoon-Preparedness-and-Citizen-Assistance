import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from backend.app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def send_otp_email(email: str, otp: str) -> bool:
    """
    Sends a 6-digit OTP verification code to the user's email.
    If no SMTP password is set in the environment, it prints the OTP to console.
    """
    subject = f"Your Monsoon Copilot Verification Code: {otp}"
    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0284c7; margin: 0;">Monsoon Copilot</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your AI-Powered Preparedness Partner</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 16px; color: #334155;">Hello,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">
            You requested a login or sign-up code. Please use the following 6-digit verification code to complete your authentication:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f172a; background: #f1f5f9; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">
              {otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
            This verification code is valid for 10 minutes. If you did not request this email, you can safely ignore it.
          </p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            © 2026 AI Monsoon Copilot. Built for resilient communities.
          </p>
        </div>
      </body>
    </html>
    """

    if not settings.SMTP_PASSWORD:
        logger.warning("==================================================")
        logger.warning(f"SMTP PASSWORD NOT SET. Simulated email for: {email}")
        logger.warning(f"VERIFICATION CODE (OTP): {otp}")
        logger.warning("==================================================")
        return True

    try:
        # Create message container
        msg = MIMEMultipart()
        msg["From"] = f"Monsoon Copilot <{settings.SMTP_FROM}>"
        msg["To"] = email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        # Setup SMTP Connection
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, email, msg.as_string())
        server.quit()
        logger.info(f"OTP successfully emailed to {email} (Terminal backup verification code: {otp})")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}")
        # Print OTP to logs anyway so development is not blocked
        logger.warning("--------------------------------------------------")
        logger.warning(f"Fallback OTP for {email}: {otp}")
        logger.warning("--------------------------------------------------")
        return False
