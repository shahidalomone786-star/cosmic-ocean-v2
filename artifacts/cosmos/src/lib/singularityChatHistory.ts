import type { DocumentRecord } from './documentStore';
import type { ImageAttachment } from './attachmentTypes';
import type { VisualReferencesState } from './visualReferences';
import type { SingularityResponseMetadata } from './singularityModes';

export const CHAT_HISTORY_STORAGE_KEY = 'cosmos.singularity.chat-history.v1';
export const CHAT_SIDEBAR_WIDTH_KEY = 'cosmos.singularity.sidebar-width';
export const CHAT_SIDEBAR_COLLAPSED_KEY = 'cosmos.singularity.sidebar-collapsed';
export const CHAT_HISTORY_DB_NAME = 'cosmos.singularity.history';
export const CHAT_HISTORY_DB_VERSION = 2;
export const CHAT_HISTORY_PAGE_SIZE = 48;
const CHAT_HISTORY_FALLBACK_PREFIX = 'cosmos.singularity.session.';

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedDocument?: DocumentRecord | null;
  attachedImages?: ImageAttachment[];
  reasoning?: string;
  reasoningSeconds?: number;
  error?: boolean;
  visualReferences?: VisualReferencesState;
  modeMetadata?: SingularityResponseMetadata;
  ts: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessageRecord[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  manualTitle?: boolean;
  deletedAt?: number;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  manualTitle?: boolean;
  deletedAt?: number;
  messageCount: number;
  preview: string;
  searchText: string;
  sortKey: string;
}

export interface ChatSessionPage {
  sessions: ChatSessionSummary[];
  hasMore: boolean;
  total: number;
}

export interface ChatHistoryImportEnvelope {
  version: 1;
  exportedAt: number;
  session: ChatSession;
}

export type ChatExportFormat = 'json' | 'markdown' | 'txt' | 'pdf';

function isChatMessage(value: unknown): value is ChatMessageRecord {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessageRecord>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.ts === 'number'
  );
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<ChatSession>;
  return (
    typeof session.id === 'string' &&
    typeof session.title === 'string' &&
    typeof session.createdAt === 'number' &&
    typeof session.updatedAt === 'number' &&
    Array.isArray(session.messages) &&
    session.messages.every(isChatMessage)
  );
}

export function createChatSession(message: ChatMessageRecord, now = Date.now()): ChatSession {
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New conversation',
    messages: [message],
    createdAt: now,
    updatedAt: now,
  };
}

const TITLE_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'can', 'could', 'do', 'does', 'explain',
  'for', 'from', 'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'please',
  'tell', 'that', 'the', 'this', 'to', 'what', 'when', 'why', 'with', 'would',
  'you', 'your', 'more', 'actually', 'really', 'want', 'know', 'help', 'give',
]);

const VAGUE_PROMPT = /^(?:hi|hello|hey|help|help me|what can you do|tell me more|interesting|thanks|thank you|can you help(?: me)?|i have a question)[!.?\s]*$/i;

function titleCaseWord(word: string): string {
  return word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word;
}

export function hasEnoughTitleContext(messages: ChatMessageRecord[]): boolean {
  const userMessages = messages.filter(message => message.role === 'user' && message.content.trim());
  if (userMessages.length === 0) return false;
  const firstPrompt = userMessages[0].content.replace(/\s+/g, ' ').trim();
  if (!VAGUE_PROMPT.test(firstPrompt)) return true;
  const assistantContent = messages
    .filter(message => message.role === 'assistant')
    .map(message => message.content.trim())
    .join(' ');
  return userMessages.length >= 2 || assistantContent.length >= 100;
}

function titleWords(text: string): string[] {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.replace(/^[-']+|[-']+$/g, '').toLowerCase())
    .filter(word => word.length > 2 && !TITLE_STOP_WORDS.has(word));
}

function compactTitle(text: string): string | null {
  const words = titleWords(text);
  const uniqueWords = words.filter((word, index) => words.indexOf(word) === index);
  const selected = uniqueWords.length >= 3
    ? uniqueWords.slice(0, 6)
    : words.slice(0, 6);
  if (selected.length < 3) return null;
  return selected.slice(0, Math.max(3, Math.min(6, selected.length))).map(titleCaseWord).join(' ');
}

export function deriveChatTitle(messages: ChatMessageRecord[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user' && message.content.trim());
  if (!firstUserMessage || !hasEnoughTitleContext(messages)) return 'New conversation';
  return compactTitle(firstUserMessage.content) ?? 'New conversation';
}

/**
 * Creates a compact local title after a response is available. This stays
 * client-side so title refinement never adds latency or another AI request to
 * the streaming path.
 */
export function deriveSmartChatTitle(messages: ChatMessageRecord[]): string | null {
  if (!hasEnoughTitleContext(messages)) return null;
  const userText = messages
    .filter(message => message.role === 'user')
    .map(message => message.content)
    .join(' ');
  const assistantContext = messages
    .filter(message => message.role === 'assistant' && message.id !== 'welcome')
    .map(message => message.content)
    .join(' ')
    .slice(0, 1200);
  const words = titleWords(`${userText} ${assistantContext}`);
  const uniqueWords = words.filter((word, index) => words.indexOf(word) === index);
  const selected = uniqueWords.slice(0, 6);
  if (selected.length < 3) return null;
  return selected.slice(0, Math.max(3, Math.min(6, selected.length))).map(titleCaseWord).join(' ');
}

export function loadChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const legacy = Array.isArray(parsed) ? parsed.filter(isChatSession) : [];
    const fallbackSessions: ChatSession[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(CHAT_HISTORY_FALLBACK_PREFIX)) continue;
      try {
        const fallback = JSON.parse(window.localStorage.getItem(key) ?? '') as unknown;
        if (isChatSession(fallback)) fallbackSessions.push(fallback);
      } catch {
        // Ignore malformed fallback entries.
      }
    }
    return [...legacy, ...fallbackSessions]
      .filter((session, index, all) => all.findIndex(item => item.id === session.id) === index)
      .filter(isChatSession)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 500);
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(sessions.slice(0, 100)),
    );
  } catch {
    // A full or unavailable localStorage must never interrupt the chat.
  }
}

export function getChatPreview(session: ChatSession): string {
  const message = session.messages.find(item => item.role === 'user' && item.content.trim())
    ?? session.messages.find(item => item.role === 'assistant' && item.content.trim());
  return message?.content.replace(/\s+/g, ' ').trim() ?? '';
}

export function getChatSearchText(session: ChatSession): string {
  return session.messages.map(message => message.content).join('\n');
}

export function summarizeChatSession(session: ChatSession): ChatSessionSummary {
  const preview = getChatPreview(session);
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    pinned: session.pinned,
    favorite: session.favorite,
    archived: session.archived,
    manualTitle: session.manualTitle,
    deletedAt: session.deletedAt,
    messageCount: session.messages.length,
    preview,
    // Keep metadata search bounded so thousands of summaries stay cheap.
    searchText: getChatSearchText(session).replace(/\s+/g, ' ').trim().slice(0, 6000),
    sortKey: getSummarySortKey(session),
  };
}

function getSummaryCategory(summary: Pick<ChatSessionSummary, 'deletedAt' | 'archived' | 'pinned' | 'favorite'>): number {
  if (summary.deletedAt) return 4;
  if (summary.archived) return 3;
  if (summary.pinned) return 0;
  if (summary.favorite) return 1;
  return 2;
}

function getSummarySortKey(session: ChatSession): string {
  const category = getSummaryCategory(session);
  const invertedTime = String(Math.max(0, 9_999_999_999_999 - session.updatedAt)).padStart(14, '0');
  return `${category}:${invertedTime}:${session.id}`;
}

function sortSummaries(a: ChatSessionSummary, b: ChatSessionSummary): number {
  return a.sortKey.localeCompare(b.sortKey);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;
let repositoryReady: Promise<void> | null = null;
let historyDatabase: IDBDatabase | null = null;
const pendingWrites = new Map<string, ChatSession>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let pendingWriteListener: ((count: number) => void) | null = null;

function openHistoryDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(CHAT_HISTORY_DB_NAME, CHAT_HISTORY_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const summaries = database.objectStoreNames.contains('summaries')
        ? request.transaction?.objectStore('summaries')
        : database.createObjectStore('summaries', { keyPath: 'id' });
      const sessions = database.objectStoreNames.contains('sessions')
        ? request.transaction?.objectStore('sessions')
        : database.createObjectStore('sessions', { keyPath: 'id' });
      if (summaries && !summaries.indexNames.contains('updatedAt')) summaries.createIndex('updatedAt', 'updatedAt');
      if (summaries && !summaries.indexNames.contains('sortKey')) summaries.createIndex('sortKey', 'sortKey');
      if (summaries && !summaries.indexNames.contains('archived')) summaries.createIndex('archived', 'archived');
      if (summaries && !summaries.indexNames.contains('pinned')) summaries.createIndex('pinned', 'pinned');
      if (summaries && !summaries.indexNames.contains('favorite')) summaries.createIndex('favorite', 'favorite');
      void sessions;
    };
    request.onsuccess = () => {
      historyDatabase = request.result;
      historyDatabase.onversionchange = () => historyDatabase?.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open chat history database.'));
  });
  return databasePromise;
}

function writeFallback(session: ChatSession): void {
  try {
    window.localStorage.setItem(`${CHAT_HISTORY_FALLBACK_PREFIX}${session.id}`, JSON.stringify(session));
  } catch {
    // The retry queue remains the final in-memory protection for transient failures.
  }
}

function notifyPendingWrites(): void {
  pendingWriteListener?.(pendingWrites.size);
}

function scheduleRetry(): void {
  if (retryTimer || pendingWrites.size === 0) return;
  const delay = Math.min(30_000, 500 * 2 ** retryAttempt);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryAttempt += 1;
    const writes = [...pendingWrites.values()];
    void Promise.all(writes.map(session => persistSession(session).catch(() => undefined))).finally(() => {
      if (pendingWrites.size > 0) scheduleRetry();
    });
  }, delay);
}

async function persistSession(session: ChatSession): Promise<void> {
  try {
    const database = await openHistoryDatabase();
    const transaction = database.transaction(['sessions', 'summaries'], 'readwrite');
    transaction.objectStore('sessions').put(session);
    transaction.objectStore('summaries').put(summarizeChatSession(session));
    await transactionDone(transaction);
    pendingWrites.delete(session.id);
    retryAttempt = 0;
    notifyPendingWrites();
  } catch (error) {
    pendingWrites.set(session.id, session);
    writeFallback(session);
    notifyPendingWrites();
    scheduleRetry();
    throw error;
  }
}

export function flushPendingHistoryWrites(): void {
  if (pendingWrites.size === 0) return;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryAttempt = 0;
  const writes = [...pendingWrites.values()];
  void Promise.all(writes.map(session => persistSession(session).catch(() => undefined))).finally(() => {
    if (pendingWrites.size > 0) scheduleRetry();
  });
}

export function onPendingHistoryWrites(listener: ((count: number) => void) | null): () => void {
  pendingWriteListener = listener;
  listener?.(pendingWrites.size);
  return () => {
    if (pendingWriteListener === listener) pendingWriteListener = null;
  };
}

export async function prepareChatHistoryRepository(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (repositoryReady) return repositoryReady;
  repositoryReady = (async () => {
    try {
      const database = await openHistoryDatabase();
      const transaction = database.transaction('summaries', 'readonly');
      const done = transactionDone(transaction);
      const count = await requestResult(transaction.objectStore('summaries').count());
      await done;
      if (count > 0) {
        const backfill = database.transaction('summaries', 'readwrite');
        const store = backfill.objectStore('summaries');
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          const summary = cursor.value as ChatSessionSummary & { sortKey?: string };
          if (!summary.sortKey) {
            cursor.update({
              ...summary,
              sortKey: getSummarySortKey({
                id: summary.id,
                title: summary.title,
                messages: [],
                createdAt: summary.createdAt,
                updatedAt: summary.updatedAt,
                pinned: summary.pinned,
                favorite: summary.favorite,
                archived: summary.archived,
                deletedAt: summary.deletedAt,
              }),
            });
          }
          cursor.continue();
        };
        await transactionDone(backfill);
        return;
      }
      const legacy = loadChatSessions();
      if (legacy.length === 0) return;
      const migration = database.transaction(['sessions', 'summaries'], 'readwrite');
      legacy.forEach(session => {
        migration.objectStore('sessions').put(session);
        migration.objectStore('summaries').put(summarizeChatSession(session));
      });
      await transactionDone(migration);
    } catch {
      // localStorage remains available as a compatibility fallback.
    }
  })();
  return repositoryReady;
}

export async function listChatSessionSummaries(
  cursor: string | null = null,
  limit = CHAT_HISTORY_PAGE_SIZE,
): Promise<ChatSessionPage> {
  await prepareChatHistoryRepository();
  try {
    const database = await openHistoryDatabase();
    const transaction = database.transaction('summaries', 'readonly');
    const done = transactionDone(transaction);
    const store = transaction.objectStore('summaries');
    const index = store.index('sortKey');
    const total = await requestResult(store.count());
    const page = await new Promise<ChatSessionSummary[]>((resolve, reject) => {
      const values: ChatSessionSummary[] = [];
      const range = cursor ? IDBKeyRange.lowerBound(cursor, true) : undefined;
      const request = index.openCursor(range, 'next');
      request.onsuccess = () => {
        const current = request.result;
        if (!current || values.length >= limit) {
          resolve(values);
          return;
        }
        const summary = current.value as ChatSessionSummary;
        if (!summary.deletedAt) values.push(summary);
        current.continue();
      };
      request.onerror = () => reject(request.error ?? new Error('Could not page chat history.'));
    });
    await done;
    const nextCursor = page.length === limit ? page[page.length - 1]?.sortKey ?? null : null;
    return { sessions: page, hasMore: Boolean(nextCursor), total };
  } catch {
    const legacy = loadChatSessions().map(summarizeChatSession).sort(sortSummaries);
    const start = cursor ? Math.max(0, legacy.findIndex(summary => summary.sortKey === cursor) + 1) : 0;
    const page = legacy.slice(start, start + limit);
    return { sessions: page, hasMore: start + limit < legacy.length, total: legacy.length };
  }
}

export async function loadChatSession(id: string): Promise<ChatSession | null> {
  await prepareChatHistoryRepository();
  try {
    const database = await openHistoryDatabase();
    const transaction = database.transaction('sessions', 'readonly');
    const done = transactionDone(transaction);
    const session = await requestResult(transaction.objectStore('sessions').get(id));
    await done;
    if (session) return session as ChatSession;
  } catch {
    // Fall through to local fallback.
  }
  try {
    const fallback = window.localStorage.getItem(`${CHAT_HISTORY_FALLBACK_PREFIX}${id}`);
    if (fallback) return JSON.parse(fallback) as ChatSession;
  } catch {
    // Fall through to legacy storage.
  }
  return loadChatSessions().find(session => session.id === id) ?? null;
}

export async function saveChatSession(session: ChatSession): Promise<void> {
  await prepareChatHistoryRepository();
  await persistSession(session);
}

export async function softDeleteChatSession(id: string): Promise<void> {
  const session = await loadChatSession(id);
  if (!session) return;
  await saveChatSession({ ...session, deletedAt: Date.now() });
}

export async function getChatHistoryStorageMode(): Promise<'indexeddb' | 'localstorage'> {
  try {
    await openHistoryDatabase();
    return 'indexeddb';
  } catch {
    return 'localstorage';
  }
}

export async function clearChatHistoryStorage(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CHAT_HISTORY_FALLBACK_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Continue to the IndexedDB boundary when localStorage is unavailable.
  }

  if (!('indexedDB' in window)) return;
  historyDatabase?.close();
  historyDatabase = null;
  databasePromise = null;
  repositoryReady = null;

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(CHAT_HISTORY_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not clear chat history.'));
    request.onblocked = () => resolve();
  });
}

export async function countPinnedChatSessions(): Promise<number> {
  try {
    await prepareChatHistoryRepository();
    const database = await openHistoryDatabase();
    const transaction = database.transaction('summaries', 'readonly');
    const done = transactionDone(transaction);
    const count = await requestResult(transaction.objectStore('summaries').index('pinned').count(IDBKeyRange.only(true)));
    await done;
    return count;
  } catch {
    return loadChatSessions().filter(session => session.pinned && !session.deletedAt).length;
  }
}

export function createImportEnvelope(session: ChatSession): ChatHistoryImportEnvelope {
  return { version: 1, exportedAt: Date.now(), session };
}

export function parseImportEnvelope(value: unknown): ChatSession | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ChatHistoryImportEnvelope>;
  return candidate.version === 1 && isChatSession(candidate.session) ? candidate.session : null;
}

export function chatSessionToMarkdown(session: ChatSession): string {
  const lines = [`# ${session.title}`, '', `Created: ${new Date(session.createdAt).toISOString()}`, ''];
  session.messages.forEach(message => {
    lines.push(`## ${message.role === 'user' ? 'You' : 'Singularity'}`);
    lines.push('');
    lines.push(message.content.trim() || '_No text content_');
    lines.push('');
    if (message.reasoning?.trim()) {
      lines.push('<details>');
      lines.push('<summary>Reasoning</summary>');
      lines.push('');
      lines.push(message.reasoning.trim());
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  });
  return lines.join('\n').trimEnd() + '\n';
}

export function chatSessionToText(session: ChatSession): string {
  return [
    session.title,
    `Created: ${new Date(session.createdAt).toLocaleString()}`,
    '',
    ...session.messages.flatMap(message => [
      `${message.role === 'user' ? 'You' : 'Singularity'}:`,
      message.content.trim(),
      '',
    ]),
  ].join('\n').trimEnd() + '\n';
}