/** Formatting helpers shared across views. */

/**
 * Indian digit grouping: ₹2,50,000 rather than ₹250,000.
 *
 * `Intl` with the `en-IN` locale does this correctly, and doing it by hand is a
 * classic source of subtly wrong numbers in Indian products.
 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInrRange(min: number, max: number): string {
  if (min === max) return formatInr(min);
  return `${formatInr(min)} – ${formatInr(max)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const STAGE_LABELS: Record<string, string> = {
  class_8_10: 'Class 8–10',
  class_11_12: 'Class 11–12',
  early_college: 'Early college',
};

export function formatStage(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

const BUCKET_LABELS: Record<string, string> = {
  next_7_days: 'This week',
  day_30: 'First 30 days',
  day_90: 'By day 90',
  day_180: 'By day 180',
};

export function formatBucket(bucket: string): string {
  return BUCKET_LABELS[bucket] ?? bucket;
}

const TRIGGER_LABELS: Record<string, string> = {
  crisis_safety_flag: 'Safety concern',
  student_parent_deadlock: 'Student–guardian deadlock',
  severe_constraint_conflict: 'Constraints rule out every option',
  high_stakes_choice: 'High-stakes decision',
  low_evidence_profile: 'Not enough information',
  student_requested: 'Student asked for help',
};

export function formatTrigger(trigger: string): string {
  return TRIGGER_LABELS[trigger] ?? trigger.replace(/_/g, ' ');
}

/** Sentence-case a snake_case key for display, e.g. `social_science` → `Social science`. */
export function humanize(key: string): string {
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
