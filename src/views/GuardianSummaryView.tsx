/**
 * Parents & Guardians – Child Progress Dashboard.
 *
 * Clean, concise, mobile-first overview answering:
 * 1. Who is my child?
 * 2. What are they studying?
 * 3. How is their assessment?
 * 4. How is their progress?
 * 5. Which career options are they exploring?
 * 6. What should they do next?
 *
 * Dynamic authenticated data flow only. Never uses hardcoded student names.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Info,
  MessageSquare,
  Printer,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';

import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useGuardianSummary } from '@/hooks/useRoadmap';
import { ApiError } from '@/services/api_client';
import { formatDate } from '@/utils/format';

interface DiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  prompts: string[];
  tips?: string[];
}

function DiscussionGuideModal({
  isOpen,
  onClose,
  studentName,
  prompts,
  tips = [],
}: DiscussionModalProps): JSX.Element | null {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discussion-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg border border-hairline bg-surface p-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-sm border-b border-hairline pb-sm">
          <div>
            <h2 id="discussion-guide-title" className="text-heading-3 font-semibold text-ink">
              {t('discussion_modal_title', 'Family Discussion Guide')}
            </h2>
            <p className="mt-xxs text-caption text-ink-muted">
              {t('discussion_modal_sub', 'Constructive conversation starters with')} {studentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close discussion guide"
            className="rounded-full p-1 text-ink-muted hover:bg-canvas-container hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-md space-y-md text-body-sm text-ink-secondary max-h-[70vh] overflow-y-auto pr-xs">
          <div>
            <h3 className="text-body font-semibold text-ink">{t('core_questions', 'Core Questions to Ask')}</h3>
            <ul className="mt-xs space-y-xs">
              {prompts.map((prompt, i) => (
                <li key={i} className="flex items-start gap-xs rounded-md bg-canvas-soft p-sm">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-ink font-medium">{prompt}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-body font-semibold text-ink">{t('counselor_recommendations', 'Counselor Recommendations')}</h3>
            <ul className="mt-xs space-y-xs">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-xs text-ink-secondary text-caption leading-relaxed">
                  <span className="text-primary font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-hairline bg-canvas-soft p-sm text-caption text-ink-muted">
            <span className="font-semibold text-ink">Healthy family tip:</span> Listen first to what energized your child about each pathway. Keep backup options open without pressure.
          </div>
        </div>

        <div className="mt-lg flex justify-end border-t border-hairline pt-sm">
          <Button variant="utility" onClick={onClose}>
            {t('close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QualitativeBadge({ label }: { label: string }): JSX.Element {
  const { t } = useLanguage();
  const norm = label.toLowerCase();
  if (norm.includes('strong')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf5ea] px-2.5 py-0.5 text-caption font-semibold text-[#1c6b24] border border-[#c3e6c6]">
        {t('strong', 'Strong')}
      </span>
    );
  }
  if (norm.includes('moderate')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf4fd] px-2.5 py-0.5 text-caption font-semibold text-[#005bab] border border-[#c8e2fb]">
        {t('moderate', 'Moderate')}
      </span>
    );
  }
  if (norm.includes('developing')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fef7ea] px-2.5 py-0.5 text-caption font-semibold text-[#915802] border border-[#fde4b8]">
        {t('developing', 'Developing')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-canvas-container px-2.5 py-0.5 text-caption font-medium text-ink-muted border border-hairline">
      {t('insufficient_evidence', 'Insufficient evidence')}
    </span>
  );
}

export function GuardianSummaryView(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: summary, isLoading, error, refetch } = useGuardianSummary();
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // 1. DYNAMIC STUDENT NAME RESOLUTION
  // Never hardcode any student name. Source of truth is authenticated response or session.
  const studentName =
    summary?.student?.full_name?.trim() ||
    (user?.role === 'student' ? user?.full_name?.trim() : '') ||
    'Student';

  const studentInitials =
    studentName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'S';

  // 14. LOADING STATE
  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-md py-md animate-pulse">
        <div className="h-6 w-36 rounded-full bg-canvas-container" />
        <div className="h-10 w-3/4 rounded-md bg-canvas-container" />
        <div className="h-5 w-1/2 rounded-md bg-canvas-container" />
        <div className="mt-md space-y-md">
          <div className="h-44 rounded-lg bg-surface border border-hairline p-md">
            <div className="flex items-center gap-md">
              <div className="h-14 w-14 rounded-full bg-canvas-container" />
              <div className="space-y-xs flex-1">
                <div className="h-5 w-40 rounded-md bg-canvas-container" />
                <div className="h-4 w-28 rounded-md bg-canvas-container" />
              </div>
            </div>
          </div>
          <div className="h-48 rounded-lg bg-surface border border-hairline" />
          <div className="h-48 rounded-lg bg-surface border border-hairline" />
        </div>
        <p className="text-center text-caption text-ink-muted mt-sm">Loading your child's progress…</p>
      </div>
    );
  }

  // 14. NOT FOUND / NO LINKED PROFILE STATE
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto max-w-xl py-lg">
        <EmptyState
          title="Student profile information is not available yet"
          description="Once your child completes their initial career assessment and learning profile, their progress dashboard will automatically appear here."
          action={
            <Button
              onClick={() => {
                if (user?.role === 'student') {
                  navigate('/onboarding');
                } else {
                  navigate('/results');
                }
              }}
            >
              {user?.role === 'student' ? 'Complete assessment' : 'Explore pathways'}
            </Button>
          }
        />
      </div>
    );
  }

  // 14. AUTHORIZATION FORBIDDEN STATE
  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="mx-auto max-w-xl py-lg">
        <EmptyState
          title={t('access_restricted', 'Access restricted')}
          description="You do not have authorization to view this student's records. Please make sure you are logged in with the verified guardian account linked to this student."
          action={<Button onClick={() => navigate('/login')}>{t('switch_account', 'Switch account')}</Button>}
        />
      </div>
    );
  }

  // 14. GENERAL ERROR / NETWORK FAILURE STATE
  if (error || !summary) {
    return (
      <div className="mx-auto max-w-xl py-lg">
        <EmptyState
          title={t('unable_to_load', 'Unable to load progress right now')}
          description={t('check_connection', 'Please check your internet connection and try refreshing the dashboard.')}
          action={
            <Button variant="utility" onClick={() => void refetch()}>
              <RotateCw className="mr-xs h-4 w-4" />
              {t('try_again', 'Try again')}
            </Button>
          }
        />
      </div>
    );
  }

  // DATA PREPARATION FROM AUTHENTICATED RESPONSE
  const student = summary.student;
  const assessmentOverview = summary.assessment_overview;
  const progress = summary.progress;
  const careerOptions = summary.career_options || [];
  const pathwayFeasibility = summary.pathway_feasibility || [];
  const familyPriorities = summary.family_priorities || [];
  const nextSteps = summary.next_steps || [];
  const familyDiscussion = summary.family_discussion || {
    prompts: [
      t('prompt_1', `What interests ${studentName.split(' ')[0]} most?`).replace('{name}', studentName.split(' ')[0]),
      t('prompt_2', 'Which pathway feels realistic for our family?'),
      t('prompt_3', 'What support is needed right now?'),
    ],
    helper_text: t('discussion_helper', 'Use these prompts to support your child’s decision.'),
    guide_tips: [
      t('tip_1', 'Focus on strengths and curiosity rather than entrance exam marks alone.'),
      t('tip_2', 'Always consider both a primary aspiration and a viable backup plan.'),
      t('tip_3', 'Check scholarships and lower-cost state institutions early.'),
    ],
  };

  const isAssessmentCompleted =
    student?.assessment_status === 'completed' || assessmentOverview?.status === 'completed';

  const totalMilestones = progress?.total_milestones ?? 0;
  const completedMilestones = progress?.completed_milestones ?? 0;
  const completionPercentage = progress?.completion_percentage ?? (totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0);

  const completedItems = progress?.completed_items || [];
  const upcomingItems = progress?.upcoming_items || [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-md pb-3xl">
      {/* 3. PAGE HEADER */}
      <header className="flex flex-col gap-xs pt-xs">
        <div className="flex items-center justify-between gap-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-caption font-semibold tracking-wide uppercase text-ink-muted">
            {t('for_parents', 'For Parents & Guardians')}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-utility flex items-center gap-1.5 px-3 py-1 text-caption text-ink-secondary"
            title="Print or save PDF summary"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('print_save', 'Print / Save')}</span>
          </button>
        </div>
        <h1 className="text-heading-2 font-bold text-ink tracking-tight">{t('page_title', "Your child's progress")}</h1>
        <p className="text-body-sm text-ink-secondary">
          {t('page_subtitle', 'A simple view of learning, assessment and career exploration.')}
        </p>
      </header>

      {/* 4. STUDENT SNAPSHOT (Priority 1) */}
      <section aria-labelledby="snapshot-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs transition-shadow">
        <h2 id="snapshot-heading" className="sr-only">Student Snapshot</h2>
        <div className="flex items-start gap-md">
          {/* Student Avatar */}
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-title font-bold text-primary shadow-xs"
          >
            {studentInitials}
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-sm gap-y-1">
              <h3 className="text-title font-bold text-ink truncate">{studentName}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas-container px-2 py-0.5 text-caption font-medium text-ink-muted">
                {t('student', 'Student')}
              </span>
            </div>

            <p className="mt-0.5 text-body-sm text-ink-secondary font-medium">
              {student?.education_stage || 'Class 11'}
              {student?.stream ? ` • ${student.stream}` : ''}
            </p>
          </div>
        </div>

        {/* Snapshot Details Grid */}
        <div className="mt-md grid grid-cols-1 gap-sm border-t border-hairline pt-sm sm:grid-cols-2">
          <div>
            <span className="text-caption text-ink-muted uppercase tracking-wider block">{t('current_focus', 'Current focus')}</span>
            <p className="mt-0.5 text-body-sm font-semibold text-ink">
              {student?.current_focus || 'Technology & Problem Solving'}
            </p>
          </div>

          <div>
            <span className="text-caption text-ink-muted uppercase tracking-wider block">{t('assessment', 'Assessment')}</span>
            <div className="mt-0.5 flex items-center gap-2">
              {isAssessmentCompleted ? (
                <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-[#1c6b24]">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('completed', 'Completed')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-body-sm font-medium text-[#915802]">
                  <Circle className="h-3.5 w-3.5" />
                  {t('in_progress', 'In progress')}
                </span>
              )}
              {student?.last_assessment_date && (
                <span className="text-caption text-ink-muted">
                  · {formatDate(student.last_assessment_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. ASSESSMENT OVERVIEW (Priority 2) */}
      <section aria-labelledby="assessment-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
        <div className="flex items-center justify-between gap-sm border-b border-hairline pb-sm">
          <div>
            <h2 id="assessment-heading" className="text-title font-bold text-ink">{t('assessment_overview', 'Assessment Overview')}</h2>
            <p className="text-caption text-ink-muted">{t('assessment_subtitle', 'Qualitative indicators based on profile activity')}</p>
          </div>
          <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-caption font-medium text-ink-muted">
            {t('no_test_scores', 'No test scores')}
          </span>
        </div>

        {isAssessmentCompleted && assessmentOverview?.dimensions ? (
          <div className="mt-sm divide-y divide-hairline">
            {assessmentOverview.dimensions.map((dim) => (
              <div key={dim.name} className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1">
                <span className="text-body-sm font-medium text-ink">{dim.name}</span>
                <QualitativeBadge label={dim.label} />
              </div>
            ))}
          </div>
        ) : (
          <div className="my-md rounded-md bg-canvas-soft p-md text-center">
            <p className="text-body-sm text-ink-secondary">{t('not_completed_yet', 'Assessment not completed yet.')}</p>
            <Button
              variant="utility"
              className="mt-sm"
              onClick={() => navigate('/onboarding')}
            >
              {t('continue_assessment', 'Continue assessment')}
            </Button>
          </div>
        )}

        <div className="mt-md border-t border-hairline pt-sm flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/results')}
            className="group inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:text-primary-active"
          >
            <span>{t('view_full_assessment', 'View full assessment')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* 6. PROGRESS SECTION (Priority 3 - Prominent!) */}
      <section aria-labelledby="progress-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <h2 id="progress-heading" className="text-title font-bold text-ink">{t('progress_title', 'Progress')}</h2>
            <p className="text-body-sm font-medium text-ink-secondary mt-xxs">
              {completedMilestones} of {totalMilestones} {t('milestones_complete', 'milestones complete')}
            </p>
          </div>
          <span className="rounded-full bg-canvas-container px-2.5 py-1 text-caption font-bold text-primary">
            {completionPercentage}% {t('complete', 'complete')}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-sm h-2.5 w-full overflow-hidden rounded-full bg-canvas-container">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(Math.max(completionPercentage, 0), 100)}%` }}
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Milestone completion percentage"
          />
        </div>

        {/* Milestone Breakdown */}
        <div className="mt-md space-y-sm text-body-sm">
          {completedItems.length > 0 && (
            <div>
              <span className="text-caption font-semibold uppercase tracking-wider text-[#1c6b24]">{t('completed', 'Completed')}</span>
              <ul className="mt-xs space-y-1.5">
                {completedItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-ink">
                    <CheckCircle2 className="h-4 w-4 text-[#1aae39] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {upcomingItems.length > 0 && (
            <div className={completedItems.length > 0 ? 'border-t border-hairline pt-sm' : ''}>
              <span className="text-caption font-semibold uppercase tracking-wider text-ink-muted">{t('upcoming', 'Upcoming')}</span>
              <ul className="mt-xs space-y-1.5">
                {upcomingItems.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-ink-secondary">
                    <Circle className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalMilestones === 0 && (
            <p className="py-sm text-center text-caption text-ink-muted">
              {t('no_milestones_yet', 'No progress milestones completed yet.')}
            </p>
          )}
        </div>

        <div className="mt-md border-t border-hairline pt-sm flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/roadmap')}
            className="group inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:text-primary-active"
          >
            <span>{t('view_roadmap', 'View roadmap')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* 7. CAREER OPTIONS (Priority 4) */}
      <section aria-labelledby="careers-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
        <div className="flex items-center justify-between gap-sm border-b border-hairline pb-sm">
          <div>
            <h2 id="careers-heading" className="text-title font-bold text-ink">{t('career_options', 'Career Options')}</h2>
            <p className="text-caption text-ink-muted">{t('career_options_subtitle', 'Currently relevant pathways based on student evidence')}</p>
          </div>
        </div>

        {careerOptions.length > 0 ? (
          <div className="mt-sm divide-y divide-hairline">
            {careerOptions.slice(0, 5).map((career) => (
              <div
                key={career.id || career.career_title}
                className="flex flex-col gap-1 py-3 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-body-sm font-semibold text-ink">{career.career_title}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center rounded-full bg-canvas-soft px-2.5 py-0.5 text-caption font-medium text-ink-secondary border border-hairline">
                    {career.fit_label} • {career.feasibility_label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-md text-center py-sm text-ink-muted text-body-sm">
            {t('continue_exploring', 'Continue exploring to build your pathway options.')}
          </div>
        )}

        <div className="mt-md border-t border-hairline pt-sm flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/compare')}
            className="group inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:text-primary-active"
          >
            <span>{t('compare_options', 'Compare options')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* 8. PATHWAY FEASIBILITY (Priority 5) */}
      <section aria-labelledby="feasibility-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
        <div className="flex items-center justify-between gap-sm border-b border-hairline pb-sm">
          <div>
            <h2 id="feasibility-heading" className="text-title font-bold text-ink">{t('pathway_feasibility', 'Pathway Feasibility')}</h2>
            <p className="text-caption text-ink-muted">{t('feasibility_subtitle', 'Estimated programme fees and duration in India')}</p>
          </div>
        </div>

        <div className="mt-sm divide-y divide-hairline">
          {pathwayFeasibility.slice(0, 4).map((item) => (
            <div key={item.career_title} className="py-2.5 first:pt-1 last:pb-1">
              <div className="flex flex-wrap items-center justify-between gap-x-sm gap-y-1">
                <span className="text-body-sm font-semibold text-ink">{item.career_title}</span>
                <span className="text-caption font-medium text-ink-secondary bg-canvas-soft px-2 py-0.5 rounded-md border border-hairline">
                  {item.cost_range} • {item.duration}
                </span>
              </div>
              <p className="mt-0.5 text-caption text-ink-muted">{item.route_name}</p>
              {item.low_cost_alternative && (
                <p className="mt-0.5 text-caption text-ink-faint">
                  {t('cheaper_option', 'Cheaper option')}: {item.low_cost_alternative}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-md flex flex-wrap items-center justify-between gap-sm border-t border-hairline pt-sm">
          <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t('scholarship_note', 'Scholarship & lower-cost state options available')}
          </span>
          <button
            type="button"
            onClick={() => navigate('/compare')}
            className="group inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:text-primary-active"
          >
            <span>{t('view_costs_routes', 'View costs & routes')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* 9. NEXT STEPS (Priority 6) */}
      <section aria-labelledby="next-steps-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
        <h2 id="next-steps-heading" className="text-title font-bold text-ink">{t('next_steps', 'Next Steps')}</h2>
        <p className="mt-xxs text-caption text-ink-muted">{t('next_steps_subtitle', "Immediate action items from your child's roadmap")}</p>

        {nextSteps.length > 0 ? (
          <ul className="mt-sm space-y-2 text-body-sm">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-ink">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-sm text-body-sm text-ink-muted">
            {t('roadmap_wait_msg', "Your child's roadmap will appear after the assessment and pathway exploration are completed.")}
          </p>
        )}
      </section>

      {/* 10. FAMILY PRIORITIES (Priority 7) */}
      {familyPriorities.length > 0 && (
        <section aria-labelledby="priorities-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
          <h2 id="priorities-heading" className="text-title font-bold text-ink">{t('family_priorities', 'Family Priorities')}</h2>
          <p className="mt-xxs text-caption text-ink-muted">
            {t('priorities_subtitle', "Shared family criteria — informs guidance without overriding your child's choices.")}
          </p>
          <div className="mt-sm flex flex-wrap gap-xs">
            {familyPriorities.map((priority) => (
              <span
                key={priority}
                className="inline-flex items-center rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-caption font-medium text-ink-secondary"
              >
                {priority}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 11. FAMILY DISCUSSION (Priority 8) */}
      <section aria-labelledby="discussion-heading" className="rounded-lg border border-hairline bg-surface p-md shadow-xs">
        <div className="flex items-start justify-between gap-sm">
          <div>
            <h2 id="discussion-heading" className="text-title font-bold text-ink">{t('family_discussion', 'Family Discussion')}</h2>
            <p className="mt-xxs text-caption text-ink-muted">{familyDiscussion.helper_text}</p>
          </div>
          <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        </div>

        <ul className="mt-sm space-y-2 text-body-sm">
          {familyDiscussion.prompts.slice(0, 3).map((prompt, idx) => (
            <li key={idx} className="flex items-start gap-2 text-ink-secondary">
              <span className="font-bold text-primary">•</span>
              <span>{prompt}</span>
            </li>
          ))}
        </ul>

        <div className="mt-md border-t border-hairline pt-sm flex justify-end">
          <button
            type="button"
            onClick={() => setGuideModalOpen(true)}
            className="group inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:text-primary-active"
          >
            <span>{t('view_discussion_guide', 'View discussion guide')}</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* 12. GUIDANCE NOTE (Priority 9) */}
      <section aria-label="Guidance note" className="flex items-start gap-sm rounded-lg border border-hairline bg-canvas-soft p-md text-caption text-ink-secondary">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <h3 className="font-semibold text-ink text-body-sm">{t('guidance_title', 'Guidance, not a prediction.')}</h3>
          <p className="mt-0.5 leading-relaxed">
            {t('guidance_desc', 'Interests, skills and plans can change. Review the pathway as your child gains new experience.')}
          </p>
        </div>
      </section>

      {/* 13. REASSESSMENT INDICATOR (Priority 10) */}
      <div className="flex items-center justify-between px-xs py-xxs text-caption text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {t('next_review', 'Next review: 90 days')}
        </span>
        <span>{t('roadmap_dynamic', 'Roadmap updates dynamically')}</span>
      </div>

      {/* DISCUSSION GUIDE MODAL */}
      <DiscussionGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        studentName={studentName}
        prompts={familyDiscussion.prompts}
        tips={familyDiscussion.guide_tips}
      />
    </div>
  );
}
export default GuardianSummaryView;
