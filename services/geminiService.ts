import { GoogleGenAI } from "@google/genai";
import { Counter, CounterLog } from "../types";

// This expects the API key to be available via environment variable
// In a real deployed app, you'd proxy this request or ensure env var is set.
// For this demo, we'll try to use process.env.API_KEY if available.

export const generateInsights = async (
  counters: Counter[],
  logs: CounterLog[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not configured for Gemini. Please check your setup.";
  }

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
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate insights.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to connect to AI for insights.";
  }
};