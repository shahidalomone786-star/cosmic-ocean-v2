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

type PrimaryObjectProfile = {
  key: string;
  canonicalName: string;
  aliases: readonly string[];
  simbadIdentifiers: readonly string[];
  queryKeys: readonly string[];
  simbadTypes: readonly string[];
};

/**
 * These are canonical identifiers used by the scientific archives, not UI
 * guesses. They let a well-known catalog lookup find the primary record
 * before SIMBAD's component/object-within-object rows.
 */
const PRIMARY_OBJECT_PROFILES: readonly PrimaryObjectProfile[] = [
  {
    key: "andromeda-galaxy",
    canonicalName: "Andromeda Galaxy",
    aliases: ["M31", "NGC 224", "Andromeda Galaxy"],
    simbadIdentifiers: ["M 31", "NGC 224"],
    queryKeys: ["m31", "ngc 224", "andromeda", "andromeda galaxy"],
    simbadTypes: ["G", "Galaxy"],
  },
  {
    key: "orion-nebula",
    canonicalName: "Orion Nebula",
    aliases: ["M42", "NGC 1976", "Orion Nebula"],
    simbadIdentifiers: ["M 42", "NGC 1976"],
    queryKeys: ["m42", "ngc 1976", "orion", "orion nebula"],
    simbadTypes: ["HII", "HII region", "Nebula"],
  },
  {
    key: "messier-87",
    canonicalName: "Messier 87",
    aliases: ["M87", "NGC 4486", "Messier 87"],
    simbadIdentifiers: ["M 87", "NGC 4486"],
    queryKeys: ["m87", "ngc 4486", "messier 87"],
    simbadTypes: ["G", "Galaxy", "AGN"],
  },
  {
    key: "sirius",
    canonicalName: "Sirius",
    aliases: ["Sirius", "Alpha Canis Majoris", "α CMa"],
    simbadIdentifiers: ["Sirius", "* alf CMa"],
    queryKeys: ["sirius", "alpha canis majoris"],
    simbadTypes: ["*", "Star", "PM*", "SB*"],
  },
  {
    key: "polaris",
    canonicalName: "Polaris",
    aliases: ["Polaris", "Alpha Ursae Minoris", "α UMi"],
    simbadIdentifiers: ["Polaris", "* alf UMi"],
    queryKeys: ["polaris", "alpha ursae minoris"],
    simbadTypes: ["*", "Star", "V*", "cC*"],
  },
];

function timeout() {
  return AbortSignal.timeout(TIMEOUT_MS);
}

function escapeAdql(value: string): string {
  return value.replace(/'/g, "''").slice(0, 120);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ");
}

function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function exactSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function profileMatchesValue(profile: PrimaryObjectProfile, value: string): boolean {
  const candidate = compactSearchText(value);
  return [...profile.aliases, ...profile.simbadIdentifiers]
    .some(alias => compactSearchText(alias) === candidate);
}

function profileForQuery(query: string): PrimaryObjectProfile | undefined {
  const normalized = normalizeSearchText(query);
  const compact = compactSearchText(query);
  return PRIMARY_OBJECT_PROFILES.find(profile =>
    profile.queryKeys.some(key => normalizeSearchText(key) === normalized || compactSearchText(key) === compact),
  );
}

function profileForObjectValues(values: string[]): PrimaryObjectProfile | undefined {
  return PRIMARY_OBJECT_PROFILES.find(profile => values.some(value => profileMatchesValue(profile, value)));
}

function queryTerms(query: string): string[] {
  const trimmed = query.normalize("NFKC").trim();
  const profile = profileForQuery(trimmed);
  return [...new Set([
    trimmed,
    ...(profile?.aliases ?? []),
    ...(profile?.simbadIdentifiers ?? []),
  ].filter((term): term is string => Boolean(term) && /^[\x00-\x7F]*$/.test(term)))];
}

export function normalizeAstronomyQuery(query: string): string {
  return normalizeSearchText(query);
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const SIMBAD_TYPE_LABELS: Record<string, string> = {
  G: "Galaxy",
  GCl: "Galaxy cluster",
  HII: "H II region",
  PN: "Planetary nebula",
  "*": "Star",
  PM: "High proper-motion star",
  "PM*": "High proper-motion star",
  "V*": "Variable star",
  AGN: "Active galaxy nucleus",
  QSO: "Quasar",
  SN: "Supernova",
  SNR: "Supernova remnant",
};

function simbadType(value: string | null): string {
  return value ? SIMBAD_TYPE_LABELS[value] ?? value : "SIMBAD object";
}

function simbadCategory(category: AstronomyCategory, objectType: string | null): AstronomyCategory {
  if (category !== "universe" || !objectType) return category;
  if (["G", "GCl", "AGN", "QSO"].includes(objectType)) return "galaxies";
  if (["*", "PM", "PM*", "V*"].includes(objectType)) return "stars";
  if (["HII", "PN", "SNR"].includes(objectType)) return "nebulae";
  if (objectType === "SN") return "supernovae";
  return category;
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
  const profile = profileForObjectValues([sourceId]);
  return {
    id: `simbad:${sourceId}`,
    name: sourceId,
    type: simbadType(objectType),
    category: simbadCategory(category, objectType),
    aliases: profile ? profile.aliases.filter(alias => exactSearchText(alias) !== exactSearchText(sourceId)) : [],
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
    const offset = (page - 1) * pageSize;
    const limit = Math.min(120, offset + pageSize + 48);
    const terms = queryTerms(query);
    const exactConditions = terms
      .map(term => `main_id = '${escapeAdql(term)}'`)
      .join(" OR ");
    const broadConditions = terms
      .map(term => `main_id LIKE '%${escapeAdql(term)}%'`)
      .join(" OR ");
    const exactRows = await simbadQuery(
      `SELECT TOP ${Math.min(terms.length, 24)} main_id, otype, ra, dec, plx_value, sp_type ` +
      `FROM basic WHERE ${exactConditions}`,
    );
    const broadRows = profileForQuery(query)?.key === "sirius" || profileForQuery(query)?.key === "polaris"
      ? []
      : await simbadQuery(
        `SELECT TOP ${limit} main_id, otype, ra, dec, plx_value, sp_type ` +
        `FROM basic WHERE ${broadConditions} ORDER BY main_id`,
      );
    const rows = [...new Map(
      [...exactRows, ...broadRows]
        .map(row => [firstText(row.main_id) ?? JSON.stringify(row), row] as const),
    ).values()];
    const items = rows
      .map(row => simbadObject(row, category ?? "universe"))
      .filter((item): item is NormalizedAstronomyObject => Boolean(item))
      .sort((left, right) => scoreAstronomyObject(right, query) - scoreAstronomyObject(left, query))
      .slice(offset, offset + pageSize);
    return {
      items,
      hasMore: rows.length === limit,
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

function isExoplanetRelevantQuery(query: string, category?: AstronomyCategory): boolean {
  if (category === "exoplanets") return true;
  if (!query.trim()) return false;
  return /^(?:kepler|k2|toi|wasp|hd|gj|gliese|trappist|hat|corot|epic|hip|xo|tres|55\s+cancri|proxima)\b/i.test(query.trim());
}

function selectedProviders(category?: AstronomyCategory, query = "", source?: AstronomySource): AstronomyProvider[] {
  if (source) {
    const provider = providers.find(candidate => candidate.id === source);
    if (provider) return [provider];
  }
  if (category === "exoplanets") return [exoplanetProvider];
  if (category === "missions" || category === "spacecraft") return [nasaMediaProvider];
  if (!category || category === "universe") {
    return [
      simbadProvider,
      ...(isExoplanetRelevantQuery(query, category) ? [exoplanetProvider] : []),
      nasaMediaProvider,
    ];
  }
  return [simbadProvider];
}

function cacheKey(request: AstronomyRequest): string {
  return [
    normalizeAstronomyQuery(request.query),
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

function objectProfile(item: NormalizedAstronomyObject): PrimaryObjectProfile | undefined {
  return profileForObjectValues([item.name, item.sourceId, ...item.aliases]);
}

function candidateContainsQuery(item: NormalizedAstronomyObject, query: string): boolean {
  const compactQuery = compactSearchText(query);
  if (!compactQuery) return false;
  return [item.name, item.sourceId, ...item.aliases]
    .some(value => compactSearchText(value).includes(compactQuery));
}

function isComponentLikeObject(item: NormalizedAstronomyObject, query: string): boolean {
  const name = item.name.trim();
  const compactQuery = compactSearchText(query);
  const compactName = compactSearchText(name);
  return Boolean(
    /^\[[^\]]+\]/.test(name) ||
    (compactQuery && compactName.includes(compactQuery) && compactName !== compactQuery),
  );
}

export function scoreAstronomyObject(item: NormalizedAstronomyObject, query: string): number {
  const trimmedQuery = query.normalize("NFKC").trim();
  const exactQuery = exactSearchText(trimmedQuery);
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  if (!normalizedQuery) return 0;

  const profile = profileForQuery(trimmedQuery);
  const itemProfile = objectProfile(item);
  const exactName = exactSearchText(item.name) === exactQuery;
  const exactIdentifier = exactSearchText(item.sourceId) === exactQuery;
  const exactAlias = item.aliases.some(alias => exactSearchText(alias) === exactQuery);
  const normalizedName = normalizeSearchText(item.name) === normalizedQuery;
  const normalizedIdentifier = normalizeSearchText(item.sourceId) === normalizedQuery;
  const normalizedAlias = item.aliases.some(alias => normalizeSearchText(alias) === normalizedQuery);

  let score = 0;
  if (exactName) score = 12_000;
  else if (exactIdentifier) score = 11_000;
  else if (exactAlias) score = 10_000;
  else if (normalizedName) score = 9_000;
  else if (normalizedIdentifier) score = 8_800;
  else if (normalizedAlias) score = 8_600;
  else if (candidateContainsQuery(item, trimmedQuery)) score = 1_000;
  else if (item.description?.toLocaleLowerCase().includes(normalizedQuery)) score = 400;

  if (profile && itemProfile?.key === profile.key) {
    score += profile.queryKeys.some(key => normalizeSearchText(key) === normalizedQuery) ? 1_200 : 700;
    if (profile.simbadTypes.includes(item.metadata.simbadObjectType as string) || profile.simbadTypes.includes(item.type)) {
      score += 250;
    }
  }
  if (item.source === "simbad" && profile) score += 150;
  if (isComponentLikeObject(item, trimmedQuery) && itemProfile?.key !== profile?.key) score -= 500;
  return score;
}

function mergeAstronomyObjects(items: NormalizedAstronomyObject[]): NormalizedAstronomyObject[] {
  const byIdentity = new Map<string, NormalizedAstronomyObject>();
  for (const item of items) {
    const profile = objectProfile(item);
    const identity = profile
      ? `profile:${profile.key}`
      : `${item.source}:${compactSearchText(item.sourceId)}`;
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, item);
      continue;
    }

    const primary = existing.source === "nasa" && item.source !== "nasa" ? item : existing;
    const secondary = primary === existing ? item : existing;
    const sourceRecords = [
      ...(Array.isArray(primary.metadata.sourceRecords) ? primary.metadata.sourceRecords : []),
      ...(Array.isArray(secondary.metadata.sourceRecords) ? secondary.metadata.sourceRecords : []),
      { source: secondary.source, sourceId: secondary.sourceId },
    ];
    byIdentity.set(identity, {
      ...primary,
      aliases: [...new Set([...primary.aliases, ...secondary.aliases])],
      description: primary.description ?? secondary.description,
      coordinates: primary.coordinates ?? secondary.coordinates,
      distance: primary.distance ?? secondary.distance,
      imageReferences: [...new Set([...primary.imageReferences, ...secondary.imageReferences])],
      observationReferences: [...new Set([...primary.observationReferences, ...secondary.observationReferences])],
      metadata: {
        ...secondary.metadata,
        ...primary.metadata,
        ...(sourceRecords.length > 0 ? { sourceRecords } : {}),
      },
    });
  }
  return [...byIdentity.values()];
}

export async function searchAstronomy(request: AstronomyRequest): Promise<AstronomyPage> {
  const key = cacheKey(request);
  const cached = getCached(key);
  if (cached) return cached;
  const providersForRequest = selectedProviders(request.category, request.query, request.source);
  const results = await Promise.allSettled(providersForRequest.map(provider => provider.search(request)));
  const items: NormalizedAstronomyObject[] = [];
  const sourceStatus: AstronomySourceStatus[] = [];
  for (const [index, result] of results.entries()) {
    const provider = providersForRequest[index];
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
  const deduped = mergeAstronomyObjects(filtered)
    .sort((left, right) => scoreAstronomyObject(right, request.query) - scoreAstronomyObject(left, request.query))
    .slice(0, request.pageSize);
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