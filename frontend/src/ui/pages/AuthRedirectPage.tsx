import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Toast } from "../components/Toast";
import { authStorage } from "../../state/auth/authStorage";

export function AuthRedirectPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing token in redirect URL.");
      return;
    }

    try {
      authStorage.setToken(token);
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Failed to store token.");
    }
  }, [navigate, params]);

  return (
    <div className="authShell">
      <div className="card authCard">
        <div className="authHeader">
          <div className="authTitle">Signing you in…</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Finalizing tenant login.
          </div>
        </div>
        <div className="authForm">
          {error ? <Toast kind="error">{error}</Toast> : <Toast kind="info">Redirecting…</Toast>}
        </div>
      </div>
    </div>
  );
}

