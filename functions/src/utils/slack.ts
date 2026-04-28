const urgencyColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const urgencyEmoji: Record<string, string> = {
  critical: '🚨', high: '⚠️', medium: '📌', low: 'ℹ️',
};

export async function sendSlackAlert(webhookUrl: string, alert: any): Promise<void> {
  const color = urgencyColors[alert.urgency] || '#3b82f6';
  const emoji = urgencyEmoji[alert.urgency] || 'ℹ️';
  const impact = alert.costImpact < 0
    ? `💰 Save $${Math.abs(alert.costImpact)}/mo`
    : alert.costImpact > 0
    ? `📈 +$${alert.costImpact}/mo`
    : 'No direct cost change';

  const message = {
    username: 'Stack Sentinel',
    icon_emoji: ':radar:',
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *${alert.urgency?.toUpperCase()} Alert* — *${alert.affectedTool}*\n${alert.whyRelevant}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Cost Impact*\n${impact}` },
              { type: 'mrkdwn', text: `*Action*\n${alert.recommendedAction}` },
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

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook failed with status ${res.status}`);
  }
}
