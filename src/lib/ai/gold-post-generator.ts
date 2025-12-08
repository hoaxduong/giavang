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

function preparePrompt(
  prices: EnrichedPriceSnapshot[],
  worldGoldPrice: number | null,
  style: string
): string {
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

  // Add world gold price if available
  const worldPriceInfo = worldGoldPrice
    ? `\n\nWorld Gold Price (XAU/USD): $${worldGoldPrice.toFixed(2)}/oz\nEstimated in VND/tael: ${formatPrice(worldGoldPrice * 31.1035 * 24000)} (using approximate exchange rate)`
    : "\n\nWorld Gold Price: Not available";

  return `You are an expert gold market analyst for a Vietnamese audience.
Write a blog post about today's gold prices (${dateStr}).

Current Data:
${priceSummary}${worldPriceInfo}

Style to use: ${style}

Structure:
1. **Opening**: Engaging introduction (approx. 100-150 words). Summarize the main trend (up/down/stable). Mention the key numbers immediately.
2. **Domestic Price Analysis** (H2: "Giá vàng trong nước hôm nay [Date]"):
   - Detailed breakdown of SJC, PNJ, DOJI, and major retailers.
   - Use a clear HTML Table to present the prices for readability (Headers: Thương hiệu, Loại vàng, Giá Mua, Giá Bán, Thay đổi).
   - Highlight any significant price movements (increase/decrease > 500k VND/tael).
3. **World Gold Price** (H2: "Giá vàng thế giới"):
   - Use the provided world price data.
   - Compare the gap between domestic and world prices.
4. **Market Commentary** (H2: "Nhận định thị trường"):
   - Why is the price moving? (Global conflict, FED interest rates, Dollar strength, etc.).
   - Use expert tone.
5. **Forecast/Advice** (H2: "Dự báo giá vàng"):
   - Short-term prediction.
   - Advice for buyers/sellers (Hold or Sell).

Requirements:
- Language: Vietnamese.
- Format: HTML (use <h2>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>).
- SEO Best Practices:
  - Use H2 for main sections, H3 for sub-sections if needed.
  - Keywords to include naturally: "giá vàng hôm nay", "SJC", "vàng 9999", "giá vàng trực tuyến", "biểu đồ giá vàng".
  - Bold key figures and trends.
  - Keep paragraphs short (3-4 sentences max).
- Tone: Professional, analytical, but easy to read.
- Title: Catchy, includes "Giá vàng hôm nay [Date]" and a "hook" (e.g., "SJC tăng sốc", "Lao dốc không phanh").

IMPORTANT: You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting, explanations, or additional text.

The JSON object must have exactly this structure:
{
  "title": "string",
  "excerpt": "string (meta description, 150-160 chars, enticing)",
  "content": "string (HTML body)"
}

Respond with ONLY the JSON object, nothing else.`;
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
  const prompt = preparePrompt(prices, worldGoldPrice, randomStyle);

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
