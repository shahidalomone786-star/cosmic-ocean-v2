/**
 * citationFormatters.ts
 *
 * Pure formatting utilities — no React, no side-effects.
 * Maps SectionItem fields to BibTeX, APA, MLA, and RIS strings.
 *
 * SectionItem field mapping:
 *   title        → title
 *   description  → abstract
 *   authors      → author list
 *   date         → year (first 4 chars)
 *   source       → journal / publisher key
 *   url          → URL / DOI
 *   citationCount→ citation count
 */

import type { SectionItem } from '../components/NasaSearch';

// ─── Source display names (mirrors SavedPapersDrawer) ───────────────────────

const SOURCE_DISPLAY: Record<string, string> = {
  wiki:            'Wikipedia',
  nasa:            'NASA',
  esa:             'ESA Hubble',
  arxiv:           'arXiv',
  openalex:        'OpenAlex',
  semanticscholar: 'Semantic Scholar',
  inspirehep:      'INSPIRE-HEP',
  book:            'Book',
};

// ─── Field accessors ─────────────────────────────────────────────────────────

export function getYear(item: SectionItem): string {
  return item.date ? item.date.slice(0, 4) : 'n.d.';
}

export function getSourceName(item: SectionItem): string {
  return SOURCE_DISPLAY[item.source] ?? item.source;
}

export function getAuthors(item: SectionItem): string[] {
  return item.authors ?? [];
}

function getCiteKey(item: SectionItem): string {
  const firstAuthor = (item.authors?.[0] ?? 'Unknown').split(/\s+/).pop() ?? 'unknown';
  const year = getYear(item);
  const titleWord = (item.title.split(/\s+/)[0] ?? 'untitled').replace(/\W/g, '');
  return `${firstAuthor}${year}${titleWord}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export function toBibTeX(item: SectionItem): string {
  const lines: string[] = [];
  lines.push(`@article{${getCiteKey(item)},`);
  lines.push(`  title     = {${item.title}},`);
  const authors = getAuthors(item);
  if (authors.length > 0) {
    lines.push(`  author    = {${authors.join(' and ')}},`);
  }
  lines.push(`  year      = {${getYear(item)}},`);
  lines.push(`  journal   = {${getSourceName(item)}},`);
  if (item.url)          lines.push(`  url       = {${item.url}},`);
  if (item.citationCount != null) lines.push(`  note      = {Cited by ${item.citationCount}},`);
  lines.push('}');
  return lines.join('\n');
}

export function toAPA(item: SectionItem): string {
  const authors = getAuthors(item);
  let authorStr: string;
  if (authors.length === 0)     authorStr = 'Unknown Author';
  else if (authors.length === 1) authorStr = authors[0];
  else if (authors.length === 2) authorStr = `${authors[0]}, & ${authors[1]}`;
  else                           authorStr = `${authors[0]}, et al.`;

  const year = getYear(item);
  const url  = item.url ? ` ${item.url}` : '';
  return `${authorStr} (${year}). ${item.title}. ${getSourceName(item)}.${url}`;
}

export function toMLA(item: SectionItem): string {
  const authors = getAuthors(item);
  let authorStr = '';
  if (authors.length === 1)     authorStr = `${authors[0]}. `;
  else if (authors.length === 2) authorStr = `${authors[0]}, and ${authors[1]}. `;
  else if (authors.length > 2)  authorStr = `${authors[0]}, et al. `;

  const url = item.url ? ` ${item.url}.` : '';
  return `${authorStr}"${item.title}." ${getSourceName(item)}, ${getYear(item)}.${url}`;
}

export function toRIS(item: SectionItem): string {
  const lines: string[] = [];
  lines.push('TY  - JOUR');
  lines.push(`TI  - ${item.title}`);
  getAuthors(item).forEach(a => lines.push(`AU  - ${a}`));
  lines.push(`PY  - ${getYear(item)}`);
  lines.push(`JO  - ${getSourceName(item)}`);
  if (item.url)                   lines.push(`UR  - ${item.url}`);
  if (item.citationCount != null) lines.push(`C1  - Cited by ${item.citationCount}`);
  if (item.description)           lines.push(`AB  - ${item.description.replace(/\n/g, ' ')}`);
  lines.push('ER  -');
  return lines.join('\n');
}

// ─── Batch export ─────────────────────────────────────────────────────────────

export type ExportFormat = 'bibtex' | 'apa' | 'mla' | 'ris';

const FORMATTERS: Record<ExportFormat, (item: SectionItem) => string> = {
  bibtex: toBibTeX,
  apa:    toAPA,
  mla:    toMLA,
  ris:    toRIS,
};

const SEPARATORS: Record<ExportFormat, string> = {
  bibtex: '\n\n',
  apa:    '\n',
  mla:    '\n',
  ris:    '\n\n',
};

export function exportItems(items: SectionItem[], format: ExportFormat): string {
  return items.map(FORMATTERS[format]).join(SEPARATORS[format]);
}

export const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  bibtex: '.bib',
  apa:    '.txt',
  mla:    '.txt',
  ris:    '.ris',
};

export const MIME_TYPES: Record<ExportFormat, string> = {
  bibtex: 'text/plain',
  apa:    'text/plain',
  mla:    'text/plain',
  ris:    'application/x-research-info-systems',
};

/** Trigger a file download in the browser. */
export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
