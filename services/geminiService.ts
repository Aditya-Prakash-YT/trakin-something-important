import { GoogleGenAI } from "@google/genai";
import { Counter, CounterLog } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.

export const generateInsights = async (
  counters: Counter[],
  logs: CounterLog[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare data summary
  const summary = {
    totalCounters: counters.length,
    counters: counters.map(c => ({ name: c.title, count: c.count })),
    recentActivityCount: logs.length,
    sampleLogs: logs.slice(-20).map(l => ({
      time: new Date(l.timestamp).toLocaleString(),
      change: l.valueChange
    }))
  };

  const prompt = `
    Analyze this user's counting data.
    Data Summary: ${JSON.stringify(summary, null, 2)}
    
    Provide a brief, fun, and motivating insight about their habits. 
    Are they productive? specific times they count?
    Keep it under 3 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768
        }
      }
    });
    return response.text || "Could not generate insights.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to connect to AI for insights.";
  }
};