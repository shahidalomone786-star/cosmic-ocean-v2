// Keep the aggregate gallery responsive when an optional archive is slow.
// Promise.allSettled still preserves successful providers as partial results.
const DEFAULT_TIMEOUT_MS = 4500;

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Cosmic-Ocean-Universal-Gallery/1.0",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Provider returned HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

export function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

export function list(...values: unknown[]): string[] {
  return values.flatMap((value) => {
    const items = Array.isArray(value) ? value : [value];
    return items.flatMap((item) => {
      const text = asText(item);
      return text ? [text] : [];
    });
  });
}

export function pageOffset(context: { page: number; limit: number }): number {
  return (context.page - 1) * context.limit;
}

export function usableLicense(
  license: unknown,
  licenseUrl: unknown,
): { license: string; licenseUrl: string | null } | null {
  const label = firstText(license);
  if (!label) return null;
  return { license: label, licenseUrl: firstText(licenseUrl) };
}

export function categoryFromQuery(query: string, fallback: string): string {
  const term = query.toLowerCase();
  if (/(galaxy|space|star|planet|nebula|astronomy|cosmos)/.test(term)) return "space";
  if (/(ocean|sea|coral|whale|marine)/.test(term)) return "ocean";
  if (/(bird|elephant|tiger|wildlife|animal)/.test(term)) return "wildlife";
  if (/(plant|flower|tree|botany)/.test(term)) return "plants";
  if (/(painting|sculpture|art|portrait|museum)/.test(term)) return "art";
  if (/(medicine|medical|cell|protein|biology|disease)/.test(term)) return "science";
  if (/(earth|climate|landscape|geography|satellite)/.test(term)) return "earth";
  if (/(history|culture|architecture)/.test(term)) return "culture";
  return fallback;
}