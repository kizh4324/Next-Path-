/**
 * Stage-aware 6-Step Onboarding Wizard
 *
 * Pages:
 * 1. Education Stage
 * 2. Interests (Technical & Non-Technical / Extracurricular)
 * 3. Values & Preferences (Environment, Team Style, Priorities)
 * 4. Academic Background (Subject comfort 1-5 ratings & optional transcripts)
 * 5. Practical Feasibility (Annual budget & Geographic relocation)
 * 6. Review & Blueprint (Complete summary & final blueprint generation)
 *
 * All backend API contracts, Zod validations, data schemas, and persistence remain intact.
 */

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  BookOpen,
  Building2,
  ShieldCheck,
  Check,
  Code2,
  Palette,
  Users,
  Briefcase,
  Layers,
  FileText,
  MapPin,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Pencil,
  Sparkles,
} from 'lucide-react';

import { MinorConsentModal } from '@/components/auth/MinorConsentModal';
import { Button, Callout, Card, Field, Input, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys, useProfileStatus, useSaveProfile } from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';
import { onboardingSchema, type OnboardingInput } from '@/types/forms';
import type { BudgetTier, EducationStage, RelocationWillingness, RiasecKey } from '@/types/models';
import { cn } from '@/utils/cn';

const DRAFT_KEY = 'nextpath.onboarding.draft';

export const STEP_TITLES = [
  'Education Stage',
  'Interests',
  'Values & Preferences',
  'Academic Background',
  'Practical Feasibility',
  'Review & Blueprint',
] as const;

interface StageOption {
  value: EducationStage;
  title: string;
  description: string;
  icon: typeof GraduationCap;
}

const STAGES: StageOption[] = [
  {
    value: 'class_8_10',
    title: 'Class 8–10',
    description: 'Stream selection, foundational interest exploration & subject discovery',
    icon: GraduationCap,
  },
  {
    value: 'class_11_12',
    title: 'Class 11–12',
    description: 'Undergraduate course planning, competitive entrance exams & career tracks',
    icon: BookOpen,
  },
  {
    value: 'early_college',
    title: 'College – 1st / 2nd Year',
    description: 'Degree specialization, early career pivots, core internships & skills alignment',
    icon: Building2,
  },
];

interface InterestItem {
  label: string;
  riasec: RiasecKey;
  hint: string;
  tag: string;
}

// 1. Technical Interests
const TECHNICAL_INTERESTS: InterestItem[] = [
  {
    label: 'Building or fixing things with my hands',
    riasec: 'R',
    hint: 'Hardware, mechanics, robotics, and fabrication',
    tag: 'Hands-on Engineering',
  },
  {
    label: 'Solving puzzles and figuring out why things work',
    riasec: 'I',
    hint: 'Algorithms, logic, coding, and mathematical thinking',
    tag: 'Logic & Problem Solving',
  },
  {
    label: 'Experimenting and researching',
    riasec: 'I',
    hint: 'Scientific testing, empirical data, and discovery',
    tag: 'Research & Science',
  },
  {
    label: 'Working with numbers, records, and accuracy',
    riasec: 'C',
    hint: 'Quantitative analysis, statistics, and high precision',
    tag: 'Quantitative Analytics',
  },
  {
    label: 'Organising information and keeping things in order',
    riasec: 'C',
    hint: 'Database structures, workflows, and process systems',
    tag: 'Systems & Architecture',
  },
];

// 2. Non-Technical & Extracurricular Interests
const NON_TECHNICAL_INTERESTS: InterestItem[] = [
  {
    label: 'Drawing, designing, or making things look good',
    riasec: 'A',
    hint: 'Visual design, UI/UX, illustration, and creative aesthetics',
    tag: 'Visual & UI Design',
  },
  {
    label: 'Writing, performing, or telling stories',
    riasec: 'A',
    hint: 'Creative writing, multimedia communications, and narrative',
    tag: 'Communications & Media',
  },
  {
    label: 'Helping people who are struggling',
    riasec: 'S',
    hint: 'Psychology, community advocacy, and healthcare counseling',
    tag: 'Social Impact & Care',
  },
  {
    label: 'Teaching or explaining things to others',
    riasec: 'S',
    hint: 'Education, academic mentorship, and knowledge sharing',
    tag: 'Mentorship & Education',
  },
  {
    label: 'Leading a group or starting something',
    riasec: 'E',
    hint: 'Entrepreneurship, team direction, and launching ventures',
    tag: 'Leadership & Startups',
  },
  {
    label: 'Persuading people and negotiating',
    riasec: 'E',
    hint: 'Strategic debating, advocacy, sales, and stakeholder alignment',
    tag: 'Negotiation & Strategy',
  },
  {
    label: 'Working outdoors or on site',
    riasec: 'R',
    hint: 'Environmental fieldwork, agriculture, surveying, and logistics',
    tag: 'Field & Outdoors',
  },
];

interface ValuePreferenceOption {
  value: string;
  title: string;
  description: string;
}

const WORK_ENVIRONMENT_OPTIONS: ValuePreferenceOption[] = [
  {
    value: 'Tech Office & Modern Studio',
    title: 'Tech Office & Studio',
    description: 'Collaborative desk space with modern digital tools and computational infrastructure.',
  },
  {
    value: 'Hybrid / Flexible',
    title: 'Hybrid / Flexible Workspace',
    description: 'Dynamic mix of focused remote productivity and regular in-person team workshops.',
  },
  {
    value: 'Field, Lab & Active Facilities',
    title: 'Field, Lab & Active Facilities',
    description: 'Hands-on operational environments with physical prototypes, field testing, or labs.',
  },
  {
    value: 'Remote & Independent',
    title: 'Remote & Autonomous',
    description: 'Digital-first workflow allowing deep personal focus and geographic independence.',
  },
];

const COLLABORATION_OPTIONS: ValuePreferenceOption[] = [
  {
    value: 'Collaborative & Agile Teams',
    title: 'Collaborative & Agile Teams',
    description: 'High peer interaction, frequent brainstorming, pair execution, and shared team milestones.',
  },
  {
    value: 'Independent / Autonomous Focus',
    title: 'Independent & Autonomous Ownership',
    description: 'Deep individual ownership with uninterrupted focus blocks and milestone check-ins.',
  },
  {
    value: 'Balanced & Cross-Functional',
    title: 'Balanced & Cross-Functional',
    description: 'Autonomous module ownership paired with structured team standups and cross-team reviews.',
  },
];

const CAREER_PRIORITY_OPTIONS: ValuePreferenceOption[] = [
  {
    value: 'Innovation & Intellectual Challenge',
    title: 'Innovation & Problem Solving',
    description: 'Solving complex engineering or scientific puzzles and continuous intellectual learning.',
  },
  {
    value: 'Job Stability & Long-Term Growth',
    title: 'Stability, Predictability & Growth',
    description: 'Structured progression ladder, durable market demand, and dependable long-term security.',
  },
  {
    value: 'Social Impact & Helping Others',
    title: 'Social Impact & Community Welfare',
    description: 'Direct positive contribution to community welfare, healthcare, education, or equity.',
  },
  {
    value: 'Entrepreneurship & Leadership',
    title: 'Leadership & Entrepreneurship',
    description: 'Building ventures, leading teams, spearheading initiatives, and scaling high-impact projects.',
  },
];

const SUBJECTS = [
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'computers',
  'language',
  'social_science',
  'commerce',
  'art_design',
  'practical_skills',
];

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  computers: 'Computer Science',
  language: 'Languages & Writing',
  social_science: 'Social Science',
  commerce: 'Commerce & Accounts',
  art_design: 'Art & Design',
  practical_skills: 'Practical / Hands-on Skills',
};

const BUDGETS: { value: BudgetTier; label: string; badge: string; hint: string }[] = [
  {
    value: 'low_cost_only',
    label: 'Under ₹50,000 / year',
    badge: 'Government & Subsidized',
    hint: 'Government colleges, central universities, and scholarship-funded routes',
  },
  {
    value: 'moderate_up_to_2_lakhs',
    label: '₹50,000 to ₹2,00,000 / year',
    badge: 'State & Balanced Aided',
    hint: 'Most government-aided institutions, state colleges, and selective private options',
  },
  {
    value: 'flexible_above_2_lakhs',
    label: 'Above ₹2,00,000 / year',
    badge: 'Expanded Private Reach',
    hint: 'Premier private universities, specialized institutes, and self-financed programs',
  },
];

const RELOCATION: { value: RelocationWillingness; label: string; detail: string }[] = [
  {
    value: 'home_district_only',
    label: 'Home District Only',
    detail: 'I prefer to study locally and commute from home daily.',
  },
  {
    value: 'within_state',
    label: 'Within My State',
    detail: 'Open to premier state colleges and universities across my state.',
  },
  {
    value: 'anywhere_in_india',
    label: 'Anywhere in India',
    detail: 'Open to relocating across national premier institutes (IITs, NITs, Central Unis).',
  },
  {
    value: 'abroad',
    label: 'India or Abroad',
    detail: 'Exploring both national institutions and international opportunities.',
  },
];

const STUDY_OPTIONS = [
  'Class 8–10',
  'Class 11–12',
  'B.E / B.Tech',
  'B.Sc',
  'BCA',
  'B.Com',
  'BA / Humanities',
  'Diploma',
  'Other',
  'Not decided yet',
] as const;

const ENGINEERING_BRANCHES = [
  'Computer Science Engineering (CSE)',
  'Information Technology (IT)',
  'Artificial Intelligence & Data Science (AI & DS)',
  'Artificial Intelligence & Machine Learning (AI & ML)',
  'Cyber Security',
  'Electronics & Communication Engineering (ECE)',
  'Electrical & Electronics Engineering (EEE)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biomedical Engineering',
  'Biotechnology',
  'Chemical Engineering',
  'Other Engineering / Technology',
] as const;

interface DraftState {
  education_stage: EducationStage | null;
  grade_or_year: string;
  current_stream: string;
  degree: string;
  engineering_branch: string;
  interests: { label: string; riasec: RiasecKey; strength: number }[];
  aptitude_signals: Record<string, number>;
  work_style_preferences: Record<string, string>;
  budget_tier: BudgetTier;
  relocation_willingness: RelocationWillingness;
  academic_records_available: boolean;
}

const EMPTY_DRAFT: DraftState = {
  education_stage: null,
  grade_or_year: '',
  current_stream: '',
  degree: '',
  engineering_branch: '',
  interests: [],
  aptitude_signals: {},
  work_style_preferences: {
    work_environment: 'Hybrid / Flexible',
    team_preference: 'Collaborative & Agile Teams',
    career_priority: 'Innovation & Intellectual Challenge',
  },
  budget_tier: 'moderate_up_to_2_lakhs',
  relocation_willingness: 'within_state',
  academic_records_available: false,
};

function loadDraft(): DraftState {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    const draft: DraftState = {
      ...EMPTY_DRAFT,
      ...parsed,
      work_style_preferences: {
        ...EMPTY_DRAFT.work_style_preferences,
        ...(parsed.work_style_preferences || {}),
      },
    };

    if (!draft.degree && draft.current_stream) {
      if (draft.current_stream.startsWith('B.E / B.Tech')) {
        draft.degree = 'B.E / B.Tech';
        const parts = draft.current_stream.split(' - ');
        if (parts[1]) {
          draft.engineering_branch = parts[1];
        }
      } else if (STUDY_OPTIONS.includes(draft.current_stream as any)) {
        draft.degree = draft.current_stream;
      }
    }
    return draft;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function OnboardingWizard(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(loadDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const saveProfile = useSaveProfile();
  const { data: status, isLoading: statusLoading } = useProfileStatus();
  const hasCompletedLocal =
    typeof window !== 'undefined' && window.localStorage.getItem('onboarding_completed') === 'true';

  useEffect(() => {
    if (!isEditing && !statusLoading && (status?.profile_exists || hasCompletedLocal)) {
      navigate('/results', { replace: true });
    }
  }, [isEditing, statusLoading, status?.profile_exists, hasCompletedLocal, navigate]);

  // Persist on every change
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      const timer = window.setTimeout(() => setDraftSaved(false), 1200);
      return () => window.clearTimeout(timer);
    } catch {
      return undefined;
    }
  }, [draft]);

  const isMinorStage =
    draft.education_stage === 'class_8_10' || draft.education_stage === 'class_11_12';

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]): void =>
    setDraft((current) => ({ ...current, [key]: value }));

  const updateWorkPreference = (key: string, value: string): void => {
    setDraft((current) => ({
      ...current,
      work_style_preferences: {
        ...current.work_style_preferences,
        [key]: value,
      },
    }));
  };

  const handleStageSelect = (stageValue: EducationStage): void => {
    setDraft((current) => {
      let degree = current.degree;
      let engineeringBranch = current.engineering_branch;
      let currentStream = current.current_stream;

      if (stageValue === 'class_8_10') {
        if (!degree || degree === 'Class 11–12' || degree === 'B.E / B.Tech') {
          degree = 'Class 8–10';
          engineeringBranch = '';
          currentStream = 'Class 8–10';
        }
      } else if (stageValue === 'class_11_12') {
        if (!degree || degree === 'Class 8–10' || degree === 'B.E / B.Tech') {
          degree = 'Class 11–12';
          engineeringBranch = '';
          currentStream = 'Class 11–12';
        }
      } else if (stageValue === 'early_college') {
        if (degree === 'Class 8–10' || degree === 'Class 11–12') {
          degree = '';
          engineeringBranch = '';
          currentStream = '';
        }
      }

      return {
        ...current,
        education_stage: stageValue,
        degree,
        engineering_branch: engineeringBranch,
        current_stream: currentStream,
      };
    });
  };

  const handleStudyChange = (studyValue: string): void => {
    setDraft((current) => {
      let newStage = current.education_stage;
      if (studyValue === 'Class 8–10') {
        newStage = 'class_8_10';
      } else if (studyValue === 'Class 11–12') {
        newStage = 'class_11_12';
      } else if (
        studyValue === 'B.E / B.Tech' ||
        studyValue === 'B.Sc' ||
        studyValue === 'BCA' ||
        studyValue === 'B.Com' ||
        studyValue === 'BA / Humanities' ||
        studyValue === 'Diploma'
      ) {
        newStage = 'early_college';
      }

      const branch = studyValue === 'B.E / B.Tech' ? current.engineering_branch : '';
      const stream =
        studyValue === 'B.E / B.Tech' && branch ? `B.E / B.Tech - ${branch}` : studyValue;

      return {
        ...current,
        education_stage: newStage,
        degree: studyValue,
        engineering_branch: branch,
        current_stream: stream,
      };
    });
  };

  const handleBranchChange = (branchValue: string): void => {
    setDraft((current) => ({
      ...current,
      engineering_branch: branchValue,
      current_stream: branchValue ? `B.E / B.Tech - ${branchValue}` : 'B.E / B.Tech',
    }));
  };

  const toggleInterest = (label: string, riasec: RiasecKey): void =>
    setDraft((current) => {
      const exists = current.interests.some((entry) => entry.label === label);
      return {
        ...current,
        interests: exists
          ? current.interests.filter((entry) => entry.label !== label)
          : [...current.interests, { label, riasec, strength: 4 }],
      };
    });

  const completeness = useMemo(() => {
    let earned = 10;
    if (draft.education_stage) earned += 15;
    if (draft.grade_or_year) earned += 10;
    if (draft.degree || draft.current_stream) earned += 10;
    if (draft.interests.length > 0) earned += 25;
    if (Object.keys(draft.work_style_preferences).length > 0) earned += 15;
    if (Object.keys(draft.aptitude_signals).length > 0) earned += 15;
    if (draft.budget_tier) earned += 5;
    if (draft.relocation_willingness) earned += 5;
    return Math.min(100, earned);
  }, [draft]);

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!draft.education_stage) {
        next.education_stage = 'Please choose where you currently are in your education.';
      }
      if (!draft.grade_or_year.trim()) {
        next.grade_or_year = 'Please enter your current class or year (e.g. Class 10, Class 12).';
      }
      if (draft.degree === 'B.E / B.Tech' && !draft.engineering_branch) {
        next.engineering_branch = 'Please select your engineering branch.';
      }
    }
    if (step === 1 && draft.interests.length === 0) {
      next.interests = 'Please select at least one activity you genuinely enjoy.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext(): void {
    if (!validateStep()) return;
    setStep((current) => Math.min(STEP_TITLES.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack(): void {
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(): Promise<void> {
    if (!validateStep()) return;

    const streamToSubmit =
      draft.degree === 'B.E / B.Tech' && draft.engineering_branch
        ? `B.E / B.Tech - ${draft.engineering_branch}`
        : draft.degree || draft.current_stream || null;

    const payload: OnboardingInput = onboardingSchema.parse({
      education_stage: draft.education_stage,
      grade_or_year: draft.grade_or_year.trim(),
      current_stream: streamToSubmit,
      degree: draft.degree || null,
      engineering_branch: draft.engineering_branch || null,
      interests: draft.interests,
      aptitude_signals: draft.aptitude_signals,
      work_style_preferences: draft.work_style_preferences,
      budget_tier: draft.budget_tier,
      relocation_willingness: draft.relocation_willingness,
      preferred_languages: ['English'],
      academic_records_available: draft.academic_records_available,
      consent_given_by: user?.full_name || 'Guardian Consent',
      consent_type: isMinorStage ? 'guardian_consent_minor' : 'self_consent_adult',
    });

    try {
      const profile = await saveProfile.mutateAsync(payload);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_KEY);
        window.localStorage.setItem('onboarding_completed', 'true');
      }

      await queryClient.refetchQueries({ queryKey: queryKeys.profileStatus });
      await queryClient.refetchQueries({ queryKey: queryKeys.recommendations });

      if (isMinorStage && !profile.consent_given_by) {
        setProfileId(profile.id);
        setConsentOpen(true);
        return;
      }
      navigate('/results');
    } catch (error) {
      setErrors({
        submit:
          error instanceof ApiError
            ? error.message
            : 'We could not save your answers. Please try again.',
      });
    }
  }

  if (!isEditing && !statusLoading && (status?.profile_exists || hasCompletedLocal)) {
    return <Navigate to="/results" replace />;
  }

  const completionPercent = Math.round(((step + 1) / STEP_TITLES.length) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* --- Top Progress Bar & Header --- */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted">
          <span>
            Step {step + 1} of {STEP_TITLES.length} •{' '}
            <span className="text-ink font-bold">{STEP_TITLES[step]}</span>
          </span>
          <span className="text-ink-muted font-medium">{completionPercent}% Completed</span>
        </div>

        {/* 6 Discrete Segmented Progress Bars (as shown in visual spec) */}
        <div className="mt-2.5 grid grid-cols-6 gap-2 w-full" aria-hidden="true">
          {STEP_TITLES.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                idx <= step ? 'bg-primary' : 'bg-hairline',
              )}
            />
          ))}
        </div>

        {draftSaved && (
          <div className="mt-1 text-right">
            <span className="text-[11px] text-ink-muted">Draft saved automatically</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: EDUCATION STAGE                                                  */}
      {/* ========================================================================= */}
      {step === 0 && (
        <Card className="border border-hairline bg-surface p-6 sm:p-8 rounded-xl shadow-none">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Getting Started
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Let’s build your career path
            </h1>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              Answer a few simple questions so our guidance system can personalize your journey.
            </p>
          </div>

          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold text-ink mb-3 block">
                What best describes your current stage?
              </legend>
              <div className="space-y-3">
                {STAGES.map((stage) => {
                  const isSelected = draft.education_stage === stage.value;
                  const Icon = stage.icon;
                  return (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => handleStageSelect(stage.value)}
                      aria-pressed={isSelected}
                      className={cn(
                        'w-full text-left rounded-lg p-4 transition-all duration-150 border flex items-center justify-between gap-4 cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Radio Dot Indicator */}
                        <div
                          className={cn(
                            'h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-hairline bg-surface',
                          )}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>

                        <div className="min-w-0">
                          <div className="text-base font-semibold text-ink leading-snug">
                            {stage.title}
                          </div>
                          <div className="text-xs text-ink-muted leading-relaxed mt-0.5">
                            {stage.description}
                          </div>
                        </div>
                      </div>

                      <Icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isSelected ? 'text-primary' : 'text-ink-muted',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              {errors.education_stage && (
                <p className="mt-2 text-xs text-error font-medium" role="alert">
                  {errors.education_stage}
                </p>
              )}
            </fieldset>

            {/* Compact Education Details Grid */}
            <div className="pt-4 border-t border-hairline grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Which class or year are you currently in?"
                hint="e.g. Class 10, Class 12, or B.Tech Year 1"
                error={errors.grade_or_year}
                required
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={draft.grade_or_year}
                    onChange={(event) => update('grade_or_year', event.target.value)}
                    placeholder="Enter class or year"
                  />
                )}
              </Field>

              <Field
                label="What are you currently studying?"
                hint="Select your current class or program"
                error={errors.degree}
              >
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={draft.degree}
                    onChange={(event) => handleStudyChange(event.target.value)}
                  >
                    <option value="">Select current study option</option>
                    {STUDY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            {draft.degree === 'B.E / B.Tech' && (
              <div className="pt-2">
                <Field
                  label="Which engineering branch are you studying?"
                  hint="Select your branch to customize core engineering roadmap"
                  error={errors.engineering_branch}
                  required
                >
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={draft.engineering_branch}
                      onChange={(event) => handleBranchChange(event.target.value)}
                    >
                      <option value="">Select an engineering branch</option>
                      {ENGINEERING_BRANCHES.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            )}

            {/* Informational Guidance Notice Card */}
            <div className="rounded-lg bg-canvas-soft border border-hairline p-3.5 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-ink-muted leading-relaxed">
                Your responses help configure our real-time guidance model. You can adjust your
                profile at any time.
              </p>
            </div>

            {isMinorStage && (
              <div className="rounded-lg bg-canvas-soft border border-hairline p-3.5 flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-ink-muted leading-relaxed">
                  <strong className="text-ink font-semibold">
                    Guardian Notice (DPDP Compliant):
                  </strong>{' '}
                  As a school student under 18, a concise parent/guardian summary will be available
                  to verify your selected career choices.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: INTERESTS (Separated into Technical & Non-Technical)               */}
      {/* ========================================================================= */}
      {step === 1 && (
        <Card className="border border-hairline bg-surface p-6 sm:p-8 rounded-xl shadow-none">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Self Discovery
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              What activities spark your curiosity?
            </h1>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              Select all activities that genuinely appeal to you. We map these directly to validated
              RIASEC career clusters without algorithmic bias.
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-ink-muted">
                Selected: <strong className="text-ink">{draft.interests.length}</strong> activities
              </span>
              {draft.interests.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                  <Check className="h-3.5 w-3.5" /> RIASEC signals ready
                </span>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Section A: Technical Interests */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <Code2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Technical Interests
                </h2>
                <span className="text-xs text-ink-muted ml-auto font-medium">
                  Engineering, Logic, Science & Data
                </span>
              </div>

              <div className="space-y-2.5">
                {TECHNICAL_INTERESTS.map((item) => {
                  const isSelected = draft.interests.some((entry) => entry.label === item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleInterest(item.label, item.riasec)}
                      aria-pressed={isSelected}
                      className={cn(
                        'w-full text-left rounded-lg p-3.5 border transition-all duration-150 flex items-start gap-3 cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-hairline bg-surface',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink leading-tight">
                          {item.label}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">{item.hint}</div>
                      </div>

                      <span className="hidden sm:inline-block shrink-0 text-[11px] font-medium text-ink-muted bg-canvas-soft px-2 py-0.5 rounded border border-hairline">
                        {item.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: Non-Technical & Extracurricular Interests */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <Palette className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Non-Technical & Extracurricular Interests
                </h2>
                <span className="text-xs text-ink-muted ml-auto font-medium">
                  Creative, Social & Leadership
                </span>
              </div>

              <div className="space-y-2.5">
                {NON_TECHNICAL_INTERESTS.map((item) => {
                  const isSelected = draft.interests.some((entry) => entry.label === item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleInterest(item.label, item.riasec)}
                      aria-pressed={isSelected}
                      className={cn(
                        'w-full text-left rounded-lg p-3.5 border transition-all duration-150 flex items-start gap-3 cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-hairline bg-surface',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink leading-tight">
                          {item.label}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">{item.hint}</div>
                      </div>

                      <span className="hidden sm:inline-block shrink-0 text-[11px] font-medium text-ink-muted bg-canvas-soft px-2 py-0.5 rounded border border-hairline">
                        {item.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {errors.interests && (
              <p className="text-xs text-error font-medium" role="alert">
                {errors.interests}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PAGE 3: VALUES & PREFERENCES (Organized into Clean Sections)              */}
      {/* ========================================================================= */}
      {step === 2 && (
        <Card className="border border-hairline bg-surface p-6 sm:p-8 rounded-xl shadow-none">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Values & Preferences
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              How do you prefer to work and grow?
            </h1>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              Define the physical environments, team collaboration dynamics, and core priorities
              that match your aspirations.
            </p>
          </div>

          <div className="space-y-6">
            {/* Section 1: Work Environment */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <Briefcase className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  1. Work Environment & Setting
                </h2>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                Where do you feel you will do your best, most energizing work?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WORK_ENVIRONMENT_OPTIONS.map((opt) => {
                  const isSelected =
                    draft.work_style_preferences?.work_environment === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateWorkPreference('work_environment', opt.value)}
                      className={cn(
                        'text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-ink">{opt.title}</span>
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border flex items-center justify-center',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-hairline bg-surface',
                            )}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Team & Collaboration Style */}
            <div className="pt-2">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  2. Team & Collaboration Dynamics
                </h2>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                How do you prefer structuring your day with peers and mentors?
              </p>
              <div className="space-y-2.5">
                {COLLABORATION_OPTIONS.map((opt) => {
                  const isSelected =
                    draft.work_style_preferences?.team_preference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateWorkPreference('team_preference', opt.value)}
                      className={cn(
                        'w-full text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer flex items-start gap-3',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0',
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-hairline bg-surface',
                        )}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{opt.title}</div>
                        <div className="text-xs text-ink-muted mt-0.5">{opt.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Core Career Priorities */}
            <div className="pt-2">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  3. Core Career Priorities
                </h2>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                What long-term career value matters most in your journey?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAREER_PRIORITY_OPTIONS.map((opt) => {
                  const isSelected =
                    draft.work_style_preferences?.career_priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateWorkPreference('career_priority', opt.value)}
                      className={cn(
                        'text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-ink">{opt.title}</span>
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border flex items-center justify-center',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-hairline bg-surface',
                            )}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: ACADEMIC BACKGROUND (Clear, Compact Layout)                       */}
      {/* ========================================================================= */}
      {step === 3 && (
        <Card className="border border-hairline bg-surface p-6 sm:p-8 rounded-xl shadow-none">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Academic Background
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Self-assessed Subject Comfort
            </h1>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              Rate your confidence on a scale of 1 (challenging) to 5 (effortless). Skip subjects
              you haven't taken — unrated subjects indicate an evidence gap, never a penalty.
            </p>

            {/* Compact Legend Scale */}
            <div className="mt-3.5 rounded-lg bg-canvas-soft border border-hairline p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Rating Scale:</span>
              <div className="flex flex-wrap items-center gap-3">
                <span>1 = Challenging</span>
                <span>3 = Comfortable</span>
                <span>5 = Effortless</span>
              </div>
              <span className="text-[11px] text-ink-muted italic">Click active rating to clear</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Compact 2-column Grid of Subjects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUBJECTS.map((subject) => {
                const currentRating = draft.aptitude_signals[subject];
                return (
                  <div
                    key={subject}
                    className="rounded-lg border border-hairline bg-surface p-3 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium text-ink truncate">
                      {SUBJECT_LABELS[subject]}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = currentRating === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setDraft((curr) => {
                                const nextSignals = { ...curr.aptitude_signals };
                                if (nextSignals[subject] === val) {
                                  delete nextSignals[subject];
                                } else {
                                  nextSignals[subject] = val;
                                }
                                return { ...curr, aptitude_signals: nextSignals };
                              })
                            }
                            aria-label={`${SUBJECT_LABELS[subject]} rating ${val}`}
                            className={cn(
                              'h-7 w-7 rounded text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer',
                              isSelected
                                ? 'bg-primary text-white shadow-none font-bold'
                                : 'bg-canvas-soft border border-hairline text-ink-secondary hover:border-primary/40 hover:text-ink',
                            )}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Records Verification */}
            <div className="mt-6 pt-4 border-t border-hairline">
              <label className="flex items-start gap-3 text-sm text-ink-secondary cursor-pointer p-3 rounded-lg bg-canvas-soft border border-hairline">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-hairline text-primary focus:ring-primary shrink-0"
                  checked={draft.academic_records_available}
                  onChange={(event) => update('academic_records_available', event.target.checked)}
                />
                <div>
                  <span className="font-semibold text-ink">
                    I have school transcripts or exam scorecards available for review (Optional)
                  </span>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Transcripts are completely optional per FR-01 and give your counselor additional
                    evidence when reviewing high-stakes entrance paths.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PAGE 5: PRACTICAL FEASIBILITY (Logical Sections)                          */}
      {/* ========================================================================= */}
      {step === 4 && (
        <Card className="border border-hairline bg-surface p-6 sm:p-8 rounded-xl shadow-none">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Practical Feasibility
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              What’s realistic for you and your family?
            </h1>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              Realistic constraints safeguard you from financial debt and deadlocks. We cross-check
              every recommendation against actual college fees and entrance criteria.
            </p>
          </div>

          <div className="space-y-6">
            {/* Section 1: Annual Budget */}
            <fieldset>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <Wallet className="h-4 w-4 text-primary" />
                <legend className="text-sm font-bold text-ink uppercase tracking-wider">
                  1. Realistic Annual Education Budget
                </legend>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                Estimated tuition and living expenses your family can comfortably budget per academic
                year:
              </p>

              <div className="space-y-2.5">
                {BUDGETS.map((budget) => {
                  const isSelected = draft.budget_tier === budget.value;
                  return (
                    <button
                      key={budget.value}
                      type="button"
                      onClick={() => update('budget_tier', budget.value)}
                      className={cn(
                        'w-full text-left rounded-lg p-3.5 border transition-all duration-150 cursor-pointer flex items-center justify-between gap-4',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-hairline bg-surface',
                          )}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink leading-tight">
                            {budget.label}
                          </div>
                          <div className="text-xs text-ink-muted mt-0.5">{budget.hint}</div>
                        </div>
                      </div>

                      <span className="hidden sm:inline-block shrink-0 text-[11px] font-medium text-ink-muted bg-canvas-soft px-2 py-0.5 rounded border border-hairline">
                        {budget.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Section 2: Relocation Willingness */}
            <fieldset className="pt-2">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-hairline">
                <MapPin className="h-4 w-4 text-primary" />
                <legend className="text-sm font-bold text-ink uppercase tracking-wider">
                  2. Geographic Relocation Willingness
                </legend>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                How far are you open to travelling or relocating for your higher studies?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RELOCATION.map((opt) => {
                  const isSelected = draft.relocation_willingness === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('relocation_willingness', opt.value)}
                      className={cn(
                        'text-left rounded-lg p-3.5 border transition-all duration-150 cursor-pointer flex flex-col justify-between',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-hairline bg-surface hover:bg-canvas-soft hover:border-ink-faint/40',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-ink">{opt.label}</span>
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-hairline bg-surface',
                            )}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">{opt.detail}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PAGE 6: REVIEW & BLUEPRINT (Comprehensive, Clean Summary)                 */}
      {/* ========================================================================= */}
      {step === 5 && (
        <Card className="border border-hairline bg-surface p-6 sm:p-8 rounded-xl shadow-none">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Review & Blueprint
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Summary of Your Profile
            </h1>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              Verify your preferences below. When you complete onboarding, our guidance engine
              synthesizes your custom career pathways and adaptive 30/90/180-day roadmaps.
            </p>
          </div>

          <div className="space-y-4">
            {/* Section Summary Cards */}

            {/* 1. Education Stage */}
            <div className="rounded-lg border border-hairline bg-canvas-soft/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                    1. Education Stage & Program
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-ink-muted block">Stage</span>
                  <span className="font-semibold text-ink">
                    {STAGES.find((s) => s.value === draft.education_stage)?.title || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block">Current Class/Year</span>
                  <span className="font-semibold text-ink">{draft.grade_or_year || '—'}</span>
                </div>
                <div>
                  <span className="text-ink-muted block">Current Program</span>
                  <span className="font-semibold text-ink">
                    {draft.degree === 'B.E / B.Tech' && draft.engineering_branch
                      ? `B.E / B.Tech (${draft.engineering_branch})`
                      : draft.degree || draft.current_stream || 'Not decided yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Interests */}
            <div className="rounded-lg border border-hairline bg-canvas-soft/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                    2. Selected Interests ({draft.interests.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              {draft.interests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {draft.interests.map((interest) => (
                    <span
                      key={interest.label}
                      className="inline-flex items-center text-xs bg-surface border border-hairline rounded-md px-2.5 py-1 text-ink-secondary"
                    >
                      {interest.label}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-error font-medium">No interests selected yet</span>
              )}
            </div>

            {/* 3. Values & Preferences */}
            <div className="rounded-lg border border-hairline bg-canvas-soft/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                    3. Values & Preferences
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-ink-muted block">Work Environment</span>
                  <span className="font-semibold text-ink">
                    {draft.work_style_preferences?.work_environment || 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block">Collaboration Style</span>
                  <span className="font-semibold text-ink">
                    {draft.work_style_preferences?.team_preference || 'Collaborative'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block">Career Priority</span>
                  <span className="font-semibold text-ink">
                    {draft.work_style_preferences?.career_priority || 'Innovation & Challenge'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Academic Signals */}
            <div className="rounded-lg border border-hairline bg-canvas-soft/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                    4. Academic Signals & Transcripts
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Subjects Self-Rated:</span>
                  <span className="font-semibold text-ink">
                    {Object.keys(draft.aptitude_signals).length} of {SUBJECTS.length} subjects
                  </span>
                </div>
                {Object.keys(draft.aptitude_signals).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(draft.aptitude_signals).map(([sub, rating]) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 bg-surface border border-hairline px-2 py-0.5 rounded text-[11px] text-ink"
                      >
                        <span>{SUBJECT_LABELS[sub] || sub}:</span>
                        <strong className="text-primary">{rating}/5</strong>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-hairline/60">
                  <span className="text-ink-muted">Transcript records available:</span>
                  <span className="font-semibold text-ink">
                    {draft.academic_records_available ? 'Yes (Available for counselor)' : 'No (Optional)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Feasibility Constraints */}
            <div className="rounded-lg border border-hairline bg-canvas-soft/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                    5. Feasibility Boundaries
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ink-muted block">Annual Education Budget</span>
                  <span className="font-semibold text-ink">
                    {BUDGETS.find((b) => b.value === draft.budget_tier)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block">Geographic Willingness</span>
                  <span className="font-semibold text-ink">
                    {RELOCATION.find((r) => r.value === draft.relocation_willingness)?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completeness Assessment Bar */}
            <div className="rounded-lg border border-hairline bg-surface p-4 mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  Overall Signal Completeness
                </span>
                <span className="text-sm font-bold text-primary">{completeness}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-canvas-soft">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Higher completeness unlocks strong Evidence Quality ratings and prevents ungrounded
                hallucinations.
              </p>
            </div>

            {errors.submit && <Callout variant="error">{errors.submit}</Callout>}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STICKY BOTTOM ACTION BAR                                                  */}
      {/* ========================================================================= */}
      <div className="sticky bottom-0 z-20 mt-6 pt-4 pb-4 border-t border-hairline bg-canvas flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            type="button"
            variant="utility"
            onClick={goBack}
            className="rounded-full px-5 py-2.5 text-sm font-medium border-hairline flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        ) : (
          <div />
        )}

        {step < STEP_TITLES.length - 1 ? (
          <Button
            type="button"
            onClick={goNext}
            className="rounded-full bg-primary text-white hover:bg-primary-active px-7 py-2.5 text-sm font-medium flex items-center gap-2 ml-auto shadow-none"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void submit()}
            loading={saveProfile.isPending}
            disabled={completeness < 40}
            className="rounded-full bg-primary text-white hover:bg-primary-active px-8 py-2.5 text-sm font-semibold flex items-center gap-2 ml-auto shadow-none"
          >
            <Sparkles className="h-4 w-4" />
            <span>{saveProfile.isPending ? 'Generating Blueprint…' : 'Generate My Career Blueprint'}</span>
          </Button>
        )}
      </div>

      {status && !status.can_generate_recommendations && status.blocking_reason && step === 5 && (
        <div className="mt-4">
          <Callout variant="info">{status.blocking_reason}</Callout>
        </div>
      )}

      <MinorConsentModal
        open={consentOpen}
        studentProfileId={profileId}
        onClose={() => setConsentOpen(false)}
        onRecorded={() => {
          setConsentOpen(false);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('onboarding_completed', 'true');
          }
          void queryClient.invalidateQueries({ queryKey: queryKeys.profileStatus });
          void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
          navigate('/results');
        }}
      />
    </div>
  );
}
