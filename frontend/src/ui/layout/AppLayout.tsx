import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { computeApiBase } from "../../config/apiBase";
import { useAuth } from "../../state/auth/AuthContext";
import "./layout.css";

export function AppLayout() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { tenant } = computeApiBase();
  const role = auth.claims?.role ?? "UNKNOWN";

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <span className="brandMarkMain">J</span>
            <span className="brandMarkDot" />
          </div>
          <div>
            <div className="brandName">Multi-Tenant Jira</div>
            <div className="brandMeta">
              <span className="pill">Tenant: {tenant ?? "—"}</span>{" "}
              <span className="pill">Role: {String(role)}</span>
            </div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Projects
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Tasks
          </NavLink>
        </nav>

        <div className="sidebarFooter">
          <button
            className="btn btnDanger"
            onClick={() => {
              auth.logout();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbarTitle">Workspace</div>
          <div className="topbarRight" />
        </div>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

