import { METRICS } from "./catalog";
import type { Condition, RuleSpec } from "./types";

export function validateCondition(c: Condition, path = "条件", depth = 0): string[] {
  const errs: string[] = [];
  if (depth > 3) errs.push(`${path}：嵌套层级不得超过 3 层`);
  if (c.kind === "group") {
    if (c.children.length === 0) errs.push(`${path}：条件组不能为空`);
    c.children.forEach((ch, i) => errs.push(...validateCondition(ch, `${path}.${i + 1}`, depth + 1)));
    return errs;
  }
  const m = METRICS[c.metric];
  if (!c.instrument?.code) errs.push(`${path}：缺少标的`);
  if (m.type !== c.type) errs.push(`${path}：指标「${m.label}」与条件类型不匹配`);
  if (!m.ops.includes(c.operator)) errs.push(`${path}：指标「${m.label}」不支持运算符 ${c.operator}`);
  if (c.metric === "event_tag") {
    if (typeof c.threshold !== "string" || !c.threshold) errs.push(`${path}：事件标签不能为空`);
  } else {
    if (typeof c.threshold !== "number" || Number.isNaN(c.threshold)) errs.push(`${path}：阈值必须为数字`);
    else {
      if (c.metric === "heat_score" && (c.threshold < 0 || c.threshold > 100)) errs.push(`${path}：热度阈值需在 0-100 之间`);
      if (c.metric === "price_change_pct" && Math.abs(c.threshold) > 30) errs.push(`${path}：涨跌幅阈值超出合理范围(±30%)`);
      if (c.metric === "price" && c.threshold <= 0) errs.push(`${path}：价格阈值必须大于 0`);
      if (c.metric === "days_to_event" && c.threshold < 0) errs.push(`${path}：天数不能为负`);
    }
  }
  if (c.lookback.value < 0 || c.lookback.value > 250) errs.push(`${path}：回看窗口需在 0-250 之间`);
  return errs;
}

export function validateRule(r: RuleSpec): string[] {
  const errs = validateCondition(r.condition);
  if (r.tickSeconds < 10 || r.tickSeconds > 86400) errs.push("检查频率需在 10 秒到 1 天之间");
  if (r.cooldownMinutes < 0 || r.cooldownMinutes > 10080) errs.push("冷却时间需在 0 到 10080 分钟之间");
  if (r.staleAfterSeconds < 5) errs.push("过期阈值至少 5 秒");
  if (!r.timezone) errs.push("必须选择交易时区");
  return errs;
}
