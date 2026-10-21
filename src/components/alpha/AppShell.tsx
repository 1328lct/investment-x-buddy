import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Bell, Database, FlaskConical, LayoutDashboard, ListChecks, Menu, PlusCircle, Radar, ScanSearch, ShieldCheck } from "lucide-react";
import { startBrowserScheduler, useApp } from "@/lib/alpha/store";

const NAV = [
  { to: "/", label: "概览", icon: LayoutDashboard },
  { to: "/tasks", label: "任务管理", icon: ListChecks },
  { to: "/tasks/new", label: "新建任务", icon: PlusCircle },
  { to: "/simulate", label: "模拟与故障注入", icon: FlaskConical },
  { to: "/explain", label: "可解释性", icon: ScanSearch },
  { to: "/notifications", label: "通知中心", icon: Bell },
  { to: "/sources", label: "数据源状态", icon: Database },
  { to: "/settings", label: "设置与合规", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const s = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => startBrowserScheduler(), []);
  const unread = s.notifications.filter((n) => !n.read).length;
  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-sidebar-border bg-sidebar transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-glow"><Radar className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <div className="text-sm font-bold tracking-tight">AlphaRadar</div>
            <div className="text-[11px] text-muted-foreground">投资风险雷达</div>
          </div>
        </div>
        <nav className="space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} activeOptions={{ exact: true }} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}>
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {to === "/notifications" && unread > 0 && <span className="num rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-4 rounded-lg border border-demo/40 bg-demo/10 p-3 text-[11px] leading-relaxed text-demo">
          <div className="mb-1 flex items-center gap-1 font-semibold"><Activity className="h-3.5 w-3.5" />仅浏览器演示模式</div>
          非 24h 后台调度。调度器仅在本页面打开时运行，数据为 DEMO 模拟，存储于本机浏览器。
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur lg:px-8">
          <button className="lg:hidden" aria-label="打开导航" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="rounded border border-demo/40 bg-demo/10 px-2 py-0.5 text-[11px] font-medium text-demo">仅浏览器演示模式，非24h后台调度</span>
          <span className="hidden text-[11px] text-muted-foreground md:inline">数据源：DEMO 模拟 · 非实时 · 不构成投资建议</span>
          <span className="ml-auto text-[11px] text-muted-foreground">浏览器调度器：{s.settings.schedulerEnabled ? <b className="text-success">运行中（页面打开时）</b> : <b>已停止</b>}</span>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
