/** Phased topic syllabus viewer with free learning resources (FR-21 / roadmap.sh). */

import { useState } from 'react';

import { Badge, Card, Callout, SkeletonCard } from '@/components/ui';
import { useCareerSyllabus } from '@/hooks/useRoadmap';
import { cn } from '@/utils/cn';
import type { SyllabusPhase, TopicItem } from '@/types/models';

export function TopicSyllabusView({ careerId }: { careerId: string }): JSX.Element {
  const { data: syllabus, isLoading, isError } = useCareerSyllabus(careerId);
  const [completedTopicIds, setCompletedTopicIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`np_syllabus_completed_${careerId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleTopic = (topicId: number) => {
    setCompletedTopicIds((prev) => {
      const next = prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId];
      try {
        localStorage.setItem(`np_syllabus_completed_${careerId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-md py-md">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !syllabus) {
    return (
      <Callout variant="error">
        Could not load the topic syllabus for this career path. Please check back shortly.
      </Callout>
    );
  }

  const allTopicsCount = syllabus.phases.reduce((acc, p) => acc + p.topics.length, 0);
  const completedCount = completedTopicIds.length;
  const progressPct = allTopicsCount > 0 ? Math.round((completedCount / allTopicsCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-lg py-sm">
      {/* Header Banner */}
      <Card className="bg-canvas-soft border-hairline">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <div className="flex items-center gap-xs">
              <span className="text-xl">📚</span>
              <h2 className="text-heading-3 text-ink font-semibold">
                {syllabus.career_title} — Step-by-Step Curriculum
              </h2>
            </div>
            <p className="mt-xxs text-body-sm text-ink-muted">
              Curated syllabus with verified free resources. Check off topics as you learn.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <Badge tone="ai">⏱️ ~{syllabus.total_estimated_hours} Study Hours</Badge>
            <Badge tone={progressPct === 100 ? 'success' : 'neutral'}>
              {completedCount}/{allTopicsCount} Completed ({progressPct}%)
            </Badge>
          </div>
        </div>
      </Card>

      {/* Phased Roadmap Trees */}
      <div className="flex flex-col gap-md">
        {syllabus.phases.map((phase) => (
          <PhaseSection
            key={phase.phase_number}
            phase={phase}
            completedTopicIds={completedTopicIds}
            onToggleTopic={toggleTopic}
          />
        ))}
      </div>
    </div>
  );
}

function PhaseSection({
  phase,
  completedTopicIds,
  onToggleTopic,
}: {
  phase: SyllabusPhase;
  completedTopicIds: number[];
  onToggleTopic: (id: number) => void;
}): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  const phaseCompleted = phase.topics.every((t) => completedTopicIds.includes(t.id));
  const phaseCompletedCount = phase.topics.filter((t) => completedTopicIds.includes(t.id)).length;

  return (
    <Card className="p-0 overflow-hidden border-hairline">
      {/* Phase Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-md text-left bg-canvas-soft hover:bg-canvas-muted transition-colors"
      >
        <div className="flex items-center gap-sm">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-caption font-bold transition-colors',
              phaseCompleted
                ? 'bg-success text-surface'
                : 'bg-primary/10 text-primary',
            )}
          >
            {phaseCompleted ? '✓' : phase.phase_number}
          </span>
          <div>
            <h3 className="text-title text-ink font-semibold">{phase.phase_title}</h3>
            <p className="text-caption text-ink-muted">
              {phaseCompletedCount} of {phase.topics.length} topics mastered
            </p>
          </div>
        </div>
        <span className="text-ink-muted text-sm">{isExpanded ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {/* Topic List */}
      {isExpanded && (
        <div className="divide-y divide-hairline p-md pt-0 bg-surface">
          {phase.topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              isDone={completedTopicIds.includes(topic.id)}
              onToggle={() => onToggleTopic(topic.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function TopicRow({
  topic,
  isDone,
  onToggle,
}: {
  topic: TopicItem;
  isDone: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <div
      className={cn(
        'py-md flex flex-col md:flex-row md:items-start justify-between gap-sm transition-opacity',
        isDone && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-sm flex-1">
        <input
          type="checkbox"
          checked={isDone}
          onChange={onToggle}
          aria-label={`Mark ${topic.topic_title} as completed`}
          className="mt-1 h-4 w-4 rounded border-hairline text-primary focus:ring-primary cursor-pointer"
        />
        <div className="flex flex-col gap-xxs">
          <div className="flex items-center gap-xs flex-wrap">
            <h4
              className={cn(
                'text-body font-medium text-ink',
                isDone && 'line-through text-ink-muted',
              )}
            >
              {topic.topic_title}
            </h4>
            <Badge tone="neutral">~{topic.estimated_hours} hrs</Badge>
            {topic.is_optional && <Badge tone="neutral">Optional</Badge>}
          </div>
          <p className="text-body-sm text-ink-secondary">{topic.description}</p>
          {topic.key_concepts.length > 0 && (
            <div className="flex flex-wrap gap-xxs mt-xxs">
              {topic.key_concepts.map((concept) => (
                <span
                  key={concept}
                  className="rounded bg-canvas-soft px-1.5 py-0.5 text-xs text-ink-muted"
                >
                  #{concept}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Free Resource Link */}
      <div className="flex items-center md:items-end justify-end shrink-0 pl-md md:pl-0">
        <a
          href={topic.free_resource_url}
          target="_blank"
          rel="noreferrer noopener"
          className="btn-utility text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          <span>📖 Free Course ({topic.free_resource_name})</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}
