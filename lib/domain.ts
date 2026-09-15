export function isDomainAllowed(allowedDomains: string | null, origin: string | null): boolean {
  if (!allowedDomains) return true; // no restriction configured
  if (!origin) return false;

  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  const allowed = allowedDomains
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(host);
}
