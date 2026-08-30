/**
 * Design System v6 primitives.
 *
 * Every visual value here comes from a Tailwind token defined in tailwind.config.js.
 * No component in this file (or any other) may use a raw hex value.
 */

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/utils/cn';

// --- Button ----------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'utility' | 'ghost' | 'destructive';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  utility: 'btn-utility',
  ghost: 'btn-ghost',
  destructive: 'btn-destructive',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', fullWidth, loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(VARIANT_CLASS[variant], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ label }: { label?: string }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-xs" role="status">
      <svg
        className="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

// --- Card ------------------------------------------------------------------------------
export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}): JSX.Element {
  return <Tag className={cn('card', className)}>{children}</Tag>;
}

// --- Badge & Status Chips --------------------------------------------------------------
/**
 * Editorial Minimalism Badge:
 * - Neutral white pill + hairline border for general & fit/feasibility labels.
 * - 6px green dot for completed / acquired.
 * - 6px orange dot for skill gaps / attention.
 * - AI accent badge for AI-derived insights.
 */
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ai' | 'success' | 'warning' | 'primary';
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs bg-surface border border-hairline rounded-full px-sm py-xxs text-caption text-ink font-normal whitespace-nowrap',
        tone === 'primary' && 'border-primary/30 text-primary bg-primary/5 font-medium',
        tone === 'ai' && 'border-ai-accent/40 text-ai-accent bg-ai-accent-soft/20',
        tone === 'success' && 'border-hairline text-ink',
        tone === 'warning' && 'border-hairline text-ink',
        className,
      )}
    >
      {tone === 'success' && <span className="status-dot-success" aria-hidden="true" />}
      {tone === 'warning' && <span className="status-dot-warning" aria-hidden="true" />}
      {tone === 'primary' && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
      )}
      {tone === 'ai' && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-ai-accent shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
}

/**
 * Match Score Pill:
 * Displays a large primary-blue numeral pill paired with a small "Evidence Quality" caption.
 * Never shows a raw percentage alone.
 */
export function MatchScorePill({
  score,
  evidenceQuality,
  className,
}: {
  score: number;
  evidenceQuality?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <div className="inline-flex items-center justify-center rounded-full bg-primary-fixed/50 px-md py-1 border border-primary/20">
        <span className="text-heading-3 font-bold text-primary tabular-nums">
          {score}
        </span>
        <span className="text-body-sm font-semibold text-primary/70 ml-0.5">%</span>
      </div>
      <span className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
        {evidenceQuality ? `Evidence: ${evidenceQuality}` : 'Fit Index'}
      </span>
    </div>
  );
}

/**
 * Verified Source Tag:
 * Editorial attribution tag for dates, stats, entrance fees, and salary figures.
 */
export function VerifiedSourceTag({
  date,
  sourceName,
  className,
}: {
  date?: string;
  sourceName?: string;
  className?: string;
}): JSX.Element {
  return (
    <span className={cn('verified-tag text-caption', className)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        Source {sourceName ? `(${sourceName})` : ''} · Last verified {date || '2026'}
      </span>
    </span>
  );
}

// --- Form fields -------------------------------------------------------------------------
interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps): JSX.Element {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-xxs">
      <label htmlFor={id} className="text-body-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-ink-muted" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="text-caption text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ invalid, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('input', invalid && 'input-error', className)}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ invalid, className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('input min-h-[96px] py-sm', invalid && 'input-error', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('input appearance-none pr-lg', invalid && 'input-error', className)}
      {...rest}
    >
      {children}
    </select>
  );
});

/** Multi-select pill. 44px minimum touch target for mobile (UX accessibility checklist). */
export function Chip({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn('chip', selected && 'chip-selected')}
    >
      {children}
    </button>
  );
}

// --- Modal -------------------------------------------------------------------------------
export function Modal({
  open,
  title,
  onClose,
  children,
  dismissible = true,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** A consent gate is not dismissible — closing it would bypass the gate. */
  dismissible?: boolean;
}): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && dismissible) onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      // Focus trap: a dialog the keyboard can escape into the page behind it is not a
      // dialog (UX accessibility checklist).
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-md"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-wizard overflow-y-auto rounded-xl bg-surface p-lg shadow-level-2 animate-fade-in sm:rounded-xl"
      >
        <div className="mb-md flex items-start justify-between gap-md">
          <h2 id={titleId} className="text-heading-3 text-ink">
            {title}
          </h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-xxs text-ink-muted hover:bg-canvas-soft"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Feedback surfaces ---------------------------------------------------------------------
export function Callout({
  variant = 'info',
  title,
  children,
}: {
  variant?: 'info' | 'error' | 'evidence' | 'support';
  title?: string;
  children: ReactNode;
}): JSX.Element {
  const styles = {
    info: 'border-hairline bg-canvas-soft text-ink-secondary',
    // Reserved for validation failures and API errors (UX invariant 7).
    error: 'border-error bg-error-soft/40 text-ink',
    // Missing evidence is a neutral fact, not a warning — no alarm colour.
    evidence: 'border-hairline bg-canvas-soft text-ink-secondary',
    // Crisis surfaces are calm and high-contrast, strictly neutral/white (invariant 8).
    support: 'border-hairline bg-surface text-ink shadow-level-1',
  }[variant];

  return (
    <div
      className={cn('rounded-lg border p-md', styles)}
      role={variant === 'error' ? 'alert' : variant === 'support' ? 'region' : undefined}
    >
      {variant === 'support' && (
        <div className="mb-xs flex items-center gap-xs">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ai-accent-soft text-ai-accent text-xs font-bold">
            i
          </span>
          <p className="text-body-sm font-semibold text-ink">
            {title || 'Support & Confidential Guidance'}
          </p>
        </div>
      )}
      {variant !== 'support' && title && (
        <p className="mb-xxs text-body-sm font-semibold text-ink">{title}</p>
      )}
      <div className="text-body-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}): JSX.Element {
  return (
    <Card className="text-center py-xl">
      {icon ? (
        <div className="mx-auto mb-sm flex h-12 w-12 items-center justify-center rounded-full bg-canvas-soft border border-hairline text-xl">
          {icon}
        </div>
      ) : (
        <div className="mx-auto mb-sm flex h-10 w-10 items-center justify-center rounded-full bg-canvas-soft border border-hairline text-ink-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
      )}
      <h3 className="text-heading-3 text-ink font-semibold">{title}</h3>
      <p className="mx-auto mt-xs max-w-[50ch] text-body-sm text-ink-muted leading-relaxed">{description}</p>
      {action && <div className="mt-lg flex justify-center">{action}</div>}
    </Card>
  );
}

export function SkeletonCard(): JSX.Element {
  return (
    <div className="card animate-pulse" aria-hidden="true">
      <div className="h-4 w-1/3 rounded-xs bg-canvas-soft" />
      <div className="mt-sm h-3 w-full rounded-xs bg-canvas-soft" />
      <div className="mt-xxs h-3 w-4/5 rounded-xs bg-canvas-soft" />
      <div className="mt-md flex gap-xs">
        <div className="h-6 w-24 rounded-full bg-canvas-soft" />
        <div className="h-6 w-24 rounded-full bg-canvas-soft" />
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-canvas-soft"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
