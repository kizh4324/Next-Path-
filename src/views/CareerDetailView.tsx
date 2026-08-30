/** Career deep-dive with market evidence or an explicit missing-evidence state (FR-04, FR-14). */

import { Link, useParams } from 'react-router-dom';

import { SkillList } from '@/components/career/CareerCard';
import { CareerTrajectoryView } from '@/components/career/CareerTrajectoryView';
import { SkillProjectLab } from '@/components/career/SkillProjectLab';
import { TopicSyllabusView } from '@/components/career/TopicSyllabusView';
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
        description="This pathway could not be found in our current verified catalogue."
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
      <nav aria-label="Breadcrumb">
        <Link to="/results" className="inline-flex items-center gap-1 text-caption text-primary hover:underline font-medium">
          ← Back to My Options
        </Link>
      </nav>

      <header className="flex flex-col gap-xs border-b border-hairline pb-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <span className="eyebrow text-ink-muted">{career.cluster}</span>
          <span className="badge bg-surface border border-hairline text-ink-secondary text-caption font-mono">
            O*NET-SOC {career.onet_soc_code}
          </span>
        </div>
        <h1 className="text-heading-1 font-bold text-ink tracking-tight">{career.title}</h1>
        <p className="text-body-md text-ink-secondary max-w-[75ch] leading-relaxed">{career.description}</p>
        <div className="mt-xxs flex flex-wrap items-center gap-xs">
          <span className="text-caption text-ink-muted">
            Verified evidence by {career.content_owner} · Last audited {formatDate(career.last_reviewed_date)}
          </span>
        </div>
      </header>

      <Card className="border-hairline p-lg">
        <h2 className="text-heading-3 font-semibold text-ink">Day-to-Day Work Reality</h2>
        <p className="mt-xs text-body-md text-ink-secondary leading-relaxed">{career.work_reality_summary}</p>
      </Card>

      <Card className="flex flex-col gap-md border-hairline p-lg">
        <div>
          <h2 className="text-heading-3 font-semibold text-ink">Academic & Entrance Pathways in India</h2>
          <p className="text-body-sm text-ink-muted mt-xxs">
            Verified degree programs, fee structures, and entrance exams.
          </p>
        </div>
        <ul className="flex flex-col gap-sm">
          {career.india_entry_routes.map((route) => (
            <li key={route.route_name} className="rounded-xl border border-hairline bg-surface p-md">
              <div className="flex flex-wrap items-baseline justify-between gap-xs">
                <p className="text-title font-semibold text-ink">{route.route_name}</p>
                <span className="badge bg-canvas-soft border border-hairline text-caption font-medium text-ink">
                  {route.degree_or_cert_awarded}
                </span>
              </div>
              <dl className="mt-sm grid gap-xs text-body-sm sm:grid-cols-3 bg-canvas-soft/70 rounded-lg p-sm border border-hairline">
                <div>
                  <dt className="eyebrow text-ink-muted">Est. Total Cost</dt>
                  <dd className="text-ink font-semibold text-body-sm mt-0.5">
                    {formatInrRange(route.estimated_cost_inr_min, route.estimated_cost_inr_max)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink-muted">Duration</dt>
                  <dd className="text-ink font-medium text-body-sm mt-0.5">{route.duration_years} Years</dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink-muted">Target Qualification</dt>
                  <dd className="text-ink font-medium text-body-sm mt-0.5">{route.degree_or_cert_awarded}</dd>
                </div>
              </dl>
              {route.entrance_exams.length > 0 && (
                <div className="mt-sm flex flex-wrap items-center gap-1.5">
                  <span className="eyebrow text-ink-muted mr-1">Required Entrance:</span>
                  {route.entrance_exams.map((exam) => (
                    <span key={exam} className="badge bg-surface border border-hairline text-ink font-mono text-xs">
                      {exam}
                    </span>
                  ))}
                </div>
              )}
              {route.low_cost_alternative_route && (
                <p className="mt-sm rounded-md bg-canvas-container/50 border border-hairline p-xs text-caption text-ink-secondary">
                  <strong className="font-medium text-ink">Economical Route: </strong>
                  {route.low_cost_alternative_route}
                </p>
              )}
            </li>
          ))}
        </ul>
        {career.prerequisites.length > 0 && (
          <p className="text-body-sm text-ink-secondary pt-xs border-t border-hairline">
            <strong className="font-semibold text-ink">School prerequisites: </strong>
            {career.prerequisites.join('; ')}
          </p>
        )}
      </Card>

      {career.risks_and_tradeoffs.length > 0 && (
        <Card className="border-hairline p-lg">
          <h2 className="text-heading-3 font-semibold text-ink">Trade-offs and Ground Realities</h2>
          <ul className="mt-xs list-disc space-y-1 pl-md text-body-sm text-ink-secondary">
            {career.risks_and_tradeoffs.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
          {career.regional_caveats && (
            <p className="mt-sm text-body-sm text-ink-secondary bg-canvas-soft rounded-md p-xs border border-hairline">
              <strong className="font-medium text-ink">Regional Considerations: </strong>
              {career.regional_caveats}
            </p>
          )}
        </Card>
      )}

      {career.market_snapshot ? (
        <MarketEvidence snapshot={career.market_snapshot} />
      ) : (
        career.market_evidence_unavailable && (
          <Card className="border-hairline p-lg">
            <h2 className="text-heading-3 font-semibold text-ink">Job Market Evidence</h2>
            <Callout variant="evidence" title="No verified market survey data">
              <p>{career.market_evidence_unavailable.reason}</p>
              <p className="mt-xs">{career.market_evidence_unavailable.what_would_help}</p>
            </Callout>
          </Card>
        )
      )}

      {gaps && (
        <Card className="flex flex-col gap-lg border-hairline p-lg">
          <div>
            <h2 className="text-heading-3 font-semibold text-ink">Required Skills & Free Learning Links</h2>
            <p className="mt-xxs text-body-sm text-ink-muted">{gaps.free_first_note}</p>
          </div>
          <SkillList title="Essential Competencies" skills={gaps.essential} />
          <SkillList title="High-Value Skills" skills={gaps.useful} />
          <SkillList title="Optional Enhancements" skills={gaps.optional} />
        </Card>
      )}

      {/* Curriculum, Projects & Trajectory Tabs */}
      <section className="flex flex-col gap-md">
        <h2 className="text-heading-2 font-bold text-ink">Structured Curriculum & Progression</h2>
        <TopicSyllabusView careerId={career.id} />
        <SkillProjectLab careerId={career.id} />
        <CareerTrajectoryView careerId={career.id} />
      </section>

      <Card className="border-hairline p-lg">
        <h2 className="text-title font-semibold text-ink">Verified Data Attribution & Sources</h2>
        <p className="mt-xxs text-caption text-ink-muted">
          Maintained by {career.content_owner} · Last audited{' '}
          {formatDate(career.last_reviewed_date)} · Review cycle every{' '}
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
                  className="text-body-sm text-primary hover:underline font-medium"
                >
                  {new URL(link).hostname} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </article>
  );
}
