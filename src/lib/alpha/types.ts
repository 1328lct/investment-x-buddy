// AlphaRadar 任务 JSON Schema（版本化）
export const SCHEMA_VERSION = "1.0" as const;

export type ConditionType = "price" | "event" | "calendar" | "popularity";
export type Metric =
  | "price_change_pct"
  | "price"
  | "volume_ratio"
  | "event_tag"
  | "days_to_event"
  | "heat_score";
export type Operator = ">" | ">=" | "<" | "<=" | "==" | "contains";
export type Unit = "%" | "CNY" | "x" | "score" | "days" | "tag";
export type LogicOp = "AND" | "OR";

export interface Instrument {
  code: string; // 例如 300750.SZ 或 SECTOR:新能源
  name: string;
}

export interface LeafCondition {
  kind: "leaf";
  id: string;
  type: ConditionType;
  instrument: Instrument;
  metric: Metric;
  operator: Operator;
  threshold: number | string;
  unit: Unit;
  lookback: { value: number; unit: "min" | "day" };
}

export interface GroupCondition {
  kind: "group";
  id: string;
  op: LogicOp;
  children: Condition[];
}

export type Condition = LeafCondition | GroupCondition;

export interface RuleSpec {
  condition: Condition;
  tickSeconds: number;
  timezone: string; // 交易时区，例如 Asia/Shanghai
  cooldownMinutes: number;
  staleAfterSeconds: number;
}

export interface RuleVersion {
  version: number;
  rule: RuleSpec;
  createdAt: string;
  note: string;
}

export type TaskStatus = "active" | "paused";
export type Health = "healthy" | "stale" | "failed" | "conflict" | "timeout" | "unknown";

export interface TaskRuntimeState {
  episode: number; // 条件"成立片段"计数
  conditionActive: boolean;
  lastTriggeredAt?: string | undefined;
  cooldownUntil?: string | undefined;
  notifiedKeys: string[]; // 已通知的 dedupe key
  lastRunAt?: string | undefined;
  nextRunAt?: string | undefined;
  health: Health;
  lastResult?: TriState | undefined;
}

export interface Task {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  nlSource: string;
  parser: "demo-pattern" | "manual";
  status: TaskStatus;
  ruleVersion: number;
  rule: RuleSpec;
  versions: RuleVersion[];
  state: TaskRuntimeState;
  createdAt: string;
  updatedAt: string;
}

export type TriState = "true" | "false" | "unknown";

export interface DataPoint {
  key: string; // `${instrument.code}|${metric}`
  value: number | string[];
  observedAt: string; // 数据时间戳
  source: string;
  demo: boolean;
}

export interface Snapshot {
  fetchedAt: string;
  scenario: string;
  seed: number;
  points: DataPoint[];
}

export interface LeafEvidence {
  leafId: string;
  label: string;
  result: TriState;
  observed?: number | string[] | undefined;
  observedAt?: string | undefined;
  sources: string[];
  reason: string;
  health: Health;
}

export type Decision =
  | "triggered"
  | "no_trigger"
  | "suppressed_cooldown"
  | "suppressed_dedupe"
  | "still_active"
  | "recovered"
  | "indeterminate"
  | "skipped_unhealthy"
  | "skipped_paused";

export interface RunRecord {
  id: string;
  taskId: string;
  ruleVersion: number;
  at: string;
  trigger: "manual" | "scheduler" | "simulation";
  scenario: string;
  health: Health;
  result: TriState;
  decision: Decision;
  dedupeKey?: string | undefined;
  evidence: LeafEvidence[];
  explanation: string;
  snapshot?: Snapshot | undefined;
  error?: string | undefined;
}

export interface Notification {
  id: string;
  taskId: string;
  runId: string;
  dedupeKey: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  taskId?: string | undefined;
  detail: string;
}
