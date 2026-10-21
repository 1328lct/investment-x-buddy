import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RunEvidence } from "@/components/alpha/RunView";
import { DecisionPill, HealthPill, Label, PageHeader, Panel, Pill, ResultPill } from "@/components/alpha/ui";
import { describeLeaf } from "@/lib/alpha/evaluator";
import { useApp } from "@/lib/alpha/store";
import type { Condition, LeafEvidence } from "@/lib/alpha/types";

export const Route = createFileRoute("/explain")({
  head: () => ({
    meta: [
      { title: "可解释性 · AlphaRadar" },
      { name: "description", content: "逐条件展示证据、三值逻辑组合与触发决策。" },
      { property: "og:title", content: "可解释性 · AlphaRadar" },
      { property: "og:description", content: "每一次触发与不触发的理由。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explain,
});

function Tree({ c, ev }: { c: Condition; ev: LeafEvidence[] }) {
  if (c.kind === "leaf") {
    const e = ev.find((x) => x.leafId === c.id);
    return <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-xs"><span>{describeLeaf(c)}</span>{e ? <><HealthPill h={e.health} /><ResultPill r={e.result} /></> : <Pill>未评估</Pill>}</div>;
  }
  return (
    <div className="rounded-lg border border-dashed border-primary/40 p-2">
      <Pill tone="primary">{c.op}</Pill>
      <div className="mt-2 space-y-1.5 pl-3">{c.children.map((ch) => <Tree key={ch.id} c={ch} ev={ev} />)}</div>
    </div>
  );
}

function Explain() {
  const s = useApp();
  const [tid, setTid] = useState("");
  const id = tid || s.tasks[0]?.id;
  const t = s.tasks.find((x) => x.id === id);
  const run = s.runs.find((r) => r.taskId === id);
  return (
    <>
      <PageHeader title="可解释性" desc="健康（数据可信度）→ 条件结果（三值逻辑）→ 决策（去重/冷却/恢复），三层分离。" />
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          <Panel title="选择任务">
            <select className="field w-full" value={id} onChange={(e) => setTid(e.target.value)}>{s.tasks.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </Panel>
          {t && <Panel title="条件树（最近一次运行）"><Tree c={t.rule.condition} ev={run && run.ruleVersion === t.ruleVersion ? run.evidence : []} /></Panel>}
          <Panel title="决策规则">
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
              <li>数据获取失败/超时 → 健康降级，结果「未知」，跳过，不改变成立片段。</li>
              <li>单条件：无数据 / 多源差异超容忍度（冲突）/ 时间戳超过过期阈值 → 「未知」。</li>
              <li>AND：任一不成立即不成立；否则有未知即未知。OR：任一成立即成立；否则有未知即未知。</li>
              <li>结果由不成立变为成立 → 开启新片段 episode+1，dedupeKey = taskId:v版本:e片段。</li>
              <li>dedupeKey 已通知 → 不重复；处于冷却期 → 冷却抑制；否则触发并设置冷却截止时间。</li>
              <li>结果由成立变为不成立 → 「恢复」，片段结束。修改规则产生新版本并重置运行状态。</li>
            </ol>
          </Panel>
        </div>
        <Panel title="最近一次决策与证据" actions={run && <div className="flex gap-1"><HealthPill h={run.health} /><ResultPill r={run.result} /><DecisionPill d={run.decision} /></div>}>
          {run ? <><Label>规则 v{run.ruleVersion} · {new Date(run.at).toLocaleString("zh-CN", { hour12: false })}</Label><RunEvidence run={run} /></> : <p className="text-xs text-muted-foreground">该任务尚无运行记录。</p>}
        </Panel>
      </div>
    </>
  );
}
