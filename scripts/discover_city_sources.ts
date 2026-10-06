// Read-only discovery of candidate authoritative parking sources for a city.
// Searches ArcGIS Online and the Socrata catalog, then probes each parking-like
// layer for record count, last edit date, and field names.
// Usage:
//   npx tsx scripts/discover_city_sources.ts "<city name>" ["<extra search term>"]
//   npx tsx scripts/discover_city_sources.ts --server <ArcGIS REST services URL>
// --server crawls every folder and service on a city GIS server, which finds
// services that catalog search misses (unlisted layers).
// Output is a lead list for the cover-city skill, not evidence by itself.

const PARKING = /park|curb|kerb|meter|permit|sign|restrict|tow|loading|no.?stop/i;
const NOT_PARKING =
  /parks?(?!ing)\b|parks?_|dog ?park|trail|recreation|playground|garden|bike|curb ?ramp|water meter|development permit|building permit|traffic signal|cemetery/i;
const TIMEOUT_MS = 20000;

type Candidate = { title: string; owner: string; modified: string; url: string };
type ArcgisItem = { title: string; owner: string; modified: number; url?: string; snippet?: string };
type ArcgisLayerRef = { id: number; name: string };
type ArcgisMeta = {
  name?: string;
  geometryType?: string;
  editingInfo?: { lastEditDate?: number };
  fields?: { name: string }[];
  layers?: ArcgisLayerRef[];
  folders?: string[];
  services?: { name: string; type: string }[];
};
type SocrataResult = {
  resource: { name: string; description?: string; data_updated_at?: string; updatedAt?: string };
  metadata: { domain: string };
  permalink: string;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const isParking = (s: string) => PARKING.test(s) && !NOT_PARKING.test(s);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function searchArcgis(place: string): Promise<Candidate[]> {
  const q =
    `(parking OR "parking regulations" OR "parking signs" OR "permit parking" OR "no parking" OR curb OR meters) ` +
    `AND "${place}" AND (type:"Feature Service" OR type:"Map Service")`;
  const url = `https://www.arcgis.com/sharing/rest/search?num=50&f=json&q=${encodeURIComponent(q)}`;
  const json = await getJson<{ results?: ArcgisItem[] }>(url);
  return (json.results ?? [])
    .filter((r) => r.url && isParking(`${r.title} ${r.snippet ?? ""}`))
    .map((r) => ({ title: r.title, owner: r.owner, modified: day(r.modified), url: r.url! }));
}

async function probeLayer(url: string): Promise<string> {
  const meta = await getJson<ArcgisMeta>(`${url}?f=json`);
  let count = "?";
  try {
    const res = await getJson<{ count?: number }>(`${url}/query?where=1%3D1&returnCountOnly=true&f=json`);
    count = String(res.count ?? "?");
  } catch {
    // Some MapServer layers reject count queries; leave as unknown.
  }
  const edited = meta.editingInfo?.lastEditDate ? day(meta.editingInfo.lastEditDate) : "?";
  const fields = (meta.fields ?? []).map((f) => f.name).join(", ");
  return `    - layer ${meta.name} | ${meta.geometryType ?? "table"} | n=${count} | edited ${edited}\n      fields: ${fields.slice(0, 400)}`;
}

async function probeLayers(serviceUrl: string, layers: string[]): Promise<string[]> {
  const lines: string[] = [];
  for (const layer of layers.slice(0, 8)) {
    try {
      lines.push(await probeLayer(layer));
    } catch (e) {
      lines.push(`    - ${layer.replace(serviceUrl, "")}: probe failed (${message(e)})`);
    }
  }
  return lines;
}

async function probeService(c: Candidate): Promise<string> {
  const lines = [`- ${c.title} | owner ${c.owner} | item modified ${c.modified}\n  ${c.url}`];
  try {
    const meta = await getJson<ArcgisMeta>(`${c.url}?f=json`);
    const layers = meta.layers
      ? meta.layers.filter((l) => isParking(l.name)).map((l) => `${c.url}/${l.id}`)
      : [c.url];
    lines.push(...(await probeLayers(c.url, layers)));
  } catch (e) {
    lines.push(`    probe failed (${message(e)})`);
  }
  return lines.join("\n");
}

async function searchSocrata(place: string): Promise<string[]> {
  const url = `https://api.us.socrata.com/api/catalog/v1?only=dataset&limit=30&q=${encodeURIComponent(`parking ${place}`)}`;
  const json = await getJson<{ results?: SocrataResult[] }>(url);
  return (json.results ?? [])
    .filter((r) => isParking(`${r.resource.name} ${r.resource.description ?? ""}`))
    .map(
      (r) =>
        `- ${r.resource.name} | ${r.metadata.domain} | updated ${String(r.resource.data_updated_at ?? r.resource.updatedAt).slice(0, 10)}\n  ${r.permalink}`
    );
}

async function crawlServer(root: string) {
  const base = root.replace(/\/+$/, "");
  const queue = [""];
  const services: string[] = [];
  while (queue.length && services.length < 2000) {
    const folder = queue.shift()!;
    try {
      const json = await getJson<ArcgisMeta>(`${base}${folder ? `/${folder}` : ""}?f=json`);
      for (const f of json.folders ?? []) queue.push(folder ? `${folder}/${f}` : f);
      for (const s of json.services ?? []) {
        // Service names already include their folder prefix.
        if (s.type === "FeatureServer" || s.type === "MapServer") services.push(`${base}/${s.name}/${s.type}`);
      }
    } catch (e) {
      console.log(`- ${folder || "(root)"}: listing failed (${message(e)})`);
    }
  }
  console.log(`\n## Server crawl: ${base} (${services.length} services)`);
  for (const svc of services) {
    try {
      const meta = await getJson<ArcgisMeta>(`${svc}?f=json`);
      const layers = (meta.layers ?? []).filter((l) => isParking(l.name));
      const serviceName = svc.split("/").slice(-2, -1)[0] ?? "";
      if (!layers.length && !isParking(serviceName)) continue;
      const targets = layers.length ? layers : (meta.layers ?? []).slice(0, 3);
      console.log(`- ${svc}`);
      console.log((await probeLayers(svc, targets.map((l) => `${svc}/${l.id}`))).join("\n"));
    } catch {
      // Unreachable or secured service; skip.
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--server" && args[1]) {
    await crawlServer(args[1]);
    return;
  }
  const [place, extra] = args;
  if (!place) {
    console.error(
      'Usage: npx tsx scripts/discover_city_sources.ts "<city name>" ["<extra term>"]\n' +
        "       npx tsx scripts/discover_city_sources.ts --server <ArcGIS REST services URL>"
    );
    process.exit(1);
  }

  for (const term of extra ? [place, extra] : [place]) {
    console.log(`\n## ArcGIS Online: "${term}"`);
    try {
      const candidates = await searchArcgis(term);
      if (candidates.length === 0) console.log("(none found)");
      for (const c of candidates) console.log(await probeService(c));
    } catch (e) {
      console.log(`search failed (${message(e)})`);
    }

    console.log(`\n## Socrata catalog: "${term}"`);
    try {
      const rows = await searchSocrata(term);
      console.log(rows.length ? rows.join("\n") : "(none found)");
    } catch (e) {
      console.log(`search failed (${message(e)})`);
    }
  }

  console.log(
    "\nNot searched automatically: the city's own open data portal (Opendatasoft/CKAN/custom), " +
      "the city's GIS server directory (rerun with --server), bylaws, transit agencies, and national datasets."
  );
}

void main();
