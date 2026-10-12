import { isIP } from "net";

// Validates syntax, not identity: only a trusted proxy can authenticate headers.
// Keep the report route's precedence and first forwarded address semantics.
export function getClientIp(headers: Pick<Headers, "get">): string | null {
  const candidates = [
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const candidate of candidates) {
    const ip = candidate?.trim();
    if (ip && isIP(ip)) return ip;
  }
  return null;
}
