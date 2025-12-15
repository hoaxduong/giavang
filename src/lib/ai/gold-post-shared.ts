import { EnrichedPriceSnapshot } from "@/lib/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export const DEFAULT_PROMPT_TEMPLATE = `You are an expert gold market analyst for a Vietnamese audience.
  Write a blog post about today's gold prices ({{date_str}}).
  
  Current Data:
  {{price_summary}}
  
  {{world_price_info}}
  
  Style to use: {{style}}
  
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

export function getPromptVariables(
  prices: EnrichedPriceSnapshot[],
  worldGoldPrice: number | null,
  style: string
): Record<string, string> {
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

  return {
    date_str: dateStr,
    price_summary: priceSummary,
    world_price_info: worldPriceInfo,
    style: style,
  };
}

export function fillPromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let prompt = template;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return prompt;
}
