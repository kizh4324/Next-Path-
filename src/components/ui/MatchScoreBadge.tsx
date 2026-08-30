/**
 * The three-part match indicator (FR-06, FR-07, UX invariant 6).
 *
 * This component exists to make one rule unbreakable: a match number is never rendered
 * on its own. Fit, Feasibility, and Evidence Quality always ship together, because the
 * PRD (Sections 15-16) forbids presenting a single confident figure without the
 * evidence context that qualifies it.
 *
 * The badges are neutral and text-only. Colouring them green or red would turn a
 * nuanced three-way reading into a pass/fail verdict — the exact misreading the
 * decomposition is meant to prevent.
 */

import { Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { EvidenceQualityLabel, FeasibilityLabel, FitLabel } from '@/types/models';

interface MatchScoreBadgeProps {
  compositeScore: number;
  fitLabel: FitLabel;
  feasibilityLabel: FeasibilityLabel;
  evidenceQualityLabel: EvidenceQualityLabel;
  fitScore?: number;
  feasibilityScore?: number;
  evidenceQualityScore?: number;
  /** `full` shows the numeral; `compact` shows only the three labels. */
  variant?: 'full' | 'compact';
  className?: string;
}

const FIT_MEANING: Record<FitLabel, string> = {
  Strong: 'Your interests and stated strengths line up closely with this work.',
  Moderate: 'Real overlap with your interests, with some areas still unexplored.',
  Emerging: 'Early signs of a fit, based on limited signals so far.',
  'Insufficient evidence': "We don't yet know enough about you to judge the fit.",
};

const FEASIBILITY_MEANING: Record<FeasibilityLabel, string> = {
  High: 'Direct, affordable entry routes exist within reach of where you are.',
  Moderate: 'Realistic with a moderate budget or a standard entrance exam.',
  Challenging: 'Expect high cost, strict entrance filters, or relocation.',
  Low: 'Severe budget or prerequisite barriers stand in the way right now.',
};

const EVIDENCE_MEANING: Record<EvidenceQualityLabel, string> = {
  High: 'Based on a full profile with academic records.',
  Moderate: 'Based on your questionnaire; records not verified.',
  Preliminary: 'Based on partial answers — treat this as exploratory.',
  Sparse: 'Key information is missing, so read this with real caution.',
};

function LabelledBadge({
  caption,
  label,
  meaning,
  score,
}: {
  caption: string;
  label: string;
  meaning: string;
  score?: number;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="eyebrow">{caption}</span>
      <Badge className="justify-center">
        <span title={meaning}>{label}</span>
        {score !== undefined && (
          <span className="text-ink-muted" aria-hidden="true">
            {Math.round(score)}
          </span>
        )}
      </Badge>
      <span className="sr-only">
        {caption}: {label}. {meaning}
      </span>
    </div>
  );
}

export function MatchScoreBadge({
  compositeScore,
  fitLabel,
  feasibilityLabel,
  evidenceQualityLabel,
  fitScore,
  feasibilityScore,
  evidenceQualityScore,
  variant = 'full',
  className,
}: MatchScoreBadgeProps): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-sm', className)}>
      {variant === 'full' && (
        <div className="flex items-baseline gap-xs">
          <span className="text-heading-1 text-ink" aria-hidden="true">
            {Math.round(compositeScore)}
          </span>
          <span className="text-body-sm text-ink-muted">
            overall — read the three parts below, not this number alone
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-xs">
        <LabelledBadge
          caption="Fit"
          label={fitLabel}
          meaning={FIT_MEANING[fitLabel]}
          score={fitScore}
        />
        <LabelledBadge
          caption="Feasibility"
          label={feasibilityLabel}
          meaning={FEASIBILITY_MEANING[feasibilityLabel]}
          score={feasibilityScore}
        />
        <LabelledBadge
          caption="Evidence"
          label={evidenceQualityLabel}
          meaning={EVIDENCE_MEANING[evidenceQualityLabel]}
          score={evidenceQualityScore}
        />
      </div>
    </div>
  );
}

export { EVIDENCE_MEANING, FEASIBILITY_MEANING, FIT_MEANING };
