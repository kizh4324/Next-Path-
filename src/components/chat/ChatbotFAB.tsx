/**
 * Floating chat button and slide-over drawer (FR-16, Stories 4.2, 4.3, 4.5).
 *
 * The AI accent (#391c57) appears here and nowhere else in the app — it tags AI moments
 * decoratively and is never used as a structural fill (UX invariant 2).
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Badge, Button, Callout, Spinner } from '@/components/ui';
import { useChatbot } from '@/hooks/useChatbot';
import { cn } from '@/utils/cn';
import type { ChatTurn } from '@/types/models';

const SUGGESTIONS = [
  'What does this job actually involve day to day?',
  'What are the risks of this path?',
  'What is the cheapest way into this career?',
];

function CrisisAnswer({ text }: { text: string }): JSX.Element {
  return (
    <Callout variant="support" title="Please read this">
      {/* Calm, high-contrast support surface — never the warning token (invariant 8). */}
      <p className="whitespace-pre-line text-body-sm text-ink">{text}</p>
    </Callout>
  );
}

function TurnView({ turn }: { turn: ChatTurn }): JSX.Element {
  return (
    <li className="flex flex-col gap-xs">
      <div className="self-end rounded-lg rounded-br-xs bg-canvas-soft px-sm py-xs text-body-sm text-ink">
        {turn.question}
      </div>

      {turn.pending && (
        <div className="self-start text-body-sm text-ink-muted">
          <Spinner label="Looking this up in our career records…" />
        </div>
      )}

      {turn.failed && (
        <Callout variant="error">
          That message did not go through. Check your connection and try again.
        </Callout>
      )}

      {turn.response && !turn.response.is_crisis_response && (
        <div className="flex flex-col gap-xs self-start">
          <div className="rounded-lg rounded-bl-xs border border-hairline bg-surface px-sm py-xs">
            <p className="whitespace-pre-line text-body-sm text-ink">{turn.response.answer}</p>
          </div>

          {turn.response.ai_unavailable && (
            <p className="text-caption text-ink-muted">
              The assistant is unavailable right now — this is not an answer to your
              question.
            </p>
          )}

          {turn.response.citations.length > 0 && (
            <div className="flex flex-wrap items-center gap-xxs">
              <span className="eyebrow">Based on</span>
              {turn.response.citations.map((citation) => (
                <Badge key={citation.career_id}>
                  {citation.career_title}
                  <span className="text-ink-faint">· {citation.last_reviewed_date}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {turn.response?.is_crisis_response && <CrisisAnswer text={turn.response.answer} />}
    </li>
  );
}

export function ChatbotDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const { turns, ask, isSending } = useChatbot();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  if (!open) return null;

  function submit(question: string): void {
    ask(question);
    setDraft('');
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Career assistant"
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full w-full max-w-[440px] flex-col bg-surface shadow-level-2 animate-slide-in-right"
      >
        {/* The one place the AI accent paints a surface: the drawer header strip. */}
        <header className="flex items-center justify-between gap-md bg-ai-accent px-md py-sm text-ai-accent-soft">
          <div>
            <p className="text-body-sm font-semibold text-on-primary">Career assistant</p>
            <p className="text-caption">Answers only from our reviewed career records</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-md p-xxs text-on-primary hover:bg-ink/20"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-md py-md">
          {turns.length === 0 ? (
            <div className="flex flex-col gap-md">
              <Callout variant="info">
                Ask about any career in your list. If the answer is not in our reviewed
                records, this assistant will say so rather than guess.
              </Callout>
              <div className="flex flex-col gap-xs">
                <span className="eyebrow">Try asking</span>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-md border border-hairline px-sm py-xs text-left text-body-sm text-ink-secondary hover:bg-canvas-soft"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-md" aria-live="polite">
              {turns.map((turn) => (
                <TurnView key={turn.id} turn={turn} />
              ))}
            </ul>
          )}
          <div ref={listEndRef} />
        </div>

        <form
          className="border-t border-hairline p-md"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <div className="flex gap-xs">
            <label htmlFor="chat-input" className="sr-only">
              Ask a question about a career
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a career…"
              maxLength={2000}
              className="input"
              disabled={isSending}
            />
            <Button type="submit" disabled={!draft.trim() || isSending}>
              Ask
            </Button>
          </div>
          <p className="mt-xs text-caption text-ink-muted">
            Each question is answered on its own — the assistant does not remember earlier
            messages.
          </p>
        </form>
      </aside>
    </div>
  );
}

export function ChatbotFAB(): JSX.Element {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isCoursesPage = location.pathname === '/courses';

  return (
    <>
      {isCoursesPage ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask NextPath AI"
          aria-expanded={open}
          className={cn(
            'fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full',
            'bg-[#d6b6f6]/10 hover:bg-[#d6b6f6]/20 border border-[#d6b6f6]/40 text-[#391c57]',
            'transition-transform hover:scale-105 active:scale-95 shadow-none',
            'focus:outline-none focus:ring-2 focus:ring-[#0075de]',
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10a9.96 9.96 0 0 1-4.708-1.175L2 22l1.175-5.292A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2z" />
            <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2.5" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the career assistant"
          aria-expanded={open}
          className={cn(
            'fixed bottom-lg right-lg z-30 flex min-h-touch items-center gap-xs rounded-full',
            'bg-ai-accent px-md py-sm text-button text-on-primary shadow-level-1',
            'transition-transform hover:scale-[1.02]',
          )}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 5.5A2.5 2.5 0 015.5 3h9A2.5 2.5 0 0117 5.5v6a2.5 2.5 0 01-2.5 2.5H8l-4 3v-3H5.5A2.5 2.5 0 013 11.5v-6z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Ask
        </button>
      )}
      <ChatbotDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
