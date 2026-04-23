import React, { useEffect, useMemo, useState } from "react";
import { listUsers } from "../../api/auth";
import { getProjects, Project } from "../../api/projects";
import { assignTask, changeStatus, createTask, deleteTask, getTaskDetail, getTasks, Task, TaskStatus, updateTask } from "../../api/tasks";
import { useAuth } from "../../state/auth/AuthContext";
import { Toast } from "../components/Toast";
import { Drawer } from "../components/Drawer";
import "./tasks.css";

function groupByStatus(tasks: Task[]) {
  const buckets: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const t of tasks) {
    const s = (t.status ?? "TODO").toString();
    if (!buckets[s]) buckets[s] = [];
    buckets[s].push(t);
  }
  return buckets;
}

function statusTitle(s: string) {
  if (s === "IN_PROGRESS") return "In progress";
  return s === "DONE" ? "Done" : "Todo";
}

export function TasksPage() {
  const auth = useAuth();
  const role = (auth.claims?.role ?? "UNKNOWN").toString().toUpperCase();
  const canCreate = role === "ADMIN" || role === "PM";
  const canDelete = role === "ADMIN" || role === "PM";

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: number; email: string; role: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<"" | "TODO" | "IN_PROGRESS" | "DONE">("");
  const [filterAssignee, setFilterAssignee] = useState<"all" | "mine">("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [taskDetailErr, setTaskDetailErr] = useState<string | null>(null);
  const [loadingTaskDetail, setLoadingTaskDetail] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | "">("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBootstrap = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [ps, us] = await Promise.all([getProjects(), listUsers()]);
      setProjects(ps);
      setUsers(us);
      if (ps.length && projectId == null) setProjectId(ps[0].id);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load projects/users");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (pid: number) => {
    setLoading(true);
    setErr(null);
    try {
      const data = await getTasks(pid, {
        status: filterStatus || undefined,
        mine: filterAssignee === "mine" ? true : undefined
      });
      setTasks(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (projectId != null) void loadTasks(projectId);
  }, [projectId, filterStatus, filterAssignee]);

  const buckets = useMemo(() => groupByStatus(tasks), [tasks]);

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="card">
        <div className="cardBody">
          <div className="tasksHeaderRow">
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Tasks</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Project-scoped board · status: TODO / IN_PROGRESS / DONE
              </div>
            </div>
            <button
              className="btn"
              onClick={() => {
                if (projectId != null) void loadTasks(projectId);
              }}
              disabled={loading || projectId == null}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div style={{ height: 12 }} />

          <div className="row">
            <div>
              <label className="label">Project</label>
              <select
                className="input"
                value={projectId ?? ""}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status filter</label>
              <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="">All</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="label">Assignee filter</label>
              <select className="input" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value as any)}>
                <option value="all">All</option>
                <option value="mine">Assigned to me</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end", gap: 10 }}>
              <span className="pill">Role: {role}</span>
              <span className="pill">{projects.length} projects</span>
            </div>
          </div>

          <div style={{ height: 12 }} />
          {err ? <Toast kind="error">{err}</Toast> : null}
        </div>
      </div>

      <div style={{ height: 14 }} />

      {canCreate ? (
        <div className="card">
          <div className="cardBody">
            <div style={{ fontWeight: 700 }}>Create task (ADMIN/PM)</div>
            <div style={{ height: 12 }} />
            <div className="row">
              <div>
                <label className="label">Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="label">Assign to</label>
                <select
                  className="input"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ height: 12 }} />
            <div>
              <label className="label">Description</label>
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div style={{ height: 12 }} />
            <button
              className="btn btnPrimary"
              disabled={creating || !title.trim() || projectId == null}
              onClick={async () => {
                if (projectId == null) return;
                setCreating(true);
                setErr(null);
                try {
                  await createTask({
                    title: title.trim(),
                    description: description.trim() ? description.trim() : undefined,
                    project_id: projectId,
                    assigned_to: assignedTo === "" ? null : assignedTo
                  });
                  setTitle("");
                  setDescription("");
                  setAssignedTo("");
                  await loadTasks(projectId);
                } catch (e: any) {
                  setErr(e?.message ?? "Create task failed");
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? "Creating..." : "Create task"}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ height: 14 }} />

      <div
        className="board"
      >
        {(["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => (
          <div className="card" key={s}>
            <div className="cardBody">
              <div className="columnTitle">
                <div style={{ fontWeight: 700 }}>{statusTitle(s)}</div>
                <span className="pill">{(buckets[s] ?? []).length}</span>
              </div>
              <div style={{ height: 12 }} />

              <div style={{ display: "grid", gap: 10 }}>
                {(buckets[s] ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="taskCard"
                    onClick={async () => {
                      setSelectedTaskId(t.id);
                      setTaskDetail(null);
                      setTaskDetailErr(null);
                      setLoadingTaskDetail(true);
                      setSelectedAssigneeId(t.assigned_to?.id ?? "");
                      setEditTitle(t.title ?? "");
                      setEditDescription(t.description ?? "");
                      try {
                        const detail = await getTaskDetail(t.id);
                        setTaskDetail(detail);
                        setSelectedAssigneeId(detail.assigned_to?.id ?? "");
                        setEditTitle(detail.title ?? "");
                        setEditDescription(detail.description ?? "");
                      } catch (e: any) {
                        setTaskDetailErr(e?.message ?? "Failed to load task details");
                      } finally {
                        setLoadingTaskDetail(false);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 650 }}>{t.title}</div>
                        <div className="taskMeta">
                          #{t.id} · proj {t.project?.id ?? "—"}
                        </div>
                      </div>
                      <span className="pill">{t.status}</span>
                    </div>

                    {t.description ? (
                      <div className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                        {t.description}
                      </div>
                    ) : null}

                    <div style={{ height: 10 }} />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div className="taskMeta">
                        Assigned: {t.assigned_to?.email ?? "—"}
                      </div>
                      <div className="taskActions">
                        {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((next) => (
                          <button
                            key={next}
                            className="btn statusBtn"
                            disabled={next === t.status || projectId == null}
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              try {
                                await changeStatus(t.id, next);
                                if (projectId != null) await loadTasks(projectId);
                              } catch (e: any) {
                                setErr(e?.message ?? "Failed to update status");
                              }
                            }}
                          >
                            {next === "IN_PROGRESS" ? "Start" : next === "DONE" ? "Done" : "Todo"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {(buckets[s] ?? []).length === 0 ? <div className="muted">No tasks.</div> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 18 }} />

      <Drawer
        open={selectedTaskId != null}
        title={`Task details #${selectedTaskId ?? ""}`}
        onClose={() => setSelectedTaskId(null)}
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {canDelete ? (
              <button
                className="btn"
                disabled={deleting || selectedTaskId == null}
                onClick={async () => {
                  if (selectedTaskId == null) return;
                  const ok = window.confirm("Delete this task?");
                  if (!ok) return;
                  setDeleting(true);
                  setTaskDetailErr(null);
                  try {
                    await deleteTask(selectedTaskId);
                    setSelectedTaskId(null);
                    if (projectId != null) await loadTasks(projectId);
                  } catch (e: any) {
                    setTaskDetailErr(e?.message ?? "Failed to delete task");
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
            <button className="btn" onClick={() => setSelectedTaskId(null)}>
              Done
            </button>
          </div>
        }
      >
        {loadingTaskDetail ? <div className="muted">Loading…</div> : null}
        {taskDetailErr ? <Toast kind="error">{taskDetailErr}</Toast> : null}
        {taskDetail ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="cardBody" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{taskDetail.title}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  id: {taskDetail.id}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Status
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{taskDetail.status}</div>
                </div>
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Project
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{taskDetail.project?.name ?? "—"}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ boxShadow: "none" }}>
              <div className="cardBody" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Description
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{taskDetail.description ?? "No description"}</div>
              </div>
            </div>

            {canCreate ? (
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Edit task (ADMIN/PM)
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <label className="label">Title</label>
                    <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div style={{ height: 10 }} />
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      className="input"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div style={{ height: 10 }} />
                  <button
                    className="btn btnPrimary"
                    disabled={saving || selectedTaskId == null || !editTitle.trim()}
                    onClick={async () => {
                      if (selectedTaskId == null) return;
                      setSaving(true);
                      setTaskDetailErr(null);
                      try {
                        const updated = await updateTask(selectedTaskId, {
                          title: editTitle.trim(),
                          description: editDescription.trim() ? editDescription.trim() : ""
                        });
                        setTaskDetail(updated);
                        if (projectId != null) await loadTasks(projectId);
                      } catch (e: any) {
                        setTaskDetailErr(e?.message ?? "Failed to update task");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Assigned to
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{taskDetail.assigned_to?.email ?? "Unassigned"}</div>
                </div>
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Created by
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{taskDetail.created_by?.email ?? "—"}</div>
                </div>
              </div>
            </div>

            {canCreate ? (
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Reassign task (ADMIN/PM)
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Select user and click Assign.
                  </div>
                  <div style={{ height: 8 }} />
                  <div className="row">
                    <div>
                      <select
                        className="input"
                        value={selectedAssigneeId}
                        onChange={(e) => setSelectedAssigneeId(e.target.value ? Number(e.target.value) : "")}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
                      <button
                        className="btn btnPrimary"
                        disabled={assigning || selectedTaskId == null || selectedAssigneeId === ""}
                        onClick={async () => {
                          if (selectedTaskId == null || selectedAssigneeId === "") return;
                          setAssigning(true);
                          setTaskDetailErr(null);
                          try {
                            const updated = await assignTask(selectedTaskId, Number(selectedAssigneeId));
                            setTaskDetail(updated);
                            if (projectId != null) await loadTasks(projectId);
                          } catch (e: any) {
                            setTaskDetailErr(e?.message ?? "Failed to assign task");
                          } finally {
                            setAssigning(false);
                          }
                        }}
                      >
                        {assigning ? "Assigning..." : "Assign"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

