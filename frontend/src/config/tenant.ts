export function getTenantFromHostname(hostname: string): string | null {
  // Example: company1.localhost -> company1
  // Example: company1.example.com -> company1
  // Example: localhost -> null
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 1) return null;
  return parts[0] ?? null;
}

