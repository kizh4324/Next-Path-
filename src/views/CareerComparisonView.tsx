/** Side-by-side comparison of 2-3 careers (FR-08, Story 2.5). */

import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ComparisonTable } from '@/components/career/CareerCard';
import { Callout, EmptyState, SkeletonCard } from '@/components/ui';
import { useCompareCareers } from '@/hooks/useRecommendations';

export function CareerComparisonView(): JSX.Element {
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const compare = useCompareCareers();
  const { mutate } = compare;

  useEffect(() => {
    if (ids.length >= 2 && ids.length <= 3) mutate(ids);
    // Comparing on the id list itself, not the array identity, so a re-render with the
    // same ids does not refire the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('ids'), mutate]);

  if (ids.length < 2 || ids.length > 3) {
    return (
      <EmptyState
        title="Pick two or three careers"
        description="Comparison works with two or three options at a time — more than that stops being readable, especially on a phone."
        action={
          <Link to="/results" className="btn-utility">
            Back to my options
          </Link>
        }
      />
    );
  }

  if (compare.isPending) return <SkeletonCard />;

  if (compare.isError || !compare.data) {
    return (
      <EmptyState
        title="We could not build that comparison"
        description="One of these careers may not exist in our catalogue. Try selecting again."
        action={
          <Link to="/results" className="btn-utility">
            Back to my options
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <header>
        <p className="eyebrow">Side by side</p>
        <h1 className="text-heading-2 text-ink">
          {compare.data.careers.map((career) => career.title).join(' vs ')}
        </h1>
      </header>

      <Callout variant="info">
        Compare the trade-offs, not just the totals. The cheapest route and the shortest
        route are rarely the same one, and neither is automatically the right choice for
        you.
      </Callout>

      <ComparisonTable data={compare.data} />

      <Link to="/results" className="btn-utility self-start">
        Back to my options
      </Link>
    </div>
  );
}
