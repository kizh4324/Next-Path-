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
import { useNavigate } from 'react-router-dom';

import { MinorConsentModal } from '@/components/auth/MinorConsentModal';
import { Button, Callout, Card, Chip, Field, Input, ProgressBar, Select } from '@/components/ui';
import { useProfileStatus, useSaveProfile } from '@/hooks/useRecommendations';
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

const STREAMS = [
  'Science (PCM)',
  'Science (PCB)',
  'Science (PCMB)',
  'Commerce',
  'Arts / Humanities',
  'Vocational',
  'Not decided yet',
];

interface DraftState {
  education_stage: EducationStage | null;
  grade_or_year: string;
  current_stream: string;
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
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as DraftState) } : EMPTY_DRAFT;
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
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(loadDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const saveProfile = useSaveProfile();
  const { data: status } = useProfileStatus();

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
    if (draft.interests.length > 0) earned += 25;
    if (Object.keys(draft.aptitude_signals).length > 0) earned += 20;
    if (Object.keys(draft.work_style_preferences).length > 0) earned += 10;
    if (draft.academic_records_available) earned += 5;
    return Math.min(100, earned);
  }, [draft]);

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!draft.education_stage) next.education_stage = 'Choose where you are in your education.';
      if (!draft.grade_or_year.trim()) next.grade_or_year = 'Tell us your class or year.';
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

    const payload: OnboardingInput = onboardingSchema.parse({
      education_stage: draft.education_stage,
      grade_or_year: draft.grade_or_year.trim(),
      current_stream: draft.current_stream || null,
      interests: draft.interests,
      aptitude_signals: draft.aptitude_signals,
      work_style_preferences: draft.work_style_preferences,
      budget_tier: draft.budget_tier,
      relocation_willingness: draft.relocation_willingness,
      preferred_languages: ['English'],
      academic_records_available: draft.academic_records_available,
    });

    try {
      const profile = await saveProfile.mutateAsync(payload);
      window.localStorage.removeItem(DRAFT_KEY);
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
              {STAGES.map((stage) => (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => update('education_stage', stage.value)}
                  aria-pressed={draft.education_stage === stage.value}
                  className={`card text-left transition-colors ${
                    draft.education_stage === stage.value ? 'border-primary' : ''
                  }`}
                >
                  <span className="block text-title text-ink">{stage.title}</span>
                  <span className="mt-xxs block text-body-sm text-ink-muted">
                    {stage.description}
                  </span>
                </button>
              ))}
            </div>
            {errors.education_stage && (
              <p className="mt-xs text-caption text-error" role="alert">
                {errors.education_stage}
              </p>
            )}
          </fieldset>

          <Card className="flex flex-col gap-md">
            <Field label="Which class or year are you in?" error={errors.grade_or_year} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={draft.grade_or_year}
                  onChange={(event) => update('grade_or_year', event.target.value)}
                  placeholder="e.g. Class 10, or B.Sc Year 2"
                />
              )}
            </Field>

            {draft.education_stage !== 'class_8_10' && (
              <Field
                label="Which stream are you studying?"
                hint="Leave this if you have not chosen yet."
              >
                {({ id }) => (
                  <Select
                    id={id}
                    value={draft.current_stream}
                    onChange={(event) => update('current_stream', event.target.value)}
                  >
                    <option value="">Select a stream</option>
                    {STREAMS.map((stream) => (
                      <option key={stream} value={stream}>
                        {stream}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </Card>

          {isMinorStage && (
            <Callout variant="info" title="A parent or guardian will need to agree">
              Because you are under 18, we need a parent or guardian to give consent
              before we can generate your career options. You can fill in everything
              first — we will ask at the end.
            </Callout>
          )}
        </div>
      )}

      {/* --- Step 1: interests ----------------------------------------------- */}
      {step === 1 && (
        <Card className="flex flex-col gap-md">
          <p className="text-body-sm text-ink-secondary">
            Pick everything that genuinely appeals — not what you think you should
            choose. This is the single biggest input into your results.
          </p>
          <fieldset>
            <legend className="sr-only">Things you enjoy</legend>
            <div className="flex flex-wrap gap-xs">
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
        <Card className="flex flex-col gap-md">
          <p className="text-body-sm text-ink-secondary">
            Rate yourself honestly from 1 to 5. Skip anything you have not studied — we
            would rather show you an honest gap than a confident guess.
          </p>
          <div className="flex flex-col gap-sm">
            {SUBJECTS.map((subject) => (
              <div key={subject} className="flex flex-wrap items-center justify-between gap-xs">
                <span className="text-body-sm text-ink">{SUBJECT_LABELS[subject]}</span>
                <div className="flex gap-xxs" role="radiogroup" aria-label={SUBJECT_LABELS[subject]}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      role="radio"
                      aria-checked={draft.aptitude_signals[subject] === rating}
                      onClick={() =>
                        setDraft((current) => {
                          const next = { ...current.aptitude_signals };
                          if (next[subject] === rating) delete next[subject];
                          else next[subject] = rating;
                          return { ...current, aptitude_signals: next };
                        })
                      }
                      className={`h-11 w-11 rounded-md border text-body-sm transition-colors ${
                        draft.aptitude_signals[subject] === rating
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-hairline bg-surface text-ink-secondary hover:bg-canvas-soft'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-xs text-body-sm text-ink-secondary">
            <input
              type="checkbox"
              className="mt-xxs h-5 w-5"
              checked={draft.academic_records_available}
              onChange={(event) => update('academic_records_available', event.target.checked)}
            />
            <span>
              I can share my actual marks or report card with a counselor if asked. This
              is optional — it raises how confident we can be, and nothing is blocked
              without it.
            </span>
          </label>
        </Card>
      )}

      {/* --- Step 3: constraints --------------------------------------------- */}
      {step === 3 && (
        <Card className="flex flex-col gap-lg">
          <fieldset>
            <legend className="mb-xs text-title text-ink">
              What can your family realistically spend on education?
            </legend>
            <p className="mb-sm text-body-sm text-ink-muted">
              An honest answer here matters more than an optimistic one — it decides
              which options we show you as reachable.
            </p>
            <div className="grid gap-xs">
              {BUDGETS.map((budget) => (
                <button
                  key={budget.value}
                  type="button"
                  role="radio"
                  aria-checked={draft.budget_tier === budget.value}
                  onClick={() => update('budget_tier', budget.value)}
                  className={`rounded-lg border p-sm text-left ${
                    draft.budget_tier === budget.value
                      ? 'border-primary bg-surface'
                      : 'border-hairline bg-surface hover:bg-canvas-soft'
                  }`}
                >
                  <span className="block text-body-sm font-medium text-ink">{budget.label}</span>
                  <span className="block text-caption text-ink-muted">{budget.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-sm text-title text-ink">How far could you move to study?</legend>
            <div className="grid gap-xs">
              {RELOCATION.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={draft.relocation_willingness === option.value}
                  onClick={() => update('relocation_willingness', option.value)}
                  className={`rounded-lg border p-sm text-left text-body-sm ${
                    draft.relocation_willingness === option.value
                      ? 'border-primary text-ink'
                      : 'border-hairline text-ink-secondary hover:bg-canvas-soft'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </Card>
      )}

      {/* --- Step 4: review --------------------------------------------------- */}
      {step === 4 && (
        <div className="flex flex-col gap-md">
          <Card className="flex flex-col gap-sm">
            <h2 className="text-title text-ink">What we will use</h2>
            <dl className="grid grid-cols-1 gap-sm text-body-sm sm:grid-cols-2">
              <div>
                <dt className="eyebrow">Stage</dt>
                <dd className="text-ink">{draft.grade_or_year || '—'}</dd>
              </div>
              <div>
                <dt className="eyebrow">Stream</dt>
                <dd className="text-ink">{draft.current_stream || 'Not chosen yet'}</dd>
              </div>
              <div>
                <dt className="eyebrow">Interests picked</dt>
                <dd className="text-ink">{draft.interests.length}</dd>
              </div>
              <div>
                <dt className="eyebrow">Subjects rated</dt>
                <dd className="text-ink">{Object.keys(draft.aptitude_signals).length}</dd>
              </div>
            </dl>
            <div className="mt-xs">
              <p className="eyebrow mb-xxs">Profile completeness</p>
              <ProgressBar value={completeness} label="Profile completeness" />
              <p className="mt-xxs text-caption text-ink-muted">
                {completeness}% — anything missing shows up as lower evidence quality on
                your results, never as a hidden guess.
              </p>
            </div>
          </Card>

          {completeness < 50 && (
            <Callout variant="error" title="A bit more is needed">
              We need at least 50% before the results would mean anything. Go back and
              add a few more interests or subject ratings.
            </Callout>
          )}

          {errors.submit && <Callout variant="error">{errors.submit}</Callout>}
        </div>
      )}

      {/* --- Navigation ------------------------------------------------------- */}
      <div className="sticky bottom-0 mt-lg flex gap-xs border-t border-hairline bg-canvas-soft py-md">
        {step > 0 && (
          <Button variant="utility" onClick={() => setStep((current) => current - 1)}>
            Back
          </Button>
        )}
        {step < STEP_TITLES.length - 1 ? (
          <Button onClick={goNext} fullWidth={step === 0}>
            Continue
          </Button>
        ) : (
          <Button
            onClick={() => void submit()}
            loading={saveProfile.isPending}
            disabled={completeness < 50}
            fullWidth
          >
            {saveProfile.isPending ? 'Saving profile…' : 'See my options'}
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
          navigate('/results');
        }}
      />
    </div>
  );
}
