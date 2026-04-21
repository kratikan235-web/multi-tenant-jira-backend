import React, { useEffect, useMemo, useState } from "react";
import { listUsers } from "../../api/auth";
import { inviteUser } from "../../api/users";
import { getUserDetail, UserDetail } from "../../api/userDetails";
import { computeApiBase } from "../../config/apiBase";
import { useAuth } from "../../state/auth/AuthContext";
import { Toast } from "../components/Toast";
import { Drawer } from "../components/Drawer";

export function DashboardPage() {
  const { tenant } = computeApiBase();
  const auth = useAuth();

  const role = (auth.claims?.role ?? "UNKNOWN").toString().toUpperCase();
  const canInvite = role === "ADMIN" || role === "PM";

  const [users, setUsers] = useState<{ id: number; email: string; role: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("USER");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailErr, setUserDetailErr] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const tenantHint = useMemo(() => `Tenant: ${tenant ?? "—"}`, [tenant]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      setErrorUsers(null);
      try {
        const data = await listUsers();
        if (mounted) setUsers(data);
      } catch (e: any) {
        if (mounted) setErrorUsers(e?.message ?? "Failed to load users");
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="card">
        <div className="cardBody">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Dashboard</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {tenantHint}
              </div>
            </div>
            <div className="pill">Role: {role}</div>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {canInvite ? (
        <div className="card">
          <div className="cardBody">
            <div style={{ fontWeight: 700 }}>Invite user (ADMIN/PM)</div>

            <div style={{ height: 12 }} />

            {inviteErr ? <Toast kind="error">{inviteErr}</Toast> : null}
            {inviteMsg ? <Toast kind="ok">{inviteMsg}</Toast> : null}

            <div style={{ height: 12 }} />

            <div className="row">
              <div>
                <label className="label">Email</label>
                <input className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="USER">USER</option>
                  <option value="PM">PM</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            <div style={{ height: 12 }} />

            <button
              className="btn btnPrimary"
              onClick={async () => {
                setInviteErr(null);
                setInviteMsg(null);
                try {
                  const res = await inviteUser(inviteEmail, inviteRole);
                  setInviteMsg(res.message);
                  setInviteEmail("");
                } catch (e: any) {
                  setInviteErr(e?.message ?? "Invite failed");
                }
              }}
            >
              Send invite
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="cardBody">
            <div style={{ fontWeight: 700 }}>Invites</div>
            <div className="muted" style={{ marginTop: 6 }}>
              You don’t have permission to invite users. Only <b>ADMIN</b> or <b>PM</b> can invite.
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="cardBody">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700 }}>Users</div>
            <div className="muted">{loadingUsers ? "Loading..." : `${users.length} users`}</div>
          </div>
          <div style={{ height: 10 }} />
          {errorUsers ? <Toast kind="error">{errorUsers}</Toast> : null}
          <div style={{ display: "grid", gap: 8 }}>
            {users.map((u) => (
              <button
                key={u.id}
                className="userRow"
                onClick={async () => {
                  setSelectedUserId(u.id);
                  setUserDetail(null);
                  setUserDetailErr(null);
                  setLoadingDetail(true);
                  try {
                    const detail = await getUserDetail(u.id);
                    setUserDetail(detail);
                  } catch (e: any) {
                    setUserDetailErr(e?.message ?? "Failed to load user details");
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
                  <div style={{ fontWeight: 650 }}>{u.email}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    id: {u.id}
                  </div>
                </div>
                <span className="pill">{u.role}</span>
              </button>
            ))}
            {users.length === 0 && !loadingUsers ? <div className="muted">No users yet.</div> : null}
          </div>
        </div>
      </div>

      <Drawer
        open={selectedUserId != null}
        title={`User details #${selectedUserId ?? ""}`}
        onClose={() => setSelectedUserId(null)}
        footer={
          <button className="btn" onClick={() => setSelectedUserId(null)}>
            Done
          </button>
        }
      >
        {loadingDetail ? <div className="muted">Loading…</div> : null}
        {userDetailErr ? <Toast kind="error">{userDetailErr}</Toast> : null}
        {userDetail ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="cardBody" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{userDetail.email}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  id: {userDetail.id}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Role
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{userDetail.role}</div>
                </div>
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="cardBody" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Activated
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{userDetail.activated ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

