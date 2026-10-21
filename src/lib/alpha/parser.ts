// 演示解析器：确定性的正则/词典规则，不是 AI。
import { ALL_INSTRUMENTS, EVENT_TAGS, INSTRUMENTS, SECTORS } from "./catalog";
import type { Condition, GroupCondition, Instrument, LeafCondition } from "./types";

export interface ParseResult {
  parser: "demo-pattern";
  condition: Condition | null;
  warnings: string[];
  unparsed: string[];
  matchedClauses: { text: string; leaf: LeafCondition }[];
}

let counter = 0;
export const newId = (p = "c") => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

function findInstrument(text: string): Instrument | undefined {
  for (const s of SECTORS) {
    const base = s.name.replace("板块", "");
    if (text.includes(base + "板块") || text.includes(base + "行业")) return s;
  }
  for (const i of INSTRUMENTS) if (text.includes(i.name) || text.includes(i.code.slice(0, 6))) return i;
  for (const s of SECTORS) if (text.includes(s.name.replace("板块", ""))) return s;
  return undefined;
}

function num(s: string | undefined) {
  return s === undefined ? NaN : Number(s);
}

function lookbackFrom(text: string): LeafCondition["lookback"] {
  const m = text.match(/(\d+)\s*(日|天|个交易日)/);
  if (m && /(\d+)\s*(日|天|个交易日)(内|累计|涨|跌)/.test(text)) return { value: num(m[1]), unit: "day" };
  const mm = text.match(/(\d+)\s*分钟/);
  if (mm) return { value: num(mm[1]), unit: "min" };
  return { value: 1, unit: "day" };
}

function parseClause(raw: string, ctx: { last?: Instrument }): LeafCondition | null {
  const text = raw.trim();
  const inst = findInstrument(text) ?? ctx.last;
  const base = { kind: "leaf" as const, id: newId(), lookback: lookbackFrom(text) };
  const n = text.match(/(-?\d+(?:\.\d+)?)/g);
  const v = n ? num(n[n.length - 1]) : NaN;

  // 热度
  if (/热度|人气|关注度/.test(text) && inst && !isNaN(v)) {
    ctx.last = inst;
    return {
      ...base,
      type: "popularity",
      instrument: inst,
      metric: "heat_score",
      operator: /低于|小于|不足|跌破|<|以下/.test(text) ? "<" : ">",
      threshold: v,
      unit: "score",
      lookback: { value: 1, unit: "day" },
    };
  }
  // 日历
  if (/财报|年报|季报|半年报|披露/.test(text) && /(前|内|还有|距)/.test(text) && inst) {
    ctx.last = inst;
    return {
      ...base,
      type: "calendar",
      instrument: inst,
      metric: "days_to_event",
      operator: "<=",
      threshold: isNaN(v) ? 3 : v,
      unit: "days",
      lookback: { value: 0, unit: "day" },
    };
  }
  // 事件
  const tag = EVENT_TAGS.find((t) => text.includes(t)) ?? (/公告/.test(text) ? "业绩预告" : undefined);
  if (tag && inst) {
    ctx.last = inst;
    return {
      ...base,
      type: "event",
      instrument: inst,
      metric: "event_tag",
      operator: "contains",
      threshold: tag,
      unit: "tag",
      lookback: { value: 1, unit: "day" },
    };
  }
  if (!inst || isNaN(v)) return null;
  ctx.last = inst;
  // 量比
  if (/成交量|量比|放量/.test(text)) {
    return { ...base, type: "price", instrument: inst, metric: "volume_ratio", operator: ">=", threshold: v, unit: "x" };
  }
  // 价格绝对值
  if (/元|股价|价格/.test(text) && /(跌破|低于|突破|高于|站上)/.test(text)) {
    return {
      ...base,
      type: "price",
      instrument: inst,
      metric: "price",
      operator: /跌破|低于/.test(text) ? "<" : ">",
      threshold: v,
      unit: "CNY",
    };
  }
  // 涨跌幅
  if (/跌幅|下跌|跌超|跌了/.test(text)) {
    return { ...base, type: "price", instrument: inst, metric: "price_change_pct", operator: "<=", threshold: -Math.abs(v), unit: "%" };
  }
  if (/涨幅|上涨|涨超|涨了/.test(text)) {
    return { ...base, type: "price", instrument: inst, metric: "price_change_pct", operator: ">=", threshold: Math.abs(v), unit: "%" };
  }
  return null;
}

/** AND 优先级高于 OR：先按"或"切分，再按"且"切分。 */
export function parseInstruction(input: string): ParseResult {
  const warnings: string[] = [];
  const unparsed: string[] = [];
  const matched: ParseResult["matchedClauses"] = [];
  const body = input
    .replace(/[，,。；;！!]/g, " ")
    .replace(/(时|的时候|时候)?(请)?(提醒我|通知我|告诉我|提醒|预警)/g, " ")
    .trim();
  if (!body) return { parser: "demo-pattern", condition: null, warnings: ["输入为空"], unparsed, matchedClauses: [] };

  const ctx: { last?: Instrument } = {};
  const orParts = body.split(/或者|或是|或/).map((s) => s.trim()).filter(Boolean);
  const groups: Condition[] = [];
  for (const part of orParts) {
    const andParts = part.split(/并且|而且|同时|且|以及|并/).map((s) => s.trim()).filter(Boolean);
    const leaves: LeafCondition[] = [];
    for (const a of andParts) {
      const leaf = parseClause(a, ctx);
      if (leaf) {
        leaves.push(leaf);
        matched.push({ text: a, leaf });
      } else unparsed.push(a);
    }
    if (leaves.length === 1) groups.push(leaves[0]!);
    else if (leaves.length > 1) groups.push({ kind: "group", id: newId("g"), op: "AND", children: leaves });
  }
  if (unparsed.length) warnings.push(`有 ${unparsed.length} 个片段未能识别，请在右侧编辑器中手动补充。`);
  if (!ALL_INSTRUMENTS.some((i) => body.includes(i.name.replace("板块", "")))) warnings.push("未识别到字典内标的，可能沿用了上下文或解析失败。");
  let condition: Condition | null = null;
  if (groups.length === 1) {
    const g = groups[0]!;
    condition = g.kind === "group" ? g : ({ kind: "group", id: newId("g"), op: "AND", children: [g] } as GroupCondition);
  } else if (groups.length > 1) condition = { kind: "group", id: newId("g"), op: "OR", children: groups };
  return { parser: "demo-pattern", condition, warnings, unparsed, matchedClauses: matched };
}
