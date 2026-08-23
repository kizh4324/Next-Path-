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
    <Card as="article" className="flex flex-col gap-md">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="eyebrow">
            #{recommendation.rank_position} · {career?.cluster ?? 'Career'}
          </p>
          <h3 className="text-heading-3 text-ink">{recommendation.career_title}</h3>
        </div>
        {recommendation.is_primary_selection && <Badge>Your primary choice</Badge>}
        {recommendation.is_backup_selection && <Badge>Your backup</Badge>}
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
        <p className="text-body-sm text-ink-secondary line-clamp-3">{career.description}</p>
      )}

      {route && (
        <dl className="grid grid-cols-2 gap-sm text-body-sm sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Cheapest route</dt>
            <dd className="text-ink">{route.route_name}</dd>
          </div>
          <div>
            <dt className="eyebrow">Total cost</dt>
            <dd className="text-ink">
              {formatInrRange(route.estimated_cost_inr_min, route.estimated_cost_inr_max)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Duration</dt>
            <dd className="text-ink">{route.duration_years} years</dd>
          </div>
        </dl>
      )}

      {exams.length > 0 && (
        <div className="flex flex-wrap items-center gap-xxs">
          <span className="eyebrow">Exams</span>
          {exams.slice(0, 4).map((exam) => (
            <Badge key={exam}>{exam}</Badge>
          ))}
        </div>
      )}

      {recommendation.reasons.length > 0 && (
        <div>
          <p className="eyebrow mb-xxs">Why this appeared</p>
          <ul className="list-disc space-y-xxs pl-md text-body-sm text-ink-secondary">
            {recommendation.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.concerns.length > 0 && (
        <div>
          <p className="eyebrow mb-xxs">What would make this harder</p>
          <ul className="list-disc space-y-xxs pl-md text-body-sm text-ink-secondary">
            {recommendation.concerns.slice(0, 3).map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.missing_evidence_flags.length > 0 && (
        <Callout variant="evidence" title="What we still don't know">
          <ul className="list-disc space-y-xxs pl-md">
            {recommendation.missing_evidence_flags.slice(0, 3).map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="mt-auto flex flex-wrap gap-xs pt-xs">
        <Link to={`/careers/${recommendation.career_id}`} className="btn-utility">
          See the full picture
        </Link>
        {onToggleCompare && (
          <button
            type="button"
            onClick={() => onToggleCompare(recommendation.career_id)}
            aria-pressed={selected}
            className={selected ? 'btn-primary' : 'btn-utility'}
          >
            {selected ? 'Selected to compare' : 'Compare'}
          </button>
        )}
        {onChoose && (
          <Button
            variant={chosenAs ? 'primary' : 'ghost'}
            onClick={() => onChoose(recommendation.career_id)}
          >
            {chosenAs === 'primary'
              ? '✓ Primary choice'
              : chosenAs === 'backup'
                ? '✓ Backup choice'
                : 'Choose this path'}
          </Button>
        )}
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
