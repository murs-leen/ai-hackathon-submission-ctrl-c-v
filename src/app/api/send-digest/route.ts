import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function POST(req: Request) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json(
        { success: false, error: 'EMAIL_USER and EMAIL_PASS not configured in .env.local' },
        { status: 500 }
      );
    }

    const { to, userName, alerts, stats, dashboardUrl } = await req.json();
    const criticalAlerts = alerts.filter((a: any) => a.urgency === 'critical');
    const highAlerts = alerts.filter((a: any) => a.urgency === 'high');

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:system-ui,Arial,sans-serif;background:#0a0f1e;color:#e2e8f0;margin:0}
      .wrap{max-width:600px;margin:0 auto;padding:0 0 40px}
      .header{background:linear-gradient(135deg,#1e3a8a,#3730a3);padding:32px 28px;border-radius:12px 12px 0 0}
      .header h1{margin:0;font-size:22px;font-weight:800}
      .header p{margin:6px 0 0;opacity:.75;font-size:14px}
      .body{background:#111827;padding:28px}
      .stats{display:flex;gap:12px;margin-bottom:28px}
      .stat{flex:1;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:16px;text-align:center}
      .stat-val{font-size:28px;font-weight:800;color:#60a5fa}
      .savings{color:#34d399}
      .stat-label{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
      h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin:20px 0 10px}
      .alert{border-left:3px solid #ef4444;background:#1c1018;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:10px}
      .alert.high{border-color:#f97316;background:#1c1408}
      .alert-tool{font-size:11px;font-weight:700;text-transform:uppercase;color:#f97316;margin-bottom:4px}
      .alert-why{font-size:14px;color:#d1d5db;margin:0 0 6px}
      .impact{font-size:12px;color:#34d399;font-weight:600}
      .btn{display:block;width:180px;margin:28px auto 0;background:#3b82f6;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:700;font-size:14px}
      .footer{text-align:center;margin-top:24px;font-size:11px;color:#4b5563}
    </style></head><body><div class="wrap">
    <div class="header"><h1>📡 Stack Sentinel Report</h1><p>Hey ${userName}, your weekly stack intelligence is ready</p></div>
    <div class="body">
      <div class="stats">
        <div class="stat"><div class="stat-val">${stats.totalAlerts}</div><div class="stat-label">Alerts</div></div>
        <div class="stat"><div class="stat-val">${stats.criticalAlerts}</div><div class="stat-label">Critical</div></div>
        <div class="stat"><div class="stat-val savings">$${stats.potentialSavings}</div><div class="stat-label">Savings</div></div>
        <div class="stat"><div class="stat-val">${stats.actedOn}</div><div class="stat-label">Acted On</div></div>
      </div>
      ${criticalAlerts.length > 0 ? `<h2>🚨 Critical Alerts</h2>${criticalAlerts.map((a: any) => `
        <div class="alert"><div class="alert-tool">${a.affectedTool}</div>
        <p class="alert-why">${a.whyRelevant}</p>
        ${a.costImpact ? `<div class="impact">$${Math.abs(a.costImpact)}/mo impact</div>` : ''}</div>`).join('')}` : ''}
      ${highAlerts.length > 0 ? `<h2>⚠️ High Priority</h2>${highAlerts.slice(0,3).map((a: any) => `
        <div class="alert high"><div class="alert-tool">${a.affectedTool}</div>
        <p class="alert-why">${a.whyRelevant}</p></div>`).join('')}` : ''}
      <a href="${dashboardUrl || 'https://localhost:3000/dashboard'}" class="btn">View Dashboard →</a>
    </div>
    <div class="footer">Sent by Stack Sentinel | <a href="${dashboardUrl || '#'}/settings" style="color:#6b7280">Manage Preferences</a></div>
    </div></body></html>`;

    await createTransporter().sendMail({
      from: '"Stack Sentinel 📡" <' + process.env.EMAIL_USER + '>',
      to,
      subject: `📊 Stack Report: ${stats.totalAlerts} alerts, $${stats.potentialSavings} savings identified`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Email error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
