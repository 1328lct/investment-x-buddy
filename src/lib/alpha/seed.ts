import { freshState } from "./evaluator";
import { newId } from "./parser";
import { SCHEMA_VERSION, type Condition, type RuleSpec, type Task } from "./types";

const ndsd = { code: "300750.SZ", name: "宁德时代" };
const ny = { code: "SECTOR:新能源", name: "新能源板块" };

function mk(name: string, nl: string, condition: Condition, extra: Partial<RuleSpec> = {}, status: Task["status"] = "active"): Task {
  const now = new Date();
  const rule: RuleSpec = { condition, tickSeconds: 60, timezone: "Asia/Shanghai", cooldownMinutes: 30, staleAfterSeconds: 300, ...extra };
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId("task"),
    name,
    nlSource: nl,
    parser: "demo-pattern",
    status,
    ruleVersion: 1,
    rule,
    versions: [{ version: 1, rule, createdAt: now.toISOString(), note: "初始版本（示例任务）" }],
    state: freshState(rule.tickSeconds, now),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

const leaf = (o: Omit<Extract<Condition, { kind: "leaf" }>, "kind" | "id">): Condition => ({ kind: "leaf", id: newId(), ...o });

export function seedTasks(): Task[] {
  return [
    mk("宁德时代急跌 + 板块降温", "宁德时代单日跌幅超过3%且新能源板块热度低于40时提醒我", {
      kind: "group", id: newId("g"), op: "AND",
      children: [
        leaf({ type: "price", instrument: ndsd, metric: "price_change_pct", operator: "<=", threshold: -3, unit: "%", lookback: { value: 1, unit: "day" } }),
        leaf({ type: "popularity", instrument: ny, metric: "heat_score", operator: "<", threshold: 40, unit: "score", lookback: { value: 1, unit: "day" } }),
      ],
    }),
    mk("贵州茅台价格跌破阈值", "贵州茅台股价跌破1000元时提醒我", {
      kind: "group", id: newId("g"), op: "AND",
      children: [leaf({ type: "price", instrument: { code: "600519.SH", name: "贵州茅台" }, metric: "price", operator: "<", threshold: 1000, unit: "CNY", lookback: { value: 1, unit: "day" } })],
    }, { tickSeconds: 30 }),
    mk("比亚迪减持公告", "比亚迪出现减持公告时提醒我", {
      kind: "group", id: newId("g"), op: "AND",
      children: [leaf({ type: "event", instrument: { code: "002594.SZ", name: "比亚迪" }, metric: "event_tag", operator: "contains", threshold: "减持", unit: "tag", lookback: { value: 1, unit: "day" } })],
    }, { cooldownMinutes: 1440 }),
    mk("招商银行财报临近", "招商银行财报披露前3天提醒我", {
      kind: "group", id: newId("g"), op: "AND",
      children: [leaf({ type: "calendar", instrument: { code: "600036.SH", name: "招商银行" }, metric: "days_to_event", operator: "<=", threshold: 3, unit: "days", lookback: { value: 0, unit: "day" } })],
    }, { tickSeconds: 3600, cooldownMinutes: 1440 }),
    mk("半导体热度过热", "半导体板块热度高于85时提醒我", {
      kind: "group", id: newId("g"), op: "AND",
      children: [leaf({ type: "popularity", instrument: { code: "SECTOR:半导体", name: "半导体板块" }, metric: "heat_score", operator: ">", threshold: 85, unit: "score", lookback: { value: 1, unit: "day" } })],
    }, {}, "paused"),
    mk("隆基绿能复合风险", "隆基绿能5日累计跌幅超过8%或（出现监管问询且光伏板块热度低于30）时提醒我", {
      kind: "group", id: newId("g"), op: "OR",
      children: [
        leaf({ type: "price", instrument: { code: "601012.SH", name: "隆基绿能" }, metric: "price_change_pct", operator: "<=", threshold: -8, unit: "%", lookback: { value: 5, unit: "day" } }),
        { kind: "group", id: newId("g"), op: "AND", children: [
          leaf({ type: "event", instrument: { code: "601012.SH", name: "隆基绿能" }, metric: "event_tag", operator: "contains", threshold: "监管问询", unit: "tag", lookback: { value: 1, unit: "day" } }),
          leaf({ type: "popularity", instrument: { code: "SECTOR:光伏", name: "光伏板块" }, metric: "heat_score", operator: "<", threshold: 30, unit: "score", lookback: { value: 1, unit: "day" } }),
        ] },
      ],
    }),
  ];
}
