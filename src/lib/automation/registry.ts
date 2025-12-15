import { AutomationHandler } from "./types";
import { GoldPricePostHandler } from "./handlers/gold-price-post";

export const automationRegistry: Record<string, AutomationHandler> = {
  gold_price_post: new GoldPricePostHandler(),
};

export function getAutomationHandler(type: string): AutomationHandler {
  const handler = automationRegistry[type];
  if (!handler) {
    throw new Error(`No handler found for automation type: ${type}`);
  }
  return handler;
}
