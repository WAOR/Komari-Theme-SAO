import { memo } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { Flag } from "@/components/ui/Flag";
import type { AdminClient, PingTask } from "@/types/komari";
import type { HomepagePingTaskBindings } from "@/utils/pingTasks";
import {
  applyAvailableClientAssignments,
  applyClientAssignment,
  pruneBindings,
  summarizeNodes,
} from "../utils";

const EMPTY_ADMIN_CLIENTS: AdminClient[] = [];

export const TaskBindingSection = memo(function TaskBindingSection({
  task,
  assigned,
  expanded,
  clientsById,
  visibleClients,
  assignedTaskByClientUuid,
  nodeSearch,
  onNodeSearch,
  onToggleExpand,
  onPatchBindings,
}: {
  task: PingTask;
  assigned: string[];
  expanded: boolean;
  clientsById: Map<string, AdminClient>;
  visibleClients: AdminClient[];
  assignedTaskByClientUuid: Map<string, string>;
  nodeSearch: string;
  onNodeSearch: (value: string) => void;
  onToggleExpand: (taskId: number) => void;
  onPatchBindings: (
    updater: (prev: HomepagePingTaskBindings) => HomepagePingTaskBindings,
  ) => void;
}) {
  const assignedSummary = summarizeNodes(assigned, clientsById);
  const selectableVisibleClients = expanded
    ? visibleClients.filter((client) => {
        const assignedTaskId = assignedTaskByClientUuid.get(client.uuid);
        return !assignedTaskId || assignedTaskId === String(task.id);
      })
    : EMPTY_ADMIN_CLIENTS;
  const allVisibleSelectableAssigned =
    selectableVisibleClients.length > 0 &&
    selectableVisibleClients.every((client) => assigned.includes(client.uuid));

  return (
    <section className="surface-inset px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-(--text-primary)">
              {task.name || `任务 #${task.id}`}
            </h3>
            <span className="rounded-full border border-(--hairline) px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-(--text-tertiary)">
              {task.type || "icmp"}
            </span>
            <span className="rounded-full border border-(--hairline) px-2 py-0.5 text-[10px] font-medium text-(--text-tertiary)">
              {task.interval}s
            </span>
            <span className="rounded-full border border-(--hairline) px-2 py-0.5 text-[10px] font-medium text-(--text-tertiary)">
              ID {task.id}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-(--text-secondary)">
            <span className="font-medium text-(--text-primary)">
              已绑定 {assigned.length} 个节点
            </span>
            <span className="mx-2 text-(--text-tertiary)">·</span>
            <span title={task.target || ""}>{task.target || "未填写目标"}</span>
          </div>
          <p className="mt-2 text-[12px] text-(--text-tertiary)" title={assignedSummary}>
            {assignedSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {expanded && (
            <button
              type="button"
              disabled={selectableVisibleClients.length === 0 || allVisibleSelectableAssigned}
              onClick={() => {
                onPatchBindings((prev) =>
                  applyAvailableClientAssignments(
                    prev,
                    task.id,
                    selectableVisibleClients.map((client) => client.uuid),
                  ),
                );
              }}
              className="theme-manage-button is-compact"
            >
              {allVisibleSelectableAssigned ? "已全选可用" : "全选可用"}
            </button>
          )}
          {assigned.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onPatchBindings((prev) => {
                  const next = { ...prev };
                  delete next[String(task.id)];
                  return pruneBindings(next);
                });
              }}
              className="theme-manage-button is-compact is-danger"
            >
              清空节点
            </button>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => onToggleExpand(task.id)}
            className="theme-manage-button is-compact"
          >
            {expanded ? "收起节点" : "编辑节点"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-(--hairline) pt-4">
          <label className="surface-inset flex items-center gap-2 px-3 py-2">
            <Search size={14} className="text-(--text-tertiary)" />
            <input
              value={nodeSearch}
              onChange={(event) => onNodeSearch(event.target.value)}
              placeholder="搜索节点名称 / UUID / 分组 / 地区"
              aria-label="搜索节点"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--text-tertiary)"
            />
          </label>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleClients.map((client) => {
              const checked = assigned.includes(client.uuid);
              const subtitle = [client.group, client.uuid].filter(Boolean).join(" · ");
              return (
                <label
                  key={client.uuid}
                  className={clsx(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                    checked
                      ? "border-(--border-strong) bg-[color-mix(in_srgb,var(--hover-bg)_72%,transparent)]"
                      : "border-(--hairline) bg-transparent hover:bg-(--hover-bg)",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      onPatchBindings((prev) =>
                        applyClientAssignment(prev, task.id, client.uuid, nextChecked),
                      );
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-(--accent-500)"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Flag region={client.region} size={14} />
                      <span className="truncate text-[13px] font-medium text-(--text-primary)">
                        {client.name}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-(--text-tertiary)">
                      {subtitle || client.region || "未设置分组"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
});
