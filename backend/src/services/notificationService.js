const nodemailer = require('nodemailer');

let transporter = null;

function isEmailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.ALERT_EMAIL_TO);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  return transporter;
}

async function sendAlertNotification(alert) {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: 'SMTP_HOST or ALERT_EMAIL_TO not configured' };
  }

  const from = process.env.SMTP_FROM || 'siv-alerts@example.com';
  const to = process.env.ALERT_EMAIL_TO;
  const subject = `[SIV] ${alert.type} alert for bus ${alert.bus_id}`;
  const text = [
    `Alert type: ${alert.type}`,
    `Bus ID: ${alert.bus_id}`,
    `Message: ${alert.message}`,
    alert.valeur !== undefined ? `Value: ${alert.valeur}` : null,
    alert.createdAt ? `Created at: ${alert.createdAt}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await getTransporter().sendMail({ from, to, subject, text });
  return { skipped: false };
}

module.exports = { sendAlertNotification, isEmailEnabled };