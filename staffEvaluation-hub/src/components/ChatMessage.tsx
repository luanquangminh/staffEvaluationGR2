import { memo, useState } from 'react';
import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';

// ---------------------------------------------------------------------------
// Markdown-lite renderer
// ---------------------------------------------------------------------------

/**
 * Lightweight inline-markdown renderer. Handles bold, italic, inline code,
 * unordered/ordered lists, and newlines -- sufficient for assistant replies
 * without pulling in a heavy markdown library.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.type === 'ul' ? 'ul' : 'ol';
    const className = listBuffer.type === 'ul' ? 'list-disc' : 'list-decimal';
    nodes.push(
      <Tag key={`list-${nodes.length}`} className={`${className} ml-4 my-1 space-y-0.5`}>
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>,
    );
    listBuffer = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Unordered list items: "- " or "* "
    const ulMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (ulMatch) {
      if (listBuffer && listBuffer.type !== 'ul') flushList();
      if (!listBuffer) listBuffer = { type: 'ul', items: [] };
      listBuffer.items.push(ulMatch[1]);
      continue;
    }

    // Ordered list items: "1. "
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (olMatch) {
      if (listBuffer && listBuffer.type !== 'ol') flushList();
      if (!listBuffer) listBuffer = { type: 'ol', items: [] };
      listBuffer.items.push(olMatch[1]);
      continue;
    }

    flushList();

    if (line.trim() === '') {
      nodes.push(<br key={`br-${i}`} />);
    } else {
      nodes.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }

  flushList();
  return nodes;
}

/** Handle bold, italic, and inline code within a single line. */
function renderInline(text: string): React.ReactNode[] {
  // Regex order matters: bold (**) before italic (*), code before both
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const segment = match[0];
    if (segment.startsWith('`')) {
      parts.push(
        <code
          key={`code-${match.index}`}
          className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
        >
          {segment.slice(1, -1)}
        </code>,
      );
    } else if (segment.startsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`}>{segment.slice(2, -2)}</strong>,
      );
    } else if (segment.startsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`}>{segment.slice(1, -1)}</em>,
      );
    }
    lastIndex = match.index + segment.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Streaming cursor
// ---------------------------------------------------------------------------

function StreamingCursor() {
  return (
    <span
      className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground/70"
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest: boolean;
}

function ChatMessageComponent({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showTimestamp, setShowTimestamp] = useState(false);

  const formattedTime = message.timestamp.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'group flex w-full gap-2 px-3 py-1.5',
        isUser ? 'justify-end' : 'justify-start',
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Bot avatar */}
      {!isUser && (
        <Avatar className="mt-0.5 h-7 w-7 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'relative max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md',
        )}
      >
        {/* Message content */}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-1 break-words">
            {message.content
              ? renderMarkdown(message.content)
              : (
                  <span className="text-muted-foreground italic">
                    Đang khởi động...
                  </span>
                )}
            {message.isStreaming && isLatest && <StreamingCursor />}
          </div>
        )}

        {/* Timestamp tooltip (hover) */}
        <Tooltip open={showTimestamp}>
          <TooltipTrigger asChild>
            <span className="absolute inset-0" />
          </TooltipTrigger>
          <TooltipContent
            side={isUser ? 'left' : 'right'}
            className="text-xs"
          >
            {formattedTime}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export const ChatMessageItem = memo(ChatMessageComponent);
