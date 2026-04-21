import { getTenantFromHostname } from "./tenant";

type ApiBaseConfig = {
  baseURL: string;
  tenant: string | null;
};

function normalizePort(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  if (!/^\d+$/.test(v)) return null;
  return v;
}

export function computeApiBase(): ApiBaseConfig {
  // Never hardcode tenant URLs. We derive tenant from current hostname.
  // Backend port can be configured via VITE_API_PORT; defaults to 8000.
  const hostname = window.location.hostname;
  const tenant = getTenantFromHostname(hostname);

  const explicit = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (explicit && explicit.trim()) {
    return { baseURL: explicit.trim().replace(/\/+$/, ""), tenant };
  }

  const apiPort = normalizePort((import.meta as any).env?.VITE_API_PORT) ?? "8000";
  const protocol = window.location.protocol || "http:";

  // Use the same hostname (which includes tenant subdomain if present),
  // but target the backend port.
  return { baseURL: `${protocol}//${hostname}:${apiPort}`, tenant };
}

