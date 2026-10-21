import { createFileRoute } from "@tanstack/react-router";
import { fmt, PageHeader, Panel, Pill } from "@/components/alpha/ui";
import { ADAPTERS } from "@/lib/alpha/adapters";
import { actions, useApp } from "@/lib/alpha/store";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "数据源状态 · AlphaRadar" },
      { name: "description", content: "数据适配器连接状态：DEMO 模拟源可用，扶摇与 iFinD MCP 未接入。" },
      { property: "og:title", content: "数据源状态 · AlphaRadar" },
      { property: "og:description", content: "数据来源与接入状态。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sources,
});

function Sources() {
  const s = useApp();
  const lastOk = s.runs.find((r) => r.snapshot);
  return (
    <>
      <PageHeader title="数据源状态" desc="所有适配器实现统一 DataAdapter 接口。未提供凭据的适配器不会被伪装为已连接。" />
      <div className="grid gap-3 md:grid-cols-3">
        {ADAPTERS.map((a) => (
          <Panel key={a.id} title={a.name} actions={<Pill tone={a.connected ? "success" : "muted"}>{a.connected ? "可用（DEMO）" : "未接入"}</Pill>}>
            <p className="text-xs leading-relaxed text-muted-foreground">{a.description}</p>
            <p className="num mt-2 text-[11px] text-muted-foreground">id: {a.id}</p>
            <button disabled={!a.connected} onClick={() => actions.setSettings({ adapterId: a.id })} className={`mt-3 rounded-md border px-3 py-1 text-xs ${s.settings.adapterId === a.id ? "border-primary text-primary" : "border-border text-muted-foreground"} disabled:opacity-40`}>{s.settings.adapterId === a.id ? "当前使用" : a.connected ? "设为当前" : "需凭据"}</button>
          </Panel>
        ))}
      </div>
      <Panel title="最近一次数据获取" className="mt-4">
        {lastOk?.snapshot ? <p className="num text-xs">场景 {lastOk.snapshot.scenario} · 种子 {lastOk.snapshot.seed} · {fmt(lastOk.snapshot.fetchedAt)} · {lastOk.snapshot.points.length} 个数据点 · 来源 {[...new Set(lastOk.snapshot.points.map((p) => p.source))].join(", ")}</p> : <p className="text-xs text-muted-foreground">暂无。</p>}
      </Panel>
    </>
  );
}
