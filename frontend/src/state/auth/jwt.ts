export type JwtClaims = {
  user_id?: number;
  tenant?: string;
  role?: "ADMIN" | "PM" | "USER" | string;
  exp?: number;
  [k: string]: unknown;
};

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
  return atob(base64 + pad);
}

export function parseJwt(token: string): JwtClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = base64UrlDecode(payload);
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

