import { METRICS, OP_LABEL } from "./catalog";
import type {
  Condition,
  Decision,
  Health,
  LeafCondition,
  LeafEvidence,
  Operator,
  RunRecord,
  Snapshot,
  Task,
  TaskRuntimeState,
  TriState,
} from "./types";

export const leafKey = (l: LeafCondition) => `${l.instrument.code}|${l.metric}`;

/** 比较器：数值比较与标签包含 */
export function compare(observed: number | string[], op: Operator, threshold: number | string): boolean {
  if (op === "contains") return Array.isArray(observed) && observed.includes(String(threshold));
  if (typeof observed !== "number" || typeof threshold !== "number") return false;
  switch (op) {
    case ">": return observed > threshold;
    case ">=": return observed >= threshold;
    case "<": return observed < threshold;
    case "<=": return observed <= threshold;
    case "==": return Math.abs(observed - threshold) < 1e-9;
  }
}

/** 三值逻辑组合器（Kleene）：AND 遇 false 即 false；OR 遇 true 即 true；否则含 unknown 为 unknown */
export function combine(op: "AND" | "OR", vals: TriState[]): TriState {
  if (vals.length === 0) return "unknown";
  if (op === "AND") {
    if (vals.includes("false")) return "false";
    if (vals.includes("unknown")) return "unknown";
    return "true";
  }
  if (vals.includes("true")) return "true";
  if (vals.includes("unknown")) return "unknown";
  return "false";
}

export function describeLeaf(l: LeafCondition) {
  const m = METRICS[l.metric];
  const lb = l.lookback.value ? `（回看 ${l.lookback.value}${l.lookback.unit === "day" ? "日" : "分钟"}）` : "";
  return `${l.instrument.name} ${m.label}${lb} ${OP_LABEL[l.operator]} ${l.threshold}${l.unit === "tag" ? "" : l.unit === "score" ? "分" : l.unit === "days" ? "天" : l.unit}`;
}

export function describeCondition(c: Condition): string {
  if (c.kind === "leaf") return describeLeaf(c);
  return c.children.map((ch) => (ch.kind === "group" ? `(${describeCondition(ch)})` : describeCondition(ch))).join(c.op === "AND" ? " 且 " : " 或 ");
}

export function collectLeaves(c: Condition): LeafCondition[] {
  return c.kind === "leaf" ? [c] : c.children.flatMap(collectLeaves);
}

const CONFLICT_TOL = 0.5; // 多源数值差异容忍（同单位绝对差）

export function evaluateLeaf(l: LeafCondition, snap: Snapshot, now: Date, staleAfterSeconds: number): LeafEvidence {
  const key = leafKey(l);
  const pts = snap.points.filter((p) => p.key === key);
  const label = describeLeaf(l);
  if (pts.length === 0)
    return { leafId: l.id, label, result: "unknown", sources: [], reason: "无可用数据点", health: "failed" };
  const sources = pts.map((p) => `${p.source}${p.demo ? "(DEMO)" : ""}`);
  const first = pts[0]!;
  // 冲突检测
  if (pts.length > 1) {
    const nums = pts.map((p) => p.value).filter((v): v is number => typeof v === "number");
    if (nums.length > 1 && Math.max(...nums) - Math.min(...nums) > CONFLICT_TOL)
      return { leafId: l.id, label, result: "unknown", observed: first.value, observedAt: first.observedAt, sources, reason: `多源数据冲突：${nums.join(" vs ")}，差异超过容忍度 ${CONFLICT_TOL}`, health: "conflict" };
  }
  const ageSec = (now.getTime() - new Date(first.observedAt).getTime()) / 1000;
  if (ageSec > staleAfterSeconds)
    return { leafId: l.id, label, result: "unknown", observed: first.value, observedAt: first.observedAt, sources, reason: `数据过期：距今 ${Math.round(ageSec)} 秒，超过阈值 ${staleAfterSeconds} 秒`, health: "stale" };
  const ok = compare(first.value, l.operator, l.threshold);
  const obs = Array.isArray(first.value) ? `[${first.value.join("、") || "无"}]` : String(first.value);
  return { leafId: l.id, label, result: ok ? "true" : "false", observed: first.value, observedAt: first.observedAt, sources, reason: `观测值 ${obs} ${ok ? "满足" : "不满足"} ${OP_LABEL[l.operator]} ${l.threshold}`, health: "healthy" };
}

export function evaluateCondition(c: Condition, snap: Snapshot, now: Date, stale: number, out: LeafEvidence[]): TriState {
  if (c.kind === "leaf") {
    const ev = evaluateLeaf(c, snap, now, stale);
    out.push(ev);
    return ev.result;
  }
  return combine(c.op, c.children.map((ch) => evaluateCondition(ch, snap, now, stale, out)));
}

const HEALTH_RANK: Health[] = ["healthy", "unknown", "stale", "conflict", "timeout", "failed"];
export function worstHealth(hs: Health[]): Health {
  return hs.reduce<Health>((a, b) => (HEALTH_RANK.indexOf(b) > HEALTH_RANK.indexOf(a) ? b : a), "healthy");
}

export const dedupeKeyOf = (taskId: string, ruleVersion: number, episode: number) => `${taskId}:v${ruleVersion}:e${episode}`;

export interface CheckOutcome {
  run: RunRecord;
  state: TaskRuntimeState;
  notify: boolean;
}

export type FetchResult = { ok: true; snapshot: Snapshot } | { ok: false; health: "failed" | "timeout"; error: string; scenario: string };

/** 核心：一次检查的决策状态机（纯函数，便于单测） */
export function runCheck(task: Task, fetched: FetchResult, now: Date, trigger: RunRecord["trigger"], runId: string): CheckOutcome {
  const st: TaskRuntimeState = { ...task.state, notifiedKeys: [...task.state.notifiedKeys], lastRunAt: now.toISOString(), nextRunAt: new Date(now.getTime() + task.rule.tickSeconds * 1000).toISOString() };
  const base = { id: runId, taskId: task.id, ruleVersion: task.ruleVersion, at: now.toISOString(), trigger };

  if (task.status === "paused") {
    return { run: { ...base, scenario: fetched.ok ? fetched.snapshot.scenario : fetched.scenario, health: task.state.health, result: "unknown", decision: "skipped_paused", evidence: [], explanation: "任务已暂停，未执行评估。" }, state: { ...task.state }, notify: false };
  }
  if (!fetched.ok) {
    st.health = fetched.health;
    st.lastResult = "unknown";
    return { run: { ...base, scenario: fetched.scenario, health: fetched.health, result: "unknown", decision: "skipped_unhealthy", evidence: [], error: fetched.error, explanation: `数据获取${fetched.health === "timeout" ? "超时" : "失败"}：${fetched.error}。任务健康状态降级，条件结果未知，不触发、不改变成立片段。` }, state: st, notify: false };
  }
  const evidence: LeafEvidence[] = [];
  const result = evaluateCondition(task.rule.condition, fetched.snapshot, now, task.rule.staleAfterSeconds, evidence);
  const health = worstHealth(evidence.map((e) => e.health));
  st.health = health;
  st.lastResult = result;

  let decision: Decision;
  let dedupeKey: string | undefined;
  let notify = false;
  let explanation: string;

  if (result === "unknown") {
    decision = "indeterminate";
    explanation = "部分条件数据不可用（过期/冲突/缺失），按三值逻辑无法确定整体结果，保持原状态不触发。";
  } else if (result === "false") {
    if (st.conditionActive) {
      st.conditionActive = false;
      decision = "recovered";
      explanation = `条件已解除，成立片段 #${st.episode} 结束；下一次成立将开启新片段并可再次提醒。`;
    } else {
      decision = "no_trigger";
      explanation = "条件不成立，未触发。";
    }
  } else {
    const isNewEpisode = !st.conditionActive;
    if (isNewEpisode) {
      st.episode += 1;
      st.conditionActive = true;
    }
    dedupeKey = dedupeKeyOf(task.id, task.ruleVersion, st.episode);
    const inCooldown = st.cooldownUntil && now < new Date(st.cooldownUntil);
    if (st.notifiedKeys.includes(dedupeKey)) {
      decision = isNewEpisode ? "suppressed_dedupe" : "still_active";
      explanation = `条件持续成立，但去重键 ${dedupeKey} 已通知过，不重复提醒。`;
    } else if (inCooldown) {
      decision = "suppressed_cooldown";
      explanation = `条件成立，但处于冷却期（至 ${st.cooldownUntil}），本次抑制提醒。`;
    } else {
      decision = "triggered";
      notify = true;
      st.notifiedKeys.push(dedupeKey);
      st.lastTriggeredAt = now.toISOString();
      st.cooldownUntil = new Date(now.getTime() + task.rule.cooldownMinutes * 60000).toISOString();
      explanation = `条件成立（片段 #${st.episode}），生成提醒；冷却至 ${st.cooldownUntil}。`;
    }
  }
  return { run: { ...base, scenario: fetched.snapshot.scenario, health, result, decision, dedupeKey, evidence, explanation, snapshot: fetched.snapshot }, state: st, notify };
}

export function freshState(tickSeconds: number, now = new Date()): TaskRuntimeState {
  return { episode: 0, conditionActive: false, notifiedKeys: [], health: "unknown", nextRunAt: new Date(now.getTime() + tickSeconds * 1000).toISOString() };
}

export const DECISION_LABEL: Record<Decision, string> = {
  triggered: "已触发提醒",
  no_trigger: "未触发",
  suppressed_cooldown: "冷却抑制",
  suppressed_dedupe: "去重抑制",
  still_active: "持续成立(已提醒)",
  recovered: "条件解除·恢复",
  indeterminate: "结果不确定",
  skipped_unhealthy: "数据异常跳过",
  skipped_paused: "已暂停跳过",
};

export const HEALTH_LABEL: Record<Health, string> = {
  healthy: "健康",
  stale: "数据过期",
  failed: "获取失败",
  conflict: "数据冲突",
  timeout: "超时",
  unknown: "未检查",
};
