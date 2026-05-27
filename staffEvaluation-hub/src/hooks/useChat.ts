import { useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_KEY = 'chat_messages';
const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Rehydrate messages from sessionStorage (timestamps arrive as strings). */
function loadSessionMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed: ChatMessage[] = JSON.parse(raw);
    return parsed.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
      isStreaming: false, // never resume a stream
    }));
  } catch {
    return [];
  }
}

function saveSessionMessages(messages: ChatMessage[]): void {
  try {
    // Strip streaming state before persisting
    const serialisable = messages.map(({ isStreaming: _, ...rest }) => rest);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serialisable));
  } catch {
    // sessionStorage full or unavailable -- silently ignore
  }
}

/** Build the conversation-history payload sent to the API. */
function buildHistory(msgs: ChatMessage[]) {
  return msgs
    .filter((m) => !m.isStreaming)
    .slice(-MAX_HISTORY)
    .map(({ role, content }) => ({ role, content }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(loadSessionMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller ref so we can cancel in-flight streams on unmount
  const abortRef = useRef<AbortController | null>(null);

  // Persist to sessionStorage whenever messages change
  useEffect(() => {
    saveSessionMessages(messages);
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // -------------------------------------------------------------------
  // sendMessage
  // -------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      setError(null);

      // 1. Append user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const assistantId = generateId();

      setMessages((prev) => {
        const next = [
          ...prev,
          userMsg,
          {
            id: assistantId,
            role: 'assistant' as const,
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          },
        ];
        return next;
      });

      setIsLoading(true);

      const accessToken = localStorage.getItem('accessToken');
      const controller = new AbortController();
      abortRef.current = controller;

      // Build history *before* the new user message is in state
      const conversationHistory = buildHistory([
        ...messages, // previous messages at call-time
        userMsg,
      ]);

      // ------ Try SSE streaming first ------
      try {
        const res = await fetch(`${API_URL}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ message: trimmed, conversationHistory }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('ReadableStream not supported');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // SSE format: each event is "data: <text>\n\n"
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content' && parsed.content) {
                  accumulated += parsed.content;
                } else if (parsed.type === 'error') {
                  accumulated = parsed.content || 'Lỗi từ hệ thống AI.';
                } else if (parsed.type === 'done' || parsed.type === 'model') {
                  // metadata events — skip
                  continue;
                }
              } catch {
                // Plain-text SSE data (not JSON-wrapped)
                accumulated += data;
              }

              // Update the assistant message in-place
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulated }
                    : m,
                ),
              );
            }
          }
        }

        // Finalise
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, content: accumulated || 'Xin lỗi, tôi không thể trả lời lúc này.' }
              : m,
          ),
        );
      } catch (streamErr: unknown) {
        // If aborted intentionally, don't fallback
        if ((streamErr as Error).name === 'AbortError') {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setIsLoading(false);
          return;
        }

        // ------ Fallback to non-streaming endpoint ------
        try {
          const fallbackRes = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ message: trimmed, conversationHistory }),
            signal: controller.signal,
          });

          if (!fallbackRes.ok) {
            throw new Error(`HTTP ${fallbackRes.status}`);
          }

          const data = await fallbackRes.json();
          const reply = data.reply ?? data.response ?? data.content ?? '';

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: reply, isStreaming: false }
                : m,
            ),
          );
        } catch (fallbackErr: unknown) {
          if ((fallbackErr as Error).name === 'AbortError') {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            setIsLoading(false);
            return;
          }

          const errMsg =
            fallbackErr instanceof Error
              ? fallbackErr.message
              : 'Không thể kết nối đến EveBot. Vui lòng thử lại sau.';

          setError(errMsg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Lỗi: ${errMsg}`,
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, messages],
  );

  // -------------------------------------------------------------------
  // clearHistory
  // -------------------------------------------------------------------
  const clearHistory = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
  };
}
