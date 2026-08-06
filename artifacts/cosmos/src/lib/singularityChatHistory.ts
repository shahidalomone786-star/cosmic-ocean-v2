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

export function deriveChatTitle(messages: ChatMessageRecord[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user' && message.content.trim());
  if (!firstUserMessage) return 'New conversation';
  const title = firstUserMessage.content.replace(/\s+/g, ' ').trim();
  return title.length > 56 ? `${title.slice(0, 56).trimEnd()}…` : title;
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