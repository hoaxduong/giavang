import { v4 as uuidv4 } from "uuid";
import type { PortfolioEntry } from "./types";

const STORAGE_KEY = "giavang_portfolio";

export const portfolioStorage = {
  getPortfolio: (): PortfolioEntry[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  addEntry: (
    entry: Omit<PortfolioEntry, "id" | "user_id" | "created_at" | "updated_at">
  ): PortfolioEntry => {
    const portfolio = portfolioStorage.getPortfolio();
    const newEntry: PortfolioEntry = {
      ...entry,
      id: uuidv4(),
      user_id: "local-user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedPortfolio = [newEntry, ...portfolio];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolio));
    return newEntry;
  },

  updateEntry: (
    entry: Partial<PortfolioEntry> & { id: string }
  ): PortfolioEntry => {
    const portfolio = portfolioStorage.getPortfolio();
    const index = portfolio.findIndex((e) => e.id === entry.id);

    if (index === -1) {
      throw new Error("Entry not found");
    }

    const updatedEntry = {
      ...portfolio[index],
      ...entry,
      updated_at: new Date().toISOString(),
    };

    portfolio[index] = updatedEntry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    return updatedEntry;
  },

  deleteEntry: (id: string): void => {
    const portfolio = portfolioStorage.getPortfolio();
    const updatedPortfolio = portfolio.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolio));
  },

  importPortfolio: (entries: PortfolioEntry[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  },

  exportPortfolio: (): string => {
    const portfolio = portfolioStorage.getPortfolio();
    return JSON.stringify(portfolio, null, 2);
  },
};
