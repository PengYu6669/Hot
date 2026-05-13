import { getHotEventDashboard } from "@/lib/hot-events";
import { WorkflowDemo } from "./workflow-demo";

export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  const dashboard = await getHotEventDashboard();

  return <WorkflowDemo dashboard={dashboard} />;
}
