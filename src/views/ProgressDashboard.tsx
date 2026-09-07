/**
 * Visual progress analytics (FR-28, Story 6.2 — P1).
 *
 * Designed as a decision and pathway companion:
 * Tracks roadmap milestones, 30/90/180-day progress, learning & activity progress,
 * and current pathway state with calm, evidence-oriented clarity.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  ListChecks,
  Compass,
  Clock,
  RotateCcw,
  Calendar,
  Info,
  Home,
  BarChart2,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { useRoadmap } from '@/hooks/useRoadmap';
import { useRecommendationHistory } from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';
import { formatDate } from '@/utils/format';
import { SkeletonCard, EmptyState, Button } from '@/components/ui';

export function ProgressDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { data: roadmap, isLoading, error } = useRoadmap();
  const { data: history } = useRecommendationHistory();

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Steps completed & progress calculations
  const totalMilestones = roadmap?.total_milestones && roadmap.total_milestones > 0
    ? roadmap.total_milestones
    : (roadmap?.milestones?.length || 7);

  const completedMilestones = roadmap?.completed_milestones ?? 0;
  const remainingMilestones = Math.max(0, totalMilestones - completedMilestones);
  const percentComplete = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0;

  // Determine current active stage
  const currentStage = useMemo(() => {
    if (!roadmap?.milestones || roadmap.milestones.length === 0) {
      return 'Stage 1: Exploration';
    }
    const firstIncomplete = roadmap.milestones.find((m) => !m.is_completed);
    if (!firstIncomplete) return 'Stage 4: Pathway Ready';
    if (firstIncomplete.timeframe_bucket === 'next_7_days') return 'Stage 1: Exploration';
    if (firstIncomplete.timeframe_bucket === 'day_30') return 'Stage 2: Foundation';
    if (firstIncomplete.timeframe_bucket === 'day_90') return 'Stage 3: Skill Building';
    return 'Stage 4: Execution';
  }, [roadmap]);

  // 2. Current pathway
  const currentPathway = roadmap?.primary_career_title || 'Technology & Product Design';
  const lastUpdatedText = roadmap?.created_at
    ? `Updated ${formatDate(roadmap.created_at)}`
    : 'Updated recently';

  // 3. Assessment cycle data
  const currentCycle = history && history.length > 0 ? history[0]?.batch_number ?? history.length : 1;

  // 4. Completion by timeframe (intervals matching reference)
  const timeframeData = useMemo(() => {
    const milestones = roadmap?.milestones || [];

    // Cumulative progression intervals as defined in the roadmap companion:
    // This week: next_7_days (target 1)
    // First 30 days: up through day_30 (target 3)
    // By day 90: up through day_90 (target 5)
    // By day 180: up through day_180 (target 7)
    const weekMilestones = milestones.filter((m) => m.timeframe_bucket === 'next_7_days');
    const monthMilestones = milestones.filter(
      (m) => m.timeframe_bucket === 'next_7_days' || m.timeframe_bucket === 'day_30',
    );
    const quarterMilestones = milestones.filter(
      (m) =>
        m.timeframe_bucket === 'next_7_days' ||
        m.timeframe_bucket === 'day_30' ||
        m.timeframe_bucket === 'day_90',
    );
    const halfYearMilestones = milestones;

    const intervals = [
      {
        label: 'This week',
        completed: weekMilestones.filter((m) => m.is_completed).length,
        total: weekMilestones.length > 0 ? weekMilestones.length : 1,
      },
      {
        label: 'First 30 days',
        completed: monthMilestones.filter((m) => m.is_completed).length,
        total: monthMilestones.length > 0 ? monthMilestones.length : 3,
      },
      {
        label: 'By day 90',
        completed: quarterMilestones.filter((m) => m.is_completed).length,
        total: quarterMilestones.length > 0 ? quarterMilestones.length : 5,
      },
      {
        label: 'By day 180',
        completed: halfYearMilestones.filter((m) => m.is_completed).length,
        total: halfYearMilestones.length > 0 ? halfYearMilestones.length : 7,
      },
    ];

    return intervals.map((item) => {
      const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      return {
        ...item,
        percent: pct,
      };
    });
  }, [roadmap]);

  // 5. Learning & activity progress (4 core categories)
  const activityData = useMemo(() => {
    const milestones = roadmap?.milestones || [];

    const skillAssessments = milestones.filter(
      (m) =>
        m.milestone_type === 'skill_check' ||
        m.milestone_type === 'exam_prep' ||
        m.completion_evidence_type === 'quiz_score',
    );

    const practicalProjects = milestones.filter(
      (m) =>
        m.milestone_type === 'project_output' ||
        m.completion_evidence_type === 'project_artifact',
    );

    const mentorshipReviews = milestones.filter(
      (m) =>
        m.milestone_type === 'reassessment' ||
        m.completion_evidence_type === 'mentor_confirmation',
    );

    const industryReadings = milestones.filter(
      (m) =>
        m.milestone_type === 'exploration' ||
        m.milestone_type === 'foundational_learning' ||
        m.milestone_type === 'scholarship_application',
    );

    const categories = [
      {
        label: 'Skill Assessments',
        completed: skillAssessments.filter((m) => m.is_completed).length,
        total: skillAssessments.length,
      },
      {
        label: 'Practical Projects',
        completed: practicalProjects.filter((m) => m.is_completed).length,
        total: practicalProjects.length,
      },
      {
        label: 'Mentorship & Reviews',
        completed: mentorshipReviews.filter((m) => m.is_completed).length,
        total: mentorshipReviews.length,
      },
      {
        label: 'Industry Research & Readings',
        completed: industryReadings.filter((m) => m.is_completed).length,
        total: industryReadings.length,
      },
    ];

    return categories.map((cat) => {
      const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
      return {
        ...cat,
        percent: pct,
      };
    });
  }, [roadmap]);

  // Filtered milestones when search query is active
  const filteredMilestones = useMemo(() => {
    if (!searchQuery.trim() || !roadmap?.milestones) return [];
    const q = searchQuery.toLowerCase();
    return roadmap.milestones.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.milestone_type.toLowerCase().includes(q) ||
        m.timeframe_bucket.toLowerCase().includes(q),
    );
  }, [searchQuery, roadmap]);

  const handleOpenAiChat = () => {
    window.dispatchEvent(new CustomEvent('open-nextpath-ai-chat'));
  };

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

  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#31302e] antialiased -mx-4 -my-6 px-4 py-6 sm:px-6 sm:py-8 md:px-8 pb-28 md:pb-12">
      <div className="max-w-xl mx-auto space-y-4">
        {/* 1. HEADER */}
        <header className="space-y-2">
          <div className="flex items-center gap-1.5 text-[#0075de]">
            <TrendingUp size={16} strokeWidth={2.2} aria-hidden="true" />
            <span className="text-[12px] font-bold tracking-wider uppercase">
              TRACK &amp; MILESTONES
            </span>
          </div>

          <h1 className="text-[26px] sm:text-[30px] font-bold text-[#000000] tracking-tight leading-tight">
            How you are tracking
          </h1>

          <p className="text-[14px] sm:text-[15px] text-[#615d59] leading-relaxed max-w-[65ch]">
            Review your career milestone progress, active pathway steps, and task velocity across your journey.
          </p>

          {/* Search / Filter Field */}
          <div className="pt-2 relative">
            <div className="relative flex items-center">
              <Search
                size={16}
                className="absolute left-3.5 text-[#615d59] pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="milestone-filter-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter milestones, timeline or competencies..."
                aria-label="Filter milestones, timeline or competencies"
                className="w-full bg-[#ffffff] border border-[#e6e6e6] rounded-[10px] pl-9 pr-8 py-2.5 text-[14px] text-[#000000] placeholder:text-[#a39e98] focus:outline-none focus:ring-2 focus:ring-[#0075de] transition-all shadow-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search filter"
                  className="absolute right-2.5 text-[#615d59] hover:text-[#000000] p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter results overlay if typing */}
            {searchQuery.trim() && (
              <div className="mt-2 bg-[#ffffff] border border-[#e6e6e6] rounded-[10px] p-3 text-[13px] text-[#31302e] shadow-sm">
                <p className="font-semibold text-[#000000] mb-1.5">
                  {filteredMilestones.length} matching milestone
                  {filteredMilestones.length === 1 ? '' : 's'}:
                </p>
                {filteredMilestones.length === 0 ? (
                  <p className="text-[#615d59]">No milestones match &ldquo;{searchQuery}&rdquo;.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredMilestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-[#f6f5f4] cursor-pointer"
                        onClick={() => navigate('/roadmap')}
                      >
                        <span className="truncate font-medium">{m.title}</span>
                        <span className="text-[11px] text-[#615d59] shrink-0">
                          {m.is_completed ? 'Completed' : 'Planned'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 2. STEPS COMPLETED CARD */}
        <section
          aria-label="Steps Completed"
          className="bg-[#ffffff] rounded-[12px] border border-[#e6e6e6] p-4 sm:p-5 space-y-3 shadow-none"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[#f0f7ff] text-[#0075de] flex items-center justify-center shrink-0">
                <ListChecks size={18} strokeWidth={2} aria-hidden="true" />
              </div>
              <h2 className="text-[15px] font-semibold text-[#000000]">Steps Completed</h2>
            </div>
            <span className="text-[12px] font-medium text-[#31302e] bg-[#f6f5f4] border border-[#e6e6e6] px-2.5 py-0.5 rounded-full">
              {percentComplete}% Completed
            </span>
          </div>

          <div className="flex items-baseline">
            <span className="text-[32px] sm:text-[36px] font-bold text-[#000000] tracking-tight leading-none">
              {completedMilestones}/{totalMilestones}
            </span>
            <span className="ml-2 text-[14px] text-[#615d59] font-normal">milestones finished</span>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-2 bg-[#e6e6e6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0075de] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(percentComplete, percentComplete === 0 ? 3 : percentComplete)}%` }}
              role="progressbar"
              aria-valuenow={percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Milestones completion percentage"
            />
          </div>

          <div className="flex items-center justify-between text-[13px] text-[#615d59]">
            <span className="font-medium text-[#31302e]">{currentStage}</span>
            <span>{remainingMilestones} steps remaining</span>
          </div>
        </section>

        {/* 3. CURRENT PATHWAY CARD & ASSESSMENT CYCLE CARD */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Current Pathway Card */}
          <section
            aria-label="Current Pathway"
            className="bg-[#ffffff] rounded-[12px] border border-[#e6e6e6] p-3.5 sm:p-4 flex flex-col justify-between shadow-none min-h-[140px]"
          >
            <div>
              <div className="w-8 h-8 rounded-md bg-[#f0f7ff] text-[#0075de] flex items-center justify-center shrink-0">
                <Compass size={17} strokeWidth={2} aria-hidden="true" />
              </div>
              <p className="text-[12px] font-medium text-[#615d59] mt-2">Current Pathway</p>
              <h3 className="text-[15px] font-bold text-[#000000] leading-snug mt-0.5 line-clamp-2">
                {currentPathway}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#615d59] mt-3 pt-2 border-t border-[#f0edea]">
              <Clock size={13} className="text-[#a39e98] shrink-0" aria-hidden="true" />
              <span className="truncate">{lastUpdatedText}</span>
            </div>
          </section>

          {/* Assessment Cycle Card */}
          <section
            aria-label="Assessment Cycle"
            className="bg-[#ffffff] rounded-[12px] border border-[#e6e6e6] p-3.5 sm:p-4 flex flex-col justify-between shadow-none min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-md bg-[#f0f7ff] text-[#0075de] flex items-center justify-center shrink-0">
                  <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
                </div>
                <span className="text-[11px] font-semibold text-[#793400] bg-[#fff8e6] border border-[#f5dfb8] px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-[12px] font-medium text-[#615d59] mt-2">Assessment Cycles</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h3 className="text-[17px] font-bold text-[#000000]">Cycle {currentCycle}</h3>
                <span className="text-[#a39e98] text-[14px]">/ 3</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#615d59] mt-3 pt-2 border-t border-[#f0edea]">
              <Calendar size={13} className="text-[#615d59] shrink-0" aria-hidden="true" />
              <span className="truncate">Diagnostic Stage</span>
            </div>
          </section>
        </div>

        {/* 4. COMPLETION BY TIMEFRAME CARD */}
        <section
          aria-label="Completion by timeframe"
          className="bg-[#ffffff] rounded-[12px] border border-[#e6e6e6] p-4 sm:p-5 space-y-4 shadow-none"
        >
          <div>
            <h2 className="text-[17px] font-bold text-[#000000]">Completion by timeframe</h2>
            <p className="text-[13px] text-[#615d59] mt-0.5">
              Your roadmap progress across key milestones
            </p>
          </div>

          <div className="space-y-3.5">
            {timeframeData.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-semibold text-[#000000]">{item.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-semibold text-[#000000]">{item.percent}%</span>
                    <span className="text-[13px] text-[#615d59]">
                      ({item.completed}/{item.total})
                    </span>
                  </div>
                </div>

                <div className="relative w-full h-2 bg-[#e6e6e6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0075de] rounded-full transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                    role="progressbar"
                    aria-valuenow={item.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.label} completion percentage`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Legend */}
          <div className="border-t border-[#e6e6e6] pt-3 flex items-center gap-5 text-[12px] text-[#615d59]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0075de] inline-block" aria-hidden="true" />
              <span>In Progress / Planned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1aae39] inline-block" aria-hidden="true" />
              <span>Completed</span>
            </div>
          </div>
        </section>

        {/* 5. WORK / ACTIVITY PROGRESS CARD */}
        <section
          aria-label="Your learning & activity progress"
          className="bg-[#ffffff] rounded-[12px] border border-[#e6e6e6] p-4 sm:p-5 space-y-4 shadow-none"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[#000000]">
                Your learning &amp; activity progress
              </h2>
              <p className="text-[13px] text-[#615d59] mt-0.5">
                Track the work and evidence you’ve completed
              </p>
            </div>
            <span className="text-[12px] font-medium text-[#615d59] bg-[#f6f5f4] border border-[#e6e6e6] px-2.5 py-0.5 rounded-full shrink-0">
              Distribution
            </span>
          </div>

          <div className="space-y-3.5">
            {activityData.map((cat) => (
              <div key={cat.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-[14px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-[2px] bg-[#0075de] inline-block shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-[#000000]">{cat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-semibold text-[#000000]">{cat.percent}%</span>
                    <span className="text-[13px] text-[#615d59]">({cat.completed} tasks)</span>
                  </div>
                </div>

                <div className="relative w-full h-2 bg-[#e6e6e6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0075de] rounded-full transition-all duration-300"
                    style={{ width: `${cat.percent}%` }}
                    role="progressbar"
                    aria-valuenow={cat.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${cat.label} completion percentage`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Informational Callout */}
          <div className="bg-[#f0f7ff]/70 border border-[#d6e8fa] rounded-[10px] p-3 flex items-start gap-2.5 mt-2">
            <Info size={16} className="text-[#0075de] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[13px] text-[#31302e] leading-snug">
              Progress updates automatically as you submit assignments and complete pathway milestones.
            </p>
          </div>
        </section>
      </div>

      {/* 6. MOBILE BOTTOM NAVIGATION (Matches reference screenshot & preserves routing) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#ffffff] border-t border-[#e6e6e6] px-3 py-2 flex items-center justify-around shadow-[0_-2px_8px_rgba(0,0,0,0.03)]"
      >
        <button
          type="button"
          onClick={() => navigate('/results')}
          aria-label="Navigate to Home"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[#615d59] hover:text-[#000000] transition-colors cursor-pointer"
        >
          <Home size={20} strokeWidth={1.75} />
          <span className="text-[11px] mt-0.5">Home</span>
        </button>

        <button
          type="button"
          aria-label="Current tab: Progress"
          aria-current="page"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[#0075de] font-semibold cursor-pointer"
        >
          <BarChart2 size={20} strokeWidth={2.2} />
          <span className="text-[11px] mt-0.5">Progress</span>
        </button>

        {/* Floating/Elevated AI Assistant pill button */}
        <button
          type="button"
          onClick={handleOpenAiChat}
          aria-label="Ask AI Assistant"
          className="flex items-center gap-1.5 bg-[#ffffff] hover:bg-[#faf7fc] text-[#391c57] border border-[#d6b6f6] px-3.5 py-1.5 rounded-full text-[12px] font-semibold shadow-sm min-h-[40px] transition-transform active:scale-95 cursor-pointer"
        >
          <Sparkles size={14} className="text-[#391c57]" aria-hidden="true" />
          <span>AI Assistant</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/courses')}
          aria-label="Navigate to Explore"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[#615d59] hover:text-[#000000] transition-colors cursor-pointer"
        >
          <Compass size={20} strokeWidth={1.75} />
          <span className="text-[11px] mt-0.5">Explore</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Navigate to Profile"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[#615d59] hover:text-[#000000] transition-colors cursor-pointer"
        >
          <User size={20} strokeWidth={1.75} />
          <span className="text-[11px] mt-0.5">Profile</span>
        </button>
      </nav>
    </div>
  );
}
