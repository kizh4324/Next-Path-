/** Multi-option results (FR-05, FR-06, FR-07 — Story 2.4). */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CareerCard } from '@/components/career/CareerCard';
import { Button, Callout, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useEvaluate, useProfileStatus, useRecommendations, useSelectPathways } from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';

export function ResultsDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { data: status, isLoading: statusLoading } = useProfileStatus();
  const { data: batch, isLoading, error } = useRecommendations(
    status?.can_generate_recommendations ?? false,
  );
  const evaluate = useEvaluate();
  const selectPathways = useSelectPathways();

  const [comparing, setComparing] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggleCompare(careerId: string): void {
    setComparing((current) =>
      current.includes(careerId)
        ? current.filter((id) => id !== careerId)
        : current.length >= 3
          ? current
          : [...current, careerId],
    );
  }

  async function commit(): Promise<void> {
    if (!primary) return;
    setSubmitError(null);
    try {
      await selectPathways.mutateAsync({ primary, backup });
      navigate('/roadmap');
    } catch (caught) {
      setSubmitError(
        caught instanceof ApiError ? caught.message : 'We could not save your choice.',
      );
    }
  }

  if (statusLoading) {
    return (
      <div className="grid gap-md md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!status?.profile_exists) {
    return (
      <EmptyState
        title="Let's start with a few questions"
        description="We need to know a little about what you enjoy and what is realistic for you before we can suggest anything useful."
        action={<Button onClick={() => navigate('/onboarding')}>Start</Button>}
      />
    );
  }

  if (!status.can_generate_recommendations) {
    return (
      <EmptyState
        title="One more step"
        description={status.blocking_reason ?? 'Finish your profile to see your options.'}
        action={<Button onClick={() => navigate('/onboarding')}>Continue my profile</Button>}
      />
    );
  }

  const notFound = error instanceof ApiError && error.status === 404;
  if (notFound || (!batch && !isLoading)) {
    return (
      <EmptyState
        title="Ready when you are"
        description="Your profile is complete. Generate your shortlist to see three to five options with honest fit, feasibility, and evidence labels."
        action={
          <Button onClick={() => evaluate.mutate()} loading={evaluate.isPending}>
            Show my options
          </Button>
        }
      />
    );
  }

  if (isLoading || !batch) {
    return (
      <div className="grid gap-md md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-sm">
        <p className="eyebrow">
          Cycle {batch.batch_number} · {batch.recommendations.length} options
        </p>
        <h1 className="text-heading-1 text-ink">Options worth considering</h1>
        {/* Shipped with the data, not written into the template — the framing must
            survive any change to this view (PRD Section 15). */}
        <Callout variant="info">{batch.decision_support_notice}</Callout>
      </header>

      <div className="grid gap-md lg:grid-cols-2">
        {batch.recommendations.map((recommendation) => (
          <CareerCard
            key={recommendation.id}
            recommendation={recommendation}
            selected={comparing.includes(recommendation.career_id)}
            onToggleCompare={toggleCompare}
            chosenAs={
              primary === recommendation.career_id
                ? 'primary'
                : backup === recommendation.career_id
                  ? 'backup'
                  : undefined
            }
            onChoose={(careerId) => {
              if (primary === careerId) setPrimary(null);
              else if (backup === careerId) setBackup(null);
              else if (!primary) setPrimary(careerId);
              else if (!backup) setBackup(careerId);
              else setPrimary(careerId);
            }}
          />
        ))}
      </div>

      {comparing.length >= 2 && (
        <div className="sticky bottom-md z-20 flex justify-center">
          <Button
            onClick={() => navigate(`/compare?ids=${comparing.join(',')}`)}
            className="shadow-level-1"
          >
            Compare {comparing.length} side by side
          </Button>
        </div>
      )}

      <Card className="flex flex-col gap-md">
        <div>
          <h2 className="text-heading-3 text-ink">Choose a direction</h2>
          <p className="mt-xxs text-body-sm text-ink-muted">
            Pick a primary path and, if you can, a realistic backup. Neither is
            permanent — you can change both at any time, and your history is kept.
          </p>
        </div>

        <dl className="grid gap-sm sm:grid-cols-2">
          <div className="rounded-lg border border-hairline p-sm">
            <dt className="eyebrow">Primary</dt>
            <dd className="text-body-sm text-ink">
              {batch.recommendations.find((r) => r.career_id === primary)?.career_title ??
                'Not chosen — tap "Choose this path" on a card'}
            </dd>
          </div>
          <div className="rounded-lg border border-hairline p-sm">
            <dt className="eyebrow">Backup (optional)</dt>
            <dd className="text-body-sm text-ink">
              {batch.recommendations.find((r) => r.career_id === backup)?.career_title ??
                'Not chosen'}
            </dd>
          </div>
        </dl>

        {submitError && <Callout variant="error">{submitError}</Callout>}

        <div className="flex flex-wrap gap-xs">
          <Button onClick={() => void commit()} disabled={!primary} loading={selectPathways.isPending}>
            Build my roadmap
          </Button>
          <Button variant="ghost" onClick={() => navigate('/onboarding')}>
            Still exploring — change my answers
          </Button>
        </div>
      </Card>
    </div>
  );
}
