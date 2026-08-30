/** Interactive roadmap timeline with proof submission (FR-10, Story 3.4). */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge, Button, Callout, Card, EmptyState, Field, Input, Modal, ProgressBar, Select, SkeletonCard } from '@/components/ui';
import { useCompleteMilestone, useRoadmap } from '@/hooks/useRoadmap';
import { ApiError } from '@/services/api_client';
import { cn } from '@/utils/cn';
import { formatBucket, formatInr } from '@/utils/format';
import type { EvidenceType, Milestone, TimeframeBucket } from '@/types/models';
import { CareerTrajectoryView } from '@/components/career/CareerTrajectoryView';
import { SkillProjectLab } from '@/components/career/SkillProjectLab';
import { TopicSyllabusView } from '@/components/career/TopicSyllabusView';

const BUCKETS: TimeframeBucket[] = ['next_7_days', 'day_30', 'day_90', 'day_180'];

const EVIDENCE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: 'self_report', label: 'I just did it (no proof needed)' },
  { value: 'project_artifact', label: 'I made something — link to it' },
  { value: 'quiz_score', label: 'I scored on a test or quiz' },
  { value: 'mentor_confirmation', label: 'A teacher or mentor confirmed it' },
];

function MilestoneCard({
  milestone,
  onComplete,
}: {
  milestone: Milestone;
  onComplete: (milestone: Milestone) => void;
}): JSX.Element {
  const [showFallback, setShowFallback] = useState(false);

  return (
    <li className="relative pl-lg">
      {/* Timeline rail and node */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-px bg-hairline"
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-6 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-surface shadow-xs transition-colors',
          milestone.is_completed
            ? 'bg-success border-surface'
            : milestone.is_locked
              ? 'bg-outline border-surface'
              : 'bg-primary border-surface',
        )}
      />

      <Card className={cn('mb-md border-hairline p-md transition-all', milestone.is_locked && 'opacity-60 bg-canvas-soft/40')}>
        <div className="flex flex-wrap items-start justify-between gap-xs">
          <h3 className="text-title font-semibold text-ink">{milestone.title}</h3>
          <div className="flex flex-wrap gap-1">
            {milestone.is_low_cost_or_free ? (
              <Badge tone="success">100% Free</Badge>
            ) : (
              <Badge tone="primary">{formatInr(milestone.estimated_cost_inr)}</Badge>
            )}
            {milestone.is_completed && <Badge tone="success">✓ Completed</Badge>}
          </div>
        </div>

        <p className="mt-xs text-body-sm text-ink-secondary leading-relaxed">{milestone.description}</p>

        {milestone.is_locked && milestone.blocked_by.length > 0 && (
          <p className="mt-xs text-caption text-ink-muted">
            Prerequisite: {milestone.blocked_by.join(', ')}
          </p>
        )}

        {milestone.free_resource_url && (
          <a
            href={milestone.free_resource_url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-xs inline-flex items-center gap-1 text-body-sm text-primary hover:underline font-medium"
          >
            Access Free Learning Resource ↗
          </a>
        )}

        {/* Milestone fallback contingency */}
        <div className="mt-sm pt-xs border-t border-hairline/60">
          <button
            type="button"
            onClick={() => setShowFallback((open) => !open)}
            aria-expanded={showFallback}
            className="text-caption text-ink-muted hover:text-ink font-medium underline cursor-pointer"
          >
            {showFallback ? 'Hide contingency plan' : 'What if this pathway encounters obstacles?'}
          </button>
          {showFallback && (
            <div className="mt-xs rounded-md bg-canvas-soft p-sm text-body-sm text-ink-secondary border border-hairline">
              <span className="font-semibold text-ink block mb-xxs">Contingency Action:</span>
              {milestone.fallback_action}
            </div>
          )}
        </div>

        {milestone.is_completed ? (
          <p className="mt-sm text-caption text-success font-medium">
            Recorded Completed
            {milestone.completion_evidence_note_or_url
              ? ` · ${milestone.completion_evidence_note_or_url}`
              : ''}
          </p>
        ) : (
          <div className="mt-sm flex justify-end">
            <Button
              variant="utility"
              className="text-xs px-3 py-1"
              disabled={milestone.is_locked}
              onClick={() => onComplete(milestone)}
            >
              Mark Milestone Done
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}

type RoadmapTab = 'milestones' | 'syllabus' | 'projects' | 'trajectory';

export function RoadmapView(): JSX.Element {
  const navigate = useNavigate();
  const { data: roadmap, isLoading, isError } = useRoadmap();
  const complete = useCompleteMilestone();
  const [currentTab, setCurrentTab] = useState<RoadmapTab>('milestones');

  const [active, setActive] = useState<Milestone | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('self_report');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-lg">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError && !roadmap) {
    return (
      <EmptyState
        title="We could not load your roadmap"
        description="Check your connection and try again."
        action={<Button onClick={() => navigate(0)}>Retry</Button>}
      />
    );
  }

  if (!roadmap) {
    return (
      <EmptyState
        title="We could not load your roadmap"
        description="Check your connection and try again."
        action={<Button onClick={() => navigate(0)}>Retry</Button>}
      />
    );
  }

  async function submitCompletion(): Promise<void> {
    if (!active) return;
    if (evidenceType !== 'self_report' && !note.trim()) {
      setFormError('Add a link or a short note as proof.');
      return;
    }
    setFormError(null);
    try {
      await complete.mutateAsync({
        milestoneId: active.id,
        evidenceType,
        note: note.trim() || null,
      });
      setActive(null);
      setNote('');
      setEvidenceType('self_report');
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.message : 'We could not save that. Try again.',
      );
    }
  }

  const progress =
    roadmap.total_milestones === 0
      ? 0
      : (roadmap.completed_milestones / roadmap.total_milestones) * 100;

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-sm">
        <p className="eyebrow">Your plan</p>
        <h1 className="text-heading-2 text-ink">Becoming a {roadmap.primary_career_title}</h1>
        {roadmap.backup_career_title && (
          <p className="text-body-sm text-ink-muted">
            Backup path: {roadmap.backup_career_title}
          </p>
        )}
        <div className="mt-xs">
          <ProgressBar value={progress} label="Roadmap progress" />
          <p className="mt-xxs text-caption text-ink-muted">
            {roadmap.completed_milestones} of {roadmap.total_milestones} steps done ·{' '}
            {roadmap.free_milestone_count} of {roadmap.total_milestones} cost nothing
          </p>
        </div>
      </header>

      {/* Navigation Tabs (roadmap.sh Alignment) */}
      <div className="flex flex-wrap gap-1.5 border-b border-hairline pb-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'milestones'}
          onClick={() => setCurrentTab('milestones')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            currentTab === 'milestones'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-ink-secondary hover:bg-canvas-soft hover:text-ink'
          }`}
        >
          <span>Action Plan Milestones</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'syllabus'}
          onClick={() => setCurrentTab('syllabus')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            currentTab === 'syllabus'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-ink-secondary hover:bg-canvas-soft hover:text-ink'
          }`}
        >
          <span>Topic Syllabus</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'projects'}
          onClick={() => setCurrentTab('projects')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            currentTab === 'projects'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-ink-secondary hover:bg-canvas-soft hover:text-ink'
          }`}
        >
          <span>Project Lab</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === 'trajectory'}
          onClick={() => setCurrentTab('trajectory')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            currentTab === 'trajectory'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-ink-secondary hover:bg-canvas-soft hover:text-ink'
          }`}
        >
          <span>Career Progression</span>
        </button>
      </div>

      {/* Tab 1: Milestones */}
      {currentTab === 'milestones' && (
        <div className="flex flex-col gap-lg">
          {roadmap.total_estimated_cost_inr === 0 && (
            <Callout variant="info">
              Every step in this plan is free. Paid options exist for some of them, but none
              is required to make progress.
            </Callout>
          )}

          {BUCKETS.map((bucket) => {
            const milestones = roadmap.milestones.filter((m) => m.timeframe_bucket === bucket);
            if (milestones.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="mb-sm text-heading-3 text-ink">{formatBucket(bucket)}</h2>
                <ul className="ml-xs">
                  {milestones.map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      onComplete={setActive}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Tab 2: Topic Syllabus */}
      {currentTab === 'syllabus' && (
        <TopicSyllabusView careerId={roadmap.primary_career_id} />
      )}

      {/* Tab 3: Project Lab */}
      {currentTab === 'projects' && (
        <SkillProjectLab careerId={roadmap.primary_career_id} />
      )}

      {/* Tab 4: Career Progression Trajectory */}
      {currentTab === 'trajectory' && (
        <CareerTrajectoryView careerId={roadmap.primary_career_id} />
      )}

      <Card className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 className="text-title text-ink">Things changed?</h2>
          <p className="mt-xxs text-body-sm text-ink-muted">
            Redo your profile whenever your interests, marks, or circumstances shift.
            This plan and everything you completed stays in your history.
          </p>
        </div>
        <Link to="/results" className="btn-utility">
          Reassess
        </Link>
      </Card>

      <Modal
        open={active !== null}
        title={active ? `Mark done: ${active.title}` : ''}
        onClose={() => {
          setActive(null);
          setFormError(null);
        }}
      >
        <div className="flex flex-col gap-md">
          <Field label="How did you complete this?">
            {({ id }) => (
              <Select
                id={id}
                value={evidenceType}
                onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
              >
                {EVIDENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {evidenceType !== 'self_report' && (
            <Field
              label="Link or short note"
              hint="A repository link, a photo of a certificate, or a sentence describing what you did."
              error={formError ?? undefined}
              required
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  value={note}
                  invalid={invalid}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="https://… or a short description"
                />
              )}
            </Field>
          )}

          {formError && evidenceType === 'self_report' && (
            <Callout variant="error">{formError}</Callout>
          )}

          <div className="flex gap-xs">
            <Button onClick={() => void submitCompletion()} loading={complete.isPending}>
              Save
            </Button>
            <Button variant="utility" onClick={() => setActive(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
