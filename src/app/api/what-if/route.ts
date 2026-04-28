import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const whatIfSchema = {
  type: "OBJECT",
  properties: {
    estimatedNewCost: { type: "NUMBER" },
    monthlySavings: { type: "NUMBER" },
    migrationComplexity: { type: "STRING", enum: ["low", "medium", "high"] },
    featureComparison: { type: "STRING" },
    recommendation: { type: "STRING" },
    caveats: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["estimatedNewCost", "monthlySavings", "migrationComplexity", "featureComparison", "recommendation", "caveats"]
};

export async function POST(req: Request) {
  try {
    const { currentTool, replacementTool, action, stack } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ success: false, error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }

    const stackContext = stack
      .map((s: any) => `- ${s.name} (${s.category}): $${s.monthlyCost}/month`)
      .join('\n');

    const prompt = `
You are Stack Sentinel, an AI infrastructure cost analyst evaluating a tech stack migration scenario.
The user wants to evaluate the scenario: ${action}

Current Tool: ${currentTool?.name ? currentTool.name + ' ($'+currentTool.monthlyCost+'/mo)' : 'None'}
Action: ${action}
Replacement Tool/Service: ${replacementTool?.name || 'None'}

Their full stack is:
${stackContext}

Analyze the following using Google Search Grounding to verify current pricing and features:
1. What is the estimated monthly cost of the replacement tool assuming similar scalable usage?
2. What is the migration complexity? 
3. Provide a brief feature comparison mapping pros/cons.
4. What is your final recommendation?

Always return valid JSON. Do not include markdown wraps.
`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: whatIfSchema,
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });

    if (!response.text) {
      throw new Error("No text response from Gemini");
    }

    const result = JSON.parse(response.text);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (err: any) {
    console.error("What-If Analysis Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
