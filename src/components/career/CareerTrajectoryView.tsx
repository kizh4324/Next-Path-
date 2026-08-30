/** Career mobility, vertical promotions, and lateral transition compass (FR-23 / roadmap.sh). */

import { Badge, Card, Callout, SkeletonCard } from '@/components/ui';
import { useCareerTrajectory } from '@/hooks/useRoadmap';
import type { CareerTrajectory, TrajectoryType } from '@/types/models';

export function CareerTrajectoryView({ careerId }: { careerId: string }): JSX.Element {
  const { data: trajectoryData, isLoading, isError } = useCareerTrajectory(careerId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-md py-md">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !trajectoryData) {
    return (
      <Callout variant="error">
        Could not load career progression trajectories for this pathway.
      </Callout>
    );
  }

  const trajectories = trajectoryData.trajectories;

  return (
    <div className="flex flex-col gap-lg py-sm">
      {/* Header Banner */}
      <Card className="bg-canvas-soft border-hairline">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <div className="flex items-center gap-xs">
              <span className="text-xl">🧭</span>
              <h2 className="text-heading-3 text-ink font-semibold">
                Where to Move Next — Career Progression Compass
              </h2>
            </div>
            <p className="mt-xxs text-body-sm text-ink-muted">
              Explore long-term advancement vectors, lateral multidisciplinary pivots, and the delta
              skills needed.
            </p>
          </div>
          <Badge tone="ai">Source: {trajectoryData.source_career_title}</Badge>
        </div>
      </Card>

      {/* Trajectory Cards Grid */}
      {trajectories.length === 0 ? (
        <Callout variant="info">
          No specialized progression tracks mapped yet for this career.
        </Callout>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {trajectories.map((traj) => (
            <TrajectoryCard key={traj.id} trajectory={traj} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrajectoryCard({ trajectory }: { trajectory: CareerTrajectory }): JSX.Element {
  const getBadgeConfig = (type: TrajectoryType) => {
    switch (type) {
      case 'vertical_advancement':
        return { label: '⬆️ Vertical Promotion', tone: 'success' as const };
      case 'lateral_transition':
        return { label: '🔄 Lateral Shift', tone: 'ai' as const };
      case 'specialization':
        return { label: '🎯 Deep Specialization', tone: 'warning' as const };
    }
  };

  const badge = getBadgeConfig(trajectory.trajectory_type);

  return (
    <Card className="flex flex-col justify-between border-hairline">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-xs">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <span className="text-xs font-semibold text-success">
            {trajectory.expected_salary_delta_inr}
          </span>
        </div>

        <h3 className="mt-sm text-title text-ink font-semibold">
          {trajectory.target_career_title}
        </h3>

        <div className="mt-xs flex items-center gap-sm text-caption text-ink-muted">
          <span>⏳ Experience: {trajectory.typical_years_experience}</span>
          <span>•</span>
          <span>🔄 Transferable Skills: {trajectory.transferable_skills_pct}%</span>
        </div>

        <p className="mt-sm text-body-sm text-ink-secondary">{trajectory.overview}</p>

        {/* Delta Skills Box */}
        {trajectory.required_delta_skills.length > 0 && (
          <div className="mt-md rounded-md bg-canvas-soft p-sm border border-hairline">
            <h4 className="text-caption font-semibold text-ink uppercase tracking-wide">
              Critical Delta Skills Needed:
            </h4>
            <div className="mt-xs flex flex-wrap gap-xxs">
              {trajectory.required_delta_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-primary shadow-2xs border border-primary/20"
                >
                  +{skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
