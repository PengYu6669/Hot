import { getHotEventDashboard } from "@/lib/hot-events";
import { HotAgentWorkbench } from "./hotagent-workbench";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dashboard = await getHotEventDashboard();

  return <HotAgentWorkbench initialDashboard={dashboard} />;
}
