import { Window } from "happy-dom";

// Polyfill DOM for @tiptap/html on server side
if (!global.window) {
  const window = new Window();
  // @ts-ignore
  global.window = window;
  // @ts-ignore
  global.document = window.document;
  // @ts-ignore - navigator is read-only in Node 21+, but checking validation script suggested we might not need it?
  // actually let's try WITHOUT navigator first as it caused crash in verification script.
}

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateJSON } from "@tiptap/html";
import { extensions } from "@/lib/tiptap/extensions";
import { EnrichedPriceSnapshot } from "@/lib/types";
import {
  getPromptVariables,
  fillPromptTemplate,
  DEFAULT_PROMPT_TEMPLATE,
} from "./gold-post-shared";

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const styles = [
  "Analytical: Focus on market trends and economic analysis",
  "News-style: Objective, journalistic, and direct",
  "Conversational: Friendly, engaging, and easy to understand",
  "Concise: Short, punchy, and to the point",
  "Detailed: Comprehensive coverage of all price movements",
];

export function preparePrompt(
  prices: EnrichedPriceSnapshot[],
  worldGoldPrice: number | null,
  style: string
): string {
  const vars = getPromptVariables(prices, worldGoldPrice, style);
  return fillPromptTemplate(DEFAULT_PROMPT_TEMPLATE, vars);
}

import { createOpenAI } from "@ai-sdk/openai";

interface AiConfig {
  provider: "google" | "openai";
  apiKey: string;
}

export async function generateDailyGoldPost(
  prices: EnrichedPriceSnapshot[],
  config?: AiConfig,
  promptTemplate?: string
) {
  // Fetch world gold price from database
  let worldGoldPrice: number | null = null;
  try {
    const { createServiceRoleClient } =
      await import("@/lib/supabase/service-role");
    const supabase = createServiceRoleClient();

    const { data: worldGold } = await supabase
      .from("price_snapshots")
      .select("buy_price")
      .eq("unit", "USD/oz")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (worldGold) {
      worldGoldPrice = Number(worldGold.buy_price);
    }
  } catch (error) {
    console.warn("Failed to fetch world gold price:", error);
    // Continue without world price
  }

  // Pick a random style
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  let prompt: string;
  if (promptTemplate) {
    const vars = getPromptVariables(prices, worldGoldPrice, randomStyle);
    prompt = fillPromptTemplate(promptTemplate, vars);
  } else {
    prompt = preparePrompt(prices, worldGoldPrice, randomStyle);
  }

  let model;

  if (config?.provider === "openai" && config.apiKey) {
    const openai = createOpenAI({ apiKey: config.apiKey });
    model = openai("gpt-4o");
  } else if (config?.provider === "google" && config.apiKey) {
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    model = google("gemini-2.5-flash");
  } else {
    // Fallback to default env vars
    model = google("gemini-2.5-flash");
  }

  const { text } = await generateText({
    model,
    prompt: prompt,
    temperature: 0.7,
  });

  // Parse the JSON response from the text
  // We asked for a JSON object in the prompt, but LLMs might wrap it in markdown code blocks
  let cleanText = text.trim();

  // Remove markdown code blocks
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/g, "").replace(/\s*```$/g, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/g, "").replace(/\s*```$/g, "");
  }

  // Try to extract JSON if there's text before/after
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  let result;
  try {
    result = JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse AI response:", text, e);
    throw new Error("AI response was not valid JSON");
  }

  // Convert HTML content to Tiptap JSON
  const tiptapJson = generateJSON(result.content, extensions);

  return {
    title: result.title,
    excerpt: result.excerpt,
    content: tiptapJson,
    style: randomStyle,
    provider: config?.provider || "default-google",
  };
}
