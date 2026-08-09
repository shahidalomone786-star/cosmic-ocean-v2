const INTERNAL_SECTION_START =
  /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:draft response(?:\s*\(\s*mental refinement\s*\))?|mental refinement|internal (?:monologue|reasoning)|scratchpad|rule[- ]?checking?|check against rules)\s*:?\s*(?:\*\*)?\s*/i;
const FINAL_RESPONSE_MARKER =
  /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:final response|final answer)\s*:?\s*(?:\*\*)?\s*/gi;
const THINK_OPEN_PREFIX = '<think';

/** Defense-in-depth cleanup for any response content that reaches the UI. */
export function sanitizeVisibleResponse(content: string): string {
  if (!content) return '';

  let cleaned = content.trim();
  const thinkBlocks = /<think\b[^>]*>[\s\S]*?<\/think\s*>/gi;
  cleaned = cleaned
    .replace(thinkBlocks, '')
    .replace(/<\/?think\b[^>]*>/gi, '')
    .replace(new RegExp(`${THINK_OPEN_PREFIX}$`, 'i'), '')
    .trim();

  const internalStart = cleaned.search(INTERNAL_SECTION_START);
  if (internalStart !== -1) {
    const afterInternal = cleaned.slice(internalStart);
    const finalMatches = [...afterInternal.matchAll(FINAL_RESPONSE_MARKER)];
    if (finalMatches.length > 0) {
      const finalMarker = finalMatches[finalMatches.length - 1];
      cleaned = afterInternal.slice((finalMarker.index ?? 0) + finalMarker[0].length).trim();
      const trailingInternal = cleaned.search(INTERNAL_SECTION_START);
      if (trailingInternal !== -1) cleaned = cleaned.slice(0, trailingInternal).trim();
    } else {
      cleaned = cleaned.slice(0, internalStart).trim();
    }
  } else {
    cleaned = cleaned
      .split('\n')
      .filter(line => !/^\s*(?:[-*•]\s*)?(?:check against rules|rule[- ]?check(?:ing)?|internal quality check)\s*:?\s*/i.test(line))
      .join('\n')
      .trim();
  }

  return cleaned;
}