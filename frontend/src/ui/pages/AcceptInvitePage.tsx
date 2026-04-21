import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvite } from "../../api/users";
import { computeApiBase } from "../../config/apiBase";
import { Toast } from "../components/Toast";
import "./auth.css";

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { tenant } = computeApiBase();
  const tenantLocked = useMemo(() => Boolean(tenant), [tenant]);

  const [tenantInput, setTenantInput] = useState(tenant ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <div className="authShell">
      <div className="card authCard">
        <div className="authHeader">
          <div className="authTitle">Accept invite</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Set your password to activate the invited account.
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
              // Backend uses tenant from hostname middleware; tenantInput is here to help user switch subdomain.
              // If they typed a tenant and are currently on localhost (no subdomain), they should open:
              //   http://{tenant}.localhost:5173/accept-invite
              if (tenantLocked === false && tenantInput.trim()) {
                window.location.href = `${window.location.protocol}//${tenantInput.trim().toLowerCase()}.${window.location.hostname}:${window.location.port}/accept-invite?email=${encodeURIComponent(email)}`;
                return;
              }

              const res = await acceptInvite(email, password);
              setOk(res.message ?? "Account activated. You can now login.");
              setTimeout(() => navigate("/login"), 600);
            } catch (err: any) {
              setError(err?.message ?? "Activation failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          {error ? <Toast kind="error">{error}</Toast> : null}
          {ok ? <Toast kind="ok">{ok}</Toast> : null}

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
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              If you’re already on `company1.localhost`, tenant is auto-detected.
            </div>
          </div>

          <div className="row">
            <div>
              <label className="label">Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Set password</label>
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
              {loading ? "Activating..." : "Activate account"}
            </button>
            <div className="muted">
              Back to <Link to="/login">Login</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

