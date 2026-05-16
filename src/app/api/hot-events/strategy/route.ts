import { NextResponse } from "next/server";
import { createStrategy, type HotEvent } from "@/lib/hot-events";

type StrategyRequest = {
  event?: HotEvent;
  instruction?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StrategyRequest;
    const instruction = body.instruction?.trim();

    if (!body.event) {
      return NextResponse.json({ error: "event is required" }, { status: 400 });
    }

    const strategy = await createStrategy(body.event, {
      humanInstruction: instruction,
    });

    return NextResponse.json({ strategy });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to regenerate strategy";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
