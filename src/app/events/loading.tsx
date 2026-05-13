import { AppShell, Panel } from "../app-shell";

export default function Loading() {
  return (
    <AppShell eyebrow="Event Detail" title="单事件看清楚">
      <Panel>
        <div className="h-8 w-64 rounded bg-[#f7f7f4]" />
        <div className="mt-4 h-28 rounded bg-[#f7f7f4]" />
      </Panel>
    </AppShell>
  );
}
