/**
 * Counselor triage portal (FR-15, Story 5.2).
 *
 * Must render an anonymized ticket without crashing: after a student exercises their
 * right to erasure, the crisis record survives with `student_id = null` and a scrubbed
 * snapshot, and the counselor still needs to see it.
 */

import { useState } from 'react';

import { Badge, Button, Callout, Card, EmptyState, Field, SkeletonCard, Textarea } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { counselorApi } from '@/services/endpoints';
import { queryKeys } from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';
import { formatDate, formatTrigger, humanize } from '@/utils/format';
import type { Escalation, EscalationStatus } from '@/types/models';

const STATUS_FLOW: EscalationStatus[] = [
  'pending',
  'under_review',
  'session_scheduled',
  'resolved',
  'overridden',
];

function SnapshotView({ escalation }: { escalation: Escalation }): JSX.Element {
  const snapshot = escalation.student_summary_snapshot as Record<string, unknown>;

  if (escalation.is_anonymized) {
    return (
      <Callout variant="info" title="[Anonymized Profile / Closed Account]">
        This student deleted their account. The safety record is retained without any
        identifying details, as a duty-of-care audit trail. The decision context below is
        all that remains.
        <dl className="mt-sm grid gap-xs sm:grid-cols-2">
          {(['education_stage', 'budget_tier', 'relocation_willingness'] as const).map((key) =>
            snapshot[key] ? (
              <div key={key}>
                <dt className="eyebrow">{humanize(key)}</dt>
                <dd className="text-body-sm text-ink">{String(snapshot[key])}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </Callout>
    );
  }

  const recommendations = (snapshot.recommendations ?? []) as {
    rank: number;
    career: string;
    fit: string;
    feasibility: string;
    evidence_quality: string;
  }[];

  return (
    <div className="flex flex-col gap-sm">
      <dl className="grid gap-xs sm:grid-cols-2">
        {(
          [
            'full_name',
            'education_stage',
            'grade_or_year',
            'degree',
            'engineering_branch',
            'current_stream',
            'budget_tier',
            'relocation_willingness',
            'profile_completeness_pct',
          ] as const
        ).map((key) =>
          snapshot[key] !== undefined && snapshot[key] !== null ? (
            <div key={key}>
              <dt className="eyebrow">{humanize(key)}</dt>
              <dd className="text-body-sm text-ink">{String(snapshot[key])}</dd>
            </div>
          ) : null,
        )}
      </dl>

      {typeof snapshot.student_note === 'string' && snapshot.student_note && (
        <div>
          <p className="eyebrow">In the student's words</p>
          <p className="text-body-sm text-ink-secondary">{snapshot.student_note}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <p className="eyebrow mb-xxs">What they were shown</p>
          <ul className="space-y-xxs text-body-sm text-ink-secondary">
            {recommendations.map((recommendation) => (
              <li key={recommendation.rank}>
                #{recommendation.rank} {recommendation.career} — fit {recommendation.fit},
                feasibility {recommendation.feasibility}, evidence{' '}
                {recommendation.evidence_quality}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ escalation }: { escalation: Escalation }): JSX.Element {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<EscalationStatus>(escalation.status);
  const [notes, setNotes] = useState(escalation.counselor_notes ?? '');
  const [decision, setDecision] = useState(escalation.counselor_override_decision ?? '');
  const [rationale, setRationale] = useState(escalation.counselor_override_rationale ?? '');
  const [error, setError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: () =>
      counselorApi.review(escalation.id, {
        status,
        counselor_notes: notes || null,
        counselor_override_decision: decision || null,
        counselor_override_rationale: rationale || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['counselor', 'queue'] });
      setError(null);
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : 'Could not save the review.'),
  });

  // Mirrors the server rule so the counselor sees it before submitting (FR-15).
  const rationaleMissing = Boolean(decision.trim()) && !rationale.trim();

  return (
    <div className="mt-md flex flex-col gap-md border-t border-hairline pt-md">
      <Field label="Status">
        {({ id }) => (
          <select
            id={id}
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value as EscalationStatus)}
          >
            {STATUS_FLOW.map((option) => (
              <option key={option} value={option}>
                {humanize(option)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Your notes">
        {({ id }) => (
          <Textarea
            id={id}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What you found, what you advised, what happens next."
          />
        )}
      </Field>

      <Field
        label="Override decision"
        hint="Only if you are changing what the system told this student."
      >
        {({ id }) => (
          <Textarea
            id={id}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            placeholder="e.g. Recommend the commerce stream instead of science."
          />
        )}
      </Field>

      {decision.trim() && (
        <Field
          label="Why you are overriding"
          hint="Mandatory. A decision that changes what a student was told has to carry its reasoning."
          error={rationaleMissing ? 'A rationale is required whenever you record an override.' : undefined}
          required
        >
          {({ id, invalid }) => (
            <Textarea
              id={id}
              value={rationale}
              invalid={invalid}
              onChange={(event) => setRationale(event.target.value)}
            />
          )}
        </Field>
      )}

      {error && <Callout variant="error">{error}</Callout>}

      <Button
        onClick={() => review.mutate()}
        loading={review.isPending}
        disabled={rationaleMissing}
        className="self-start"
      >
        Save review
      </Button>
    </div>
  );
}

export function CounselorQueueView(): JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.counselorQueue(),
    queryFn: () => counselorApi.queue(),
    refetchInterval: 60_000,
  });

  if (isLoading) return <SkeletonCard />;

  if (!data || data.total === 0) {
    return (
      <EmptyState
        title="Nothing in the queue"
        description="No students are waiting for a conversation right now."
      />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-wrap items-baseline justify-between gap-xs">
        <div>
          <p className="eyebrow">Triage</p>
          <h1 className="text-heading-2 text-ink">{data.total} waiting</h1>
        </div>
        {data.crisis_count > 0 && (
          <Callout variant="support" title={`${data.crisis_count} safety concern${data.crisis_count === 1 ? '' : 's'}`}>
            These are at the top of the list and should be actioned first.
          </Callout>
        )}
      </header>

      <ul className="flex flex-col gap-md">
        {data.results.map((escalation) => (
          <Card as="li" key={escalation.id}>
            <div className="flex flex-wrap items-start justify-between gap-xs">
              <div>
                <div className="flex flex-wrap items-center gap-xxs">
                  <h2 className="text-title text-ink">
                    {formatTrigger(escalation.trigger_reason)}
                  </h2>
                  {escalation.trigger_reason === 'crisis_safety_flag' && (
                    <Badge tone="ai">Priority</Badge>
                  )}
                  {escalation.is_anonymized && <Badge>Account closed</Badge>}
                </div>
                <p className="mt-xxs text-caption text-ink-muted">
                  Raised {formatDate(escalation.created_at)} · {humanize(escalation.status)}
                </p>
              </div>
              <Button
                variant="utility"
                onClick={() => setExpanded(expanded === escalation.id ? null : escalation.id)}
                aria-expanded={expanded === escalation.id}
              >
                {expanded === escalation.id ? 'Collapse' : 'Review'}
              </Button>
            </div>

            {expanded === escalation.id && (
              <div className="mt-md">
                <SnapshotView escalation={escalation} />
                <ReviewForm escalation={escalation} />
              </div>
            )}
          </Card>
        ))}
      </ul>
    </div>
  );
}
