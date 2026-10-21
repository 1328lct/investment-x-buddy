import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DecisionPill, fmt, HealthPill, PageHeader, Pill, ResultPill } from "@/components/alpha/ui";
import { DECISION_LABEL, describeCondition } from "@/lib/alpha/evaluator";
import { actions, useApp } from "@/lib/alpha/store";
import { TYPE_LABEL } from "@/lib/alpha/catalog";
import { collectLeaves } from "@/lib/alpha/evaluator";

export const Route = createFileRoute("/tasks/")({
  head: () => ({
    meta: [
      { title: "任务管理 · AlphaRadar" },
      { name: "description", content: "创建、修改、暂停与恢复风险监控任务。" },
      { property: "og:title", content: "任务管理 · AlphaRadar" },
      { property: "og:description", content: "管理所有监控任务及其健康状态。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tasks,
});

function Tasks() {
  const s = useApp();
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "unhealthy">("all");
  const list = s.tasks.filter((t) => filter === "all" || (filter === "unhealthy" ? !["healthy", "unknown"].includes(t.state.health) : t.status === filter));
  return (
    <>
      <PageHeader title="任务管理" desc="健康状态（数据是否可信）与条件结果（是否成立）独立展示。" actions={<Button asChild className="bg-gradient-primary"><Link to="/tasks/new">新建任务</Link></Button>} />
      <div className="mb-3 flex gap-1">
        {(["all", "active", "paused", "unhealthy"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-xs ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{{ all: "全部", active: "运行中", paused: "已暂停", unhealthy: "健康异常" }[f]}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((t) => {
          const last = s.runs.find((r) => r.taskId === t.id);
          const types = [...new Set(collectLeaves(t.rule.condition).map((l) => TYPE_LABEL[l.type]))];
          return (
            <div key={t.id} className="panel flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/tasks/$id" params={{ id: t.id }} className="font-medium hover:text-primary">{t.name}</Link>
                  <Pill tone={t.status === "active" ? "success" : "muted"}>{t.status === "active" ? "运行中" : "已暂停"}</Pill>
                  {types.map((x) => <Pill key={x} tone="info">{x}</Pill>)}
                  <Pill>v{t.ruleVersion}</Pill>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{describeCondition(t.rule.condition)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <HealthPill h={t.state.health} /><ResultPill r={t.state.lastResult} />{last && <DecisionPill d={last.decision} />}
                  <span className="num text-muted-foreground">上次 {fmt(t.state.lastRunAt)} · 下次 {t.status === "active" ? fmt(t.state.nextRunAt) : "—"} · 冷却至 {fmt(t.state.cooldownUntil)}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="outline" onClick={async () => { const r = await actions.check(t.id, "manual"); if (r) toast(`检查完成：${DECISION_LABEL[r.decision]}`); }}><RefreshCw className="h-3.5 w-3.5" />立即检查</Button>
                {t.status === "active" ? <Button size="sm" variant="outline" onClick={() => actions.setStatus(t.id, "paused")}><Pause className="h-3.5 w-3.5" />暂停</Button> : <Button size="sm" variant="outline" onClick={() => actions.setStatus(t.id, "active")}><Play className="h-3.5 w-3.5" />恢复</Button>}
                <Button size="sm" variant="ghost" aria-label="删除" onClick={() => { if (confirm(`确认删除「${t.name}」？`)) actions.deleteTask(t.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground">没有符合条件的任务。</p>}
      </div>
    </>
  );
}
