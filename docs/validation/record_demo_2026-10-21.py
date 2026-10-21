"""AlphaRadar 主链路演示录像（2026-10-21 复验）。
流程：概览 → 新建任务(解析→校验→二次确认) → 模拟完整生命周期 → 通知中心去重 → 版本v2 → 可解释性。
Playwright 录制 webm，之后由 ffmpeg 转 mp4。
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

B = "http://localhost:8080"
OUT = Path(__file__).parent / "video_raw"
OUT.mkdir(parents=True, exist_ok=True)
LOG = Path(__file__).parent / "recording_log.txt"

lines = []
def log(msg):
    print(msg)
    lines.append(msg)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
            record_video_dir=str(OUT),
            record_video_size={"width": 1280, "height": 1800},
        )
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:150]))

        # 1. 概览
        await pg.goto(B + "/")
        await pg.wait_for_timeout(6000)
        log("1 概览页：演示模式横幅 + 6 个示例任务")
        await pg.evaluate("window.scrollTo(0, 600)")
        await pg.wait_for_timeout(5000)

        # 2. 新建任务：解析
        await pg.goto(B + "/tasks/new")
        await pg.wait_for_timeout(2500)
        await pg.get_by_role("button", name="解析为结构化规则").click()
        await pg.wait_for_timeout(2500)
        log("2 新建任务：演示解析器解析出结构化规则")
        await pg.evaluate("window.scrollTo(0, 500)")
        await pg.wait_for_timeout(3500)

        # 3. 校验错误演示：热度阈值 150
        await pg.locator("input[type=number]").nth(2).fill("150")
        await pg.wait_for_timeout(1500)
        log("3 校验：热度阈值 150 触发 0-100 错误")
        await pg.locator("input[type=number]").nth(2).fill("40")
        await pg.wait_for_timeout(1200)

        # 4. 二次确认创建
        await pg.get_by_role("button", name="创建任务…").click()
        await pg.wait_for_timeout(1200)
        await pg.get_by_role("button", name="确认创建任务").click()
        await pg.wait_for_url("**/tasks/task_*")
        tid = pg.url.split("/")[-1]
        await pg.wait_for_timeout(2500)
        log(f"4 任务已创建：{tid}")

        # 5. 模拟完整生命周期
        await pg.goto(B + "/simulate")
        await pg.wait_for_timeout(3500)
        await pg.locator("select").first.select_option(tid)
        await pg.get_by_role("button", name="完整生命周期").click()
        await pg.wait_for_timeout(7000)
        log("5 模拟：完整生命周期 8 次运行（触发/去重/过期/冲突/超时/恢复/冷却）")
        await pg.evaluate("window.scrollTo(0, 700)")
        await pg.wait_for_timeout(5000)

        # 6. 通知中心：去重证据
        await pg.goto(B + "/notifications")
        await pg.wait_for_timeout(5000)
        n1 = await pg.get_by_text(f"{tid}:v1:e1").count()
        n2 = await pg.get_by_text(f"{tid}:v1:e2").count()
        log(f"6 通知中心：v1:e1 通知 {n1} 条，v1:e2 被冷却抑制 {n2} 条")

        # 7. 任务详情：修改规则 → v2
        await pg.goto(B + f"/tasks/{tid}")
        await pg.wait_for_timeout(3500)
        await pg.get_by_role("button", name="修改规则").click()
        await pg.wait_for_timeout(1000)
        await pg.get_by_placeholder("例如：阈值由 -3% 调整为 -4%").fill("阈值调整演示")
        await pg.get_by_role("button", name="保存为新版本…").click()
        await pg.wait_for_timeout(800)
        await pg.get_by_role("button", name="确认保存为新版本").click()
        await pg.wait_for_timeout(1500)
        await pg.get_by_role("button", name="版本时间线 (2)").click()
        await pg.wait_for_timeout(2500)
        log("7 版本时间线：v2 当前，v1 历史（版本隔离）")

        # 8. 可解释性
        await pg.goto(B + "/explain")
        await pg.wait_for_timeout(5000)
        log("8 可解释性：条件树逐项证据")
        await pg.evaluate("window.scrollTo(0, 500)")
        await pg.wait_for_timeout(2500)

        # 9. 数据源状态
        await pg.goto(B + "/sources")
        await pg.wait_for_timeout(5000)
        log("9 数据源：DEMO 可用，扶摇/iFinD 未接入")

        log(f"pageerror 数量：{len(errs)}")
        for e in errs:
            log("  ERR: " + e)

        await ctx.close()  # 关闭 context 才会落盘视频
        await browser.close()

    vids = list(OUT.glob("*.webm"))
    for v in vids:
        log(f"视频文件：{v} ({v.stat().st_size} bytes)")

asyncio.run(main())
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8")
