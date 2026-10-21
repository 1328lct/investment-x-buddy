import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { TaskComposer } from "@/components/alpha/TaskComposer";
import { PageHeader } from "@/components/alpha/ui";
import { actions } from "@/lib/alpha/store";

export const Route = createFileRoute("/tasks/new")({
  head: () => ({
    meta: [
      { title: "新建任务 · AlphaRadar" },
      { name: "description", content: "用中文描述监控意图，解析为可编辑的结构化规则。" },
      { property: "og:title", content: "新建任务 · AlphaRadar" },
      { property: "og:description", content: "自然语言 → 结构化规则 → 预览确认。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewTask,
});

function NewTask() {
  const nav = useNavigate();
  return (
    <>
      <PageHeader title="新建监控任务" desc="左侧输入中文指令 → 解析 → 右侧核对与编辑 → 预览确认。系统仅做条件提醒，不提供买卖建议。" />
      <TaskComposer submitLabel="创建任务" onSubmit={(v) => { const id = actions.createTask(v); toast.success("任务已创建"); void nav({ to: "/tasks/$id", params: { id } }); }} />
    </>
  );
}
