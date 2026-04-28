import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function POST(req: Request) {
  try {
    const { stack } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ success: false, error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }

    const stackDescription = stack
      .map((s: any) => `- ${s.name} (${s.category}): $${s.monthlyCost}/month`)
      .join('\n');

    // STEP 1: Use Google Search Grounding to find real news (no responseSchema — they conflict)
    const groundedPrompt = `
You are Stack Sentinel, an AI technical analyst specializing in developer tools and cloud infrastructure.

The user's tech stack is:
${stackDescription}

Search the web RIGHT NOW for the LATEST news (last 30 days) about these exact tools covering:
1. ANY pricing changes, price increases, or new pricing tiers
2. Deprecation notices or API breaking changes  
3. New alternatives or competitors launching
4. New features that significantly affect monthly costs
5. Acquisition news that may affect pricing or availability

For EACH relevant finding you discover through web search, return a JSON object in an array called "alerts" with these exact fields:
- isRelevant: true/false
- relevanceScore: 0-100 (how directly this affects the user's stack)
- urgency: "critical" | "high" | "medium" | "low"
- affectedTool: exact tool name from the stack
- whyRelevant: 2-3 sentence explanation of why this matters specifically for this user
- costImpact: estimated monthly dollar change (negative = savings, positive = cost increase, 0 if unknown)
- recommendedAction: specific actionable step the user should take
- sourceUrl: the actual URL where this news was found

IMPORTANT: 
- You MUST search the web and find REAL news articles 
- Even "medium" relevance findings should be included
- Return at minimum 3 alerts if any relevant news exists
- Always include the sourceUrl from the actual webpage you found
- Return ONLY valid JSON: {"alerts": [...]}
`;

    const groundedResponse = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: groundedPrompt,
      config: {
        responseMimeType: "text/plain", // plain text when using googleSearch
        tools: [{ googleSearch: {} }],
        temperature: 0.3
      }
    });

    const rawText = groundedResponse.text || '{"alerts":[]}';

    // Extract sources from grounding metadata
    const groundingMetadata = groundedResponse.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.webSearchQueries || [];
    const groundingChunks = (groundingMetadata as any)?.groundingChunks || [];
    const sourceUrls = groundingChunks
      .map((c: any) => c?.web?.uri)
      .filter(Boolean)
      .slice(0, 5);

    // Parse JSON from the grounded response
    let parsed: { alerts: any[] } = { alerts: [] };
    try {
      // Strip markdown code fences if present
      const clean = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Find the JSON object
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("JSON parse error, raw text:", rawText.substring(0, 500));
      // If parsing fails, try STEP 2 below to reformat
    }

    // STEP 2: If grounding returned no alerts or failed to parse, use structured output without grounding
    if (!parsed.alerts || parsed.alerts.length === 0) {
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
              },
              required: ["isRelevant", "relevanceScore", "urgency", "affectedTool", "whyRelevant", "costImpact", "recommendedAction"]
            }
          }
        },
        required: ["alerts"]
      };

      const fallbackResponse = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Based on your training knowledge about these developer tools, identify ANY recent news, pricing changes, deprecations, or important updates for:
${stackDescription}

Include anything from the last 6 months. Do not say "stack is fine" — always find SOMETHING notable to report even if minor.
Return at least 2-3 alerts.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: alertSchema,
          temperature: 0.4
        }
      });

      if (fallbackResponse.text) {
        try { parsed = JSON.parse(fallbackResponse.text); } catch {}
      }
    }

    const validAlerts = (parsed.alerts || []).filter((a: any) => a.isRelevant !== false);
    const urgencyMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    const sortedAlerts = validAlerts.sort((a: any, b: any) => {
      const uA = urgencyMap[a.urgency?.toLowerCase()] || 0;
      const uB = urgencyMap[b.urgency?.toLowerCase()] || 0;
      if (uA !== uB) return uB - uA;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    return NextResponse.json({
      success: true,
      alerts: sortedAlerts.slice(0, 6),
      sources: [...sources, ...sourceUrls],
      analyzedAt: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("Grounding Analysis Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
