/** Multi-option results (FR-05, FR-06, FR-07 — Story 2.4). */

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { CareerCard } from '@/components/career/CareerCard';
import { Button, Callout, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useEvaluate, useProfile, useProfileStatus, useRecommendations, useSelectPathways } from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';

export function ResultsDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const hasCompletedLocal =
    typeof window !== 'undefined' && window.localStorage.getItem('onboarding_completed') === 'true';
  const { data: status, isLoading: statusLoading } = useProfileStatus();
  const canGenerate = Boolean(status?.can_generate_recommendations || hasCompletedLocal);
  const { data: batch, isLoading, error } = useRecommendations(canGenerate);
  const evaluate = useEvaluate();
  const selectPathways = useSelectPathways();

  const [comparing, setComparing] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  let localDraft: any = null;
  try {
    if (typeof window !== 'undefined') {
      localDraft = JSON.parse(window.localStorage.getItem('nextpath_onboarding_draft') || '{}');
    }
  } catch {
    // Ignore storage parse errors
  }

  // Dynamic student name (strictly user's actual registered name or local profile name)
  const studentName =
    user?.full_name?.trim() ||
    localDraft?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Student';

  const studentInitials =
    studentName
      .split(' ')
      .filter(Boolean)
      .map((part: string) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'S';

  // Dynamic actual class
  const studentClass =
    profile?.grade_or_year?.trim() ||
    localDraft?.grade_or_year?.trim() ||
    (profile?.education_stage === 'class_8_10' || localDraft?.education_stage === 'class_8_10'
      ? 'Class 10'
      : profile?.education_stage === 'class_11_12' || localDraft?.education_stage === 'class_11_12'
        ? 'Class 11'
        : profile?.education_stage === 'early_college' || localDraft?.education_stage === 'early_college'
          ? 'Early College'
          : '');

  // Dynamic actual stream / subjects
  const streamRaw =
    profile?.current_stream?.trim() ||
    localDraft?.current_stream?.trim() ||
    profile?.degree?.trim() ||
    localDraft?.degree?.trim() ||
    '';
  const branchRaw =
    profile?.engineering_branch?.trim() ||
    localDraft?.engineering_branch?.trim() ||
    '';

  let streamSubjects = '';
  if (streamRaw && branchRaw && !streamRaw.includes(branchRaw)) {
    streamSubjects = `${streamRaw} (${branchRaw})`;
  } else if (streamRaw) {
    streamSubjects = streamRaw;
  } else if ((profile?.education_stage || localDraft?.education_stage) === 'class_8_10') {
    streamSubjects = 'General';
  }

  // Combine class and stream e.g. "Class 10 • General" or "Class 11 • Science (PCM)"
  const studentAcademicLine = [studentClass, streamSubjects].filter(Boolean).join(' • ');

  // If recommendations have not yet been evaluated, automatically evaluate them once profile exists
  useEffect(() => {
    if (
      (status?.profile_exists || hasCompletedLocal) &&
      !batch &&
      !isLoading &&
      !evaluate.isPending &&
      !evaluate.data
    ) {
      evaluate.mutate();
    }
  }, [status?.profile_exists, hasCompletedLocal, batch, isLoading, evaluate]);

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

  if (statusLoading || (hasCompletedLocal && !status?.profile_exists)) {
    return (
      <div className="grid gap-md md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!status?.profile_exists && !hasCompletedLocal) {
    return <Navigate to="/onboarding" replace />;
  }

  if (status && !status.can_generate_recommendations && !hasCompletedLocal) {
    return (
      <EmptyState
        title="One more step"
        description={status.blocking_reason ?? 'Finish your profile to see your options.'}
        action={<Button onClick={() => navigate('/onboarding')}>Continue my profile</Button>}
      />
    );
  }

  if (isLoading || evaluate.isPending || (!batch && !error)) {
    return (
      <div className="grid gap-md md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
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
      {/* Student Profile Card - Loaded dynamically from user's actual profile/account */}
      <section
        aria-label="Student profile summary"
        className="rounded-xl border border-hairline/90 bg-surface p-4 sm:p-5 shadow-xs transition-shadow"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-base font-bold text-primary shadow-xs"
            >
              {studentInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-ink">
                  {studentName}
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#f4f3f0] border border-hairline px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                  Student
                </span>
              </div>
              {studentAcademicLine ? (
                <p className="text-xs sm:text-sm font-medium text-ink-secondary mt-0.5">
                  {studentAcademicLine}
                </p>
              ) : null}
            </div>
          </div>

          {/* Quick Hub Navigation to Student Features */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => navigate('/roadmap')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => navigate('/scholarships')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Scholarships
            </button>
            <button
              type="button"
              onClick={() => navigate('/progress')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Progress
            </button>
          </div>
        </div>
      </section>

      <header className="flex flex-col gap-sm">
        <p className="eyebrow">
          Assessment Cycle {batch.batch_number} · {batch.recommendations.length} Career Matches
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
