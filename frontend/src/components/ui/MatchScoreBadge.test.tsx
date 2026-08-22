/**
 * The rule this component exists to enforce: a match number never appears without its
 * three-part evidence context (FR-06, FR-07, UX invariant 6). These tests fail if
 * someone later "simplifies" the card down to a single percentage.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MatchScoreBadge } from '@/components/ui/MatchScoreBadge';

describe('MatchScoreBadge', () => {
  it('never shows the composite number without all three labels', () => {
    render(
      <MatchScoreBadge
        compositeScore={87}
        fitLabel="Strong"
        feasibilityLabel="High"
        evidenceQualityLabel="Moderate"
      />,
    );

    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('Fit')).toBeInTheDocument();
    expect(screen.getByText('Feasibility')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('qualifies the number in visible text rather than leaving it to be read alone', () => {
    render(
      <MatchScoreBadge
        compositeScore={87}
        fitLabel="Strong"
        feasibilityLabel="High"
        evidenceQualityLabel="High"
      />,
    );
    expect(screen.getByText(/not this number alone/i)).toBeInTheDocument();
  });

  it('still shows all three labels in compact mode, only dropping the numeral', () => {
    render(
      <MatchScoreBadge
        compositeScore={64}
        fitLabel="Moderate"
        feasibilityLabel="Challenging"
        evidenceQualityLabel="Preliminary"
        variant="compact"
      />,
    );

    expect(screen.queryByText('64')).not.toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Challenging')).toBeInTheDocument();
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
  });

  it('renders a thin-evidence result without dressing it up', () => {
    render(
      <MatchScoreBadge
        compositeScore={22}
        fitLabel="Insufficient evidence"
        feasibilityLabel="Low"
        evidenceQualityLabel="Sparse"
      />,
    );
    expect(screen.getByText('Insufficient evidence')).toBeInTheDocument();
    expect(screen.getByText('Sparse')).toBeInTheDocument();
  });

  it('explains each label to a screen reader, not just on hover', () => {
    render(
      <MatchScoreBadge
        compositeScore={80}
        fitLabel="Strong"
        feasibilityLabel="High"
        evidenceQualityLabel="High"
      />,
    );
    // Tooltips are invisible to assistive tech, so the meaning is also in the DOM.
    expect(
      screen.getByText(/Fit: Strong\. Your interests and stated strengths/i),
    ).toBeInTheDocument();
  });
});
