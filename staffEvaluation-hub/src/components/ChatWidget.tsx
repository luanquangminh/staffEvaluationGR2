import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react';
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { ChatMessageItem } from '@/components/ChatMessage';

// ---------------------------------------------------------------------------
// Suggestions shown in empty state
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  'Hỏi về tiêu chí đánh giá',
  'Kỳ đánh giá hiện tại?',
  'Hướng dẫn đánh giá đồng nghiệp',
  'Cách xem kết quả đánh giá',
] as const;

// ---------------------------------------------------------------------------
// Typing indicator (three animated dots)
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" aria-label="Đang suy nghĩ">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

function SuggestionChips({ onSelect, className }: { onSelect: (text: string) => void; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className={cn(
            'cursor-pointer rounded-full border px-3 py-1.5 text-xs',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-colors duration-150',
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth gate -- renders nothing when logged out, avoids conditional hooks
// ---------------------------------------------------------------------------

export function ChatWidget() {
  const { user } = useAuth();
  if (!user) return null;
  return <ChatWidgetInner />;
}

// ---------------------------------------------------------------------------
// Inner widget (only mounted when authenticated)
// ---------------------------------------------------------------------------

function ChatWidgetInner() {
  const {
    messages,
    isLoading,
    sendMessage,
    clearHistory,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Auto-scroll to bottom when messages change
  // -----------------------------------------------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [draft, adjustTextareaHeight]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleSend = () => {
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft('');
    sendMessage(text);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  const toggleOpen = () => setIsOpen((prev) => !prev);

  // -----------------------------------------------------------------------
  // Unread indicator heuristic
  // -----------------------------------------------------------------------
  const lastMsg = messages[messages.length - 1];
  const hasUnread = !isOpen && lastMsg?.role === 'assistant' && !lastMsg.isStreaming;

  return (
    <>
      {/* ----- Chat panel ----- */}
      <div
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden',
          'bg-background border shadow-2xl',
          'transition-all duration-300 ease-in-out',
          'bottom-24 right-6 w-96 rounded-2xl',
          'max-sm:inset-0 max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:rounded-none',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto h-[500px] max-sm:h-full'
            : 'opacity-0 translate-y-4 pointer-events-none h-0',
        )}
        role="dialog"
        aria-label="EveBot"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">EveBot</h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Clear history */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={clearHistory}
                  disabled={messages.length === 0}
                  aria-label="Xóa lịch sử trò chuyện"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Xóa lịch sử
              </TooltipContent>
            </Tooltip>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleOpen}
              aria-label="Đóng cửa sổ chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col py-3">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Xin chào! Tôi có thể giúp gì?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hỏi bất kỳ điều gì về hệ thống đánh giá
                  </p>
                </div>
                <SuggestionChips onSelect={handleSuggestionClick} className="justify-center" />
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isLatest={idx === messages.length - 1}
                  />
                ))}
                {isLoading &&
                  messages[messages.length - 1]?.role === 'assistant' &&
                  !messages[messages.length - 1]?.content && (
                    <TypingIndicator />
                  )}
                {!isLoading && (
                  <SuggestionChips onSelect={handleSuggestionClick} className="px-3 pt-2" />
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Input area */}
        <div className="flex items-end gap-2 px-3 py-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi..."
            disabled={isLoading}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2',
              'text-sm leading-relaxed placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-[120px] min-h-[36px]',
            )}
            aria-label="Nhập tin nhắn"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={!draft.trim() || isLoading}
                aria-label="Gửi tin nhắn"
              >
                {isLoading ? (
                  <ChevronDown className="h-4 w-4 animate-bounce" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Gửi (Enter)
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ----- Floating trigger button ----- */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex h-14 w-14 items-center justify-center',
          'rounded-full bg-primary text-primary-foreground shadow-lg',
          'cursor-pointer',
          'transition-all duration-300 ease-in-out',
          'hover:bg-primary/90 hover:shadow-xl hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'active:scale-95',
          isOpen && 'scale-0 opacity-0 pointer-events-none',
        )}
        aria-label={isOpen ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
      >
        <MessageCircle className="h-6 w-6" />

        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-destructive" />
          </span>
        )}

        {!hasUnread && (
          <Badge
            className="absolute -right-1 -top-1 h-5 px-1.5 text-[10px] font-bold"
            variant="secondary"
          >
            AI
          </Badge>
        )}
      </button>
    </>
  );
}
