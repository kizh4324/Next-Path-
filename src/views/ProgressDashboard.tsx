/**
 * Visual progress analytics (FR-28, Story 6.2 — P1).
 *
 * Charts use the decorative accent tokens (sky, teal, success), never the structural
 * primary — that blue means "you can act here", and a chart series is not an action.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge, Button, Callout, Card, EmptyState, ProgressBar, SkeletonCard } from '@/components/ui';
import { useRecommendationHistory } from '@/hooks/useRecommendations';
import { useRoadmap } from '@/hooks/useRoadmap';
import { ApiError } from '@/services/api_client';
import { formatBucket, formatDate } from '@/utils/format';

// Categorical series colours, from the decorative palette only.
const SERIES = {
  completed: '#1aae39',
  remaining: '#e6e6e6',
  bar: '#62aef0',
};

export function ProgressDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { data: roadmap, isLoading, error } = useRoadmap();
  const { data: history } = useRecommendationHistory();

  const byBucket = useMemo(() => {
    if (!roadmap) return [];
    const buckets = ['next_7_days', 'day_30', 'day_90', 'day_180'] as const;
    return buckets.map((bucket) => {
      const milestones = roadmap.milestones.filter((m) => m.timeframe_bucket === bucket);
      const completed = milestones.filter((m) => m.is_completed).length;
      return {
        bucket: formatBucket(bucket),
        completed,
        remaining: milestones.length - completed,
        total: milestones.length,
      };
    });
  }, [roadmap]);

  const byType = useMemo(() => {
    if (!roadmap) return [];
    const counts = new Map<string, { total: number; completed: number }>();
    for (const milestone of roadmap.milestones) {
      const key = milestone.milestone_type.replace(/_/g, ' ');
      const entry = counts.get(key) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (milestone.is_completed) entry.completed += 1;
      counts.set(key, entry);
    }
    return Array.from(counts, ([type, value]) => ({ type, ...value }));
  }, [roadmap]);

  if (isLoading) return <SkeletonCard />;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="No progress to show yet"
        description="Once you choose a pathway and start working through the roadmap, your momentum shows up here."
        action={<Button onClick={() => navigate('/results')}>See my options</Button>}
      />
    );
  }

  if (!roadmap) {
    return (
      <EmptyState
        title="We could not load your progress"
        description="Check your connection and try again."
        action={<Button onClick={() => navigate(0)}>Retry</Button>}
      />
    );
  }

  const percentComplete =
    roadmap.total_milestones === 0
      ? 0
      : Math.round((roadmap.completed_milestones / roadmap.total_milestones) * 100);

  return (
    <div className="flex flex-col gap-lg">
      <header>
        <p className="eyebrow">Progress</p>
        <h1 className="text-heading-2 text-ink">How you are tracking</h1>
        <p className="mt-xs max-w-[60ch] text-body-sm text-ink-muted">
          This measures steps completed, which is not the same as readiness. A slow month
          is information about your circumstances, not a verdict on you.
        </p>
      </header>

      <div className="grid gap-md sm:grid-cols-3">
        <Card>
          <p className="eyebrow">Steps completed</p>
          <p className="mt-xxs text-heading-1 text-ink">
            {roadmap.completed_milestones}
            <span className="text-body-md text-ink-muted">/{roadmap.total_milestones}</span>
          </p>
          <div className="mt-sm">
            <ProgressBar value={percentComplete} label="Overall roadmap progress" />
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Current pathway</p>
          <p className="mt-xxs text-title text-ink">{roadmap.primary_career_title}</p>
          {roadmap.backup_career_title && (
            <p className="mt-xxs text-body-sm text-ink-muted">
              Backup: {roadmap.backup_career_title}
            </p>
          )}
        </Card>
        <Card>
          <p className="eyebrow">Assessment cycles</p>
          <p className="mt-xxs text-heading-1 text-ink">{history?.length ?? 1}</p>
          <p className="mt-xxs text-caption text-ink-muted">
            Started {formatDate(roadmap.created_at)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-heading-3 text-ink">Completion by timeframe</h2>
        <div className="mt-md h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byBucket} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" vertical={false} />
              <XAxis
                dataKey="bucket"
                tick={{ fill: '#615d59', fontSize: 12 }}
                axisLine={{ stroke: '#e6e6e6' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#615d59', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e6e6e6',
                  fontSize: 14,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" stackId="a" name="Done" fill={SERIES.completed} radius={[0, 0, 0, 0]} />
              <Bar dataKey="remaining" stackId="a" name="Still to do" fill={SERIES.remaining} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="text-heading-3 text-ink">What kind of work you have done</h2>
        <div className="mt-md h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byType}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#615d59', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="type"
                width={130}
                tick={{ fill: '#615d59', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e6e6e6', fontSize: 14 }} />
              <Bar dataKey="completed" name="Completed" radius={[0, 4, 4, 0]}>
                {byType.map((entry) => (
                  <Cell key={entry.type} fill={SERIES.bar} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {history && history.length > 1 && (
        <Card>
          <h2 className="text-heading-3 text-ink">Your assessment history</h2>
          <ul className="mt-sm flex flex-col gap-xs">
            {history.map((batch) => (
              <li
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-xs rounded-sm border border-hairline p-sm"
              >
                <div>
                  <p className="text-body-sm text-ink">
                    Cycle {batch.batch_number} · {batch.recommendations.length} options
                  </p>
                  <p className="text-caption text-ink-muted">{formatDate(batch.created_at)}</p>
                </div>
                {batch.is_current ? (
                  <Badge tone="success">Current</Badge>
                ) : (
                  <Badge>Superseded {formatDate(batch.superseded_at)}</Badge>
                )}
              </li>
            ))}
          </ul>
          <Callout variant="info">
            Nothing from an earlier cycle is deleted. Everything you completed is still
            recorded against the plan you completed it on.
          </Callout>
        </Card>
      )}
    </div>
  );
}
