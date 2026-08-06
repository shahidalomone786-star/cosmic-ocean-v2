import { Router } from "express";

const router = Router();
const VISUAL_REFERENCE_CACHE_TTL_MS = 15 * 60_000;
const visualReferenceCache = new Map<string, {
  expiresAt: number;
  references: VisualReference[];
}>();

interface VisualReference {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  sourceUrl: string;
  source: string;
  alt: string;
}

type VisualCategory =
  | "science"
  | "people"
  | "places"
  | "history"
  | "animals"
  | "products"
  | "art"
  | "technology"
  | "food"
  | "other";

const HIGH_VALUE_RULES: Array<{ category: VisualCategory; pattern: RegExp }> = [
  { category: "science", pattern: /\b(scientific|science|physics|quantum|chemistry|biology|cell(?:s)?|gene(?:s)?|dna|molecule(?:s)?|evolution|engineering|anatom(?:y|ies)|medical|medicine|microscope|fossil(?:s)?)\b/i },
  { category: "science", pattern: /\b(astronomy|cosmology|planet(?:s)?|galax(?:y|ies)|nebula(?:e|s)?|black holes?|star(?:s)?|moon(?:s)?|mars|solar system|space)\b/i },
  { category: "people", pattern: /\b(portrait|famous|person|people|scientist|artist|author|president|leader|einstein|newton|curie)\b/i },
  { category: "places", pattern: /\b(monument|architecture|building|landmark|city|country|geography|map|mountain|river|island|travel|temple|cathedral)\b/i },
  { category: "history", pattern: /\b(history|historical|ancient|civilization|war|revolution|timeline|empire|archaeology)\b/i },
  { category: "animals", pattern: /\b(animal|species|bird|whale|dinosaur|cat|dog|insect|mammal|reptile|amphibian)\b/i },
  { category: "products", pattern: /\b(product|device|phone|camera|car|vehicle|machine|tool|equipment|model)\b/i },
  { category: "art", pattern: /\b(artwork|painting|sculpture|art|design|illustration|photograph|drawing)\b/i },
  { category: "technology", pattern: /\b(robot|computer|technology|hardware|circuit|architecture|technical drawing|3d render)\b/i },
  { category: "food", pattern: /\b(recipe|cooking|dish|ingredient|food|cuisine|meal)\b/i },
];

const LOW_VALUE_PATTERN = /\b(code|coding|programming|debug|debugging|typescript|javascript|python|essay|translation|translate|proof|theorem|poetry|poem|legal|contract|email|memo|rewrite)\b/i;
const EXPLICIT_VISUAL_PATTERN = /\b(show|see|visual|image|images|picture|pictures|photo|photos|diagram|diagrams|map|illustration|illustrations|visuali[sz]e|look like)\b/i;

function classifyVisualNeed(userQuery: string, response: string): {
  enabled: boolean;
  explicit: boolean;
  category: VisualCategory;
} {
  const text = `${userQuery}\n${response.slice(0, 1800)}`;
  const explicit = EXPLICIT_VISUAL_PATTERN.test(userQuery);
  const match = HIGH_VALUE_RULES.find(rule => rule.pattern.test(text));
  if (LOW_VALUE_PATTERN.test(userQuery) && !explicit) {
    return { enabled: false, explicit, category: "other" };
  }
  return {
    enabled: Boolean(match) || explicit,
    explicit,
    category: match?.category ?? "other",
  };
}

function buildEducationalQuery(userQuery: string, category: VisualCategory): string {
  const subject = userQuery
    .replace(/^(please|can you|could you|tell me|explain|what is|what are|how does|how do|how)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  if (/\bblack holes?\b/i.test(userQuery)) {
    return "black hole event horizon accretion disk visualization";
  }
  if (/\b(planet|galaxy|nebula|star|moon|mars|solar system)\b/i.test(userQuery)) {
    return `${subject} astronomy scientific visualization`.slice(0, 190);
  }

  const suffix: Record<VisualCategory, string> = {
    science: "scientific diagram visualization",
    people: "portrait historical photograph",
    places: "architecture geography reference photograph",
    history: "historical photograph timeline artifact",
    animals: "natural history photograph scientific illustration",
    products: "technical reference photograph design",
    art: "artwork museum reference",
    technology: "technical diagram engineering visualization",
    food: "dish preparation reference photograph",
    other: "educational visual reference",
  };

  return `${subject || "educational topic"} ${suffix[category]}`.slice(0, 190);
}

function captionFor(query: string, title: string, category: VisualCategory): string {
  const framing: Record<VisualCategory, string> = {
    science: "This reference makes the scientific structure or process easier to inspect.",
    people: "This reference anchors the subject in a recognizable historical or human context.",
    places: "This reference gives the subject useful spatial and architectural context.",
    history: "This reference connects the explanation to a concrete historical record or artifact.",
    animals: "This reference highlights the subject's visible form and distinguishing features.",
    products: "This reference makes the object's design and physical details easier to compare.",
    art: "This reference lets you examine the visual details discussed in the response.",
    technology: "This reference clarifies the system's physical structure or engineering context.",
    food: "This reference makes the ingredients, form, or preparation easier to recognize.",
    other: "This reference provides concrete visual context for the topic.",
  };
  const cleanTitle = title.replace(/^File:\s*/i, "").slice(0, 100);
  return `${framing[category].replace(/\.$/, "")}: ${cleanTitle}.`.slice(0, 220);
}

function resultCount(userQuery: string, response: string): number {
  if (/\b(compare|comparison|versus|vs\.?|differences|types|examples)\b/i.test(userQuery)) return 4;
  if (response.length > 2800 || /\b(quantum|anatomy|astronomy|architecture|history|biology)\b/i.test(userQuery)) return 3;
  return 2;
}

function cacheKey(query: string, count: number): string {
  return `${query.toLowerCase().replace(/\s+/g, " ").trim()}::${count}`;
}

async function searchWikimedia(query: string, count: number, category: VisualCategory): Promise<VisualReference[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(Math.min(count * 2, 8)));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size|extmetadata");
  url.searchParams.set("iiurlwidth", "1200");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Cosmos-Singularity/1.0 visual references" },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);

  const payload = await response.json() as {
    query?: {
      pages?: Record<string, {
        pageid?: number;
        title?: string;
        canonicalurl?: string;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          mime?: string;
          width?: number;
          height?: number;
          extmetadata?: { ImageDescription?: { value?: string } };
        }>;
      }>;
    };
  };

  const seen = new Set<string>();
  return Object.values(payload.query?.pages ?? [])
    .flatMap(page => {
      const info = page.imageinfo?.[0];
      const imageUrl = info?.thumburl ?? info?.url;
      if (
        !page.pageid ||
        !page.title ||
        !imageUrl ||
        !info?.mime?.startsWith("image/") ||
        (info.width ?? 0) < 260 ||
        (info.height ?? 0) < 180 ||
        seen.has(imageUrl)
      ) return [];
      seen.add(imageUrl);
      const cleanTitle = page.title.replace(/^File:\s*/i, "").replace(/_/g, " ");
      const reference: VisualReference = {
        id: `wikimedia-${page.pageid}`,
        title: cleanTitle.slice(0, 140),
        caption: captionFor(query, cleanTitle, category),
        imageUrl,
        sourceUrl: page.canonicalurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
        source: "Wikimedia Commons",
        alt: `${cleanTitle.slice(0, 160)} — visual reference for ${query.slice(0, 90)}`,
      };
      return [reference];
    })
    .slice(0, count);
}

function fallbackQueryFor(category: VisualCategory): string | null {
  const fallbacks: Partial<Record<VisualCategory, string>> = {
    science: "scientific diagram visualization",
    people: "historical portrait photograph",
    places: "landmark architecture reference photograph",
    history: "historical artifact photograph",
    animals: "natural history scientific illustration",
    products: "technical product reference photograph",
    art: "museum artwork reference",
    technology: "engineering technical diagram",
    food: "food preparation reference photograph",
  };
  return fallbacks[category] ?? null;
}

router.post("/visual-references", async (req, res) => {
  const userQuery = typeof req.body?.query === "string" ? req.body.query.trim().slice(0, 500) : "";
  const responseText = typeof req.body?.response === "string" ? req.body.response.trim().slice(0, 4_000) : "";
  if (!userQuery || !responseText) {
    res.json({ enabled: false, references: [] });
    return;
  }

  const decision = classifyVisualNeed(userQuery, responseText);
  if (!decision.enabled) {
    res.json({ enabled: false, references: [], category: decision.category });
    return;
  }

  const query = buildEducationalQuery(userQuery, decision.category);
  const count = resultCount(userQuery, responseText);
  const key = cacheKey(query, count);
  const cached = visualReferenceCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ enabled: true, references: cached.references, query, category: decision.category });
    return;
  }

  try {
    let references = await searchWikimedia(query, count, decision.category);
    if (references.length === 0) {
      const fallbackQuery = fallbackQueryFor(decision.category);
      if (fallbackQuery && fallbackQuery !== query) {
        references = await searchWikimedia(fallbackQuery, count, decision.category);
      }
    }
    visualReferenceCache.set(key, { expiresAt: Date.now() + VISUAL_REFERENCE_CACHE_TTL_MS, references });
    if (visualReferenceCache.size > 250) {
      for (const [cacheEntryKey, entry] of visualReferenceCache) {
        if (entry.expiresAt <= Date.now()) visualReferenceCache.delete(cacheEntryKey);
      }
    }
    res.json({
      enabled: references.length > 0,
      references,
      ...(references.length === 0
        ? {
            unavailable: true,
            message: "Visual references are currently unavailable.",
          }
        : {}),
      query,
      category: decision.category,
    });
  } catch (error) {
    console.warn("[visual-references] search unavailable", error);
    res.json({
      enabled: true,
      references: [],
      unavailable: true,
      message: "Visual references are currently unavailable.",
      query,
      category: decision.category,
    });
  }
});

export default router;