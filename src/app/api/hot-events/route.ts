import { NextResponse } from "next/server";
import { getHotEventDashboard } from "@/lib/hot-events";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const dashboard = await getHotEventDashboard({ q });
    return NextResponse.json(dashboard);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load hot events";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
