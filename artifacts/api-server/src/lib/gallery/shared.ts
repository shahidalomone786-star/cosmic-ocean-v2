import type { GalleryLicenseClass, GallerySearchContext } from "./types";

// Keep the aggregate gallery responsive when an optional archive is slow.
// Promise.allSettled still preserves successful providers as partial results.
const DEFAULT_TIMEOUT_MS = 7000;

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort();
  upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
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
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

export function asText(value: unknown): string | null {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(asText).filter((part): part is string => Boolean(part)).join("; ") || null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return asText(record.value ?? record.label ?? record.name ?? record.title);
  }
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

export type NormalizedLicense = {
  license: string;
  licenseUrl: string | null;
  licenseClass: GalleryLicenseClass;
};

export function classifyLicense(license: unknown, licenseUrl: unknown): GalleryLicenseClass {
  const text = `${firstText(license) ?? ""} ${firstText(licenseUrl) ?? ""}`.toLowerCase();
  if (!text.trim() || /unknown|verify|rights reserved|all rights reserved|no information|not provided/.test(text)) {
    return "UNKNOWN";
  }
  if (/cc0|creative commons zero|publicdomain\/zero|public-domain\/zero/.test(text)) {
    return "CC0";
  }
  if (/public domain|no known copyright|government work|u\.?s\.? government|noc-us|publicdomain\//.test(text)) {
    return "PUBLIC_DOMAIN";
  }
  if (/commercial use|commercial license|royalty[- ]free|unsplash license/.test(text)) {
    return "COMMERCIAL_USE";
  }
  if (/\b(?:by|by-sa|by-nd|by-nc)\b|cc[- ]?(by|by-sa|by-nd|by-nc)|creative commons|attribution|required attribution/.test(text)) {
    return "ATTRIBUTION_REQUIRED";
  }
  if (/open license|open access|free cultural work|gnu|mit license|apache license|odbl|open government/.test(text)) {
    return "OPEN_LICENSE";
  }
  return "UNKNOWN";
}

export function usableLicense(
  license: unknown,
  licenseUrl: unknown,
): NormalizedLicense {
  const label = firstText(license) ?? "Unknown / Verify source";
  const url = firstText(licenseUrl);
  return { license: label, licenseUrl: url, licenseClass: classifyLicense(label, url) };
}

export function categoryFromQuery(query: string, fallback: string): string {
  const term = query.toLowerCase();
  if (/(galaxy|space|star|planet|nebula|astronomy|cosmos)/.test(term)) return "space";
  if (/(ocean|sea|coral|whale|marine)/.test(term)) return "ocean";
  if (/(cat|dog|bird|elephant|tiger|wildlife|animal)/.test(term)) return "animals";
  if (/(plant|flower|tree|botany)/.test(term)) return "plants";
  if (/(microscope|medicine|medical|cell|disease|health)/.test(term)) return "medical";
  if (/(protein|molecule|molecular|pdb|chemistry)/.test(term)) return "science";
  if (/(painting|sculpture|van gogh|art|portrait|museum)/.test(term)) return "art";
  if (/(architecture|building|house|design)/.test(term)) return "architecture";
  if (/(map|cartograph|atlas)/.test(term)) return "maps";
  if (/(volcano|earth|climate|landscape|geology|geography|satellite)/.test(term)) return "earth";
  if (/(history|ancient|egypt|culture|heritage)/.test(term)) return "history";
  return fallback;
}

export function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function firstImageUrl(...values: unknown[]): string | null {
  for (const value of values) {
    const candidate = firstText(value);
    if (candidate && isImageUrl(candidate)) return candidate;
  }
  return null;
}

export function matchesGalleryFilters(
  item: { category: string; source: string; title: string; description: string | null; tags: string[]; licenseClass: GalleryLicenseClass; width: number | null; height: number | null },
  filters: Partial<Pick<GallerySearchContext, "category" | "media" | "license" | "quality" | "orientation">>,
): boolean {
  const haystack = [item.category, item.source, item.title, item.description ?? "", ...item.tags].join(" ").toLowerCase();
  if (filters.category && filters.category !== "all" && item.category.toLowerCase() !== filters.category.toLowerCase()) return false;

  if (filters.media && filters.media !== "all") {
    const mediaTerms: Record<string, RegExp> = {
      photos: /photo|photograph|observation|unsplash|inaturalist|gbif/i,
      illustrations: /illustrat|drawing|engraving|sketch|diagram/i,
      artwork: /art|painting|sculpture|museum|metropolitan|rijks|europeana/i,
      "scientific-imagery": /science|scientific|nasa|smithsonian|nih|medical|microscop|protein|biology/i,
      maps: /map|landsat|cartograph|geograph/i,
      "3d-molecular": /molecular|protein|pdb|structure/i,
    };
    if (!mediaTerms[filters.media]?.test(haystack)) return false;
  }

  if (filters.license && filters.license !== "all") {
    const licenseMatches: Record<string, GalleryLicenseClass[]> = {
      "public-domain": ["PUBLIC_DOMAIN", "CC0"],
      cc0: ["CC0"],
      commercial: ["COMMERCIAL_USE"],
      attribution: ["ATTRIBUTION_REQUIRED"],
      "open-license": ["OPEN_LICENSE"],
    };
    if (!licenseMatches[filters.license]?.includes(item.licenseClass)) return false;
  }

  if (filters.quality && filters.quality !== "any") {
    const minimum = filters.quality === "hd" ? 1280 : filters.quality === "2k" ? 2000 : 3840;
    if (!item.width || !item.height || Math.max(item.width, item.height) < minimum) return false;
  }

  if (filters.orientation && filters.orientation !== "all") {
    const ratio = item.width && item.height ? item.width / item.height : null;
    if (!ratio) return false;
    if (filters.orientation === "landscape" && ratio <= 1.05) return false;
    if (filters.orientation === "portrait" && ratio >= 0.95) return false;
    if (filters.orientation === "square" && (ratio < 0.95 || ratio > 1.05)) return false;
  }
  return true;
}