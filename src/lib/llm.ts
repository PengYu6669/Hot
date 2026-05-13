type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const DEFAULT_TIMEOUT_MS = 12000;

export async function generateJsonWithLlm<T>({
  system,
  user,
  fallback,
}: {
  system: string;
  user: string;
  fallback: T;
}): Promise<T> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.LLM_MODEL ?? "deepseek-chat";

  if (!apiKey || !baseUrl) {
    return fallback;
  }

  try {
    const response = await postChatCompletion({
      baseUrl,
      apiKey,
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return fallback;

    return JSON.parse(extractJson(content)) as T;
  } catch {
    return fallback;
  }
}

async function postChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(getChatCompletionUrl(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    return (await response.json()) as ChatCompletionResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function getChatCompletionUrl(baseUrl: string) {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  if (normalized.endsWith("/chat/completions/")) return normalized;
  if (normalized.endsWith("/v1/")) return new URL("chat/completions", normalized);
  return new URL("v1/chat/completions", normalized);
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();

  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");
  if (first >= 0 && last > first) return content.slice(first, last + 1);

  return content;
}
