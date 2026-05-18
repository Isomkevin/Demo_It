const ORG_COOKIE = "demo_org_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 25);
  }
  return `org_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrgIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ORG_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function getOrCreateOrgId(): string {
  const existing = getOrgIdFromCookie();
  if (existing) return existing;

  const id = `org_${randomId()}`;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${ORG_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  return id;
}
