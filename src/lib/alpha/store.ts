// 浏览器持久化（localStorage）。仅浏览器演示模式，非 24h 后台调度。
import { useSyncExternalStore } from "react";
import { ADAPTERS, type Scenario } from "./adapters";
import { freshState, runCheck } from "./evaluator";
import { newId } from "./parser";
import { seedTasks } from "./seed";
import type { AuditEntry, Notification, RuleSpec, RunRecord, Task } from "./types";

const KEY = "alpharadar.v1";

export interface AppState {
  version: 1;
  tasks: Task[];
  runs: RunRecord[];
  notifications: Notification[];
  audit: AuditEntry[];
  settings: { scenario: Scenario; seed: number; schedulerEnabled: boolean; adapterId: string };
  loaded: boolean;
}

const EMPTY: AppState = { version: 1, tasks: [], runs: [], notifications: [], audit: [], settings: { scenario: "normal", seed: 42, schedulerEnabled: true, adapterId: "demo-sim" }, loaded: false };

let state: AppState = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();

function audit(action: string, detail: string, taskId?: string): AuditEntry {
  return { id: newId("a"), at: new Date().toISOString(), actor: "本地用户", action, detail, taskId };
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      state = { ...EMPTY, ...(JSON.parse(raw) as AppState), loaded: true };
      return;
    }
  } catch {
    /* 损坏则重建 */
  }
  state = { ...EMPTY, tasks: seedTasks(), audit: [audit("初始化", "载入 6 个示例任务")], loaded: true };
  persist();
}

function persist() {
  if (typeof window === "undefined") return;
  const { loaded: _l, ...rest } = state;
  void _l;
  window.localStorage.setItem(KEY, JSON.stringify({ ...rest, runs: rest.runs.slice(0, 500), audit: rest.audit.slice(0, 500) }));
}

function set(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (cb) => {
      init();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      init();
      return state;
    },
    () => EMPTY,
  );
}

export const getState = () => (init(), state);

export const actions = {
  createTask(input: { name: string; nlSource: string; parser: Task["parser"]; rule: RuleSpec }) {
    const now = new Date().toISOString();
    const t: Task = {
      schemaVersion: "1.0", id: newId("task"), name: input.name, nlSource: input.nlSource, parser: input.parser,
      status: "active", ruleVersion: 1, rule: input.rule,
      versions: [{ version: 1, rule: input.rule, createdAt: now, note: "创建" }],
      state: freshState(input.rule.tickSeconds), createdAt: now, updatedAt: now,
    };
    const s = getState();
    set({ ...s, tasks: [t, ...s.tasks], audit: [audit("创建任务", t.name, t.id), ...s.audit] });
    return t.id;
  },
  updateRule(id: string, rule: RuleSpec, note: string, name?: string) {
    const s = getState();
    set({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const v = t.ruleVersion + 1;
        // 版本隔离：新版本重置成立片段/去重状态，旧版本记录不受影响
        return { ...t, name: name ?? t.name, ruleVersion: v, rule, versions: [...t.versions, { version: v, rule, createdAt: new Date().toISOString(), note }], state: freshState(rule.tickSeconds), updatedAt: new Date().toISOString() };
      }),
      audit: [audit("修改规则", `生成新版本：${note}`, id), ...s.audit],
    });
  },
  setStatus(id: string, status: Task["status"]) {
    const s = getState();
    set({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status, state: status === "active" ? { ...t.state, nextRunAt: new Date(Date.now() + t.rule.tickSeconds * 1000).toISOString() } : t.state, updatedAt: new Date().toISOString() } : t)),
      audit: [audit(status === "paused" ? "暂停任务" : "恢复任务", "", id), ...s.audit],
    });
  },
  deleteTask(id: string) {
    const s = getState();
    const t = s.tasks.find((x) => x.id === id);
    set({ ...s, tasks: s.tasks.filter((x) => x.id !== id), audit: [audit("删除任务", t?.name ?? id, id), ...s.audit] });
  },
  async check(id: string, trigger: RunRecord["trigger"], override?: { scenario: Scenario; seed: number }) {
    const s0 = getState();
    const task = s0.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    const adapter = ADAPTERS.find((a) => a.id === s0.settings.adapterId) ?? ADAPTERS[0]!;
    const opts = override ?? { scenario: s0.settings.scenario, seed: s0.settings.seed };
    const now = new Date();
    const fetched = await adapter.fetch(task, now, opts);
    const out = runCheck(task, fetched, now, trigger, newId("run"));
    const s = getState();
    const notifs: Notification[] = out.notify
      ? [{ id: newId("n"), taskId: id, runId: out.run.id, dedupeKey: out.run.dedupeKey!, at: out.run.at, title: `【DEMO】${task.name} 条件成立`, body: out.run.evidence.filter((e) => e.result === "true").map((e) => e.label).join("；") + "。仅为条件提醒，不构成投资建议。", read: false }]
      : [];
    set({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, state: out.state } : t)),
      runs: [out.run, ...s.runs],
      notifications: [...notifs, ...s.notifications],
      audit: trigger === "scheduler" ? s.audit : [audit(trigger === "manual" ? "立即检查" : "模拟运行", `场景=${opts.scenario} 种子=${opts.seed} 决策=${out.run.decision}`, id), ...s.audit],
    });
    return out.run;
  },
  setSettings(p: Partial<AppState["settings"]>) {
    const s = getState();
    set({ ...s, settings: { ...s.settings, ...p }, audit: [audit("修改设置", JSON.stringify(p)), ...s.audit] });
  },
  markRead(id?: string) {
    const s = getState();
    set({ ...s, notifications: s.notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) });
  },
  reset() {
    initialized = true;
    set({ ...EMPTY, tasks: seedTasks(), audit: [audit("重置", "清空本地数据并重新载入示例任务")], loaded: true });
  },
};

// 浏览器内调度器：仅在页面打开时运行
let timer: ReturnType<typeof setInterval> | undefined;
export function startBrowserScheduler() {
  if (timer || typeof window === "undefined") return;
  timer = setInterval(() => {
    const s = getState();
    if (!s.settings.schedulerEnabled) return;
    const now = Date.now();
    for (const t of s.tasks) {
      if (t.status !== "active") continue;
      if (!t.state.nextRunAt || new Date(t.state.nextRunAt).getTime() <= now) void actions.check(t.id, "scheduler");
    }
  }, 5000);
}
