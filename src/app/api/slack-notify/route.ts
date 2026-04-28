import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { webhookUrl, alert } = await req.json();

    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: 'Missing webhookUrl' }, { status: 400 });
    }

    const urgencyEmoji: Record<string, string> = {
      critical: '🚨', high: '⚠️', medium: '📌', low: 'ℹ️',
    };
    const urgencyColors: Record<string, string> = {
      critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
    };

    const isTest = !alert;
    const payload = isTest
      ? {
          username: 'Stack Sentinel',
          icon_emoji: ':radar:',
          text: '✅ *Stack Sentinel is connected!* Alerts will be sent here based on your settings.',
        }
      : {
          username: 'Stack Sentinel',
          icon_emoji: ':radar:',
          attachments: [
            {
              color: urgencyColors[alert.urgency] || '#3b82f6',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `${urgencyEmoji[alert.urgency] || 'ℹ️'} *${(alert.urgency || '').toUpperCase()} Alert* — *${alert.affectedTool}*\n${alert.whyRelevant}`,
                  },
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Cost Impact*\n${alert.costImpact < 0 ? `💰 Save $${Math.abs(alert.costImpact)}/mo` : alert.costImpact > 0 ? `📈 +$${alert.costImpact}/mo` : 'No direct cost change'}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Action*\n${alert.recommendedAction}`,
                    },
                  ],
                },
                ...(alert.sourceUrl ? [{
                  type: 'context',
                  elements: [{ type: 'mrkdwn', text: `🔗 <${alert.sourceUrl}|View Source>` }],
                }] : []),
              ],
            },
          ],
        };

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!slackRes.ok) {
      const text = await slackRes.text();
      return NextResponse.json(
        { success: false, error: `Slack returned ${slackRes.status}: ${text}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Slack notify error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
