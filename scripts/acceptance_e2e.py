import asyncio
from playwright.async_api import async_playwright
B="http://localhost:8080"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True); ctx=await b.new_context(viewport={"width":1280,"height":1800}); pg=await ctx.new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:150]))
        res={}
        await pg.goto(B+"/tasks/new"); await pg.wait_for_timeout(2500)
        await pg.get_by_role("button", name="解析为结构化规则").click()
        await pg.get_by_role("button", name="创建任务…").click(); await pg.get_by_role("button", name="确认创建任务").click()
        await pg.wait_for_url("**/tasks/task_*"); tid=pg.url.split("/")[-1]
        # simulate lifecycle
        await pg.goto(B+"/simulate"); await pg.wait_for_timeout(1500)
        await pg.locator("select").first.select_option(tid)
        await pg.get_by_role("button", name="完整生命周期").click(); await pg.wait_for_timeout(2500)
        res["sim_runs"]=await pg.get_by_text("本次会话结果 (8)").count()
        await pg.goto(B+"/notifications"); await pg.wait_for_timeout(1200)
        res["notifs_for_v1e1"]=await pg.get_by_text(f"{tid}:v1:e1").count()
        res["notifs_v1e2"]=await pg.get_by_text(f"{tid}:v1:e2").count()
        # edit -> v2
        await pg.goto(B+f"/tasks/{tid}"); await pg.wait_for_timeout(1500)
        await pg.get_by_role("button", name="修改规则").click()
        await pg.get_by_placeholder("例如：阈值由 -3% 调整为 -4%").fill("阈值调整")
        await pg.get_by_role("button", name="保存为新版本…").click(); await pg.get_by_role("button", name="确认保存为新版本").click(); await pg.wait_for_timeout(800)
        await pg.get_by_role("button", name="立即检查").first.click(); await pg.wait_for_timeout(800)
        await pg.get_by_role("button", name="版本时间线 (2)").click()
        res["v2_current"]=await pg.get_by_text("v2 · 当前").count()
        # pause / resume
        await pg.get_by_role("button", name="暂停").click(); res["paused"]=await pg.get_by_text("已暂停").count()
        await pg.get_by_role("button", name="恢复").click()
        # persistence
        await pg.reload(); await pg.wait_for_timeout(2000)
        res["persist_after_reload"]=await pg.get_by_text("规则 v2").count()
        # validation
        await pg.goto(B+"/tasks/new"); await pg.wait_for_timeout(1500)
        await pg.get_by_role("button", name="解析为结构化规则").click()
        await pg.locator('input[type=number]').nth(2).fill("150"); await pg.wait_for_timeout(300)
        res["validation_err"]=await pg.get_by_text("热度阈值需在 0-100 之间").count()
        # scheduler toggle
        await pg.goto(B+"/settings"); await pg.wait_for_timeout(1200)
        await pg.get_by_label("启用浏览器调度器").uncheck(); await pg.wait_for_timeout(300)
        res["sched_stopped"]=await pg.get_by_text("已停止").count()
        await pg.get_by_label("启用浏览器调度器").check()
        # corrupted storage
        await pg.evaluate("localStorage.setItem('alpharadar.v1','{bad')"); await pg.goto(B+"/"); await pg.wait_for_timeout(2000)
        res["corrupt_recovered_cards"]=await pg.get_by_text("宁德时代急跌 + 板块降温").count()
        # mobile
        m=await (await b.new_context(viewport={"width":390,"height":844})).new_page()
        await m.goto(B+"/tasks/new"); await m.wait_for_timeout(2000); await m.screenshot(path="/tmp/browser/acc/mobile.png")
        print(res); print("errs",errs)
        await b.close()
asyncio.run(main())
