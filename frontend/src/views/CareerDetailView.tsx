/** Career deep-dive with market evidence or an explicit missing-evidence state (FR-04, FR-14). */

import { Link, useParams } from 'react-router-dom';

import { SkillList } from '@/components/career/CareerCard';
import { Badge, Callout, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useCareer, useSkillGaps } from '@/hooks/useRecommendations';
import { formatDate, formatInrRange } from '@/utils/format';
import type { MarketSnapshot } from '@/types/models';

function MarketEvidence({ snapshot }: { snapshot: MarketSnapshot }): JSX.Element {
  return (
    <Card className="flex flex-col gap-md">
      <div className="flex flex-wrap items-baseline justify-between gap-xs">
        <h2 className="text-heading-3 text-ink">What the job market looked like</h2>
        <Badge>Demand: {snapshot.demand_indicator}</Badge>
      </div>

      <dl className="grid gap-sm sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Entry-level range</dt>
          <dd className="text-body-md text-ink">{snapshot.salary_range_entry_inr}</dd>
        </div>
        <div>
          <dt className="eyebrow">Mid-level range</dt>
          <dd className="text-body-md text-ink">{snapshot.salary_range_mid_inr}</dd>
        </div>
      </dl>

      {snapshot.top_demanded_skills.length > 0 && (
        <div>
          <p className="eyebrow mb-xxs">Most requested skills</p>
          <div className="flex flex-wrap gap-xxs">
            {snapshot.top_demanded_skills.slice(0, 8).map((entry) => (
              <Badge key={entry.skill}>
                {entry.skill}
                <span className="text-ink-faint">{entry.share_pct}%</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {snapshot.top_hiring_locations.length > 0 && (
        <div>
          <p className="eyebrow mb-xxs">Where the postings were</p>
          <div className="flex flex-wrap gap-xxs">
            {snapshot.top_hiring_locations.slice(0, 6).map((entry) => (
              <Badge key={entry.location}>
                {entry.location}
                <span className="text-ink-faint">{entry.share_pct}%</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Both caveats are mandatory fields on the record and are always rendered —
          a number without them would be exactly the overclaim the PRD forbids. */}
      <Callout variant="evidence" title="Read these figures carefully">
        <p>{snapshot.competition_caveat}</p>
        <p className="mt-xs">{snapshot.uncertainty_statement}</p>
      </Callout>

      <p className="text-caption text-ink-faint">
        {snapshot.data_source} · {snapshot.timeframe_period} · {snapshot.geography} ·
        updated {formatDate(snapshot.last_updated_date)}
      </p>
    </Card>
  );
}

export function CareerDetailView(): JSX.Element {
  const { careerId } = useParams<{ careerId: string }>();
  const { data: career, isLoading } = useCareer(careerId);
  const { data: gaps } = useSkillGaps(careerId);

  if (isLoading) return <SkeletonCard />;
  if (!career) {
    return (
      <EmptyState
        title="Career not found"
        description="This career is not in our catalogue."
        action={
          <Link to="/results" className="btn-utility">
            Back to my options
          </Link>
        }
      />
    );
  }

  return (
    <article className="flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <p className="eyebrow">{career.cluster}</p>
        <h1 className="text-heading-2 text-ink">{career.title}</h1>
        <p className="text-body-md text-ink-secondary">{career.description}</p>
      </header>

      <Card>
        <h2 className="text-heading-3 text-ink">What the work is actually like</h2>
        <p className="mt-xs text-body-md text-ink-secondary">{career.work_reality_summary}</p>
      </Card>

      <Card className="flex flex-col gap-md">
        <h2 className="text-heading-3 text-ink">Ways into this in India</h2>
        <ul className="flex flex-col gap-sm">
          {career.india_entry_routes.map((route) => (
            <li key={route.route_name} className="rounded-lg border border-hairline p-sm">
              <p className="text-title text-ink">{route.route_name}</p>
              <dl className="mt-xs grid gap-xs text-body-sm sm:grid-cols-3">
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
                <div>
                  <dt className="eyebrow">You come out with</dt>
                  <dd className="text-ink">{route.degree_or_cert_awarded}</dd>
                </div>
              </dl>
              {route.entrance_exams.length > 0 && (
                <div className="mt-xs flex flex-wrap items-center gap-xxs">
                  <span className="eyebrow">Exams</span>
                  {route.entrance_exams.map((exam) => (
                    <Badge key={exam}>{exam}</Badge>
                  ))}
                </div>
              )}
              {route.low_cost_alternative_route && (
                <p className="mt-xs rounded-sm bg-canvas-soft p-xs text-body-sm text-ink-secondary">
                  <span className="font-medium text-ink">Cheaper route: </span>
                  {route.low_cost_alternative_route}
                </p>
              )}
            </li>
          ))}
        </ul>
        {career.prerequisites.length > 0 && (
          <p className="text-body-sm text-ink-muted">
            <span className="font-medium text-ink">School subjects needed: </span>
            {career.prerequisites.join('; ')}
          </p>
        )}
      </Card>

      {career.risks_and_tradeoffs.length > 0 && (
        <Card>
          <h2 className="text-heading-3 text-ink">Risks and trade-offs</h2>
          <ul className="mt-xs list-disc space-y-xxs pl-md text-body-sm text-ink-secondary">
            {career.risks_and_tradeoffs.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
          {career.regional_caveats && (
            <p className="mt-sm text-body-sm text-ink-secondary">
              <span className="font-medium text-ink">Where this matters: </span>
              {career.regional_caveats}
            </p>
          )}
        </Card>
      )}

      {career.market_snapshot ? (
        <MarketEvidence snapshot={career.market_snapshot} />
      ) : (
        career.market_evidence_unavailable && (
          <Card>
            <h2 className="text-heading-3 text-ink">Job market</h2>
            <Callout variant="evidence" title="No verified market evidence">
              <p>{career.market_evidence_unavailable.reason}</p>
              <p className="mt-xs">{career.market_evidence_unavailable.what_would_help}</p>
            </Callout>
          </Card>
        )
      )}

      {gaps && (
        <Card className="flex flex-col gap-lg">
          <div>
            <h2 className="text-heading-3 text-ink">Skills this needs</h2>
            <p className="mt-xxs text-body-sm text-ink-muted">{gaps.free_first_note}</p>
          </div>
          <SkillList title="Essential" skills={gaps.essential} />
          <SkillList title="Useful" skills={gaps.useful} />
          <SkillList title="Optional" skills={gaps.optional} />
        </Card>
      )}

      <Card>
        <h2 className="text-title text-ink">Where this information comes from</h2>
        <p className="mt-xxs text-caption text-ink-muted">
          Maintained by {career.content_owner} · last reviewed{' '}
          {formatDate(career.last_reviewed_date)} · reviewed every{' '}
          {career.review_cycle_months} months · O*NET-SOC {career.onet_soc_code}
        </p>
        {career.source_links.length > 0 && (
          <ul className="mt-xs flex flex-wrap gap-sm">
            {career.source_links.map((link) => (
              <li key={link}>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-body-sm text-primary underline"
                >
                  {new URL(link).hostname}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </article>
  );
}
