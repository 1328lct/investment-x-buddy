import { Plus, Trash2, Layers } from "lucide-react";
import { ALL_INSTRUMENTS, EVENT_TAGS, METRICS, OP_LABEL, TIMEZONES, TYPE_LABEL } from "@/lib/alpha/catalog";
import { newId } from "@/lib/alpha/parser";
import type { Condition, ConditionType, GroupCondition, LeafCondition, Metric, RuleSpec } from "@/lib/alpha/types";
import { Label, Pill } from "./ui";

const defaultLeaf = (): LeafCondition => ({ kind: "leaf", id: newId(), type: "price", instrument: ALL_INSTRUMENTS[0]!, metric: "price_change_pct", operator: "<=", threshold: -3, unit: "%", lookback: { value: 1, unit: "day" } });

function LeafEditor({ c, onChange, onRemove }: { c: LeafCondition; onChange: (c: LeafCondition) => void; onRemove?: (() => void) | undefined }) {
  const metricsForType = (Object.keys(METRICS) as Metric[]).filter((m) => METRICS[m].type === c.type);
  const m = METRICS[c.metric];
  const setType = (type: ConditionType) => {
    const metric = (Object.keys(METRICS) as Metric[]).find((k) => METRICS[k].type === type)!;
    const mm = METRICS[metric];
    onChange({ ...c, type, metric, unit: mm.unit, operator: mm.ops[0]!, threshold: metric === "event_tag" ? EVENT_TAGS[0]! : 0 });
  };
  const setMetric = (metric: Metric) => {
    const mm = METRICS[metric];
    onChange({ ...c, metric, unit: mm.unit, operator: mm.ops[0]!, threshold: metric === "event_tag" ? EVENT_TAGS[0]! : typeof c.threshold === "number" ? c.threshold : 0 });
  };
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background/60 p-3 md:grid-cols-12">
      <label className="md:col-span-2"><Label>类型</Label>
        <select className="field w-full" value={c.type} onChange={(e) => setType(e.target.value as ConditionType)}>
          {(Object.keys(TYPE_LABEL) as ConditionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </label>
      <label className="md:col-span-3"><Label>标的 / 板块</Label>
        <select className="field w-full" value={c.instrument.code} onChange={(e) => onChange({ ...c, instrument: ALL_INSTRUMENTS.find((i) => i.code === e.target.value)! })}>
          {ALL_INSTRUMENTS.map((i) => <option key={i.code} value={i.code}>{i.name} · {i.code.replace("SECTOR:", "板块")}</option>)}
        </select>
      </label>
      <label className="md:col-span-2"><Label>指标</Label>
        <select className="field w-full" value={c.metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          {metricsForType.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
        </select>
      </label>
      <label className="md:col-span-1"><Label>运算</Label>
        <select className="field w-full" value={c.operator} onChange={(e) => onChange({ ...c, operator: e.target.value as LeafCondition["operator"] })}>
          {m.ops.map((o) => <option key={o} value={o}>{o === "contains" ? "包含" : o}</option>)}
        </select>
      </label>
      <label className="md:col-span-2"><Label>阈值（{c.unit === "tag" ? "标签" : c.unit}）</Label>
        {c.metric === "event_tag" ? (
          <select className="field w-full" value={String(c.threshold)} onChange={(e) => onChange({ ...c, threshold: e.target.value })}>
            {EVENT_TAGS.map((t) => <option key={t}>{t}</option>)}
          </select>
        ) : (
          <input type="number" step="any" className="field num w-full" value={Number.isNaN(c.threshold as number) ? "" : String(c.threshold)} onChange={(e) => onChange({ ...c, threshold: e.target.value === "" ? NaN : Number(e.target.value) })} />
        )}
      </label>
      <label className="md:col-span-1"><Label>回看</Label>
        <input type="number" className="field num w-full" value={c.lookback.value} onChange={(e) => onChange({ ...c, lookback: { ...c.lookback, value: Number(e.target.value) } })} />
      </label>
      <div className="flex items-end gap-1 md:col-span-1">
        <select className="field w-full" value={c.lookback.unit} onChange={(e) => onChange({ ...c, lookback: { ...c.lookback, unit: e.target.value as "min" | "day" } })}>
          <option value="day">日</option><option value="min">分</option>
        </select>
        {onRemove && <button type="button" aria-label="删除条件" onClick={onRemove} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
      </div>
      <p className="col-span-full text-[11px] text-muted-foreground">{OP_LABEL[c.operator]} · {m.label}</p>
    </div>
  );
}

export function ConditionEditor({ c, onChange, onRemove, depth = 0 }: { c: Condition; onChange: (c: Condition) => void; onRemove?: () => void; depth?: number }) {
  if (c.kind === "leaf") return <LeafEditor c={c} onChange={onChange} onRemove={onRemove} />;
  const g = c as GroupCondition;
  const setChild = (i: number, ch: Condition) => onChange({ ...g, children: g.children.map((x, j) => (j === i ? ch : x)) });
  return (
    <div className={depth ? "rounded-lg border border-dashed border-primary/40 p-3" : ""}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          {(["AND", "OR"] as const).map((op) => (
            <button key={op} type="button" onClick={() => onChange({ ...g, op })} className={`px-3 py-1 text-xs font-semibold ${g.op === op ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {op === "AND" ? "全部满足 AND" : "任一满足 OR"}
            </button>
          ))}
        </div>
        <Pill>{depth === 0 ? "根条件组" : `嵌套组 L${depth}`}</Pill>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => onChange({ ...g, children: [...g.children, defaultLeaf()] })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" />条件</button>
          {depth < 2 && <button type="button" onClick={() => onChange({ ...g, children: [...g.children, { kind: "group", id: newId("g"), op: g.op === "AND" ? "OR" : "AND", children: [defaultLeaf()] }] })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"><Layers className="h-3.5 w-3.5" />嵌套组</button>}
          {onRemove && <button type="button" onClick={onRemove} className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10">删除组</button>}
        </div>
      </div>
      <div className="space-y-2">
        {g.children.map((ch, i) => (
          <div key={ch.id} className="relative">
            {i > 0 && <div className="my-1 text-center text-[11px] font-semibold text-primary">{g.op === "AND" ? "且" : "或"}</div>}
            <ConditionEditor c={ch} depth={depth + 1} onChange={(n) => setChild(i, n)} onRemove={() => onChange({ ...g, children: g.children.filter((_, j) => j !== i) })} />
          </div>
        ))}
        {g.children.length === 0 && <p className="text-xs text-destructive">条件组为空，请添加条件。</p>}
      </div>
    </div>
  );
}

export function ScheduleEditor({ rule, onChange }: { rule: RuleSpec; onChange: (r: RuleSpec) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <label><Label>检查频率 (秒)</Label><input type="number" className="field num w-full" value={rule.tickSeconds} onChange={(e) => onChange({ ...rule, tickSeconds: Number(e.target.value) })} /></label>
      <label><Label>冷却 (分钟)</Label><input type="number" className="field num w-full" value={rule.cooldownMinutes} onChange={(e) => onChange({ ...rule, cooldownMinutes: Number(e.target.value) })} /></label>
      <label><Label>数据过期阈值 (秒)</Label><input type="number" className="field num w-full" value={rule.staleAfterSeconds} onChange={(e) => onChange({ ...rule, staleAfterSeconds: Number(e.target.value) })} /></label>
      <label><Label>交易时区</Label>
        <select className="field w-full" value={rule.timezone} onChange={(e) => onChange({ ...rule, timezone: e.target.value })}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
    </div>
  );
}
