import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SearchResult } from "~/generated/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to parse context_used JSON string into SearchResult objects
export function parseContextUsed(contextUsed: string | null): SearchResult[] {
  if (!contextUsed) return [];

  try {
    return JSON.parse(contextUsed) as SearchResult[];
  } catch (error) {
    console.warn("Failed to parse context_used JSON:", error);
    return [];
  }
}
