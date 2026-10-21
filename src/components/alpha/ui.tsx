import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DECISION_LABEL, HEALTH_LABEL } from "@/lib/alpha/evaluator";
import type { Decision, Health, TriState } from "@/lib/alpha/types";

export function Pill({ tone = "muted", children, className }: { tone?: "muted" | "primary" | "success" | "warning" | "danger" | "info" | "demo"; children: ReactNode; className?: string }) {
  const tones = {
    muted: "bg-muted text-muted-foreground border-border",
    primary: "bg-primary/15 text-primary border-primary/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-info/15 text-info border-info/30",
    demo: "bg-demo/15 text-demo border-demo/40",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export const DemoBadge = () => <Pill tone="demo">DEMO 数据·非实时</Pill>;
export const ParserBadge = () => <Pill tone="warning">规则解析（演示解析器）</Pill>;

const H_TONE: Record<Health, "success" | "warning" | "danger" | "muted" | "info"> = { healthy: "success", stale: "warning", conflict: "warning", failed: "danger", timeout: "danger", unknown: "muted" };
export const HealthPill = ({ h }: { h: Health }) => <Pill tone={H_TONE[h]}>健康·{HEALTH_LABEL[h]}</Pill>;

export function ResultPill({ r }: { r?: TriState | undefined }) {
  if (!r) return <Pill>条件·未评估</Pill>;
  return <Pill tone={r === "true" ? "primary" : r === "false" ? "muted" : "warning"}>条件·{r === "true" ? "成立" : r === "false" ? "不成立" : "未知"}</Pill>;
}

const D_TONE: Partial<Record<Decision, "primary" | "success" | "warning" | "danger" | "info">> = { triggered: "primary", recovered: "success", suppressed_cooldown: "info", suppressed_dedupe: "info", still_active: "info", indeterminate: "warning", skipped_unhealthy: "danger" };
export const DecisionPill = ({ d }: { d: Decision }) => <Pill tone={D_TONE[d] ?? "muted"}>{DECISION_LABEL[d]}</Pill>;

export function PageHeader({ title, desc, actions }: { title: string; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel p-4", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("zh-CN", { hour12: false }) : "—");

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{children}</span>;
}
