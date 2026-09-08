/** Career card, comparison table, and skill list (FR-05, FR-07, FR-08, FR-11). */

import { Link } from 'react-router-dom';

import { Badge, Button, Callout, Card } from '@/components/ui';
import {
  EVIDENCE_MEANING,
  FEASIBILITY_MEANING,
  FIT_MEANING,
} from '@/components/ui/MatchScoreBadge';
import { formatInrRange } from '@/utils/format';
import type {
  CareerCompareResponse,
  CareerSummary,
  Recommendation,
  SkillGapItem,
} from '@/types/models';

function cheapestRoute(career: CareerSummary) {
  if (career.india_entry_routes.length === 0) return null;
  return career.india_entry_routes.reduce((cheapest, route) =>
    route.estimated_cost_inr_min < cheapest.estimated_cost_inr_min ? route : cheapest,
  );
}

export function CareerCard({
  recommendation,
  selected,
  onToggleCompare,
  chosenAs,
  onChoose,
}: {
  recommendation: Recommendation;
  selected?: boolean;
  onToggleCompare?: (careerId: string) => void;
  chosenAs?: 'primary' | 'backup';
  onChoose?: (careerId: string) => void;
}): JSX.Element {
  const career = recommendation.career;
  const route = career ? cheapestRoute(career) : null;
  const exams = career
    ? Array.from(new Set(career.india_entry_routes.flatMap((r) => r.entrance_exams)))
    : [];

  const keyFitReason = recommendation.reasons[0];
  const feasibilityNote = recommendation.concerns[0];

  return (
    <Card
      as="article"
      className="flex flex-col gap-2.5 rounded-xl border border-hairline bg-surface p-4 sm:p-4.5 transition-colors hover:border-ink-faint/40 shadow-none h-full"
    >
      {/* 1. Header: Cluster eyebrow, Career Title & Compact Match Score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block truncate">
            Option #{recommendation.rank_position} · {career?.cluster ?? 'Career Pathway'}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-ink leading-snug tracking-tight mt-0.5">
            {recommendation.career_title}
          </h3>
        </div>

        {/* Compact Match Score */}
        <div
          className="flex items-baseline gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0"
          title={`Overall Match Score: ${Math.round(recommendation.composite_score)}%`}
        >
          <span className="text-base sm:text-lg font-bold text-primary leading-none">
            {Math.round(recommendation.composite_score)}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-80">
            Match
          </span>
        </div>
      </div>

      {/* 2. Fit, Feasibility, Evidence small compact pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span
          title={FIT_MEANING[recommendation.fit_label]}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-canvas-soft border border-hairline text-ink-secondary"
        >
          <span className="text-ink-muted font-normal">Fit:</span>
          <span className="font-semibold text-ink">{recommendation.fit_label}</span>
        </span>
        <span
          title={FEASIBILITY_MEANING[recommendation.feasibility_label]}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-canvas-soft border border-hairline text-ink-secondary"
        >
          <span className="text-ink-muted font-normal">Feasibility:</span>
          <span className="font-semibold text-ink">{recommendation.feasibility_label}</span>
        </span>
        <span
          title={EVIDENCE_MEANING[recommendation.evidence_quality_label]}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-canvas-soft border border-hairline text-ink-secondary"
        >
          <span className="text-ink-muted font-normal">Evidence:</span>
          <span className="font-semibold text-ink">{recommendation.evidence_quality_label}</span>
        </span>
      </div>

      {/* 3. Short 1-2 line description */}
      {career?.description && (
        <p className="text-xs sm:text-[13px] text-ink-secondary leading-relaxed line-clamp-2">
          {career.description}
        </p>
      )}

      {/* 4. Route metrics: Cheapest Route, Estimated Total Cost, Duration */}
      {route && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-canvas-soft/80 border border-hairline p-2 text-xs">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block truncate">
              Cheapest Route
            </span>
            <span
              className="text-xs font-semibold text-ink block truncate mt-0.5"
              title={route.route_name}
            >
              {route.route_name}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block truncate">
              Est. Total Cost
            </span>
            <span className="text-xs font-semibold text-ink block truncate mt-0.5">
              {formatInrRange(route.estimated_cost_inr_min, route.estimated_cost_inr_max)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block truncate">
              Duration
            </span>
            <span className="text-xs font-semibold text-ink block truncate mt-0.5">
              {route.duration_years} Years
            </span>
          </div>
        </div>
      )}

      {/* 5. Entrance exams: max 2-3 tags, then + more */}
      {exams.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-ink-muted">Exams:</span>
          {exams.slice(0, 3).map((exam) => (
            <span
              key={exam}
              className="px-1.5 py-0.2 rounded text-[11px] font-mono font-medium bg-canvas-soft border border-hairline text-ink"
            >
              {exam}
            </span>
          ))}
          {exams.length > 3 && (
            <span className="text-[11px] font-medium text-ink-muted">
              +{exams.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* 6. Key Fit Alignment and Feasibility Note (compact) */}
      {(keyFitReason || feasibilityNote) && (
        <div className="rounded-lg bg-canvas-soft/60 border border-hairline px-2.5 py-1.5 space-y-1 text-xs">
          {keyFitReason && (
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">
                Key Fit:
              </span>
              <span className="text-ink-secondary truncate text-xs" title={keyFitReason}>
                {keyFitReason}
              </span>
            </div>
          )}
          {feasibilityNote && (
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-warning-deep shrink-0">
                Feasibility:
              </span>
              <span className="text-ink-secondary truncate text-xs" title={feasibilityNote}>
                {feasibilityNote}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 7. Bottom Actions: Detailed Dossier, Compare, Select */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline">
        <Link
          to={`/careers/${recommendation.career_id}`}
          className="text-xs font-semibold text-primary hover:text-primary-active transition-colors inline-flex items-center gap-0.5 py-1"
        >
          Detailed Dossier →
        </Link>
        <div className="flex items-center gap-1.5">
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(recommendation.career_id)}
              aria-pressed={selected}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                selected
                  ? 'bg-ink text-surface border-ink font-semibold'
                  : 'border-hairline bg-surface text-ink-secondary hover:text-ink hover:bg-canvas-soft'
              }`}
            >
              {selected ? '✓ Comparing' : '+ Compare'}
            </button>
          )}
          {onChoose && (
            <Button
              variant={chosenAs ? 'primary' : 'ghost'}
              className="text-xs px-3 py-1 h-auto"
              onClick={() => onChoose(recommendation.career_id)}
            >
              {chosenAs === 'primary'
                ? '★ Primary'
                : chosenAs === 'backup'
                  ? 'Backup'
                  : 'Select'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ComparisonTable({ data }: { data: CareerCompareResponse }): JSX.Element {
  return (
    <div className="flex flex-col gap-md">
      {data.careers_without_market_evidence.length > 0 && (
        <Callout variant="evidence" title="Missing market evidence">
          We hold no dated job-market data for{' '}
          {data.careers_without_market_evidence.join(', ')}. That means we do not know —
          not that demand is weak.
        </Callout>
      )}

      {/* Wide table scrolls inside its own container so the page never scrolls sideways. */}
      <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-body-sm">
          <caption className="sr-only">Side-by-side comparison of selected careers</caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="p-sm text-left text-eyebrow uppercase text-ink-muted">
                Dimension
              </th>
              {data.careers.map((career) => (
                <th key={career.id} scope="col" className="p-sm text-left text-body-sm text-ink">
                  {career.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.dimension} className="border-b border-hairline last:border-0 align-top">
                <th scope="row" className="p-sm text-left font-medium text-ink-secondary">
                  {row.dimension}
                  {row.note && (
                    <span className="mt-xxs block text-caption font-normal text-ink-faint">
                      {row.note}
                    </span>
                  )}
                </th>
                {data.careers.map((career) => (
                  <td key={career.id} className="p-sm text-ink">
                    {row.values[career.id] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkillList({
  title,
  skills,
}: {
  title: string;
  skills: SkillGapItem[];
}): JSX.Element | null {
  if (skills.length === 0) return null;

  return (
    <section className="flex flex-col gap-xs">
      <h3 className="text-title text-ink">{title}</h3>
      <ul className="flex flex-col gap-xs">
        {skills.map((skill) => (
          <li
            key={skill.skill_name}
            className="rounded-sm border border-hairline bg-surface p-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-xs">
              <span className="text-body-sm font-medium text-ink">{skill.skill_name}</span>
              {skill.is_already_held ? (
                <Badge tone="success">You rated yourself strong here</Badge>
              ) : (
                <Badge tone="warning">Gap to close</Badge>
              )}
            </div>
            <p className="mt-xxs text-body-sm text-ink-secondary">{skill.description}</p>
            <a
              href={skill.free_learning_resource_url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-xs inline-block text-body-sm text-primary underline"
            >
              Free: {skill.free_learning_resource_name}
            </a>
            <p className="mt-xxs text-caption text-ink-faint">{skill.commercial_disclosure}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
