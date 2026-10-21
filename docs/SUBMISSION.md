# AlphaRadar 最终提交清单 · 2026-10-21

| 提交项 | 地址或文件 | 状态 |
|---|---|---|
| Web | https://alpharadar-risk-monitor.lovable.app/ | 公开站人工主链路通过 |
| 公开源码仓库 | https://github.com/1328lct/investment-x-buddy | 已实际上传，手动同步 |
| README | https://github.com/1328lct/investment-x-buddy#readme | 包含用户、设计、AI角色、数据和边界 |
| 演示视频 | public/demo/AlphaRadar_demo.mp4；提交包内同名文件 | 70.6秒，3,126,021字节，SHA256见元数据 |
| 测试说明 | TEST_PLAN.md | 核心、异常、边界及未验证项 |
| AI使用记录 | AI_USAGE_AND_VALIDATION.md | 运行时非AI解析器、开发AI与验证 |
| 复验报告 | VALIDATION_2026-10-21.md | 本次与历史分开，附原始日志 |
| 公开Web验收 | docs/validation/public_web_2026-10-21.md | 创建→模拟→去重→v2→刷新持久化 |

视频下载：https://github.com/1328lct/investment-x-buddy/blob/main/public/demo/AlphaRadar_demo.mp4 。公开站视频路径未通过Chrome播放验证，提交时使用包内MP4或仓库下载。

已复验：Vitest16/16、类型检查exit0、本地E2E输出人工核对符合预期且pageerror0；原E2E为打印count，不是全量断言。另有12组核心纯函数独立复验。

边界：浏览器DEMO，无后台24h Worker；localStorage单浏览器；扶摇/iFinD未接入；交易时段过滤未实现；长时稳定性及关页行为未验证；不提供投资建议。Lovable与GitHub未建立双向自动同步，后续更改需手动导出。
