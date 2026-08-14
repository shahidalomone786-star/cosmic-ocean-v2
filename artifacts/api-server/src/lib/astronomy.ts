export type AstronomyCategory =
  | "universe"
  | "galaxies"
  | "stars"
  | "exoplanets"
  | "solar-system"
  | "moons"
  | "nebulae"
  | "black-holes"
  | "star-clusters"
  | "deep-sky-objects"
  | "missions"
  | "spacecraft"
  | "supernovae"
  | "nearby-objects";

export type AstronomySource =
  | "nasa"
  | "nasa-exoplanet-archive"
  | "esa"
  | "gaia"
  | "mast"
  | "simbad"
  | "sdss"
  | "other";

export type NormalizedAstronomyObject = {
  id: string;
  name: string;
  type: string;
  category: AstronomyCategory;
  aliases: string[];
  description: string | null;
  coordinates: {
    rightAscension: number | null;
    declination: number | null;
    coordinateSystem: string | null;
    epoch: string | null;
  } | null;
  distance: {
    value: number | null;
    unit: string | null;
    uncertainty: number | null;
  } | null;
  source: AstronomySource;
  sourceId: string;
  metadata: Record<string, unknown>;
  imageReferences: string[];
  observationReferences: string[];
  relatedObjects: NormalizedAstronomyObject[];
};

export type AstronomySourceStatus = {
  source: string;
  status: "ready" | "unavailable";
  message: string | null;
};

export type AstronomyRequest = {
  query: string;
  category?: AstronomyCategory;
  page: number;
  pageSize: number;
  source?: AstronomySource;
  objectType?: string;
  minDistance?: number;
  maxDistance?: number;
  discoveryYear?: number;
  observationSource?: string;
};

export type AstronomyPage = {
  items: NormalizedAstronomyObject[];
  hasMore: boolean;
  sourceStatus: AstronomySourceStatus[];
};

export type AstronomySuggestion = {
  value: string;
  label: string;
  kind: "object" | "alias" | "catalog" | "type";
  source: AstronomySource;
  objectId: string;
};

type AstronomyProvider = {
  id: AstronomySource;
  label: string;
  search(request: AstronomyRequest): Promise<AstronomyPage>;
  getById(sourceId: string, category: AstronomyCategory): Promise<NormalizedAstronomyObject | undefined>;
  getRelated?(item: NormalizedAstronomyObject): Promise<NormalizedAstronomyObject[]>;
};

const TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 10 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, { expiresAt: number; value: AstronomyPage }>();

function timeout() {
  return AbortSignal.timeout(TIMEOUT_MS);
}

function escapeAdql(value: string): string {
  return value.replace(/'/g, "''").slice(0, 120);
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function simbadType(value: string | null): string {
  return value ?? "SIMBAD object";
}

function simbadObject(
  row: Record<string, unknown>,
  category: AstronomyCategory,
): NormalizedAstronomyObject | undefined {
  const sourceId = firstText(row.main_id);
  if (!sourceId) return undefined;
  const objectType = firstText(row.otype);
  const ra = numberOrNull(row.ra);
  const dec = numberOrNull(row.dec);
  const parallax = numberOrNull(row.plx_value);
  return {
    id: `simbad:${sourceId}`,
    name: sourceId,
    type: simbadType(objectType),
    category,
    aliases: [],
    description: objectType ? `SIMBAD object type: ${objectType}.` : null,
    coordinates: ra !== null || dec !== null
      ? { rightAscension: ra, declination: dec, coordinateSystem: "ICRS", epoch: null }
      : null,
    distance: parallax && parallax > 0
      ? { value: 1000 / parallax, unit: "pc", uncertainty: null }
      : null,
    source: "simbad",
    sourceId,
    metadata: {
      simbadObjectType: objectType,
      spectralType: firstText(row.sp_type),
      sourceUrl: `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(sourceId)}`,
    },
    imageReferences: [],
    observationReferences: [
      `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(sourceId)}`,
    ],
    relatedObjects: [],
  };
}

async function simbadQuery(adql: string): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    request: "doQuery",
    lang: "adql",
    format: "json",
    query: adql,
  });
  const response = await fetch(`https://simbad.cds.unistra.fr/simbad/sim-tap/sync?${params}`, {
    headers: { Accept: "application/json" },
    signal: timeout(),
  });
  if (!response.ok) throw new Error(`SIMBAD ${response.status}`);
  const data = await response.json() as {
    data?: unknown[];
    metadata?: { name?: string }[];
  };
  if (Array.isArray(data.data)) {
    const columns = (data.metadata ?? []).map(field => field.name ?? "");
    return data.data
      .map(row => {
        if (!Array.isArray(row)) return row as Record<string, unknown>;
        return Object.fromEntries(columns.map((column, index) => [column, row[index]]));
      })
      .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
  }
  return [];
}

const simbadProvider: AstronomyProvider = {
  id: "simbad",
  label: "SIMBAD",
  async search({ query, category, page, pageSize }) {
    const safeQuery = escapeAdql(query);
    const offset = (page - 1) * pageSize;
    const rows = await simbadQuery(
      `SELECT TOP ${offset + pageSize} main_id, otype, ra, dec, plx_value, sp_type ` +
      `FROM basic WHERE main_id LIKE '%${safeQuery}%' ORDER BY main_id ` +
      ``,
    );
    const items = rows.slice(offset, offset + pageSize)
      .map(row => simbadObject(row, category ?? "universe"))
      .filter((item): item is NormalizedAstronomyObject => Boolean(item));
    return {
      items,
      hasMore: rows.length === offset + pageSize,
      sourceStatus: [{ source: "SIMBAD", status: "ready", message: null }],
    };
  },
  async getById(sourceId, category) {
    const rows = await simbadQuery(
      `SELECT TOP 1 main_id, otype, ra, dec, plx_value, sp_type ` +
      `FROM basic WHERE main_id = '${escapeAdql(sourceId)}'`,
    );
    return rows[0] ? simbadObject(rows[0], category) : undefined;
  },
};

type ExoplanetRow = Record<string, unknown> & {
  pl_name?: string;
  hostname?: string;
};

async function exoplanetQuery(adql: string): Promise<ExoplanetRow[]> {
  const params = new URLSearchParams({ query: adql, format: "json" });
  const response = await fetch(`https://exoplanetarchive.ipac.caltech.edu/TAP/sync?${params}`, {
    headers: { Accept: "application/json" },
    signal: timeout(),
  });
  if (!response.ok) throw new Error(`NASA Exoplanet Archive ${response.status}`);
  const data = await response.json() as unknown;
  return Array.isArray(data) ? data as ExoplanetRow[] : [];
}

function exoplanetObject(row: ExoplanetRow): NormalizedAstronomyObject | undefined {
  const sourceId = firstText(row.pl_name);
  if (!sourceId) return undefined;
  const ra = numberOrNull(row.ra);
  const dec = numberOrNull(row.dec);
  const distance = numberOrNull(row.sy_dist);
  return {
    id: `nasa-exoplanet-archive:${sourceId}`,
    name: sourceId,
    type: "Confirmed exoplanet",
    category: "exoplanets",
    aliases: [firstText(row.hostname)].filter((alias): alias is string => Boolean(alias)),
    description: firstText(row.discoverymethod)
      ? `Discovery method: ${row.discoverymethod}.`
      : null,
    coordinates: ra !== null || dec !== null
      ? { rightAscension: ra, declination: dec, coordinateSystem: "ICRS", epoch: null }
      : null,
    distance: distance !== null ? { value: distance, unit: "pc", uncertainty: null } : null,
    source: "nasa-exoplanet-archive",
    sourceId,
    metadata: {
      hostStar: firstText(row.hostname),
      discoveryMethod: firstText(row.discoverymethod),
      discoveryFacility: firstText(row.disc_facility),
      discoveryYear: numberOrNull(row.disc_year),
      orbitalPeriodDays: numberOrNull(row.pl_orbper),
      radiusEarth: numberOrNull(row.pl_rade),
      massEarth: numberOrNull(row.pl_bmasse),
      equilibriumTemperatureK: numberOrNull(row.pl_eqt),
      archiveUpdated: firstText(row.rowupdate),
      sourceUrl: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(sourceId)}`,
    },
    imageReferences: [],
    observationReferences: [
      `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(sourceId)}`,
    ],
    relatedObjects: [],
  };
}

const exoplanetProvider: AstronomyProvider = {
  id: "nasa-exoplanet-archive",
  label: "NASA Exoplanet Archive",
  async search({ query, page, pageSize }) {
    const safeQuery = escapeAdql(query);
    const offset = (page - 1) * pageSize;
    const rows = await exoplanetQuery(
      `SELECT TOP ${offset + pageSize} pl_name, hostname, ra, dec, sy_dist, discoverymethod, disc_facility, ` +
      `pl_orbper, pl_rade, pl_bmasse, pl_eqt, disc_year FROM pscomppars ` +
      `WHERE REPLACE(LOWER(pl_name), ' ', '') LIKE REPLACE(LOWER('%${safeQuery}%'), ' ', '') ` +
      `OR REPLACE(LOWER(hostname), ' ', '') LIKE REPLACE(LOWER('%${safeQuery}%'), ' ', '') ` +
      `ORDER BY pl_name`,
    );
    const items = rows.slice(offset, offset + pageSize)
      .map(exoplanetObject)
      .filter((item): item is NormalizedAstronomyObject => Boolean(item));
    return {
      items,
      hasMore: rows.length === offset + pageSize,
      sourceStatus: [{ source: "NASA Exoplanet Archive", status: "ready", message: null }],
    };
  },
  async getById(sourceId) {
    const rows = await exoplanetQuery(
      `SELECT TOP 1 pl_name, hostname, ra, dec, sy_dist, discoverymethod, disc_facility, ` +
      `pl_orbper, pl_rade, pl_bmasse, pl_eqt, disc_year FROM pscomppars ` +
      `WHERE pl_name = '${escapeAdql(sourceId)}'`,
    );
    return rows[0] ? exoplanetObject(rows[0]) : undefined;
  },
  async getRelated(item) {
    const hostStar = typeof item.metadata.hostStar === "string" ? item.metadata.hostStar : "";
    if (!hostStar) return [];
    const rows = await exoplanetQuery(
      `SELECT TOP 7 pl_name, hostname, ra, dec, sy_dist, discoverymethod, disc_facility, ` +
      `pl_orbper, pl_rade, pl_bmasse, pl_eqt, disc_year FROM pscomppars ` +
      `WHERE hostname = '${escapeAdql(hostStar)}' ORDER BY pl_name`,
    );
    return rows
      .map(exoplanetObject)
      .filter((related): related is NormalizedAstronomyObject => Boolean(related))
      .filter(related => related.id !== item.id)
      .slice(0, 6);
  },
};

type NasaMediaItem = {
  data?: {
    nasa_id?: string;
    title?: string;
    description?: string;
    media_type?: string;
    date_created?: string;
    center?: string;
    photographer?: string;
  }[];
  links?: { href?: string; rel?: string; render?: string }[];
};

const nasaMediaProvider: AstronomyProvider = {
  id: "nasa",
  label: "NASA Image and Video Library",
  async search({ query, category, page, pageSize }) {
    const params = new URLSearchParams({
      q: query,
      media_type: "image,video",
      page: String(page),
      page_size: String(pageSize),
    });
    const response = await fetch(`https://images-api.nasa.gov/search?${params}`, {
      headers: { Accept: "application/json" },
      signal: timeout(),
    });
    if (!response.ok) throw new Error(`NASA Images ${response.status}`);
    const data = await response.json() as { collection?: { items?: NasaMediaItem[]; links?: { href?: string; rel?: string }[] } };
    const items = (data.collection?.items ?? []).map((item): NormalizedAstronomyObject | undefined => {
      const record = item.data?.[0] ?? {};
      const sourceId = firstText(record.nasa_id);
      if (!sourceId) return undefined;
      const preview = item.links?.find(link => link.rel === "preview")?.href;
      return {
        id: `nasa:${sourceId}`,
        name: firstText(record.title) ?? sourceId,
        type: record.media_type === "video" ? "NASA video record" : "NASA image record",
        category: category ?? "missions",
        aliases: [],
        description: firstText(record.description),
        coordinates: null,
        distance: null,
        source: "nasa" as const,
        sourceId,
        metadata: {
          mediaType: firstText(record.media_type),
          dateCreated: firstText(record.date_created),
          center: firstText(record.center),
          photographer: firstText(record.photographer),
        },
        imageReferences: preview ? [preview] : [],
        observationReferences: [`https://images.nasa.gov/details/${encodeURIComponent(sourceId)}`],
        relatedObjects: [],
      } satisfies NormalizedAstronomyObject;
    }).filter((item): item is NormalizedAstronomyObject => Boolean(item));
    return {
      items,
      hasMore: items.length === pageSize,
      sourceStatus: [{ source: "NASA Image and Video Library", status: "ready", message: null }],
    };
  },
  async getById(sourceId, category) {
    const response = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(sourceId)}&media_type=image,video&page_size=25`, {
      headers: { Accept: "application/json" },
      signal: timeout(),
    });
    if (!response.ok) throw new Error(`NASA Images ${response.status}`);
    const data = await response.json() as { collection?: { items?: NasaMediaItem[] } };
    const item = (data.collection?.items ?? []).find(entry => entry.data?.[0]?.nasa_id === sourceId);
    if (!item) return undefined;
    const result = await nasaMediaProvider.search({ query: sourceId, category, page: 1, pageSize: 1 });
    return result.items[0];
  },
};

const providers: AstronomyProvider[] = [simbadProvider, exoplanetProvider, nasaMediaProvider];

function selectedProviders(category?: AstronomyCategory): AstronomyProvider[] {
  if (category === "exoplanets") return [exoplanetProvider];
  if (category === "missions" || category === "spacecraft") return [nasaMediaProvider];
  if (!category || category === "universe") return [simbadProvider, exoplanetProvider, nasaMediaProvider];
  return [simbadProvider];
}

function cacheKey(request: AstronomyRequest): string {
  return [
    request.query.toLowerCase(),
    request.category ?? "universe",
    request.page,
    request.pageSize,
    request.source ?? "",
    request.objectType?.toLowerCase() ?? "",
    request.minDistance ?? "",
    request.maxDistance ?? "",
    request.discoveryYear ?? "",
    request.observationSource?.toLowerCase() ?? "",
  ].join(":");
}

function getCached(key: string): AstronomyPage | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: AstronomyPage): void {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function searchAstronomy(request: AstronomyRequest): Promise<AstronomyPage> {
  const key = cacheKey(request);
  const cached = getCached(key);
  if (cached) return cached;
  const results = await Promise.allSettled(selectedProviders(request.category).map(provider => provider.search(request)));
  const items: NormalizedAstronomyObject[] = [];
  const sourceStatus: AstronomySourceStatus[] = [];
  for (const [index, result] of results.entries()) {
    const provider = selectedProviders(request.category)[index];
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      sourceStatus.push(...result.value.sourceStatus);
    } else {
      sourceStatus.push({ source: provider.label, status: "unavailable", message: "Scientific data temporarily unavailable." });
    }
  }
  const filtered = items.filter(item => {
    if (request.source && item.source !== request.source) return false;
    if (request.objectType && item.type.toLowerCase() !== request.objectType.toLowerCase()) return false;
    if (request.minDistance !== undefined) {
      if (item.distance?.value == null || item.distance.value < request.minDistance) return false;
    }
    if (request.maxDistance !== undefined) {
      if (item.distance?.value == null || item.distance.value > request.maxDistance) return false;
    }
    if (request.discoveryYear !== undefined) {
      const discoveryYear = numberOrNull(item.metadata.discoveryYear);
      if (discoveryYear !== request.discoveryYear) return false;
    }
    if (request.observationSource) {
      const observationSource = [
        item.source,
        item.metadata.discoveryFacility,
        item.metadata.center,
        item.metadata.observationSource,
      ].find(value => typeof value === "string" && value.trim().toLowerCase() === request.observationSource?.toLowerCase());
      if (!observationSource) return false;
    }
    return true;
  });
  const deduped = [...new Map(filtered.map(item => [item.id, item])).values()].slice(0, request.pageSize);
  const value = {
    items: deduped,
    hasMore: results.some(result => result.status === "fulfilled" && result.value.hasMore),
    sourceStatus,
  };
  setCached(key, value);
  return value;
}

export async function suggestAstronomy(
  request: Omit<AstronomyRequest, "page" | "pageSize">,
): Promise<AstronomySuggestion[]> {
  const result = await searchAstronomy({ ...request, page: 1, pageSize: 8 });
  const suggestions: AstronomySuggestion[] = [];
  const seen = new Set<string>();
  const add = (suggestion: AstronomySuggestion) => {
    const key = `${suggestion.kind}:${suggestion.value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };
  for (const item of result.items) {
    add({ value: item.name, label: item.name, kind: "object", source: item.source, objectId: item.id });
    if (item.sourceId !== item.name) {
      add({ value: item.sourceId, label: `${item.sourceId} · catalog ID`, kind: "catalog", source: item.source, objectId: item.id });
    }
    for (const alias of item.aliases) {
      add({ value: alias, label: `${alias} · alias`, kind: "alias", source: item.source, objectId: item.id });
    }
    if (item.type) {
      add({ value: item.type, label: `${item.type} · object type`, kind: "type", source: item.source, objectId: item.id });
    }
  }
  return suggestions.slice(0, 8);
}

export async function getAstronomyObject(id: string, category: AstronomyCategory): Promise<NormalizedAstronomyObject | undefined> {
  const separator = id.indexOf(":");
  if (separator < 0) return undefined;
  const source = id.slice(0, separator);
  const sourceId = id.slice(separator + 1);
  const provider = providers.find(candidate => candidate.id === source);
  const item = await provider?.getById(sourceId, category);
  if (!item) return undefined;
  if (provider?.getRelated) item.relatedObjects = await provider.getRelated(item);
  return item;
}

export function isAstronomyCategory(value: string | undefined): value is AstronomyCategory {
  return Boolean(value && [
    "universe", "galaxies", "stars", "exoplanets", "solar-system", "moons", "nebulae",
    "black-holes", "star-clusters", "deep-sky-objects", "missions", "spacecraft",
    "supernovae", "nearby-objects",
  ].includes(value));
}