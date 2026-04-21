import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { computeApiBase } from "../../config/apiBase";
import { buildTenantFrontendUrl, isOnTenantSubdomain } from "../../config/tenantUrl";
import { useAuth } from "../../state/auth/AuthContext";
import { Toast } from "../components/Toast";
import "./auth.css";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const auth = useAuth();

  const { tenant } = computeApiBase();
  const tenantLocked = useMemo(() => Boolean(tenant), [tenant]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantInput, setTenantInput] = useState(tenant ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="authShell">
      <div className="card authCard">
        <div className="authHeader">
          <div className="authTitle">Login</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Tenant is derived from your subdomain, and used to target the correct schema.
          </div>
        </div>

        <form
          className="authForm"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const normalizedTenant = tenantInput.trim().toLowerCase();
              const res = await login({ email, password, tenant: normalizedTenant });
              auth.loginWithToken(res.access_token);
              const targetPath = location?.state?.from ?? "/dashboard";

              // If user logged in on non-tenant host (e.g. localhost), redirect to tenant subdomain.
              // Since localStorage is per-origin, pass token via query to `/auth-redirect`.
              if (!isOnTenantSubdomain()) {
                const t = normalizedTenant;
                window.location.href = buildTenantFrontendUrl(t, `/auth-redirect?token=${encodeURIComponent(res.access_token)}`);
                return;
              }

              navigate(targetPath);
            } catch (err: any) {
              setError(err?.message ?? "Login failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          {error ? <Toast kind="error">{error}</Toast> : null}

          <div>
            <label className="label">Tenant</label>
            <input
              className="input"
              value={tenantInput}
              onChange={(e) => setTenantInput(e.target.value)}
              placeholder="company1"
              disabled={tenantLocked}
              required
            />
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
              {loading ? "Signing in..." : "Login"}
            </button>
            <div className="muted">
              New tenant? <Link to="/signup">Signup</Link> · Invited? <Link to="/accept-invite">Accept invite</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

