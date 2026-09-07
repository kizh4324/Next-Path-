/**
 * Stage-aware onboarding (FR-01, FR-02, FR-03, FR-19, FR-20 — Story 1.5).
 *
 * Three branches from one wizard: Class 8-10 explores streams, Class 11-12 picks a
 * degree and entrance path, early college corrects course. Academic marks are never
 * required — FR-01 is explicit that a student who will not share them must still get a
 * usable result, with the gap reflected in evidence quality rather than a locked door.
 *
 * Draft state is written to localStorage on every change so a dropped connection
 * mid-questionnaire does not cost the student their answers (FR-19).
 */

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { MinorConsentModal } from '@/components/auth/MinorConsentModal';
import { Button, Callout, Card, Chip, Field, Input, ProgressBar, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys, useProfileStatus, useSaveProfile } from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';
import { onboardingSchema, type OnboardingInput } from '@/types/forms';
import type { BudgetTier, EducationStage, RelocationWillingness, RiasecKey } from '@/types/models';

const DRAFT_KEY = 'nextpath.onboarding.draft';

const STAGES: { value: EducationStage; title: string; description: string }[] = [
  {
    value: 'class_8_10',
    title: 'Class 8 to 10',
    description: 'Working out which stream to choose after Class 10.',
  },
  {
    value: 'class_11_12',
    title: 'Class 11 to 12',
    description: 'Deciding on a degree and which entrance exams to prepare for.',
  },
  {
    value: 'early_college',
    title: 'Early college',
    description: 'Already studying, and wondering whether to adjust course.',
  },
];

const INTERESTS: { label: string; riasec: RiasecKey }[] = [
  { label: 'Building or fixing things with my hands', riasec: 'R' },
  { label: 'Working outdoors or on site', riasec: 'R' },
  { label: 'Solving puzzles and figuring out why things work', riasec: 'I' },
  { label: 'Experimenting and researching', riasec: 'I' },
  { label: 'Drawing, designing, or making things look good', riasec: 'A' },
  { label: 'Writing, performing, or telling stories', riasec: 'A' },
  { label: 'Helping people who are struggling', riasec: 'S' },
  { label: 'Teaching or explaining things to others', riasec: 'S' },
  { label: 'Leading a group or starting something', riasec: 'E' },
  { label: 'Persuading people and negotiating', riasec: 'E' },
  { label: 'Organising information and keeping things in order', riasec: 'C' },
  { label: 'Working with numbers, records, and accuracy', riasec: 'C' },
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
  computers: 'Computers',
  language: 'Languages & writing',
  social_science: 'Social science',
  commerce: 'Commerce & accounts',
  art_design: 'Art & design',
  practical_skills: 'Practical / hands-on work',
};

const BUDGETS: { value: BudgetTier; label: string; hint: string }[] = [
  {
    value: 'low_cost_only',
    label: 'Under ₹50,000 a year',
    hint: 'Government colleges and scholarship-funded routes',
  },
  {
    value: 'moderate_up_to_2_lakhs',
    label: '₹50,000 to ₹2,00,000 a year',
    hint: 'Most government and some private options',
  },
  {
    value: 'flexible_above_2_lakhs',
    label: 'Above ₹2,00,000 a year',
    hint: 'Private institutions are within reach',
  },
];

const RELOCATION: { value: RelocationWillingness; label: string }[] = [
  { value: 'home_district_only', label: 'I need to stay in my own district' },
  { value: 'within_state', label: 'Anywhere within my state' },
  { value: 'anywhere_in_india', label: 'Anywhere in India' },
  { value: 'abroad', label: 'India or abroad' },
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
  work_style_preferences: {},
  budget_tier: 'moderate_up_to_2_lakhs',
  relocation_willingness: 'within_state',
  academic_records_available: false,
};

function loadDraft(): DraftState {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    const draft: DraftState = { ...EMPTY_DRAFT, ...parsed };

    // Support existing drafts that had stream stored
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

const STEP_TITLES = [
  'Where are you right now?',
  'What do you actually enjoy?',
  'What are you good at?',
  "What's realistic for your family?",
  'Check and submit',
];

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

  // If user has already completed onboarding and is not explicitly editing,
  // directly open the My Options / Recommendation Results page.
  useEffect(() => {
    if (!isEditing && !statusLoading && (status?.profile_exists || hasCompletedLocal)) {
      navigate('/results', { replace: true });
    }
  }, [isEditing, statusLoading, status?.profile_exists, hasCompletedLocal, navigate]);

  // Persist on every change. This is what makes a dropped connection survivable.
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      const timer = window.setTimeout(() => setDraftSaved(false), 1500);
      return () => window.clearTimeout(timer);
    } catch {
      return undefined;
    }
  }, [draft]);

  const isMinorStage =
    draft.education_stage === 'class_8_10' || draft.education_stage === 'class_11_12';

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]): void =>
    setDraft((current) => ({ ...current, [key]: value }));

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
        studyValue === 'B.E / B.Tech' && branch
          ? `B.E / B.Tech - ${branch}`
          : studyValue;

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
    if (draft.education_stage) earned += 10;
    if (draft.grade_or_year) earned += 5;
    if (draft.degree || draft.current_stream) earned += 5;
    if (draft.interests.length > 0) earned += 25;
    if (Object.keys(draft.aptitude_signals).length > 0) earned += 20;
    if (Object.keys(draft.work_style_preferences).length > 0) earned += 15;
    if (draft.academic_records_available) earned += 10;
    return Math.min(100, earned);
  }, [draft]);

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!draft.education_stage) next.education_stage = 'Choose where you are in your education.';
      if (!draft.grade_or_year.trim()) next.grade_or_year = 'Tell us your class or year.';
      if (draft.degree === 'B.E / B.Tech' && !draft.engineering_branch) {
        next.engineering_branch = 'Please select your engineering branch.';
      }
    }
    if (step === 1 && draft.interests.length === 0) {
      next.interests = 'Pick at least one — this is what the match is built on.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext(): void {
    if (!validateStep()) return;
    setStep((current) => Math.min(STEP_TITLES.length - 1, current + 1));
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

      // Pre-refresh status and recommendations queries
      await queryClient.refetchQueries({ queryKey: queryKeys.profileStatus });
      await queryClient.refetchQueries({ queryKey: queryKeys.recommendations });

      // A minor cannot proceed to results until a guardian records consent (FR-20).
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

  return (
    <div className="mx-auto max-w-wizard">
      <div className="mb-lg">
        <div className="mb-xs flex items-center justify-between">
          <p className="eyebrow">
            Step {step + 1} of {STEP_TITLES.length}
          </p>
          {draftSaved && (
            <span className="text-caption text-ink-muted" role="status">
              Draft saved on this device
            </span>
          )}
        </div>
        <ProgressBar value={((step + 1) / STEP_TITLES.length) * 100} label="Onboarding progress" />
        <h1 className="mt-md text-heading-2 text-ink" aria-live="polite">
          {STEP_TITLES[step]}
        </h1>
      </div>

      {/* --- Step 0: stage --------------------------------------------------- */}
      {step === 0 && (
        <div className="flex flex-col gap-md">
          <fieldset>
            <legend className="sr-only">Your education stage</legend>
            <div className="grid gap-sm">
              {STAGES.map((stage) => {
                const isSelected = draft.education_stage === stage.value;
                return (
                  <button
                    key={stage.value}
                    type="button"
                    onClick={() => handleStageSelect(stage.value)}
                    aria-pressed={isSelected}
                    className={`card text-left transition-all border ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary bg-surface'
                        : 'border-hairline bg-surface hover:bg-canvas-soft'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-title font-semibold text-ink">{stage.title}</span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-outline'
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-surface" />}
                      </span>
                    </div>
                    <span className="mt-xs block text-body-sm text-ink-muted leading-relaxed">
                      {stage.description}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.education_stage && (
              <p className="mt-xs text-caption text-error" role="alert">
                {errors.education_stage}
              </p>
            )}
          </fieldset>

          <Card className="flex flex-col gap-md border-hairline">
            <Field label="Which class or year are you currently in?" error={errors.grade_or_year} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={draft.grade_or_year}
                  onChange={(event) => update('grade_or_year', event.target.value)}
                  placeholder="e.g. Class 10, Class 12, or B.Tech Year 1"
                />
              )}
            </Field>

            <Field
              label="What are you currently studying?"
              hint="Select your current class, degree, or program."
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
                  <option value="">Select what you are studying</option>
                  {STUDY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {draft.degree === 'B.E / B.Tech' && (
              <Field
                label="Which engineering branch are you studying?"
                hint="Select your engineering branch."
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
            )}
          </Card>

          {isMinorStage && (
            <Callout variant="info" title="Guardian Consent Notice (DPDP Compliant)">
              As an applicant under 18, you can freely explore and draft your preferences. Before generating your personalized roadmap, we will provide a plain-language summary for your parent or guardian to verify.
            </Callout>
          )}
        </div>
      )}

      {/* --- Step 1: interests ----------------------------------------------- */}
      {step === 1 && (
        <Card className="flex flex-col gap-md border-hairline">
          <div>
            <h2 className="text-title font-semibold text-ink">What activities spark your curiosity?</h2>
            <p className="mt-xxs text-body-sm text-ink-secondary leading-relaxed">
              Select all options that genuinely interest you. Your matches are formed directly from these core signals without algorithmic stereotyping.
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">Things you enjoy</legend>
            <div className="flex flex-wrap gap-xs pt-xs">
              {INTERESTS.map((interest) => (
                <Chip
                  key={interest.label}
                  selected={draft.interests.some((entry) => entry.label === interest.label)}
                  onToggle={() => toggleInterest(interest.label, interest.riasec)}
                >
                  {interest.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          {errors.interests && (
            <p className="text-caption text-error" role="alert">
              {errors.interests}
            </p>
          )}
        </Card>
      )}

      {/* --- Step 2: aptitude ------------------------------------------------ */}
      {step === 2 && (
        <Card className="flex flex-col gap-md border-hairline">
          <div>
            <h2 className="text-title font-semibold text-ink">Self-assessed Subject Comfort</h2>
            <p className="mt-xxs text-body-sm text-ink-secondary leading-relaxed">
              Rate your confidence on a scale of 1 (challenging) to 5 (effortless). Skip subjects you haven't taken — unrated subjects indicate an evidence gap, not a penalty.
            </p>
          </div>
          <div className="flex flex-col divide-y divide-hairline">
            {SUBJECTS.map((subject) => (
              <div key={subject} className="flex flex-wrap items-center justify-between gap-xs py-sm">
                <span className="text-body-sm font-medium text-ink">{SUBJECT_LABELS[subject]}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={SUBJECT_LABELS[subject]}>
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const isRated = draft.aptitude_signals[subject] === rating;
                    return (
                      <button
                        key={rating}
                        type="button"
                        role="radio"
                        aria-checked={isRated}
                        onClick={() =>
                          setDraft((current) => {
                            const next = { ...current.aptitude_signals };
                            if (next[subject] === rating) delete next[subject];
                            else next[subject] = rating;
                            return { ...current, aptitude_signals: next };
                          })
                        }
                        className={`h-10 w-10 rounded-md border text-body-sm font-semibold transition-all ${
                          isRated
                            ? 'border-primary bg-primary text-on-primary shadow-sm'
                            : 'border-hairline bg-surface text-ink-secondary hover:bg-canvas-soft'
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-xs pt-sm border-t border-hairline">
            <label className="flex items-start gap-xs text-body-sm text-ink-secondary cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-hairline text-primary focus:ring-primary"
                checked={draft.academic_records_available}
                onChange={(event) => update('academic_records_available', event.target.checked)}
              />
              <span>
                I have school transcripts or exam scorecards available if needed for counselor review. (Optional)
              </span>
            </label>
          </div>
        </Card>
      )}

      {/* --- Step 3: constraints --------------------------------------------- */}
      {step === 3 && (
        <Card className="flex flex-col gap-lg border-hairline">
          <fieldset>
            <legend className="mb-xs text-title font-semibold text-ink">
              Realistic Annual Education Budget
            </legend>
            <p className="mb-sm text-body-sm text-ink-muted">
              Estimated tuition and academic expenses your family can comfortably support per academic year.
            </p>
            <div className="grid gap-xs">
              {BUDGETS.map((budget) => {
                const isSelected = draft.budget_tier === budget.value;
                return (
                  <button
                    key={budget.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => update('budget_tier', budget.value)}
                    className={`rounded-lg border p-md text-left transition-all ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary bg-surface'
                        : 'border-hairline bg-surface hover:bg-canvas-soft'
                    }`}
                  >
                    <span className="block text-body font-semibold text-ink">{budget.label}</span>
                    <span className="mt-xxs block text-caption text-ink-muted">{budget.hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="border-t border-hairline pt-md">
            <legend className="mb-xs text-title font-semibold text-ink">Geographic Relocation</legend>
            <p className="mb-sm text-body-sm text-ink-muted">
              How far are you open to travelling or relocating for your higher studies?
            </p>
            <div className="grid gap-xs sm:grid-cols-2">
              {RELOCATION.map((option) => {
                const isSelected = draft.relocation_willingness === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => update('relocation_willingness', option.value)}
                    className={`rounded-lg border p-sm text-left text-body-sm font-medium transition-all ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary bg-surface text-ink'
                        : 'border-hairline bg-surface text-ink-secondary hover:bg-canvas-soft'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </Card>
      )}

      {/* --- Step 4: review --------------------------------------------------- */}
      {step === 4 && (
        <div className="flex flex-col gap-md">
          <Card className="flex flex-col gap-sm border-hairline">
            <h2 className="text-title font-semibold text-ink">Summary of Your Signals</h2>
            <dl className="grid grid-cols-1 gap-sm text-body-sm sm:grid-cols-2 mt-xs">
              <div className="p-xs bg-canvas-soft rounded-md">
                <dt className="eyebrow">Education Stage</dt>
                <dd className="text-ink font-medium mt-0.5">{draft.grade_or_year || '—'}</dd>
              </div>
              <div className="p-xs bg-canvas-soft rounded-md">
                <dt className="eyebrow">Currently Studying</dt>
                <dd className="text-ink font-medium mt-0.5">
                  {draft.degree === 'B.E / B.Tech'
                    ? draft.engineering_branch
                      ? `B.E / B.Tech (${draft.engineering_branch})`
                      : 'B.E / B.Tech'
                    : draft.degree || draft.current_stream || 'Not decided yet'}
                </dd>
              </div>
              <div className="p-xs bg-canvas-soft rounded-md">
                <dt className="eyebrow">Key Interests Identified</dt>
                <dd className="text-ink font-medium mt-0.5">{draft.interests.length} selected</dd>
              </div>
              <div className="p-xs bg-canvas-soft rounded-md">
                <dt className="eyebrow">Subjects Self-Rated</dt>
                <dd className="text-ink font-medium mt-0.5">{Object.keys(draft.aptitude_signals).length} subjects</dd>
              </div>
            </dl>
            <div className="mt-md pt-sm border-t border-hairline">
              <div className="flex justify-between items-center mb-xxs">
                <p className="eyebrow">Profile Completeness</p>
                <span className="text-caption font-semibold text-ink">{completeness}%</span>
              </div>
              <ProgressBar value={completeness} label="Profile completeness" />
              <p className="mt-xs text-caption text-ink-muted">
                Higher completeness produces higher evidence quality indices on your career fits.
              </p>
            </div>
          </Card>

          {completeness < 50 && (
            <Callout variant="error" title="More signals recommended">
              We require at least 50% completeness to provide meaningful career pathways. Please return to previous steps and mark your interests or subject ratings.
            </Callout>
          )}

          {errors.submit && <Callout variant="error">{errors.submit}</Callout>}
        </div>
      )}

      {/* --- Navigation ------------------------------------------------------- */}
      <div className="sticky bottom-0 mt-lg flex items-center justify-between gap-xs border-t border-hairline bg-canvas py-md">
        {step > 0 ? (
          <Button variant="utility" onClick={() => setStep((current) => current - 1)}>
            Back
          </Button>
        ) : <div />}
        {step < STEP_TITLES.length - 1 ? (
          <Button onClick={goNext} className="min-w-[140px]">
            Continue
          </Button>
        ) : (
          <Button
            onClick={() => void submit()}
            loading={saveProfile.isPending}
            disabled={completeness < 50}
            className="min-w-[180px]"
          >
            {saveProfile.isPending ? 'Generating Pathways…' : 'See My Options'}
          </Button>
        )}
      </div>

      {status && !status.can_generate_recommendations && status.blocking_reason && step === 4 && (
        <Callout variant="info">{status.blocking_reason}</Callout>
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
