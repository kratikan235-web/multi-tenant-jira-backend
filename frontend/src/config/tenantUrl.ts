import { getTenantFromHostname } from "./tenant";

function rootHost(hostname: string): string {
  const parts = hostname.split(".").filter(Boolean);
  // tenant.localhost -> localhost
  // tenant.example.com -> example.com
  if (parts.length <= 1) return hostname;
  return parts.slice(1).join(".");
}

export function buildTenantFrontendUrl(tenant: string, path: string) {
  const protocol = window.location.protocol || "http:";
  const port = window.location.port;
  const host = window.location.hostname;
  const root = rootHost(host);

  const normalizedTenant = tenant.trim().toLowerCase();
  const base = `${protocol}//${normalizedTenant}.${root}${port ? `:${port}` : ""}`;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function isOnTenantSubdomain(): boolean {
  return Boolean(getTenantFromHostname(window.location.hostname));
}

