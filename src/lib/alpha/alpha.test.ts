import { describe, expect, it } from "vitest";
import { buildSnapshot, DemoSimAdapter } from "./adapters";
import { combine, compare, dedupeKeyOf, runCheck, freshState, type FetchResult } from "./evaluator";
import { parseInstruction } from "./parser";
import { seedTasks } from "./seed";
import type { Task } from "./types";
import { validateRule } from "./validate";

const T0 = new Date("2026-01-05T02:00:00.000Z");
const at = (min: number) => new Date(T0.getTime() + min * 60000);
const task = (): Task => seedTasks()[0]!; // 宁德时代 AND 新能源热度，冷却 30 分钟
const snap = (t: Task, scenario: "normal" | "trigger" | "stale" | "conflict" | "recover", now: Date, seed = 7): FetchResult => ({ ok: true, snapshot: buildSnapshot(t, now, scenario, seed) });
function step(t: Task, f: FetchResult, now: Date) {
  const o = runCheck(t, f, now, "simulation", "r");
  return { o, t: { ...t, state: o.state } };
}

describe("比较器 compare", () => {
  it("数值边界", () => {
    expect(compare(-3, "<=", -3)).toBe(true);
    expect(compare(-2.99, "<=", -3)).toBe(false);
    expect(compare(40, "<", 40)).toBe(false);
    expect(compare(39.9, "<", 40)).toBe(true);
    expect(compare(5, "==", 5)).toBe(true);
  });
  it("标签包含", () => {
    expect(compare(["减持"], "contains", "减持")).toBe(true);
    expect(compare([], "contains", "减持")).toBe(false);
    expect(compare(3, "contains", "减持")).toBe(false);
  });
});

describe("三值组合器 combine", () => {
  it("AND", () => {
    expect(combine("AND", ["true", "true"])).toBe("true");
    expect(combine("AND", ["true", "unknown"])).toBe("unknown");
    expect(combine("AND", ["false", "unknown"])).toBe("false");
  });
  it("OR", () => {
    expect(combine("OR", ["false", "false"])).toBe("false");
    expect(combine("OR", ["unknown", "true"])).toBe("true");
    expect(combine("OR", ["unknown", "false"])).toBe("unknown");
  });
});

describe("解析器（演示解析器）", () => {
  it("解析示例指令为 AND 两条件", () => {
    const r = parseInstruction("宁德时代单日跌幅超过3%且新能源板块热度低于40时提醒我");
    expect(r.parser).toBe("demo-pattern");
    const c = r.condition!;
    expect(c.kind).toBe("group");
    if (c.kind !== "group") return;
    expect(c.op).toBe("AND");
    expect(c.children).toHaveLength(2);
    const [a, b] = c.children;
    expect(a).toMatchObject({ metric: "price_change_pct", operator: "<=", threshold: -3, instrument: { code: "300750.SZ" } });
    expect(b).toMatchObject({ metric: "heat_score", operator: "<", threshold: 40, instrument: { code: "SECTOR:新能源" } });
  });
  it("OR 与无法识别片段", () => {
    const r = parseInstruction("比亚迪涨幅超过5%或比亚迪出现回购公告");
    expect(r.condition?.kind === "group" && r.condition.op).toBe("OR");
    expect(parseInstruction("明天天气怎么样").condition).toBeNull();
  });
});

describe("健康与条件结果分离", () => {
  it("数据过期 → health=stale, result=unknown, 不触发", () => {
    const { o } = step(task(), snap(task(), "stale", T0), T0);
    expect(o.run.health).toBe("stale");
    expect(o.run.result).toBe("unknown");
    expect(o.notify).toBe(false);
  });
  it("多源冲突 → health=conflict, 不触发", () => {
    const { o } = step(task(), snap(task(), "conflict", T0), T0);
    expect(o.run.health).toBe("conflict");
    expect(o.run.decision).toBe("indeterminate");
  });
  it("超时/失败 → skipped_unhealthy 且不改变成立片段", async () => {
    const t = task();
    const f = await DemoSimAdapter.fetch(t, T0, { scenario: "timeout", seed: 1 });
    const { o } = step(t, f, T0);
    expect(o.run.health).toBe("timeout");
    expect(o.run.decision).toBe("skipped_unhealthy");
    expect(o.state.episode).toBe(0);
  });
});

describe("触发、去重、冷却、恢复", () => {
  it("同一片段只提醒一次；恢复后冷却期内再次成立被冷却抑制；冷却后提醒", () => {
    let t = task();
    let r = step(t, snap(t, "trigger", at(0)), at(0));
    expect(r.o.run.decision).toBe("triggered");
    expect(r.o.run.dedupeKey).toBe(dedupeKeyOf(t.id, 1, 1));
    t = r.t;
    r = step(t, snap(t, "trigger", at(1)), at(1));
    expect(r.o.run.decision).toBe("still_active");
    expect(r.o.notify).toBe(false);
    t = r.t;
    r = step(t, snap(t, "recover", at(2)), at(2));
    expect(r.o.run.decision).toBe("recovered");
    t = r.t;
    r = step(t, snap(t, "trigger", at(5)), at(5));
    expect(r.o.run.decision).toBe("suppressed_cooldown");
    expect(r.o.state.episode).toBe(2);
    t = r.t;
    r = step(t, snap(t, "recover", at(10)), at(10));
    t = r.t;
    r = step(t, snap(t, "trigger", at(31)), at(31));
    expect(r.o.run.decision).toBe("triggered");
    expect(r.o.run.dedupeKey).toBe(dedupeKeyOf(t.id, 1, 3));
  });
  it("暂停任务跳过评估", () => {
    const t = { ...task(), status: "paused" as const };
    expect(step(t, snap(t, "trigger", T0), T0).o.run.decision).toBe("skipped_paused");
  });
});

describe("版本隔离", () => {
  it("新版本使用新的去重键且状态重置", () => {
    let t = task();
    const r1 = step(t, snap(t, "trigger", at(0)), at(0));
    t = { ...r1.t, ruleVersion: 2, state: freshState(60, at(1)) };
    const r2 = step(t, snap(t, "trigger", at(1)), at(1));
    expect(r2.o.run.decision).toBe("triggered");
    expect(r2.o.run.dedupeKey).toBe(dedupeKeyOf(t.id, 2, 1));
    expect(r2.o.run.dedupeKey).not.toBe(r1.o.run.dedupeKey);
  });
});

describe("可复现性与校验", () => {
  it("同场景同种子同时刻 → 相同快照", () => {
    const t = task();
    expect(buildSnapshot(t, T0, "normal", 9)).toEqual(buildSnapshot(t, T0, "normal", 9));
  });
  it("所有示例任务 normal 场景不触发、trigger 场景触发", () => {
    for (const t of seedTasks().map((x) => ({ ...x, status: "active" as const }))) {
      expect(step(t, snap(t, "normal", T0), T0).o.run.result).toBe("false");
      expect(step(t, snap(t, "trigger", T0), T0).o.run.result).toBe("true");
    }
  });
  it("校验非法阈值", () => {
    const t = task();
    const bad = JSON.parse(JSON.stringify(t.rule));
    bad.condition.children[1].threshold = 150;
    bad.tickSeconds = 1;
    const errs = validateRule(bad);
    expect(errs.some((e) => e.includes("0-100"))).toBe(true);
    expect(errs.some((e) => e.includes("检查频率"))).toBe(true);
    expect(validateRule(t.rule)).toEqual([]);
  });
});
