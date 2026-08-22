/** Plain-language guardian summary (FR-17, Story 4.4). */

import { useNavigate } from 'react-router-dom';

import { Badge, Button, Callout, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useGuardianSummary } from '@/hooks/useRoadmap';
import { ApiError } from '@/services/api_client';
import { formatDate, formatInrRange } from '@/utils/format';

export function GuardianSummaryView(): JSX.Element {
  const navigate = useNavigate();
  const { data: summary, isLoading, error } = useGuardianSummary();

  if (isLoading) return <SkeletonCard />;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Nothing to share yet"
        description="Once your options are generated, we will write a plain-language summary you can go through with a parent or guardian."
        action={<Button onClick={() => navigate('/results')}>See my options</Button>}
      />
    );
  }

  if (!summary) {
    return (
      <EmptyState
        title="We could not load the summary"
        description="Check your connection and try again."
        action={<Button onClick={() => navigate(0)}>Retry</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <header>
        <p className="eyebrow">For a parent or guardian</p>
        <h1 className="text-heading-2 text-ink">What your child has been exploring</h1>
      </header>

      <Card>
        <p className="whitespace-pre-line text-body-md text-ink">{summary.summary_text}</p>
        <p className="mt-md text-caption text-ink-faint">
          Written {formatDate(summary.generated_at)}
          {summary.generated_without_ai && ' · generated from the stored figures directly'}
        </p>
      </Card>

      {summary.guardian_priorities_reflected.length > 0 && (
        <Card>
          <h2 className="text-title text-ink">What you told us matters to you</h2>
          <div className="mt-xs flex flex-wrap gap-xxs">
            {summary.guardian_priorities_reflected.map((priority) => (
              <Badge key={priority}>{priority}</Badge>
            ))}
          </div>
        </Card>
      )}

      {summary.cost_breakdown.length > 0 && (
        <Card className="flex flex-col gap-md">
          <div>
            <h2 className="text-heading-3 text-ink">What each option would cost</h2>
            <p className="mt-xxs text-body-sm text-ink-muted">
              Total programme costs, not annual fees. Ranges are wide because fees vary
              by state, institution, and admission quota — treat these as a starting
              point for your own enquiries, not a quote.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-hairline text-left">
                  <th scope="col" className="py-xs pr-sm text-eyebrow uppercase text-ink-muted">
                    Career
                  </th>
                  <th scope="col" className="py-xs pr-sm text-eyebrow uppercase text-ink-muted">
                    Cheapest route
                  </th>
                  <th scope="col" className="py-xs pr-sm text-eyebrow uppercase text-ink-muted">
                    Total cost
                  </th>
                  <th scope="col" className="py-xs text-eyebrow uppercase text-ink-muted">
                    Years
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.cost_breakdown.map((item) => (
                  <tr key={item.career_title} className="border-b border-hairline last:border-0">
                    <td className="py-sm pr-sm text-ink">{item.career_title}</td>
                    <td className="py-sm pr-sm text-ink-secondary">
                      {item.route_name}
                      {item.low_cost_alternative_route && (
                        <span className="mt-xxs block text-caption text-ink-muted">
                          Cheaper option: {item.low_cost_alternative_route}
                        </span>
                      )}
                    </td>
                    <td className="py-sm pr-sm text-ink">
                      {formatInrRange(item.estimated_cost_inr_min, item.estimated_cost_inr_max)}
                    </td>
                    <td className="py-sm text-ink">{item.duration_years}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {summary.discussion_points.length > 0 && (
        <Card>
          <h2 className="text-heading-3 text-ink">Worth talking about together</h2>
          <ul className="mt-sm list-disc space-y-xs pl-md text-body-sm text-ink-secondary">
            {summary.discussion_points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Card>
      )}

      <Callout variant="info" title="How to read this">
        These are options to discuss, not a test result and not a prediction. Nothing
        here says what your child will become or ranks their ability. If you and your
        child disagree — which is normal — you can ask for a counselor conversation from
        the options page.
      </Callout>
    </div>
  );
}
