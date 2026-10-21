import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pause, Pencil, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RunRow } from "@/components/alpha/RunView";
import { TaskComposer } from "@/components/alpha/TaskComposer";
import { fmt, HealthPill, PageHeader, Panel, Pill, ResultPill } from "@/components/alpha/ui";
import { DECISION_LABEL, describeCondition } from "@/lib/alpha/evaluator";
import { actions, useApp } from "@/lib/alpha/store";

export const Route = createFileRoute("/tasks/$id")({
  head: () => ({
    meta: [
      { title: "任务详情 · AlphaRadar" },
      { name: "description", content: "任务运行历史、版本时间线与数据证据。" },
      { property: "og:title", content: "任务详情 · AlphaRadar" },
      { property: "og:description", content: "可解释的运行记录与版本历史。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const s = useApp();
  const t = s.tasks.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"runs" | "versions" | "audit">("runs");
  if (!s.loaded) return <p className="text-sm text-muted-foreground">加载中…</p>;
  if (!t) return <p className="text-sm">任务不存在。<Link to="/tasks" className="text-primary">返回列表</Link></p>;
  const runs = s.runs.filter((r) => r.taskId === id);
  const audit = s.audit.filter((a) => a.taskId === id);

  return (
    <>
      <PageHeader
        title={t.name}
        desc={<span className="num">{t.id} · schema {t.schemaVersion} · 规则 v{t.ruleVersion}</span>}
        actions={<>
          <Button variant="outline" onClick={async () => { const r = await actions.check(t.id, "manual"); if (r) toast(`检查完成：${DECISION_LABEL[r.decision]}`); }}><RefreshCw className="h-4 w-4" />立即检查</Button>
          {t.status === "active" ? <Button variant="outline" onClick={() => actions.setStatus(t.id, "paused")}><Pause className="h-4 w-4" />暂停</Button> : <Button variant="outline" onClick={() => actions.setStatus(t.id, "active")}><Play className="h-4 w-4" />恢复</Button>}
          <Button onClick={() => setEditing(!editing)} className="bg-gradient-primary"><Pencil className="h-4 w-4" />{editing ? "取消修改" : "修改规则"}</Button>
        </>}
      />
      {editing && (
        <div className="mb-6">
          <TaskComposer requireNote initial={{ name: t.name, nlSource: t.nlSource, parser: t.parser, rule: structuredClone(t.rule) }} submitLabel="保存为新版本" onSubmit={(v, note) => { actions.updateRule(t.id, v.rule, note, v.name); setEditing(false); toast.success(`已生成 v${t.ruleVersion + 1}`); }} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="当前规则" className="lg:col-span-2">
          <p className="text-sm leading-relaxed">{describeCondition(t.rule.condition)}</p>
          <p className="mt-2 text-xs text-muted-foreground">原始指令：「{t.nlSource}」 · 解析方式：{t.parser === "demo-pattern" ? "演示解析器（非 AI）" : "手动"}</p>
          <div className="num mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <div>频率 {t.rule.tickSeconds}s</div><div>冷却 {t.rule.cooldownMinutes}min</div><div>过期 {t.rule.staleAfterSeconds}s</div><div>{t.rule.timezone}</div>
          </div>
        </Panel>
        <Panel title="运行状态">
          <div className="flex flex-wrap gap-1.5"><Pill tone={t.status === "active" ? "success" : "muted"}>{t.status === "active" ? "运行中" : "已暂停"}</Pill><HealthPill h={t.state.health} /><ResultPill r={t.state.lastResult} /></div>
          <dl className="num mt-3 space-y-1 text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">成立片段 episode</dt><dd>#{t.state.episode} {t.state.conditionActive ? "（进行中）" : ""}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">上次触发</dt><dd>{fmt(t.state.lastTriggeredAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">冷却至</dt><dd>{fmt(t.state.cooldownUntil)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">下次检查</dt><dd>{t.status === "active" ? fmt(t.state.nextRunAt) : "—"}</dd></div>
            <div><dt className="text-muted-foreground">已通知去重键</dt><dd className="break-all">{t.state.notifiedKeys.join(", ") || "—"}</dd></div>
          </dl>
        </Panel>
      </div>
      <div className="mt-6 mb-3 flex gap-1">
        {(["runs", "versions", "audit"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1 text-xs ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{{ runs: `运行历史 (${runs.length})`, versions: `版本时间线 (${t.versions.length})`, audit: `审计日志 (${audit.length})` }[k]}</button>)}
      </div>
      {tab === "runs" && <div className="space-y-2">{runs.slice(0, 60).map((r, i) => <RunRow key={r.id} run={r} defaultOpen={i === 0} />)}{runs.length === 0 && <p className="text-xs text-muted-foreground">暂无运行。点击「立即检查」。</p>}</div>}
      {tab === "versions" && (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {[...t.versions].reverse().map((v) => (
            <li key={v.version}>
              <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ${v.version === t.ruleVersion ? "bg-primary" : "bg-muted-foreground"}`} />
              <div className="flex flex-wrap items-center gap-2 text-xs"><Pill tone={v.version === t.ruleVersion ? "primary" : "muted"}>v{v.version}{v.version === t.ruleVersion ? " · 当前" : ""}</Pill><span className="num text-muted-foreground">{fmt(v.createdAt)}</span><span>{v.note}</span><span className="text-muted-foreground">运行 {runs.filter((r) => r.ruleVersion === v.version).length} 次</span></div>
              <p className="mt-1 text-sm">{describeCondition(v.rule.condition)}</p>
              <p className="num text-[11px] text-muted-foreground">频率 {v.rule.tickSeconds}s · 冷却 {v.rule.cooldownMinutes}min · 过期 {v.rule.staleAfterSeconds}s</p>
            </li>
          ))}
        </ol>
      )}
      {tab === "audit" && <div className="panel divide-y divide-border">{audit.map((a) => <div key={a.id} className="flex gap-3 px-3 py-2 text-xs"><span className="num text-muted-foreground">{fmt(a.at)}</span><b>{a.action}</b><span className="text-muted-foreground">{a.detail}</span></div>)}</div>}
    </>
  );
}
