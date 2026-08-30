/** Career card, comparison table, and skill list (FR-05, FR-07, FR-08, FR-11). */

import { Link } from 'react-router-dom';

import { Badge, Button, Callout, Card } from '@/components/ui';
import { MatchScoreBadge } from '@/components/ui/MatchScoreBadge';
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

  return (
    <Card as="article" className="flex flex-col gap-md border-hairline p-lg transition-all hover:border-outline">
      <div className="flex items-start justify-between gap-sm">
        <div>
          <span className="eyebrow text-ink-muted">
            Option #{recommendation.rank_position} · {career?.cluster ?? 'Career Pathway'}
          </span>
          <h3 className="text-heading-3 font-semibold text-ink mt-0.5">{recommendation.career_title}</h3>
        </div>
        {recommendation.is_primary_selection && <Badge tone="primary">Primary Pathway</Badge>}
        {recommendation.is_backup_selection && <Badge tone="ai">Backup Choice</Badge>}
      </div>

      <MatchScoreBadge
        compositeScore={recommendation.composite_score}
        fitLabel={recommendation.fit_label}
        feasibilityLabel={recommendation.feasibility_label}
        evidenceQualityLabel={recommendation.evidence_quality_label}
        fitScore={recommendation.fit_score}
        feasibilityScore={recommendation.feasibility_score}
        evidenceQualityScore={recommendation.evidence_quality_score}
      />

      {career && (
        <p className="text-body-sm text-ink-secondary leading-relaxed line-clamp-3">{career.description}</p>
      )}

      {route && (
        <div className="grid grid-cols-2 gap-sm rounded-lg bg-canvas-soft p-sm text-body-sm sm:grid-cols-3 border border-hairline">
          <div>
            <dt className="eyebrow text-ink-muted">Cheapest Route</dt>
            <dd className="text-ink font-medium text-xs mt-0.5">{route.route_name}</dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-muted">Est. Total Cost</dt>
            <dd className="text-ink font-medium text-xs mt-0.5">
              {formatInrRange(route.estimated_cost_inr_min, route.estimated_cost_inr_max)}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="eyebrow text-ink-muted">Duration</dt>
            <dd className="text-ink font-medium text-xs mt-0.5">{route.duration_years} Years</dd>
          </div>
        </div>
      )}

      {exams.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-1 text-ink-muted">Entrance Exams:</span>
          {exams.slice(0, 4).map((exam) => (
            <span key={exam} className="badge bg-surface border border-hairline text-ink font-mono text-[11px]">
              {exam}
            </span>
          ))}
        </div>
      )}

      {recommendation.reasons.length > 0 && (
        <div className="rounded-md border border-hairline/60 bg-surface/50 p-xs">
          <p className="eyebrow mb-xxs text-ink">Key Fit Alignment</p>
          <ul className="list-disc space-y-1 pl-md text-caption text-ink-secondary">
            {recommendation.reasons.slice(0, 2).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.concerns.length > 0 && (
        <div className="rounded-md border border-hairline/60 bg-surface/50 p-xs">
          <p className="eyebrow mb-xxs text-ink">Feasibility Constraints</p>
          <ul className="list-disc space-y-1 pl-md text-caption text-ink-secondary">
            {recommendation.concerns.slice(0, 2).map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.missing_evidence_flags.length > 0 && (
        <Callout variant="evidence" title="Unverified Signals">
          <ul className="list-disc space-y-xxs pl-md text-caption">
            {recommendation.missing_evidence_flags.slice(0, 2).map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-xs pt-xs border-t border-hairline">
        <Link to={`/careers/${recommendation.career_id}`} className="btn-utility text-xs">
          Detailed Dossier →
        </Link>
        <div className="flex gap-xs">
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(recommendation.career_id)}
              aria-pressed={selected}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selected
                  ? 'bg-ink text-surface border-ink font-medium'
                  : 'border-hairline bg-surface text-ink-secondary hover:text-ink hover:bg-canvas-soft'
              }`}
            >
              {selected ? '✓ Comparing' : '+ Compare'}
            </button>
          )}
          {onChoose && (
            <Button
              variant={chosenAs ? 'primary' : 'ghost'}
              className="text-xs px-3.5 py-1.5"
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
