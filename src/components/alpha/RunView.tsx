import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { RunRecord } from "@/lib/alpha/types";
import { DecisionPill, DemoBadge, fmt, HealthPill, Pill, ResultPill } from "./ui";

const TRIG = { manual: "手动", scheduler: "浏览器调度", simulation: "模拟" } as const;

export function RunEvidence({ run }: { run: RunRecord }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">{run.explanation}</p>
      {run.error && <p className="text-xs text-destructive">错误：{run.error}</p>}
      {run.evidence.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1 pr-3">条件</th><th className="pr-3">观测值</th><th className="pr-3">数据时间</th><th className="pr-3">来源</th><th className="pr-3">健康</th><th className="pr-3">结果</th><th>理由</th></tr></thead>
            <tbody>
              {run.evidence.map((e) => (
                <tr key={e.leafId} className="border-t border-border align-top">
                  <td className="py-1.5 pr-3">{e.label}</td>
                  <td className="num pr-3">{e.observed === undefined ? "—" : Array.isArray(e.observed) ? `[${e.observed.join("、")}]` : e.observed}</td>
                  <td className="num pr-3 whitespace-nowrap">{fmt(e.observedAt)}</td>
                  <td className="pr-3">{e.sources.join(", ") || "—"}</td>
                  <td className="pr-3"><HealthPill h={e.health} /></td>
                  <td className="pr-3"><ResultPill r={e.result} /></td>
                  <td className="text-muted-foreground">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {run.snapshot && (
        <details><summary className="cursor-pointer text-xs text-muted-foreground">数据快照与来源（可复现：场景 {run.snapshot.scenario} · 种子 {run.snapshot.seed} · 获取于 {fmt(run.snapshot.fetchedAt)}）</summary>
          <pre className="num mt-2 max-h-56 overflow-auto rounded bg-background p-2 text-[11px]">{JSON.stringify(run.snapshot, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export function RunRow({ run, taskName, defaultOpen = false }: { run: RunRecord; taskName?: string | undefined; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50">
        <span className="num text-muted-foreground">{fmt(run.at)}</span>
        {taskName && <span className="font-medium">{taskName}</span>}
        <Pill>v{run.ruleVersion}</Pill>
        <Pill>{TRIG[run.trigger]}</Pill>
        <HealthPill h={run.health} />
        <ResultPill r={run.result} />
        <DecisionPill d={run.decision} />
        {run.snapshot && <DemoBadge />}
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border p-3"><RunEvidence run={run} />{run.dedupeKey && <p className="num mt-2 text-[11px] text-muted-foreground">dedupeKey = {run.dedupeKey}</p>}</div>}
    </div>
  );
}
