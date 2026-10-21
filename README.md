# AlphaRadar · 投资风险雷达

> 把一句中文监控意图（如「宁德时代单日跌幅超过3%且新能源板块热度低于40时提醒我」）变成**结构化、可编辑、可解释**的监控规则，并给出每一次「触发 / 不触发」的证据。
>
> ⚠️ **运行模式：仅浏览器演示模式，非 24h 后台调度。** 数据为 **DEMO 合成数据，非实时、非真实行情**。系统**不提供任何买卖建议**。

## 1. 用户群体

- 个人投资者 / 投研助理：希望用自然语言快速设置组合风险提醒，而不是写代码。
- 风控/合规评审者：需要看到每次提醒背后的数据来源、时间戳、判定理由与审计记录。

## 2. 范围（已实现）

| 能力 | 状态 |
|---|---|
| 中文指令 → 结构化规则（演示解析器，界面标注「规则解析（演示解析器）」） | ✅ |
| 结构化编辑器：价格 / 事件 / 日历 / 热度，嵌套 AND/OR（≤3 层），单位、回看窗口、检查频率、交易时区、冷却、过期阈值 | ✅ |
| 校验 + 预览（自然语言回显 + JSON）+ 二次确认 | ✅ |
| 版本化 JSON 任务 Schema（`schemaVersion: "1.0"`，`ruleVersion` 递增，版本时间线） | ✅ |
| 规则评估器：比较器、三值逻辑组合器、过期/冲突/缺失检测 | ✅ 单测覆盖 |
| 决策状态机：触发、去重、冷却、持续成立、恢复、暂停跳过、异常跳过 | ✅ 单测覆盖 |
| 「立即检查」、浏览器内调度器（页面打开时每 5 秒扫描到期任务） | ✅ |
| 模拟/故障注入面板：normal / trigger / stale / conflict / timeout / failure / recover + 种子可复现 + 「完整生命周期」 | ✅ |
| 任务健康与条件结果分离显示；证据表（观测值、数据时间、来源、理由） | ✅ |
| 站内通知中心、审计日志、导出 JSON、重置演示数据 | ✅ |
| 数据适配器接口；扶摇、iFinD MCP 适配器占位（显示「未接入」） | ✅ 接口 / ❌ 实接 |

## 3. 未实现 / 限制（如实说明）

- **无后台 Worker，无 7×24 调度**。关闭页面即停止检查。未启用 Lovable Cloud / 数据库。
- **持久化仅 localStorage**（单浏览器、单用户，清除浏览器数据即丢失；运行与审计各保留最近 500 条）。
- **无大模型解析**：未配置 LLM 密钥，使用确定性词典 + 正则解析器，覆盖有限（见 `src/lib/alpha/parser.ts`）。
- **无真实行情**：扶摇、iFinD MCP 未接入；所有数值由 `buildSnapshot()` 按场景+种子合成，**不对应任何真实市场数据**。
- 无登录/多用户、无短信/邮件/推送通知、无交易日历（`timezone` 字段已存储但调度器未按交易时段过滤）。
- 冷却抑制期间的片段若持续成立，冷却到期后会补发一次（设计选择，已在 TEST_PLAN 中记录）。

## 4. 架构

```text
┌──────────────── 浏览器 (TanStack Start / React 19) ────────────────┐
│ 页面：概览 / 任务 / 新建 / 详情 / 模拟 / 可解释性 / 通知 / 数据源 / 设置 │
│        │ useApp() (useSyncExternalStore)                               │
│ store.ts ── localStorage("alpharadar.v1")  ← 任务/运行/通知/审计/设置    │
│   │ actions.check() ──► DataAdapter.fetch() ──► FetchResult             │
│   │                       ├ DemoSimAdapter（场景+种子，确定性合成）       │
│   │                       ├ 扶摇（未接入）  └ iFinD MCP（未接入）         │
│   └► evaluator.runCheck(task, fetched, now)  纯函数                     │
│         evaluateCondition（三值逻辑） → health / result / decision       │
│ 浏览器调度器：setInterval 5s，检查 nextRunAt 到期的 active 任务           │
└─────────────────────────────────────────────────────────────────────┘
```

核心模块（`src/lib/alpha/`）：

- `types.ts` 任务 Schema；`catalog.ts` 标的/指标字典（仅代码与名称）
- `parser.ts` 演示解析器：先按「或」切分，再按「且/并且/同时」切分（AND 优先于 OR），识别 涨跌幅/价格/量比/事件标签/财报日历/热度
- `evaluator.ts` 比较器、组合器、`runCheck` 决策状态机
- `validate.ts` 规则校验；`adapters.ts` 数据适配器与合成数据；`store.ts` 持久化与调度

### 决策规则

1. 获取失败/超时 → 健康 = failed/timeout，结果 unknown，决策 `skipped_unhealthy`，不改变成立片段。
2. 单条件：无数据 → unknown(failed)；多源差异 > 0.5 → unknown(conflict)；数据年龄 > `staleAfterSeconds` → unknown(stale)。
3. AND/OR 采用 Kleene 三值逻辑。
4. false→true 开启新片段（episode+1），`dedupeKey = taskId:v{ruleVersion}:e{episode}`。
5. 已通知该 key → `still_active`；冷却期内 → `suppressed_cooldown`；否则 `triggered` 并写入冷却截止时间。
6. true→false → `recovered`。修改规则 → 新版本、运行状态重置（版本隔离）。

## 5. AI 的角色与回退

见 [AI_USAGE_AND_VALIDATION.md](./AI_USAGE_AND_VALIDATION.md)。简述：运行时**不调用任何 AI**；解析器是确定性代码，界面始终显示「规则解析（演示解析器）」，用户必须在编辑器中核对并确认。

## 6. 数据源

| 适配器 | 状态 | 说明 |
|---|---|---|
| `demo-sim` DEMO 模拟 | 可用 | 场景 + 种子（mulberry32）生成满足/不满足阈值的数值，来源标注 `DEMO-SIM-A/B`，`demo: true` |
| `fuyao` 扶摇 | 未接入 | 计划：行情、板块热度。需服务端 API 凭据 |
| `ifind-mcp` 同花顺 iFinD MCP | 未接入 | 计划：公告事件、财报日历。需账号与 MCP 服务地址 |

接入真实数据源：实现 `DataAdapter.fetch(task, now, opts) → FetchResult`，返回 `DataPoint{ key, value, observedAt, source, demo:false }`；凭据必须放在服务端（例如 TanStack `createServerFn` + 环境变量），不得进入浏览器代码。

## 7. 本地运行 / 部署

```bash
bun install
bun run dev        # http://localhost:8080
bunx vitest run    # 单元测试
bun run build      # 生产构建
```

部署：在 Lovable 中点击发布即可（静态前端 + 边缘函数运行时）。由于没有后台 Worker，部署后依然是浏览器演示模式。

## 8. 演示脚本（约 120 秒）

| 时间 | 操作 | 观察点 |
|---|---|---|
| 0–15s | 打开「概览」 | 顶部「仅浏览器演示模式，非24h后台调度」、6 个示例任务、健康与条件结果两枚独立徽章 |
| 15–45s | 「新建任务」→ 点示例 → 「解析为结构化规则」 | 「规则解析（演示解析器）」徽章；解析出 宁德时代 `<= -3%` 且 新能源板块热度 `< 40` |
| 45–60s | 把 40 改成 150 | 校验报错「热度阈值需在 0-100 之间」；改回 → 创建 → 确认 |
| 60–95s | 「模拟与故障注入」→ 选该任务 →「完整生命周期」 | 依次：未触发 → 已触发 → 持续成立(去重) → 数据过期 → 数据冲突 → 超时 → 恢复 → 冷却抑制 |
| 95–110s | 「通知中心」 | 只有 1 条通知，dedupeKey `…:v1:e1` |
| 110–125s | 任务详情 →「修改规则」改阈值 → 保存为新版本 | 版本时间线出现 v2；再次触发生成 `…:v2:e1`（版本隔离） |
| 125–140s | 「可解释性」「设置与合规」 | 条件树逐项证据、审计日志 |

## 9. 测试

见 [TEST_PLAN.md](./TEST_PLAN.md) 与复验报告 [VALIDATION_2026-10-21.md](./VALIDATION_2026-10-21.md)。

- 2026-10-21 复验（本次实际运行）：`bunx vitest run` 16/16 通过；`npx tsgo --noEmit` 无错误；生产构建 build OK；`python3 scripts/acceptance_e2e.py` 输出全部符合预期、0 页面错误。原始日志在 `docs/validation/`。
- 说明：E2E 脚本打印各项数量（count）而非断言，判定方式见 TEST_PLAN 第 I 节。
- 尚未验证：关闭页面后的行为（按设计不会检查）、交易时段过滤（未实现）、真实数据源（未接入）、长时间运行稳定性、发布 URL 的自动化验收（E2E 均在本地开发服务完成）。

## 10. 演示视频

主链路实际录屏（70.6 秒，2026-10-21 录制）：[`/demo/AlphaRadar_demo.mp4`](./public/demo/AlphaRadar_demo.mp4)，部署后可通过 `<站点URL>/demo/AlphaRadar_demo.mp4` 下载。内容：概览 → 新建任务（解析→校验→二次确认）→ 模拟完整生命周期 → 通知中心去重 → 版本 v2 → 可解释性 → 数据源。SHA256 见 VALIDATION_2026-10-21.md。


## 补充：公开 Web 与最终交付

2026-10-21 已通过 Chrome 实际完成公开站创建、8步模拟、通知去重、规则v2与刷新持久化检查，见 [公开Web验收](docs/validation/public_web_2026-10-21.md)。这属于人工主链路验收，不是自动化全量回归。

公开仓库：https://github.com/1328lct/investment-x-buddy 。源码为手动导出同步，未建立Lovable双向自动同步。

演示MP4为70.6秒、3,126,021字节。提交包包含本地文件；也可从 [仓库视频](https://github.com/1328lct/investment-x-buddy/blob/main/public/demo/AlphaRadar_demo.mp4) 下载。公开站视频路径未通过Chrome播放验证，不应只提交该路径。
