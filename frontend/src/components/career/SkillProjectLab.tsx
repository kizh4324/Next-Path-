/** Skill-based project ideas explorer and proof submission portal (FR-22 / roadmap.sh). */

import { useState } from 'react';

import { Badge, Button, Card, Callout, Field, Input, Modal, SkeletonCard } from '@/components/ui';
import { useCareerProjects, useProjectSubmissions, useSubmitProject } from '@/hooks/useRoadmap';
import type { ProjectDifficulty, SkillProjectIdea } from '@/types/models';

export function SkillProjectLab({ careerId }: { careerId: string }): JSX.Element {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeProject, setActiveProject] = useState<SkillProjectIdea | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: projectsData, isLoading } = useCareerProjects(
    careerId,
    selectedDifficulty === 'all' ? undefined : selectedDifficulty,
  );
  const { data: mySubmissions } = useProjectSubmissions();
  const submitMutation = useSubmitProject();

  const submittedProjectIds = new Set(mySubmissions?.map((s) => s.project_id) ?? []);

  const handleSubmitProof = async () => {
    if (!activeProject) return;
    if (!repoUrl.trim().startsWith('http://') && !repoUrl.trim().startsWith('https://')) {
      setSubmitError('Please enter a valid URL starting with https://');
      return;
    }
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync({
        projectId: activeProject.id,
        repositoryOrLiveUrl: repoUrl.trim(),
        reflectionNotes: notes.trim() || null,
      });
      setActiveProject(null);
      setRepoUrl('');
      setNotes('');
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit proof. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-md py-md">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const projects = projectsData?.projects ?? [];

  return (
    <div className="flex flex-col gap-lg py-sm">
      {/* Header Banner */}
      <Card className="bg-canvas-soft border-hairline">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <div className="flex items-center gap-xs">
              <span className="text-xl">💻</span>
              <h2 className="text-heading-3 text-ink font-semibold">
                Project Lab — Practical Proof of Work
              </h2>
            </div>
            <p className="mt-xxs text-body-sm text-ink-muted">
              Real-world portfolio projects categorized by difficulty. Build, publish, and submit proof.
            </p>
          </div>
          <div className="flex items-center gap-xs">
            <Badge tone="success">🏆 {submittedProjectIds.size} Projects Completed</Badge>
          </div>
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="mt-md flex flex-wrap gap-xs border-t border-hairline pt-sm">
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => setSelectedDifficulty(diff)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                selectedDifficulty === diff
                  ? 'bg-primary text-surface shadow-sm'
                  : 'bg-surface text-ink-muted hover:bg-canvas-muted'
              }`}
            >
              {diff === 'all' ? 'All Tiers' : diff}
            </button>
          ))}
        </div>
      </Card>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Callout variant="info">No project ideas matching the selected difficulty filter.</Callout>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {projects.map((project) => {
            const isCompleted = submittedProjectIds.has(project.id);
            return (
              <ProjectCard
                key={project.id}
                project={project}
                isCompleted={isCompleted}
                onSubmitClick={() => {
                  setActiveProject(project);
                  setSubmitError(null);
                }}
              />
            );
          })}
        </div>
      )}

      {/* Project Submission Modal */}
      <Modal
        open={activeProject !== null}
        title={activeProject ? `Submit Proof: ${activeProject.title}` : ''}
        onClose={() => {
          setActiveProject(null);
          setSubmitError(null);
        }}
      >
        <div className="flex flex-col gap-md">
          <p className="text-body-sm text-ink-secondary">
            Paste your GitHub repository, live web app URL, or Figma prototype link to record your
            proof-of-work.
          </p>

          <Field
            label="Repository or Live Project URL"
            hint="e.g. https://github.com/yourname/task-cli or https://figma.com/proto/..."
            required
            error={submitError ?? undefined}
          >
            {({ id, invalid }) => (
              <Input
                id={id}
                value={repoUrl}
                invalid={invalid}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://..."
              />
            )}
          </Field>

          <Field
            label="Reflection Notes (Optional)"
            hint="What was the hardest part? What did you learn while building this?"
          >
            {({ id }) => (
              <textarea
                id={id}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your design decisions, bugs fixed, or test findings..."
                className="w-full rounded-md border border-hairline bg-surface p-sm text-body-sm text-ink focus:border-primary focus:outline-none"
              />
            )}
          </Field>

          {submitError && <Callout variant="error">{submitError}</Callout>}

          <div className="flex gap-xs justify-end mt-sm">
            <Button variant="utility" onClick={() => setActiveProject(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitProof()} loading={submitMutation.isPending}>
              Submit Proof of Work
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProjectCard({
  project,
  isCompleted,
  onSubmitClick,
}: {
  project: SkillProjectIdea;
  isCompleted: boolean;
  onSubmitClick: () => void;
}): JSX.Element {
  const [showDetails, setShowDetails] = useState(false);

  const getDifficultyTone = (diff: ProjectDifficulty) => {
    switch (diff) {
      case 'beginner':
        return 'success' as const;
      case 'intermediate':
        return 'warning' as const;
      case 'advanced':
        return 'ai' as const;
      default:
        return 'neutral' as const;
    }
  };

  return (
    <Card className="flex flex-col justify-between border-hairline hover:border-ink-muted/40 transition-colors">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-xs">
          <div className="flex items-center gap-xxs flex-wrap">
            <Badge tone={getDifficultyTone(project.difficulty)}>{project.difficulty}</Badge>
            <Badge tone="neutral">{project.tag}</Badge>
            {isCompleted && <Badge tone="success">✓ Completed</Badge>}
          </div>
        </div>

        <h3 className="mt-sm text-title text-ink font-semibold">{project.title}</h3>
        <p className="mt-xs text-body-sm text-ink-secondary">{project.summary}</p>

        {/* Skills Exercised */}
        <div className="mt-sm flex flex-wrap gap-xxs">
          {project.skills_exercised.map((skill) => (
            <span
              key={skill}
              className="rounded bg-canvas-soft px-1.5 py-0.5 text-xs text-ink-secondary"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Expandable Requirements Checklist */}
        <div className="mt-md">
          <button
            type="button"
            onClick={() => setShowDetails((p) => !p)}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            {showDetails ? 'Hide Requirements ▲' : 'View Requirements & Constraints ▼'}
          </button>

          {showDetails && (
            <div className="mt-sm space-y-sm rounded-md bg-canvas-soft p-sm text-xs text-ink-secondary">
              <div>
                <strong className="text-ink font-medium">Requirements:</strong>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {project.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              {project.constraints.length > 0 && (
                <div>
                  <strong className="text-ink font-medium">Constraints:</strong>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    {project.constraints.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {project.example_input_output && (
                <div>
                  <strong className="text-ink font-medium">Example Usage:</strong>
                  <pre className="mt-1 rounded bg-canvas-muted p-1.5 font-mono text-[11px] text-ink overflow-x-auto">
                    {project.example_input_output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-md pt-sm border-t border-hairline flex items-center justify-between">
        <span className="text-xs text-ink-muted">
          {isCompleted ? 'Portfolio evidence recorded' : 'Ready to build'}
        </span>
        <Button
          variant={isCompleted ? 'utility' : 'primary'}
          onClick={onSubmitClick}
        >
          {isCompleted ? 'Update Proof ↗' : 'Submit Proof ↗'}
        </Button>
      </div>
    </Card>
  );
}
