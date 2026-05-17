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

const DEFAULT_TIMEOUT_MS = 60000;

export type LlmGenerationResult<T> = {
  output: T;
  attempted: boolean;
  usedLlm: boolean;
  model: string;
  durationMs: number;
  fallbackReason: string | null;
};

export async function generateJsonWithLlm<T>({
  system,
  user,
  fallback,
  onToken,
}: {
  system: string;
  user: string;
  fallback: T;
  onToken?: (token: string) => void;
}): Promise<T> {
  const result = await generateJsonWithLlmResult({
    system,
    user,
    fallback,
    onToken,
  });
  return result.output;
}

export async function generateJsonWithLlmResult<T>({
  system,
  user,
  fallback,
  onToken,
}: {
  system: string;
  user: string;
  fallback: T;
  onToken?: (token: string) => void;
}): Promise<LlmGenerationResult<T>> {
  const startedAt = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.LLM_MODEL ?? "deepseek-chat";

  if (!apiKey || !baseUrl) {
    return {
      output: fallback,
      attempted: false,
      usedLlm: false,
      model,
      durationMs: Date.now() - startedAt,
      fallbackReason: "DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL is missing",
    };
  }

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    // Use streaming when a token callback is provided
    const content = onToken
      ? await postChatCompletionStream({
          baseUrl,
          apiKey,
          model,
          messages,
          onToken,
        })
      : await postChatCompletion({
          baseUrl,
          apiKey,
          model,
          messages,
        }).then((r) => r.choices?.[0]?.message?.content ?? "");

    if (!content) {
      return {
        output: fallback,
        attempted: true,
        usedLlm: false,
        model,
        durationMs: Date.now() - startedAt,
        fallbackReason: "LLM response did not include message content",
      };
    }

    return {
      output: JSON.parse(extractJson(content)) as T,
      attempted: true,
      usedLlm: true,
      model,
      durationMs: Date.now() - startedAt,
      fallbackReason: null,
    };
  } catch (error) {
    return {
      output: fallback,
      attempted: true,
      usedLlm: false,
      model,
      durationMs: Date.now() - startedAt,
      fallbackReason:
        error instanceof Error ? error.message : "LLM request failed",
    };
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

async function postChatCompletionStream({
  baseUrl,
  apiKey,
  model,
  messages,
  onToken,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  onToken: (token: string) => void;
}): Promise<string> {
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
        stream: true,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`LLM stream request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No stream body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            fullContent += token;
            onToken(token);
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    return fullContent;
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
