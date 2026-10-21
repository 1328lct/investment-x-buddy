import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RunRow } from "@/components/alpha/RunView";
import { DemoBadge, Label, PageHeader, Panel } from "@/components/alpha/ui";
import { SCENARIOS, type Scenario } from "@/lib/alpha/adapters";
import { actions, useApp } from "@/lib/alpha/store";
import type { RunRecord } from "@/lib/alpha/types";

export const Route = createFileRoute("/simulate")({
  head: () => ({
    meta: [
      { title: "模拟与故障注入 · AlphaRadar" },
      { name: "description", content: "以可复现的 DEMO 数据注入正常、触发、过期、冲突、超时与恢复场景。" },
      { property: "og:title", content: "模拟与故障注入 · AlphaRadar" },
      { property: "og:description", content: "可复现的场景模拟面板。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Simulate,
});

const LIFECYCLE: Scenario[] = ["normal", "trigger", "trigger", "stale", "conflict", "timeout", "recover", "trigger"];

function Simulate() {
  const s = useApp();
  const [taskId, setTaskId] = useState("");
  const [scenario, setScenario] = useState<Scenario>("trigger");
  const [seed, setSeed] = useState(42);
  const [out, setOut] = useState<RunRecord[]>([]);
  const tid = taskId || s.tasks[0]?.id || "";
  const task = s.tasks.find((t) => t.id === tid);

  const run = async (sc: Scenario) => {
    const r = await actions.check(tid, "simulation", { scenario: sc, seed });
    if (r) setOut((o) => [r, ...o]);
  };
  const lifecycle = async () => {
    for (const sc of LIFECYCLE) await run(sc);
  };

  return (
    <>
      <PageHeader title="模拟与故障注入" desc={<>所有数据为确定性合成数据（场景 + 种子可复现），<DemoBadge /> 不代表任何真实行情。</>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Panel title="配置">
          <label className="block"><Label>目标任务</Label>
            <select className="field w-full" value={tid} onChange={(e) => setTaskId(e.target.value)}>{s.tasks.map((t) => <option key={t.id} value={t.id}>{t.name}{t.status === "paused" ? "（已暂停）" : ""}</option>)}</select>
          </label>
          <label className="mt-3 block"><Label>随机种子</Label><input type="number" className="field num w-full" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></label>
          <Label>场景</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {SCENARIOS.map((sc) => (
              <button key={sc.id} onClick={() => setScenario(sc.id)} className={`rounded-md border px-3 py-2 text-left text-xs ${scenario === sc.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                <b>{sc.label}</b><span className="ml-2 text-muted-foreground">{sc.desc}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!task} className="bg-gradient-primary" onClick={() => run(scenario)}><Play className="h-4 w-4" />运行一次</Button>
            <Button disabled={!task} variant="outline" onClick={lifecycle}><ListOrdered className="h-4 w-4" />完整生命周期</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">生命周期序列：{LIFECYCLE.join(" → ")}。可观察：首次触发 → 去重（持续成立）→ 过期/冲突/超时不改变状态 → 恢复 → 冷却期内再次成立被冷却抑制。</p>
          {task && <p className="num mt-2 text-[11px] text-muted-foreground">当前 episode #{task.state.episode} · 冷却至 {task.state.cooldownUntil ?? "—"}</p>}
        </Panel>
        <Panel title={`本次会话结果 (${out.length})`} actions={out.length > 0 && <button className="text-xs text-muted-foreground" onClick={() => setOut([])}>清空</button>}>
          <div className="space-y-2">{out.map((r, i) => <RunRow key={r.id} run={r} defaultOpen={i === 0} />)}</div>
          {out.length === 0 && <p className="text-xs text-muted-foreground">选择场景并运行。结果同时写入任务运行历史与审计日志。</p>}
        </Panel>
      </div>
    </>
  );
}
