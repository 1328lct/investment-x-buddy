import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DemoBadge, fmt, PageHeader, Pill } from "@/components/alpha/ui";
import { actions, useApp } from "@/lib/alpha/store";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "通知中心 · AlphaRadar" },
      { name: "description", content: "站内提醒通知，按去重键确保同一条件片段只提醒一次。" },
      { property: "og:title", content: "通知中心 · AlphaRadar" },
      { property: "og:description", content: "站内提醒列表。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifs,
});

function Notifs() {
  const s = useApp();
  return (
    <>
      <PageHeader title="通知中心" desc={<>仅站内通知（未接入短信/邮件/推送）。<DemoBadge /></>} actions={<Button variant="outline" onClick={() => actions.markRead()}>全部标为已读</Button>} />
      <div className="space-y-2">
        {s.notifications.map((n) => (
          <div key={n.id} className={`panel p-4 ${n.read ? "opacity-60" : "border-primary/40"}`}>
            <div className="flex flex-wrap items-center gap-2">
              {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
              <b className="text-sm">{n.title}</b>
              <span className="num text-xs text-muted-foreground">{fmt(n.at)}</span>
              <Pill>{n.dedupeKey}</Pill>
              <div className="ml-auto flex gap-2">
                <Link to="/tasks/$id" params={{ id: n.taskId }} className="text-xs text-primary">查看任务</Link>
                {!n.read && <button className="text-xs text-muted-foreground" onClick={() => actions.markRead(n.id)}>标为已读</button>}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
          </div>
        ))}
        {s.notifications.length === 0 && <p className="text-sm text-muted-foreground">暂无通知。在模拟面板运行「触发」场景即可产生。</p>}
      </div>
    </>
  );
}
