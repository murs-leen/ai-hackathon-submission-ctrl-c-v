import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';

let genAI: GoogleGenerativeAI;

function getGenAI() {
  if (!genAI) {
    const apiKey = functions.config().gemini?.api_key || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function analyzeStackWithGemini(stack: any[]): Promise<any[]> {
  const stackDescription = stack
    .map(s => `- ${s.name} (${s.category}): $${s.monthlyCost}/month`)
    .join('\n');

  const prompt = `You are Stack Sentinel. Analyze the LATEST news (last 24 hours) for this tech stack:

${stackDescription}

Search for:
1. Pricing changes or new pricing tiers
2. Deprecation notices or API breaking changes
3. Significant alternatives or competitors
4. Acquisition news affecting availability

For each finding return an object with:
- isRelevant (boolean)
- relevanceScore (0-100)
- urgency (critical|high|medium|low)
- affectedTool (exact tool name)
- whyRelevant (2-3 sentences)
- costImpact (monthly $ change, negative = savings)
- recommendedAction (specific step)
- sourceUrl (URL of source)

Return JSON: {"alerts": [...]}`;

  // Use grounded search (no responseSchema — they conflict)
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} } as any],
    generationConfig: { responseMimeType: 'text/plain', temperature: 0.3 },
  });

  const raw = result.response.text();
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]).alerts || [];
  } catch {}
  return [];
}
