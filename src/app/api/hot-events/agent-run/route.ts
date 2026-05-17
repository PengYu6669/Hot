import {
  runHotEventAgents,
  type AgentRunEvent,
  type AgentRunMode,
} from "@/lib/agent-orchestrator";
import type { HotEvent, Strategy } from "@/lib/hot-events";

type AgentRunRequest = {
  event?: HotEvent;
  instruction?: string;
  mode?: AgentRunMode;
  previousStrategy?: Strategy | null;
  conversationHistory?: { role: string; content: string }[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentRunRequest;

    if (!body.event) {
      return Response.json({ error: "event is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: AgentRunEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          await runHotEventAgents({
            event: body.event!,
            instruction: body.instruction,
            mode: body.mode ?? "standard",
            onEvent: send,
            previousStrategy: body.previousStrategy,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Agent run failed";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message,
              })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent run failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
