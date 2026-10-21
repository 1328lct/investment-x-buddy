import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeCondition, collectLeaves } from "@/lib/alpha/evaluator";
import { parseInstruction, type ParseResult } from "@/lib/alpha/parser";
import type { RuleSpec } from "@/lib/alpha/types";
import { validateRule } from "@/lib/alpha/validate";
import { ConditionEditor, ScheduleEditor } from "./RuleEditor";
import { Label, Panel, ParserBadge, Pill } from "./ui";

const EXAMPLES = [
  "宁德时代单日跌幅超过3%且新能源板块热度低于40时提醒我",
  "比亚迪涨幅超过5%或比亚迪出现回购公告时提醒我",
  "招商银行财报披露前3天提醒我",
  "贵州茅台股价跌破1000元并且成交量放大2倍时提醒我",
];

export interface ComposerValue { name: string; nlSource: string; parser: "demo-pattern" | "manual"; rule: RuleSpec }

export function TaskComposer({ initial, submitLabel, onSubmit, requireNote }: { initial?: ComposerValue; submitLabel: string; requireNote?: boolean; onSubmit: (v: ComposerValue, note: string) => void }) {
  const [nl, setNl] = useState(initial?.nlSource ?? EXAMPLES[0]!);
  const [name, setName] = useState(initial?.name ?? "");
  const [parse, setParse] = useState<ParseResult | null>(null);
  const [parser, setParser] = useState<ComposerValue["parser"]>(initial?.parser ?? "manual");
  const [rule, setRule] = useState<RuleSpec>(initial?.rule ?? { condition: { kind: "group", id: "g_root", op: "AND", children: [] }, tickSeconds: 60, timezone: "Asia/Shanghai", cooldownMinutes: 30, staleAfterSeconds: 300 });
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const errors = useMemo(() => [...validateRule(rule), ...(name.trim() ? [] : ["请填写任务名称"]), ...(requireNote && !note.trim() ? ["请填写版本说明"] : [])], [rule, name, note, requireNote]);

  const doParse = () => {
    const r = parseInstruction(nl);
    setParse(r);
    if (r.condition) {
      setRule({ ...rule, condition: r.condition });
      setParser("demo-pattern");
      if (!name) setName(nl.replace(/(时)?(提醒我|通知我)$/, "").slice(0, 24));
    }
    setConfirming(false);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,2fr)_3fr]">
      <div className="space-y-4">
        <Panel title="① 自然语言描述" actions={<ParserBadge />}>
          <textarea value={nl} onChange={(e) => setNl(e.target.value)} rows={4} className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-2 focus:outline-ring" placeholder="例如：宁德时代单日跌幅超过3%且新能源板块热度低于40时提醒我" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => <button key={e} type="button" onClick={() => setNl(e)} className="rounded-md border border-border px-2 py-1 text-left text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground">{e}</button>)}
          </div>
          <Button className="mt-3 w-full bg-gradient-primary shadow-glow" onClick={doParse}><Sparkles className="h-4 w-4" />解析为结构化规则</Button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">未配置大模型密钥：当前使用确定性词典+正则的演示解析器，不是 AI。支持 价格/涨跌幅/量比/事件/财报日历/热度 与 且/或。解析结果务必在右侧核对。</p>
        </Panel>
        {parse && (
          <Panel title="解析结果">
            {parse.matchedClauses.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {parse.matchedClauses.map((m) => (
                  <li key={m.leaf.id} className="rounded-md border border-border p-2">
                    <div className="text-muted-foreground">「{m.text}」</div>
                    <div className="mt-1 flex flex-wrap gap-1"><Pill tone="info">{m.leaf.instrument.name}</Pill><Pill>{m.leaf.metric}</Pill><Pill tone="primary">{m.leaf.operator} {String(m.leaf.threshold)}{m.leaf.unit === "tag" ? "" : m.leaf.unit}</Pill></div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-destructive">未能识别任何条件，请改写或直接在右侧手动构建。</p>}
            {parse.warnings.map((w) => <p key={w} className="mt-2 flex gap-1 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</p>)}
            {parse.unparsed.length > 0 && <p className="mt-1 text-xs text-muted-foreground">未识别片段：{parse.unparsed.join(" / ")}</p>}
          </Panel>
        )}
      </div>

      <div className="space-y-4">
        <Panel title="② 结构化规则编辑器" actions={<Pill>{parser === "demo-pattern" ? "来源：演示解析器 → 可编辑" : "来源：手动"}</Pill>}>
          <label className="mb-3 block"><Label>任务名称</Label><input className="field w-full" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <ConditionEditor c={rule.condition} onChange={(c) => { setRule({ ...rule, condition: c }); setConfirming(false); }} />
          <div className="mt-4 border-t border-border pt-4"><ScheduleEditor rule={rule} onChange={(r) => { setRule(r); setConfirming(false); }} /></div>
          {requireNote && <label className="mt-3 block"><Label>版本说明</Label><input className="field w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：阈值由 -3% 调整为 -4%" /></label>}
        </Panel>
        <Panel title="③ 预览与确认">
          <p className="rounded-md bg-muted p-3 text-sm leading-relaxed">{collectLeaves(rule.condition).length ? <>当 <b className="text-primary">{describeCondition(rule.condition)}</b> 时，于 {rule.timezone} 每 {rule.tickSeconds} 秒检查一次；触发后冷却 {rule.cooldownMinutes} 分钟；数据超过 {rule.staleAfterSeconds} 秒视为过期。</> : "尚无条件"}</p>
          <details className="mt-3"><summary className="cursor-pointer text-xs text-muted-foreground">查看 JSON（schemaVersion 1.0）</summary>
            <pre className="num mt-2 max-h-64 overflow-auto rounded-md bg-background p-3 text-[11px]">{JSON.stringify({ schemaVersion: "1.0", name, nlSource: nl, parser, rule }, null, 2)}</pre>
          </details>
          {errors.length > 0 ? (
            <ul className="mt-3 space-y-1">{errors.map((e) => <li key={e} className="flex gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{e}</li>)}</ul>
          ) : <p className="mt-3 flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />校验通过</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {!confirming ? (
              <Button disabled={errors.length > 0} onClick={() => setConfirming(true)}>{submitLabel}…</Button>
            ) : (
              <>
                <Button className="bg-gradient-primary" onClick={() => onSubmit({ name: name.trim(), nlSource: nl, parser, rule }, note.trim())}>确认{submitLabel}</Button>
                <Button variant="outline" onClick={() => setConfirming(false)}>返回修改</Button>
                <span className="self-center text-xs text-muted-foreground">请确认以上规则描述与您的意图一致。</span>
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
