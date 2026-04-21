import React, { useEffect, useMemo, useState } from "react";
import { createProject, getProjectDetail, getProjects, Project } from "../../api/projects";
import { useAuth } from "../../state/auth/AuthContext";
import { Toast } from "../components/Toast";
import { Drawer } from "../components/Drawer";

export function ProjectsPage() {
  const auth = useAuth();
  const role = (auth.claims?.role ?? "UNKNOWN").toString().toUpperCase();
  const canCreate = role === "ADMIN" || role === "PM";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [projectDetailErr, setProjectDetailErr] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const items = await getProjects();
      setProjects(items);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const note = useMemo(
    () =>
      canCreate
        ? "You can create projects (ADMIN/PM)."
        : "You can view projects, but cannot create (only ADMIN/PM).",
    [canCreate]
  );

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="card">
        <div className="cardBody">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Projects</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {note}
              </div>
            </div>
            <button className="btn" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {canCreate ? (
        <div className="card">
          <div className="cardBody">
            <div style={{ fontWeight: 700 }}>Create project</div>

            <div style={{ height: 12 }} />
            {err ? <Toast kind="error">{err}</Toast> : null}
            {createdMsg ? <Toast kind="ok">{createdMsg}</Toast> : null}

            <div style={{ height: 12 }} />
            <div className="row">
              <div>
                <label className="label">Project name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <button
                  className="btn btnPrimary"
                  disabled={creating || !name.trim()}
                  onClick={async () => {
                    setCreating(true);
                    setErr(null);
                    setCreatedMsg(null);
                    try {
                      const res = await createProject(name.trim());
                      setCreatedMsg(res.message ?? "Created");
                      setName("");
                      await load();
                    } catch (e: any) {
                      setErr(e?.message ?? "Create failed");
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="cardBody">
          <div style={{ fontWeight: 700 }}>Project list</div>
          <div style={{ height: 10 }} />
          <div style={{ display: "grid", gap: 8 }}>
            {projects.map((p) => (
              <button
                key={p.id}
                className="userRow"
                onClick={async () => {
                  setSelectedProjectId(p.id);
                  setProjectDetail(null);
                  setProjectDetailErr(null);
                  setLoadingDetail(true);
                  try {
                    const detail = await getProjectDetail(p.id);
                    setProjectDetail(detail);
                  } catch (e: any) {
                    setProjectDetailErr(e?.message ?? "Failed to load project details");
                  } finally {
                    setLoadingDetail(false);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 650 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    id: {p.id} · created_by: {p.created_by}
                  </div>
                </div>
                <span className="pill">{new Date(p.created_at).toLocaleString()}</span>
              </button>
            ))}
            {projects.length === 0 && !loading ? <div className="muted">No projects yet.</div> : null}
          </div>
        </div>
      </div>

      <Drawer
        open={selectedProjectId != null}
        title={`Project details #${selectedProjectId ?? ""}`}
        onClose={() => setSelectedProjectId(null)}
        footer={
          <button className="btn" onClick={() => setSelectedProjectId(null)}>
            Done
          </button>
        }
      >
        {loadingDetail ? <div className="muted">Loading…</div> : null}
        {projectDetailErr ? <Toast kind="error">{projectDetailErr}</Toast> : null}
        {projectDetail ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="cardBody" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{projectDetail.name}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  id: {projectDetail.id}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Created by
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{projectDetail.created_by}</div>
                </div>
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Created at
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{new Date(projectDetail.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

