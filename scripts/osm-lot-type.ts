// These legacy types describe OSM context, never verified parking rules.
export function mapOsmToZoneType(tags: Record<string, unknown>): string | null {
  if (["private", "customers", "no", "employees", "residents", "permissive"].includes(String(tags.access))) {
    return null;
  }
  if (tags.fee === "yes") return "PAID";
  if (tags.fee === "no") return tags.maxstay ? "FREE_LIMITED" : "FREE_UNLIMITED";
  return "MIXED";
}
