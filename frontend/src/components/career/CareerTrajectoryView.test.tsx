import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { CareerTrajectoryView } from '@/components/career/CareerTrajectoryView';

const mockTrajectoryData = {
  source_career_id: 'software-developer',
  source_career_title: 'Software Developer',
  trajectories: [
    {
      id: 1,
      source_career_id: 'software-developer',
      target_career_title: 'Engineering Manager',
      trajectory_type: 'lateral_transition' as const,
      typical_years_experience: '4-7 years',
      expected_salary_delta_inr: '+₹10,00,000 / annum',
      required_delta_skills: ['People Management', 'Sprint Mentorship'],
      transferable_skills_pct: 70,
      overview: 'Pivots technical foundation into team leadership.',
    },
  ],
};

vi.mock('@/hooks/useRoadmap', () => ({
  useCareerTrajectory: () => ({
    data: mockTrajectoryData,
    isLoading: false,
    isError: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CareerTrajectoryView', () => {
  it('renders target career, salary delta, and delta skills', () => {
    renderWithClient(<CareerTrajectoryView careerId="software-developer" />);

    expect(screen.getByText(/Where to Move Next/i)).toBeInTheDocument();
    expect(screen.getByText('Engineering Manager')).toBeInTheDocument();
    expect(screen.getByText('+₹10,00,000 / annum')).toBeInTheDocument();
    expect(screen.getByText(/Transferable Skills: 70%/i)).toBeInTheDocument();
    expect(screen.getByText('+People Management')).toBeInTheDocument();
  });
});
