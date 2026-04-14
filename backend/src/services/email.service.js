const nodemailer = require('nodemailer');

let transporter = null;

function getResetCodeMinutes() {
  const rawValue = Number(process.env.PASSWORD_RESET_CODE_MINUTES || 15);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 15;
}

function hasEmailConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      (process.env.SMTP_FROM || process.env.SMTP_USER),
  );
}

function isEmailNotConfiguredError(error) {
  return error?.code === 'EMAIL_NOT_CONFIGURED';
}

function canUseDevelopmentEmailFallback() {
  return String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
}

function getTransporter() {
  if (transporter) return transporter;

  if (!hasEmailConfig()) {
    const error = new Error(
      'Recuperacao por email nao configurada. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM em backend/.env.',
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure:
      process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendPasswordResetCode({ to, username, code }) {
  const mailer = getTransporter();
  const expiresInMinutes = getResetCodeMinutes();

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Codigo para redefinir sua senha do Miwanzo',
    text: [
      `Ola${username ? `, ${username}` : ''}.`,
      '',
      `Seu codigo para redefinir a senha e: ${code}`,
      '',
      `Esse codigo expira em ${expiresInMinutes} minutos.`,
      'Se voce nao solicitou essa alteracao, ignore este email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <p>Ola${username ? `, ${username}` : ''}.</p>
        <p>Seu codigo para redefinir a senha e:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0; color: #2563eb;">
          ${code}
        </div>
        <p>Esse codigo expira em ${expiresInMinutes} minutos.</p>
        <p>Se voce nao solicitou essa alteracao, ignore este email.</p>
      </div>
    `,
  });
}

module.exports = {
  canUseDevelopmentEmailFallback,
  getResetCodeMinutes,
  hasEmailConfig,
  isEmailNotConfiguredError,
  sendPasswordResetCode,
};
