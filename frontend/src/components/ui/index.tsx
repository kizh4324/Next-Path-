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

// --- Badge -----------------------------------------------------------------------------
/**
 * Neutral, text-only badge. Fit and feasibility labels never get a colour: a green or
 * red pill reads as pass/fail, which is exactly the verdict framing the PRD forbids
 * (UX invariant 6). `tone` exists only for genuinely decorative uses.
 */
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ai' | 'success' | 'warning';
  className?: string;
}): JSX.Element {
  const toneClass = {
    neutral: '',
    ai: 'border-ai-accent text-ai-accent',
    success: 'border-success text-success',
    warning: 'border-warning text-warning-deep',
  }[tone];
  return <span className={cn('badge', toneClass, className)}>{children}</span>;
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
    error: 'border-error bg-error-soft text-ink',
    // Missing evidence is a neutral fact, not a warning — no alarm colour.
    evidence: 'border-hairline bg-canvas-soft text-ink-secondary',
    // Crisis surfaces are calm and high-contrast, never the warning token (invariant 8).
    support: 'border-ai-accent bg-surface text-ink',
  }[variant];

  return (
    <div className={cn('rounded-lg border p-md', styles)} role={variant === 'error' ? 'alert' : undefined}>
      {title && <p className="mb-xxs text-body-sm font-semibold text-ink">{title}</p>}
      <div className="text-body-sm">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <Card className="text-center">
      <h3 className="text-heading-3 text-ink">{title}</h3>
      <p className="mx-auto mt-xs max-w-[46ch] text-body-sm text-ink-muted">{description}</p>
      {action && <div className="mt-md flex justify-center">{action}</div>}
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
