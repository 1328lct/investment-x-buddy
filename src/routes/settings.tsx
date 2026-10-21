import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { fmt, Label, PageHeader, Panel } from "@/components/alpha/ui";
import { SCENARIOS, type Scenario } from "@/lib/alpha/adapters";
import { actions, useApp } from "@/lib/alpha/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "设置与合规 · AlphaRadar" },
      { name: "description", content: "运行模式、浏览器调度器、合规声明与审计日志。" },
      { property: "og:title", content: "设置与合规 · AlphaRadar" },
      { property: "og:description", content: "运行模式与合规说明。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const s = useApp();
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ tasks: s.tasks, runs: s.runs, audit: s.audit }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "alpharadar-export.json";
    a.click();
  };
  return (
    <>
      <PageHeader title="设置与合规" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="运行模式">
          <p className="rounded-md border border-demo/40 bg-demo/10 p-3 text-xs leading-relaxed text-demo">当前为「仅浏览器演示模式，非24h后台调度」。任务、运行记录、通知与审计日志保存在本机 localStorage；调度器每 5 秒在页面内检查到期任务，关闭页面即停止。未部署后台 Worker，不提供 7×24 监控。</p>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={s.settings.schedulerEnabled} onChange={(e) => actions.setSettings({ schedulerEnabled: e.target.checked })} />启用浏览器调度器</label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label><Label>调度器/立即检查使用的场景</Label><select className="field w-full" value={s.settings.scenario} onChange={(e) => actions.setSettings({ scenario: e.target.value as Scenario })}>{SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
            <label><Label>种子</Label><input type="number" className="field num w-full" value={s.settings.seed} onChange={(e) => actions.setSettings({ seed: Number(e.target.value) })} /></label>
          </div>
          <div className="mt-4 flex gap-2"><Button variant="outline" onClick={exportJson}>导出 JSON</Button><Button variant="destructive" onClick={() => { if (confirm("清空本地数据并重新载入示例任务？")) actions.reset(); }}>重置演示数据</Button></div>
        </Panel>
        <Panel title="合规声明">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            <li>本系统仅根据用户自定义条件发出提醒，不提供任何买入、卖出或持有建议，不构成投资建议。</li>
            <li>所有行情、事件、热度数值均为 DEMO 合成数据，标注来源 DEMO-SIM，非实时、非真实市场数据。</li>
            <li>自然语言解析使用确定性演示解析器，非大模型；结果须由用户确认后生效。</li>
            <li>扶摇、iFinD MCP 等真实数据源未接入，接入需服务端凭据与授权。</li>
            <li>每次决策保留证据、数据时间戳与来源，可追溯与复现。</li>
          </ul>
        </Panel>
      </div>
      <Panel title={`审计日志 (${s.audit.length})`} className="mt-4">
        <div className="max-h-96 divide-y divide-border overflow-auto">
          {s.audit.map((a) => <div key={a.id} className="flex flex-wrap gap-3 py-1.5 text-xs"><span className="num text-muted-foreground">{fmt(a.at)}</span><span>{a.actor}</span><b>{a.action}</b><span className="text-muted-foreground">{s.tasks.find((t) => t.id === a.taskId)?.name}</span><span className="text-muted-foreground">{a.detail}</span></div>)}
        </div>
      </Panel>
    </>
  );
}
