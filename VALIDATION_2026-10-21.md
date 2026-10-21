# 交付复验报告 · 2026-10-21

本报告记录 **2026-10-21 本次实际运行** 的验证结果，并与历史记录明确区分。本次复验**未修改任何产品功能代码**，仅新增验证产物（视频、日志、文档）。

## 1. 本次实际运行结果（2026-10-21 03:40 UTC）

| 验证项 | 命令 | 结果 | 证据文件 |
|---|---|---|---|
| 单元测试 | `bunx vitest run` | **16/16 通过**，exit=0 | `docs/validation/vitest_2026-10-21.log` |
| 类型检查 | `npx tsgo --noEmit` | **无错误**，exit=0 | `docs/validation/typecheck_2026-10-21.log` |
| 生产构建 | 平台自动构建 | **build OK**（2026-10-21T03:41:15Z） | 平台构建日志 |
| 端到端验收 | `python3 scripts/acceptance_e2e.py` | 全部输出符合预期，pageerror=0，exit=0 | `docs/validation/e2e_2026-10-21.log` |
| 主链路录像 | `docs/validation/record_demo_2026-10-21.py` | **70.6 秒**，0 页面错误 | `public/demo/AlphaRadar_demo.mp4` |

### 端到端脚本输出（如实说明）

`scripts/acceptance_e2e.py` **打印各项数量（count）而非断言（assert）**，判定由人工核对输出完成。本次输出：

```text
{'sim_runs': 1, 'notifs_for_v1e1': 1, 'notifs_v1e2': 0, 'v2_current': 1,
 'paused': 1, 'persist_after_reload': 1, 'validation_err': 1,
 'sched_stopped': 1, 'corrupt_recovered_cards': 1}
errs []
```

逐项含义：完整生命周期产生「本次会话结果 (8)」；通知中心仅 `v1:e1` 一条、`v1:e2` 被冷却抑制（0 条）；版本时间线显示「v2 · 当前」；暂停/恢复生效；刷新后 v2 仍在；热度阈值 150 显示校验错误；关闭调度器显示「已停止」；损坏的 localStorage 自动重建示例数据；页面错误 0 条。

### 演示视频

- 路径：`public/demo/AlphaRadar_demo.mp4`（可通过预览/发布 URL 的 `/demo/AlphaRadar_demo.mp4` 下载）
- 时长：**70.60 秒**（ffprobe），在要求的 60–180 秒区间内
- 大小：**3,126,021 字节**
- SHA256：`0340f4cd447e0a25c059efc74c43ba2445f14a4c23e3abd47b8c8344079c2e95`
- 内容：概览 → 新建任务（演示解析器解析 → 校验错误演示 → 二次确认创建）→ 模拟完整生命周期（8 次运行）→ 通知中心去重证据（v1:e1=1，v1:e2=0）→ 修改规则生成 v2 → 可解释性 → 数据源状态
- 录制脚本与日志：`docs/validation/record_demo_2026-10-21.py`、`docs/validation/recording_log_2026-10-21.txt`
- 说明：此前一次录制（约 93 秒）的临时文件已丢失，本视频为 2026-10-21 **重新录制**；首次重录 50.5 秒不达 60 秒下限，已作废并再次录制。

## 2. 历史记录（此前轮次，非本次运行）

| 时间 | 内容 | 结果 |
|---|---|---|
| 首次构建 | vitest / tsgo / build / Playwright 流程走查 | 16/16 通过、类型检查干净、构建成功、流程无页面错误 |
| 2026-10-20 | 首次编写并运行 `scripts/acceptance_e2e.py` | 11 项输出符合预期，0 页面错误（记录在 TEST_PLAN.md 第 I 节） |

历史结果仅作为背景，**以第 1 节本次运行结果为准**。

## 3. GitHub 连接核查

- 本项目 git 远程仅有 Lovable 内部代码存储（`origin` / `secondary`），**未发现 GitHub 仓库远程地址**。
- Git 同步（GitHub）的连接状态无法从代码侧确认，需在 **项目设置 → Git** 中查看。用户已表示完成授权，但代码侧未见关联仓库，请在该设置页确认同步状态与仓库 URL。
- 按安全要求，不展示任何带凭据的远程地址。

## 4. 边界与尚未验证项（如实声明）

- **本地端到端 ≠ 公开 URL 验收**：以上 E2E 与录像均在本地开发服务（localhost:8080）完成，未对发布 URL 做自动化验收。
- 关闭页面后的调度行为（按设计不检查）未验证。
- 交易时段过滤未实现（`timezone` 字段已存储）。
- 真实数据源（扶摇 / iFinD MCP）未接入，全部数值为 DEMO 合成数据。
- 长时间运行稳定性未验证。
- 运行模式仍为**仅浏览器演示模式，非 24h 后台调度**；系统不提供任何买卖建议。
