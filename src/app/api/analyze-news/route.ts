import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function POST(req: Request) {
  try {
    const { stack, newsItems } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable." }, { status: 500 });
    }

    // Prepare prompt
    const stackContext = stack.map((s: any) => `- ${s.name} (${s.category}) cost: $${s.monthlyCost}/mo`).join('\n');
    const newsContext = newsItems.map((n: any, i: number) => `[${i}] Title: ${n.title}\nDesc: ${n.description}`).join('\n\n');

    const prompt = `You are a technical analyst for a startup. Given this user's tech stack:
${stackContext}

Analyze the following news items:
${newsContext}

For each news item, determine if it DIRECTLY affects one of the tools in the user's stack. 
Only mark as relevant if the connection is strong (e.g., pricing change for their specific tool, or a new alternative that could clearly replace their specific tool).

Return a JSON object containing an "alerts" array. Each alert should have this structure:
{
  "newsItemIndex": number (the array index of the news item),
  "isRelevant": boolean,
  "relevanceScore": number (0-100),
  "urgency": "critical" | "high" | "medium" | "low",
  "whyRelevant": "explanation connecting news to specific tool in stack",
  "costImpact": number (negative = savings, positive = cost increase, 0 = no change),
  "recommendedAction": "specific actionable advice",
  "affectedTool": "which tool from stack this affects"
}

Only return the items that have "isRelevant": true. DO NOT output code blocks wrapping the JSON, strictly return valid JSON root.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.1
        }
    });

    let text = response.text;
    if (!text) {
        throw new Error("No text response from Gemini");
    }
    
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch(e) {
        text = text.replace(/```json/g, '').replace(/```/g, '');
        parsed = JSON.parse(text);
    }
    
    // Map indices back to actual news item
    const alerts = parsed.alerts.map((a: any) => ({
        ...a,
        newsItem: newsItems[a.newsItemIndex]
    }));

    // Filter missing/corrupted analysis and valid relevant scoring
    const validAlerts = alerts.filter((a: any) => a.isRelevant && a.newsItem);

    const urgencyMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    
    const sortedAlerts = validAlerts.sort((a: any, b: any) => {
      const uA = urgencyMap[a.urgency?.toLowerCase()] || 0;
      const uB = urgencyMap[b.urgency?.toLowerCase()] || 0;
      if (uA !== uB) return uB - uA;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    return NextResponse.json({ alerts: sortedAlerts.slice(0, 5) });
  } catch (err: any) {
    console.error("Analysis Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
