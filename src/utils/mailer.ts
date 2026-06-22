import nodemailer from 'nodemailer';

type ContactNotification = {
  fullName: string;
  phone: string;
  email?: string | null;
  message: string;
  createdAt: Date;
};

function mailEnabled() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') !== 'false';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendContactNotification(contact: ContactNotification) {
  if (!mailEnabled()) {
    console.warn('Contact email notification skipped: SMTP_USER or SMTP_PASS is missing.');
    return;
  }

  const to = process.env.CONTACT_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.MAIL_FROM_NAME || 'Com Thi No Website';
  const from = process.env.MAIL_FROM || `"${fromName}" <${process.env.SMTP_USER}>`;
  const replyTo = contact.email || undefined;
  const submittedAt = contact.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const safeName = escapeHtml(contact.fullName);
  const safePhone = escapeHtml(contact.phone);
  const safeEmail = escapeHtml(contact.email || 'Khong cung cap');
  const safeMessage = escapeHtml(contact.message).replace(/\n/g, '<br />');

  await getTransporter().sendMail({
    from,
    to,
    replyTo,
    subject: `Khach dat tiec/doan moi: ${contact.fullName} - ${contact.phone}`,
    text: [
      'Co khach vua gui form Dat Tiec Doan / Com Nieu Cong Ty.',
      '',
      `Ho ten: ${contact.fullName}`,
      `Dien thoai: ${contact.phone}`,
      `Email: ${contact.email || 'Khong cung cap'}`,
      `Thoi gian: ${submittedAt}`,
      '',
      'Noi dung:',
      contact.message,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f241b">
        <h2 style="margin:0 0 12px;color:#4A250F">Khach vua gui form dat tiec/doan</h2>
        <p style="margin:0 0 16px">Form: <strong>Dat Tiec Doan / Com Nieu Cong Ty</strong></p>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
          <tr><td style="border:1px solid #eadfce;font-weight:bold;width:150px">Ho ten</td><td style="border:1px solid #eadfce">${safeName}</td></tr>
          <tr><td style="border:1px solid #eadfce;font-weight:bold">Dien thoai</td><td style="border:1px solid #eadfce"><a href="tel:${safePhone}">${safePhone}</a></td></tr>
          <tr><td style="border:1px solid #eadfce;font-weight:bold">Email</td><td style="border:1px solid #eadfce">${safeEmail}</td></tr>
          <tr><td style="border:1px solid #eadfce;font-weight:bold">Thoi gian</td><td style="border:1px solid #eadfce">${submittedAt}</td></tr>
          <tr><td style="border:1px solid #eadfce;font-weight:bold;vertical-align:top">Noi dung</td><td style="border:1px solid #eadfce">${safeMessage}</td></tr>
        </table>
      </div>
    `,
  });
}
