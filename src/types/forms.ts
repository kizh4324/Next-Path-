/**
 * Zod schemas for every form. These mirror the backend Pydantic validators so a user
 * sees the error before the round-trip, not after it (coding-standards.md §2.2).
 */

import { z } from 'zod';

// bcrypt truncates silently past 72 bytes; the backend rejects rather than truncate, so
// the form must say so up front rather than let a password be submitted and bounced.
const MAX_PASSWORD_BYTES = 72;

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .refine(
    (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
    `Passwords must be ${MAX_PASSWORD_BYTES} bytes or fewer.`,
  );

export const registerSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: passwordSchema,
  full_name: z.string().min(1, 'Please tell us your name.').max(255),
  role: z.enum(['student']).default('student'),
  phone_number: z.string().max(20).optional().nullable(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const minorConsentSchema = z.object({
  student_profile_id: z.string().uuid(),
  guardian_email: z.string().email("Enter your guardian's email address."),
  guardian_full_name: z.string().min(1, "Enter your guardian's name.").max(255),
  guardian_phone: z.string().max(20).optional().nullable(),
  relationship_to_student: z
    .string()
    .min(1, 'Tell us how they are related to you.')
    .max(100),
  consent_confirmed: z.literal(true, {
    errorMap: () => ({ message: 'Your guardian must confirm before we can continue.' }),
  }),
});
export type MinorConsentInput = z.infer<typeof minorConsentSchema>;

export const interestEntrySchema = z.object({
  label: z.string().min(1).max(120),
  riasec: z.enum(['R', 'I', 'A', 'S', 'E', 'C']).nullable(),
  strength: z.number().int().min(1).max(5),
});

export const onboardingSchema = z.object({
  education_stage: z.enum(['class_8_10', 'class_11_12', 'early_college'], {
    errorMap: () => ({ message: 'Choose where you are in your education.' }),
  }),
  grade_or_year: z.string().min(1, 'Tell us your class or year.').max(100),
  current_stream: z.string().max(200).optional().nullable(),
  degree: z.string().max(100).optional().nullable(),
  engineering_branch: z.string().max(150).optional().nullable(),
  interests: z
    .array(interestEntrySchema)
    .min(1, 'Pick at least one thing you enjoy — this is what the match is built on.'),
  // Deliberately not required. FR-01 forbids gating the journey on academic marks; a
  // student who skips this still gets a result, with the gap shown in evidence quality.
  aptitude_signals: z.record(z.number().int().min(1).max(5)).default({}),
  work_style_preferences: z.record(z.string()).default({}),
  budget_tier: z
    .enum(['low_cost_only', 'moderate_up_to_2_lakhs', 'flexible_above_2_lakhs'])
    .default('moderate_up_to_2_lakhs'),
  relocation_willingness: z
    .enum(['home_district_only', 'within_state', 'anywhere_in_india', 'abroad'])
    .default('within_state'),
  preferred_languages: z.array(z.string()).default(['English', 'Hindi']),
  academic_records_available: z.boolean().default(false),
  consent_given_by: z.string().max(255).optional().nullable(),
  consent_type: z.string().max(100).optional().nullable(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const guardianContextSchema = z.object({
  guardian_name: z.string().max(255).optional().nullable(),
  relationship_to_student: z.string().min(1, 'How are you related?').max(100),
  guardian_priorities: z.array(z.string()).default([]),
  financial_ceiling_inr: z
    .number()
    .int()
    .min(0, 'Enter a number of 0 or more.')
    .optional()
    .nullable(),
  relocation_restriction: z
    .enum(['home_district_only', 'within_state', 'anywhere_in_india', 'abroad'])
    .default('within_state'),
  notes_and_concerns: z.string().max(2000).optional().nullable(),
});
export type GuardianContextInput = z.infer<typeof guardianContextSchema>;

export const milestoneCompleteSchema = z
  .object({
    completion_evidence_type: z
      .enum(['self_report', 'project_artifact', 'quiz_score', 'mentor_confirmation'])
      .default('self_report'),
    completion_evidence_note_or_url: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (value) =>
      value.completion_evidence_type === 'self_report' ||
      Boolean(value.completion_evidence_note_or_url?.trim()),
    {
      message: 'Add a link or a short note as proof.',
      path: ['completion_evidence_note_or_url'],
    },
  );
export type MilestoneCompleteInput = z.infer<typeof milestoneCompleteSchema>;

export const counselorReviewSchema = z
  .object({
    status: z.enum([
      'pending',
      'under_review',
      'session_scheduled',
      'resolved',
      'overridden',
    ]),
    counselor_notes: z.string().max(5000).optional().nullable(),
    counselor_override_decision: z.string().max(2000).optional().nullable(),
    counselor_override_rationale: z.string().max(5000).optional().nullable(),
  })
  .refine(
    (value) =>
      !value.counselor_override_decision?.trim() ||
      Boolean(value.counselor_override_rationale?.trim()),
    {
      // Mirrors the backend rule: an override that changes what a student was told
      // must carry its reasoning (FR-15).
      message: 'A rationale is required whenever you record an override.',
      path: ['counselor_override_rationale'],
    },
  );
export type CounselorReviewInput = z.infer<typeof counselorReviewSchema>;

export const chatMessageSchema = z.object({
  question: z.string().min(1, 'Type a question first.').max(2000),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
