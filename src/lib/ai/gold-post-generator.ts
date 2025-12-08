import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateJSON } from "@tiptap/html";
import { extensions } from "@/lib/tiptap/extensions";
import { EnrichedPriceSnapshot } from "@/lib/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function preparePrompt(prices: EnrichedPriceSnapshot[], style: string): string {
  const dateStr = format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi });

  // Group prices for better context
  const sjcPrices = prices.filter(
    (p) => p.retailer === "SJC" || p.product_name?.includes("SJC")
  );
  const pnjPrices = prices.filter((p) => p.retailer === "PNJ");
  const dojiPrices = prices.filter((p) => p.retailer === "DOJI");

  const formatGroup = (name: string, group: EnrichedPriceSnapshot[]) => {
    if (!group.length) return "";
    return (
      `\n${name}:\n` +
      group
        .map((p) => {
          const changeBuy = p.buyChange
            ? `(${p.buyChange > 0 ? "+" : ""}${formatPrice(p.buyChange)})`
            : "";
          const changeSell = p.sellChange
            ? `(${p.sellChange > 0 ? "+" : ""}${formatPrice(p.sellChange)})`
            : "";
          return `- ${p.product_name}: Mua ${formatPrice(p.buy_price)} ${changeBuy}, Bán ${formatPrice(p.sell_price)} ${changeSell}`;
        })
        .join("\n")
    );
  };

  const priceSummary =
    formatGroup("SJC", sjcPrices) +
    formatGroup("PNJ", pnjPrices) +
    formatGroup("DOJI", dojiPrices) +
    "\n\nOther Prices:\n" +
    prices
      .filter(
        (p) =>
          !sjcPrices.includes(p) &&
          !pnjPrices.includes(p) &&
          !dojiPrices.includes(p)
      )
      .map(
        (p) =>
          `- ${p.retailer} - ${p.product_name}: ${formatPrice(p.buy_price)} / ${formatPrice(p.sell_price)}`
      )
      .join("\n");

  return `
    You are an expert gold market analyst for a Vietnamese audience.
    Write a blog post about today's gold prices (${dateStr}).
    
    Current Data:
    ${priceSummary}
    
    Style to use: ${style}
    
    Structure:
    1. **Opening**: Engaging introduction about the market state today.
    2. **Detailed Analysis**: Breakdown of SJC, PNJ, DOJI prices. Highlight significant changes.
    3. **Closing**: Summary and quick advice for investors.
    
    Requirements:
    - Language: Vietnamese.
    - Format: HTML (use <h2>, <p>, <ul>, <li>, <strong>).
    - SEO: Use keywords "giá vàng hôm nay", "SJC", "vàng 9999".
    - Tone: Professional but accessible.
    - Title: Generate a catchy title including "Giá vàng hôm nay" and the date.
    
    Output Format:
    Return a JSON object with:
    {
      "title": "string",
      "excerpt": "string (short summary for meta description)",
      "content": "string (HTML body)"
    }
  `;
}

import { createOpenAI } from "@ai-sdk/openai";

interface AiConfig {
  provider: "google" | "openai";
  apiKey: string;
}

export async function generateDailyGoldPost(
  prices: EnrichedPriceSnapshot[],
  config?: AiConfig
) {
  // Pick a random style
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const prompt = preparePrompt(prices, randomStyle);

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
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json/g, "").replace(/```$/g, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```/g, "").replace(/```$/g, "");
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
