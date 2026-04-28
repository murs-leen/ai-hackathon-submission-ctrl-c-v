import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const alertSchema = {
  type: "OBJECT",
  properties: {
    alerts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          isRelevant: { type: "BOOLEAN" },
          relevanceScore: { type: "NUMBER" },
          urgency: { type: "STRING" },
          affectedTool: { type: "STRING" },
          whyRelevant: { type: "STRING" },
          costImpact: { type: "NUMBER" },
          recommendedAction: { type: "STRING" },
          sourceUrl: { type: "STRING" },
          confidence: { type: "NUMBER" }
        },
        required: ["isRelevant", "relevanceScore", "urgency", "affectedTool", "whyRelevant", "costImpact", "recommendedAction"]
      }
    }
  },
  required: ["alerts"]
};

export async function POST(req: Request) {
  try {
    const { stack } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ success: false, error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }

    const stackDescription = stack
      .map((s: any) => `- ${s.name} (${s.category}): $${s.monthlyCost}/month`)
      .join('\n');

    const prompt = `
You are Stack Sentinel, an AI technical analyst specializing in developer tools and cloud infrastructure costs.
The user has this tech stack:

${stackDescription}

Search the web for the LATEST news (last 7 days) about:
1. Pricing changes for any of these tools
2. New alternatives that could replace them
3. Deprecation notices
4. New features that affect cost

For each relevant finding, provide:
- What changed
- Which tool it affects
- Estimated monthly cost impact (negative for savings, positive for increases)
- Recommended action
- The source URL where this was found

Be conservative - only flag things that DEFINITELY affect the user's stack.
Return JSON array wrapper named "alerts".
`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: alertSchema,
        tools: [{ googleSearch: {} }],
        temperature: 0.1
      }
    });

    if (!response.text) {
      throw new Error("No text response from Gemini");
    }

    const parsed = JSON.parse(response.text);
    
    // Extract sources securely
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.webSearchQueries || [];

    const validAlerts = parsed.alerts.filter((a: any) => a.isRelevant);
    const urgencyMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    
    const sortedAlerts = validAlerts.sort((a: any, b: any) => {
      const uA = urgencyMap[a.urgency?.toLowerCase()] || 0;
      const uB = urgencyMap[b.urgency?.toLowerCase()] || 0;
      if (uA !== uB) return uB - uA;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    return NextResponse.json({
      success: true,
      alerts: sortedAlerts.slice(0, 5),
      sources: sources,
      analyzedAt: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("Grounding Analysis Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
