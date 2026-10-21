# 测试计划

图例：✅ **已验证（自动化）**——在 `src/lib/alpha/alpha.test.ts` 中有断言并通过；🖐 **已手动/Playwright 验证**；📝 **计划中，未验证**。

运行：`bunx vitest run`

## A. 比较器与组合器

| ID | 场景 | 输入 | 期望 | 状态 |
|---|---|---|---|---|
| A1 | `<=` 边界 | -3 `<=` -3；-2.99 `<=` -3 | true；false | ✅ |
| A2 | `<` 边界 | 40 `<` 40；39.9 `<` 40 | false；true | ✅ |
| A3 | 标签包含 | ["减持"] contains 减持；[] contains 减持；数字 contains | true；false；false | ✅ |
| A4 | AND 三值 | [T,T]；[T,U]；[F,U] | T；U；F | ✅ |
| A5 | OR 三值 | [F,F]；[U,T]；[U,F] | F；T；U | ✅ |

## B. 解析器（演示解析器）

| ID | 输入 | 期望 | 状态 |
|---|---|---|---|
| B1 | 宁德时代单日跌幅超过3%且新能源板块热度低于40时提醒我 | AND 组；300750.SZ price_change_pct `<=` -3；SECTOR:新能源 heat_score `<` 40；parser=demo-pattern | ✅ |
| B2 | 比亚迪涨幅超过5%或比亚迪出现回购公告 | 根组 OR | ✅ |
| B3 | 明天天气怎么样 | condition = null | ✅ |
| B4 | 贵州茅台股价跌破1000元并且成交量放大2倍时提醒我 | price `<` 1000 且 volume_ratio `>=` 2 | 🖐 |

## C. 健康与条件结果分离（固定时刻 T0 = 2026-01-05T02:00:00Z，种子 7，示例任务 #1）

| ID | 场景 | 期望 | 状态 |
|---|---|---|---|
| C1 | stale（数据年龄 = 过期阈值 + 600 秒） | health=stale，result=unknown，不通知 | ✅ |
| C2 | conflict（DEMO-SIM-A 与 B 差值 > 0.5） | health=conflict，decision=indeterminate | ✅ |
| C3 | timeout | health=timeout，decision=skipped_unhealthy，episode 保持 0 | ✅ |
| C4 | failure（HTTP 503 注入） | health=failed，skipped_unhealthy | 🖐（与 C3 同一代码路径） |

## D. 触发 / 去重 / 冷却 / 恢复（冷却 30 分钟，时间单位为分钟）

| ID | 时刻 | 场景 | 期望决策 | 状态 |
|---|---|---|---|---|
| D1 | t=0 | trigger | triggered，dedupeKey=`{id}:v1:e1` | ✅ |
| D2 | t=1 | trigger | still_active，不通知 | ✅ |
| D3 | t=2 | recover | recovered | ✅ |
| D4 | t=5 | trigger | suppressed_cooldown，episode=2 | ✅ |
| D5 | t=10→31 | recover → trigger | triggered，dedupeKey=`{id}:v1:e3` | ✅ |
| D6 | 任意 | 任务暂停 | skipped_paused | ✅ |
| D7 | UI | 模拟「完整生命周期」后通知中心 | 通知数仅 +1（只有 e1 的通知，e2 被冷却抑制） | 🖐 E2E |

## E. 版本隔离

| ID | 场景 | 期望 | 状态 |
|---|---|---|---|
| E1 | v1 已触发，改为 v2（状态重置）后再次 trigger | triggered，key=`{id}:v2:e1` ≠ v1 的 key | ✅ |
| E2 | UI 修改规则 | 版本时间线显示 v2「当前」，刷新后仍为 v2 | 🖐 E2E |

## F. 可复现性与校验

| ID | 场景 | 期望 | 状态 |
|---|---|---|---|
| F1 | 同任务、同场景、同种子、同时刻生成快照两次 | 深度相等 | ✅ |
| F2 | 6 个示例任务：normal 场景 / trigger 场景 | result=false / result=true | ✅ |
| F3 | 热度阈值 150、频率 1 秒 | 报错含「0-100」与「检查频率」；原规则无报错 | ✅ |

## G. 持久化与调度

| ID | 场景 | 期望 | 状态 |
|---|---|---|---|
| G1 | 新建任务后刷新页面 | 任务仍在（localStorage） | 🖐 E2E |
| G2 | 设置中关闭浏览器调度器 | 顶栏显示「已停止」，不再产生 scheduler 运行 | 🖐 E2E 已验证「已停止」显示；「不再产生运行」📝 未验证 |
| G3 | 关闭页面 10 分钟后重开 | 期间**没有**检查（符合「非24h后台调度」） | 📝 |
| G4 | localStorage 内容损坏 | 重建示例数据，不崩溃 | 🖐 E2E |

## H. 未覆盖（计划中）

- 📝 交易时段过滤（时区字段已存储，未执行）
- 📝 真实适配器契约测试（扶摇 / iFinD MCP 未接入）
- 📝 组件级 UI 测试（React Testing Library）
- 📝 后端 Worker 的并发与幂等（无后端）

## I. 端到端验收脚本

`scripts/acceptance_e2e.py`（Playwright，需本地开发服务运行于 8080）。**注意：该脚本打印各项数量（count），不含 assert 断言**；「通过」指人工核对输出与期望值一致（如 `notifs_for_v1e1=1`、`notifs_v1e2=0`、`errs=[]`）。

最近一次结果（2026-10-21 03:40 UTC，原始输出见 `docs/validation/e2e_2026-10-21.log`）：

| 检查 | 期望输出 | 本次输出 | 结果 |
|---|---|---|---|
| 新建任务：解析 → 确认 → 跳转到详情页 | 跳转 `tasks/task_*` | 跳转成功 | 通过 |
| 模拟「完整生命周期」8 次运行 | `sim_runs=1` | 1 | 通过 |
| 通知仅 `v1:e1` 一条，`v1:e2` 被冷却抑制 | `notifs_for_v1e1=1, notifs_v1e2=0` | 1 / 0 | 通过 |
| 修改规则后生成 v2「当前」 | `v2_current=1` | 1 | 通过 |
| 暂停 / 恢复 | `paused=1` | 1 | 通过 |
| 刷新后数据仍在（v2） | `persist_after_reload=1` | 1 | 通过 |
| 热度阈值 150 时显示校验错误 | `validation_err=1` | 1 | 通过 |
| 关闭调度器后显示「已停止」 | `sched_stopped=1` | 1 | 通过 |
| 损坏的 localStorage 自动重建 | `corrupt_recovered_cards=1` | 1 | 通过 |
| 页面错误（pageerror） | `errs=[]` | [] | 通过 |
| 手机宽度 390px 截图人工检查 | 布局正常 | 正常（2026-10-20 截图） | 通过 |

2026-10-21 复验构建：生产构建 build OK（平台日志 03:41:15Z）；类型检查 `npx tsgo --noEmit` 无错误；`bunx vitest run` 16/16 通过。历史记录（2026-10-20 首轮）与本次结果区分见 [VALIDATION_2026-10-21.md](./VALIDATION_2026-10-21.md)。
