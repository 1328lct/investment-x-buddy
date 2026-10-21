import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { RunRow } from "@/components/alpha/RunView";
import { DemoBadge, fmt, HealthPill, PageHeader, Panel, ResultPill, Pill } from "@/components/alpha/ui";
import { describeCondition } from "@/lib/alpha/evaluator";
import { useApp } from "@/lib/alpha/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "概览 · AlphaRadar 投资风险雷达" },
      { name: "description", content: "监控任务数量、健康状态与近期检查活动总览（演示数据）。" },
      { property: "og:title", content: "概览 · AlphaRadar 投资风险雷达" },
      { property: "og:description", content: "自然语言风险监控规则的总览面板。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-3xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function Overview() {
  const s = useApp();
  const active = s.tasks.filter((t) => t.status === "active").length;
  const unhealthy = s.tasks.filter((t) => !["healthy", "unknown"].includes(t.state.health)).length;
  const conditionTrue = s.tasks.filter((t) => t.state.conditionActive).length;
  const since = Date.now() - 24 * 3600e3;
  const triggered24 = s.runs.filter((r) => r.decision === "triggered" && new Date(r.at).getTime() > since).length;
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const end = Date.now() - (11 - i) * 5 * 60e3;
    const rs = s.runs.filter((r) => { const t = new Date(r.at).getTime(); return t <= end && t > end - 5 * 60e3; });
    return { t: new Date(end).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }), 未触发: rs.filter((r) => ["no_trigger", "recovered", "still_active", "suppressed_cooldown", "suppressed_dedupe"].includes(r.decision)).length, 触发: rs.filter((r) => r.decision === "triggered").length, 异常: rs.filter((r) => ["indeterminate", "skipped_unhealthy"].includes(r.decision)).length };
  });

  return (
    <>
      <PageHeader title="概览" desc={<>任务健康与条件结果分开呈现 · <DemoBadge /></>} actions={<><Button asChild variant="outline"><Link to="/simulate">故障注入</Link></Button><Button asChild className="bg-gradient-primary"><Link to="/tasks/new">新建任务</Link></Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="任务总数" value={s.tasks.length} />
        <Stat label="运行中" value={active} tone="text-primary" />
        <Stat label="条件当前成立" value={conditionTrue} tone="text-info" />
        <Stat label="健康异常" value={unhealthy} tone={unhealthy ? "text-warning" : ""} />
        <Stat label="24h 触发提醒" value={triggered24} tone="text-success" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel title="近 60 分钟检查活动（每 5 分钟）">
          <div className="h-56">{s.loaded && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} width={28} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="未触发" stackId="a" fill="var(--chart-5)" />
                <Bar dataKey="触发" stackId="a" fill="var(--chart-1)" />
                <Bar dataKey="异常" stackId="a" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>)}
          </div>
        </Panel>
        <Panel title="最近活动" actions={<Link to="/notifications" className="text-xs text-primary">通知中心 →</Link>}>
          <div className="max-h-56 space-y-2 overflow-auto">
            {s.runs.slice(0, 8).map((r) => <RunRow key={r.id} run={r} taskName={s.tasks.find((t) => t.id === r.taskId)?.name} />)}
            {s.runs.length === 0 && <p className="text-xs text-muted-foreground">暂无检查记录。打开任务点击「立即检查」或前往模拟面板。</p>}
          </div>
        </Panel>
      </div>
      <h2 className="mb-3 mt-6 text-sm font-semibold">任务卡片</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {s.tasks.map((t) => (
          <Link key={t.id} to="/tasks/$id" params={{ id: t.id }} className="panel block p-4 transition hover:border-primary/50">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{t.name}</div>
              <Pill tone={t.status === "active" ? "success" : "muted"}>{t.status === "active" ? "运行中" : "已暂停"}</Pill>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{describeCondition(t.rule.condition)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5"><HealthPill h={t.state.health} /><ResultPill r={t.state.lastResult} /><Pill>v{t.ruleVersion}</Pill></div>
            <div className="num mt-2 text-[11px] text-muted-foreground">上次 {fmt(t.state.lastRunAt)} · 下次 {t.status === "active" ? fmt(t.state.nextRunAt) : "—"}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
