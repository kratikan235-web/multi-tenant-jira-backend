import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../../api/users";
import { computeApiBase } from "../../config/apiBase";
import { buildTenantFrontendUrl } from "../../config/tenantUrl";
import { Toast } from "../components/Toast";
import "./auth.css";

export function SignupPage() {
  const navigate = useNavigate();
  const { tenant } = computeApiBase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState(tenant ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const tenantLocked = useMemo(() => Boolean(tenant), [tenant]);

  return (
    <div className="authShell">
      <div className="card authCard">
        <div className="authHeader">
          <div className="authTitle">Create your tenant</div>
          <div className="muted" style={{ marginTop: 6 }}>
            This creates a new tenant schema and the first user as <b>ADMIN</b>.
          </div>
        </div>

        <form
          className="authForm"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setOk(null);
            setLoading(true);
            try {
              const res = await signup({ email, password, tenant_name: tenantName });
              setOk(res.message || "Signup successful. Please login.");
              // After signup, redirect user to the tenant subdomain frontend URL.
              const t = tenantName.trim().toLowerCase();
              setTimeout(() => {
                window.location.href = buildTenantFrontendUrl(t, "/login");
              }, 600);
            } catch (err: any) {
              setError(err?.message ?? "Signup failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          {error ? <Toast kind="error">{error}</Toast> : null}
          {ok ? <Toast kind="ok">{ok}</Toast> : null}

          <div>
            <label className="label">Tenant name</label>
            <input
              className="input"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="company1"
              disabled={tenantLocked}
              required
            />
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Login accepts tenant name in any case (e.g. `Leadorchard` or `leadorchard`).
            </div>
          </div>

          <div className="row">
            <div>
              <label className="label">Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="authActions">
            <button className="btn btnPrimary" disabled={loading} type="submit">
              {loading ? "Creating..." : "Create tenant"}
            </button>
            <div className="muted">
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

