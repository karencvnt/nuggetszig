import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM_EMAIL ?? "Nuggets <noreply@nuggets.app>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${appUrl}/verify-email?token=${token}`;
  await resend.emails.send({
    from,
    to: email,
    subject: "Confirme seu e-mail — Nuggets",
    html: verificationEmailHtml(url),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${appUrl}/reset-password?token=${token}`;
  await resend.emails.send({
    from,
    to: email,
    subject: "Redefinir senha — Nuggets",
    html: resetPasswordEmailHtml(url),
  });
}

export async function sendNewLoginEmail(email: string, name: string, ip: string) {
  await resend.emails.send({
    from,
    to: email,
    subject: "Novo acesso detectado — Nuggets",
    html: newLoginEmailHtml(name, ip),
  });
}

function verificationEmailHtml(url: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h1 style="font-size:24px;font-weight:700;color:#101828;margin-bottom:8px">Confirme seu e-mail</h1>
      <p style="color:#475467;margin-bottom:24px">Clique no botão abaixo para ativar sua conta no Nuggets. O link expira em 24 horas.</p>
      <a href="${url}" style="display:inline-block;background:#444ce7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirmar e-mail</a>
      <p style="color:#98a2b3;font-size:12px;margin-top:32px">Se você não criou uma conta, ignore este e-mail.</p>
    </div>`;
}

function resetPasswordEmailHtml(url: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h1 style="font-size:24px;font-weight:700;color:#101828;margin-bottom:8px">Redefinir senha</h1>
      <p style="color:#475467;margin-bottom:24px">Recebemos uma solicitação para redefinir sua senha. O link expira em 1 hora e pode ser usado apenas uma vez.</p>
      <a href="${url}" style="display:inline-block;background:#444ce7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Redefinir senha</a>
      <p style="color:#98a2b3;font-size:12px;margin-top:32px">Se você não solicitou a redefinição, ignore este e-mail. Sua senha não será alterada.</p>
    </div>`;
}

function newLoginEmailHtml(name: string, ip: string) {
  const maskedIp = ip.split(".").map((_, i) => (i < 2 ? _ : "***")).join(".");
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h1 style="font-size:24px;font-weight:700;color:#101828;margin-bottom:8px">Novo acesso detectado</h1>
      <p style="color:#475467;margin-bottom:16px">Olá, ${name}. Detectamos um novo login na sua conta.</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0;color:#344054;font-size:14px">IP: ${maskedIp}</p>
        <p style="margin:4px 0 0;color:#344054;font-size:14px">Horário: ${new Date().toLocaleString("pt-BR")}</p>
      </div>
      <p style="color:#475467">Se não foi você, altere sua senha imediatamente.</p>
    </div>`;
}
