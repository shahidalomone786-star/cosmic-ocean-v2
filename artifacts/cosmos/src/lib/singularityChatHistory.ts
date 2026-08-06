import type { DocumentRecord } from './documentStore';
import type { ImageAttachment } from './attachmentTypes';

export const CHAT_HISTORY_STORAGE_KEY = 'cosmos.singularity.chat-history.v1';
export const CHAT_SIDEBAR_WIDTH_KEY = 'cosmos.singularity.sidebar-width';
export const CHAT_SIDEBAR_COLLAPSED_KEY = 'cosmos.singularity.sidebar-collapsed';

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedDocument?: DocumentRecord | null;
  attachedImages?: ImageAttachment[];
  reasoning?: string;
  reasoningSeconds?: number;
  error?: boolean;
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
}

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
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isChatSession)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 100);
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