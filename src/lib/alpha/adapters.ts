// 数据适配器接口。仅 DemoSimAdapter 实际可用；扶摇 / iFinD MCP 未接入。
import { collectLeaves, leafKey } from "./evaluator";
import type { DataPoint, LeafCondition, Snapshot, Task } from "./types";
import type { FetchResult } from "./evaluator";

export type Scenario = "normal" | "trigger" | "stale" | "conflict" | "timeout" | "failure" | "recover";
export const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
  { id: "normal", label: "正常·不触发", desc: "所有数据新鲜，数值不满足条件" },
  { id: "trigger", label: "触发", desc: "所有数据新鲜，数值满足条件" },
  { id: "stale", label: "数据过期", desc: "数据时间戳早于过期阈值" },
  { id: "conflict", label: "多源冲突", desc: "两个来源数值差异超过容忍度" },
  { id: "timeout", label: "超时", desc: "适配器请求超时" },
  { id: "failure", label: "获取失败", desc: "适配器返回错误" },
  { id: "recover", label: "恢复", desc: "条件解除，数值回到不满足区间" },
];

export interface DataAdapter {
  id: string;
  name: string;
  connected: boolean;
  description: string;
  fetch(task: Task, now: Date, opts: { scenario: Scenario; seed: number }): Promise<FetchResult>;
}

// 可复现伪随机（mulberry32）
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 依据叶子条件生成"满足/不满足"的合成值——不是任何真实行情 */
export function synthValue(l: LeafCondition, satisfy: boolean, r: () => number): number | string[] {
  if (l.metric === "event_tag") return satisfy ? [String(l.threshold)] : [];
  const t = Number(l.threshold);
  const mag = Math.max(Math.abs(t) * 0.25, 1) * (0.2 + r() * 0.8);
  const round = (x: number) => Math.round(x * 100) / 100;
  if (l.metric === "days_to_event") {
    if (l.operator === "==") return satisfy ? t : t + 1 + Math.floor(r() * 5);
    if (l.operator === ">=") return satisfy ? t + Math.floor(r() * 5) : Math.max(0, t - 1);
    const top = l.operator === "<" ? t - 1 : t;
    return satisfy ? Math.max(0, top - Math.floor(r() * Math.max(top, 1))) : t + 3 + Math.floor(r() * 10);
  }
  const upward = l.operator === ">" || l.operator === ">=";
  const dir = upward === satisfy ? 1 : -1;
  let v = round(t + dir * mag);
  if (l.metric === "heat_score") v = Math.min(100, Math.max(0, v));
  if (l.metric === "price" || l.metric === "volume_ratio") v = Math.max(0.01, v);
  return v;
}

export function buildSnapshot(task: Task, now: Date, scenario: Scenario, seed: number): Snapshot {
  const r = rng(seed);
  const leaves = collectLeaves(task.rule.condition);
  const points: DataPoint[] = [];
  const satisfy = scenario === "trigger" || scenario === "conflict" || scenario === "stale";
  const age = scenario === "stale" ? task.rule.staleAfterSeconds + 600 : Math.floor(r() * 20);
  leaves.forEach((l, i) => {
    const value = synthValue(l, satisfy, r);
    const observedAt = new Date(now.getTime() - age * 1000).toISOString();
    points.push({ key: leafKey(l), value, observedAt, source: "DEMO-SIM-A", demo: true });
    if (scenario === "conflict" && i === 0 && typeof value === "number")
      points.push({ key: leafKey(l), value: Math.round((value + 5 + r() * 5) * 100) / 100, observedAt, source: "DEMO-SIM-B", demo: true });
  });
  return { fetchedAt: now.toISOString(), scenario, seed, points };
}

export const DemoSimAdapter: DataAdapter = {
  id: "demo-sim",
  name: "DEMO 模拟数据源",
  connected: true,
  description: "基于场景与种子的确定性合成数据，用于演示与测试。非实时、非真实行情。",
  async fetch(task, now, { scenario, seed }) {
    if (scenario === "timeout") return { ok: false, health: "timeout", error: "DEMO-SIM 请求超过 5000ms 未返回（注入）", scenario };
    if (scenario === "failure") return { ok: false, health: "failed", error: "DEMO-SIM 返回 HTTP 503（注入）", scenario };
    return { ok: true, snapshot: buildSnapshot(task, now, scenario, seed) };
  },
};

function notConnected(id: string, name: string, description: string): DataAdapter {
  return {
    id,
    name,
    connected: false,
    description,
    async fetch(_t, _n, { scenario }) {
      return { ok: false, health: "failed", error: `${name} 未配置凭据，未接入`, scenario };
    },
  };
}

export const ADAPTERS: DataAdapter[] = [
  DemoSimAdapter,
  notConnected("fuyao", "扶摇 数据接口", "计划接入：行情、板块热度。需要 API 凭据（服务端密钥），当前未连接。"),
  notConnected("ifind-mcp", "同花顺 iFinD MCP", "计划接入：公告事件、财报日历。需要 iFinD 账号与 MCP 服务地址，当前未连接。"),
];
