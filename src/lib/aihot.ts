export type AihotCategory =
  | "ai-models"
  | "ai-products"
  | "industry"
  | "paper"
  | "tip";

export type AihotItem = {
  id: string;
  title: string;
  title_en: string | null;
  url: string;
  source: string;
  publishedAt: string | null;
  summary: string | null;
  category: AihotCategory | null;
};

type AihotItemsResponse = {
  count: number;
  hasNext: boolean;
  nextCursor: string | null;
  items: AihotItem[];
};

type FetchAihotItemsOptions = {
  mode?: "selected" | "all";
  take?: number;
  category?: AihotCategory;
  q?: string;
  since?: Date;
};

const AIHOT_BASE_URL =
  process.env.AIHOT_API_BASE_URL ?? "https://aihot.virxact.com";

const AIHOT_USER_AGENT =
  process.env.AIHOT_USER_AGENT ??
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchAihotItems({
  mode = "selected",
  take = 12,
  category,
  q,
  since,
}: FetchAihotItemsOptions = {}) {
  const url = new URL("/api/public/items", AIHOT_BASE_URL);
  url.searchParams.set("mode", mode);
  url.searchParams.set("take", String(Math.min(Math.max(take, 1), 100)));

  if (category) {
    url.searchParams.set("category", category);
  }

  if (q && q.trim().length >= 2) {
    url.searchParams.set("q", q.trim());
  }

  if (since) {
    url.searchParams.set("since", since.toISOString());
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": AIHOT_USER_AGENT,
      Accept: "application/json",
    },
    next: {
      revalidate: 300,
      tags: ["aihot-items"],
    },
  });

  if (!response.ok) {
    throw new Error(`AI HOT request failed: ${response.status}`);
  }

  return (await response.json()) as AihotItemsResponse;
}

export function getSinceDate(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}
