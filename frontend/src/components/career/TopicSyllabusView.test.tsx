import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { TopicSyllabusView } from '@/components/career/TopicSyllabusView';

const mockSyllabus = {
  career_id: 'software-developer',
  career_title: 'Software Developer',
  total_estimated_hours: 150,
  phases: [
    {
      phase_number: 1,
      phase_title: 'Phase 1: Programming Foundations',
      topics: [
        {
          id: 101,
          topic_title: 'Computational Thinking',
          description: 'Basic control flow and memory models.',
          key_concepts: ['Logic gates', 'Control flow'],
          free_resource_name: 'CS50',
          free_resource_url: 'https://cs50.harvard.edu/x/',
          estimated_hours: 20,
          is_optional: false,
        },
      ],
    },
  ],
};

vi.mock('@/hooks/useRoadmap', () => ({
  useCareerSyllabus: () => ({
    data: mockSyllabus,
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

describe('TopicSyllabusView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders career title, study hours, and topics', () => {
    renderWithClient(<TopicSyllabusView careerId="software-developer" />);

    expect(screen.getByText(/Software Developer — Step-by-Step Curriculum/i)).toBeInTheDocument();
    expect(screen.getByText(/~150 Study Hours/i)).toBeInTheDocument();
    expect(screen.getByText('Phase 1: Programming Foundations')).toBeInTheDocument();
    expect(screen.getByText('Computational Thinking')).toBeInTheDocument();
    expect(screen.getByText('#Logic gates')).toBeInTheDocument();
  });

  it('allows checking off topics and records progress in localStorage', () => {
    renderWithClient(<TopicSyllabusView careerId="software-developer" />);

    const checkbox = screen.getByRole('checkbox', { name: /Mark Computational Thinking as completed/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(localStorage.getItem('np_syllabus_completed_software-developer')).toContain('101');
  });
});
