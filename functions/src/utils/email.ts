import * as nodemailer from 'nodemailer';
import * as functions from 'firebase-functions';

function getTransporter() {
  const user = functions.config().email?.user || process.env.EMAIL_USER || '';
  const pass = functions.config().email?.password || process.env.EMAIL_PASS || '';
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

interface DigestEmailData {
  to: string;
  userName: string;
  alerts: any[];
  stats: { totalAlerts: number; criticalAlerts: number; potentialSavings: number; actedOn: number };
  dashboardUrl: string;
}

export async function sendDigestEmail(data: DigestEmailData) {
  const { to, userName, alerts, stats, dashboardUrl } = data;
  const criticalAlerts = alerts.filter(a => a.urgency === 'critical');
  const highAlerts = alerts.filter(a => a.urgency === 'high');

  const html = `<!DOCTYPE html><html><head><style>
    body{font-family:system-ui,Arial,sans-serif;background:#0a0f1e;color:#e2e8f0;margin:0}
    .wrap{max-width:600px;margin:0 auto;padding:0 0 40px}
    .header{background:linear-gradient(135deg,#1e3a8a,#3730a3);padding:32px 28px;border-radius:12px 12px 0 0}
    .header h1{margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px}
    .header p{margin:6px 0 0;opacity:.75;font-size:14px}
    .body{background:#111827;padding:28px}
    .stats{display:flex;gap:12px;margin-bottom:28px}
    .stat{flex:1;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:16px;text-align:center}
    .stat-val{font-size:28px;font-weight:800;color:#60a5fa}
    .stat-val.savings{color:#34d399}
    .stat-label{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
    h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin:20px 0 10px}
    .alert{border-left:3px solid #ef4444;background:#1c1018;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:10px}
    .alert.high{border-color:#f97316;background:#1c1408}
    .alert-tool{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#f97316;margin-bottom:4px}
    .alert-why{font-size:14px;color:#d1d5db;margin:0 0 6px}
    .alert-impact{font-size:12px;color:#34d399;font-weight:600}
    .btn{display:block;width:180px;margin:28px auto 0;background:#3b82f6;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:700;font-size:14px}
    .footer{text-align:center;margin-top:24px;font-size:11px;color:#4b5563}
    .footer a{color:#6b7280}
  </style></head><body><div class="wrap">
  <div class="header">
    <h1>📡 Stack Sentinel Weekly Report</h1>
    <p>Hey ${userName}, here's your stack intelligence summary</p>
  </div>
  <div class="body">
    <div class="stats">
      <div class="stat"><div class="stat-val">${stats.totalAlerts}</div><div class="stat-label">Alerts</div></div>
      <div class="stat"><div class="stat-val">${stats.criticalAlerts}</div><div class="stat-label">Critical</div></div>
      <div class="stat"><div class="stat-val savings">$${stats.potentialSavings}</div><div class="stat-label">Savings</div></div>
      <div class="stat"><div class="stat-val">${stats.actedOn}</div><div class="stat-label">Acted On</div></div>
    </div>
    ${criticalAlerts.length > 0 ? `<h2>🚨 Critical Alerts</h2>${criticalAlerts.map(a => `
      <div class="alert">
        <div class="alert-tool">${a.affectedTool}</div>
        <p class="alert-why">${a.whyRelevant}</p>
        ${a.costImpact ? `<div class="alert-impact">Impact: $${Math.abs(a.costImpact)}/mo</div>` : ''}
      </div>`).join('')}` : ''}
    ${highAlerts.slice(0,3).length > 0 ? `<h2>⚠️ High Priority</h2>${highAlerts.slice(0,3).map(a => `
      <div class="alert high">
        <div class="alert-tool">${a.affectedTool}</div>
        <p class="alert-why">${a.whyRelevant}</p>
      </div>`).join('')}` : ''}
    <a href="${dashboardUrl}" class="btn">View Full Dashboard →</a>
  </div>
  <div class="footer">
    You're receiving this because you enabled weekly digests in Stack Sentinel.<br>
    <a href="${dashboardUrl}/settings">Manage preferences</a>
  </div>
  </div></body></html>`;

  await getTransporter().sendMail({
    from: '"Stack Sentinel 📡" <alerts@stacksentinel.app>',
    to,
    subject: `📊 Weekly Stack Report: ${stats.totalAlerts} alerts, $${stats.potentialSavings} potential savings`,
    html,
  });
}

export async function sendWelcomeEmail({ to, userName }: { to: string; userName: string }) {
  await getTransporter().sendMail({
    from: '"Stack Sentinel 📡" <alerts@stacksentinel.app>',
    to,
    subject: '👋 Welcome to Stack Sentinel — Your AI Stack Watchdog',
    html: `<div style="font-family:system-ui,Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px">
      <h1 style="font-size:24px;font-weight:800">Welcome, ${userName}! 🎉</h1>
      <p>Stack Sentinel is now watching your tech stack 24/7 with Gemini AI + Google Search Grounding.</p>
      <p>You'll receive weekly intelligence digests every Monday.</p>
      <a href="https://stack-sentinel.vercel.app" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Open Dashboard →</a>
    </div>`,
  });
}
