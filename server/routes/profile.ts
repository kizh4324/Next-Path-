import { Router, Request, Response } from 'express';
import { store, StudentProfile } from '../store';
import { getAuthUser } from './auth';

const router = Router();

// GET /profile/status
router.get('/status', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const profile = store.profiles.get(user.id);
  if (!profile) {
    return res.status(200).json({
      profile_exists: false,
      profile_completeness_pct: 0,
      is_minor_stage: false,
      consent_required: false,
      consent_recorded: false,
      can_generate_recommendations: false,
      blocking_reason: 'Please complete your onboarding profile to begin.',
    });
  }

  const isMinorStage = profile.education_stage === 'class_8_10' || profile.education_stage === 'class_11_12';
  const consentRequired = isMinorStage;
  const consentRecorded = Boolean(profile.consent_recorded_at && profile.consent_given_by);
  const canGen = (!consentRequired || consentRecorded) && profile.profile_completeness_pct >= 40;

  let blockingReason: string | null = null;
  if (consentRequired && !consentRecorded) {
    blockingReason = 'Guardian consent is required before recommendations can be viewed.';
  } else if (profile.profile_completeness_pct < 40) {
    blockingReason = 'Please complete more questions in your profile.';
  }

  return res.status(200).json({
    profile_exists: true,
    profile_completeness_pct: profile.profile_completeness_pct,
    is_minor_stage: isMinorStage,
    consent_required: consentRequired,
    consent_recorded: consentRecorded,
    can_generate_recommendations: canGen,
    blocking_reason: blockingReason,
  });
});

// GET /profile
router.get('/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const profile = store.profiles.get(user.id);
  if (!profile) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Profile Not Found',
      status: 404,
      detail: 'No student profile exists for this account yet.',
    });
  }

  return res.status(200).json(profile);
});

// POST /profile (create onboarding)
router.post('/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const {
    education_stage = 'class_11_12',
    grade_or_year = 'Class 11',
    current_stream,
    degree,
    engineering_branch,
    interests = [],
    aptitude_signals = {},
    work_style_preferences = {},
    budget_tier = 'moderate_up_to_2_lakhs',
    relocation_willingness = 'within_state',
    preferred_languages = ['English'],
    consent_type = 'self_consent_adult',
    consent_given_by,
    academic_records_available = true,
  } = req.body;

  const isMinor = education_stage === 'class_8_10' || education_stage === 'class_11_12';
  const now = new Date().toISOString();

  // Calculate completeness
  let score = 30;
  if (interests.length > 0) score += 25;
  if (Object.keys(aptitude_signals).length > 0) score += 25;
  if (budget_tier) score += 10;
  if (relocation_willingness) score += 10;

  const formattedStream =
    current_stream ||
    (degree === 'B.E / B.Tech' && engineering_branch
      ? `B.E / B.Tech - ${engineering_branch}`
      : degree) ||
    null;

  const newProfile: StudentProfile = {
    id: `prof-${user.id}`,
    user_id: user.id,
    education_stage,
    grade_or_year,
    current_stream: formattedStream,
    degree: degree || null,
    engineering_branch: engineering_branch || null,
    interests,
    aptitude_signals,
    work_style_preferences,
    budget_tier,
    relocation_willingness,
    preferred_languages,
    consent_type: isMinor ? 'guardian_consent_minor' : consent_type,
    consent_given_by: consent_given_by || (isMinor ? null : user.full_name),
    consent_recorded_at: isMinor && !consent_given_by ? '' : now,
    academic_records_available,
    profile_completeness_pct: Math.min(100, score),
    created_at: now,
    updated_at: now,
    guardian_contexts: [],
  };

  store.profiles.set(user.id, newProfile);
  return res.status(201).json(newProfile);
});

// PATCH /profile
router.patch('/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const existingProfile = store.profiles.get(user.id);
  if (!existingProfile) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Profile Not Found',
      status: 404,
      detail: 'Please create your profile first.',
    });
  }

  const updates = req.body;
  const updatedProfile: StudentProfile = {
    ...existingProfile,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  store.profiles.set(user.id, updatedProfile);
  return res.status(200).json(updatedProfile);
});

// POST /profile/guardian
router.post('/guardian', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  let profile = store.profiles.get(user.id);
  if (!profile) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Profile Not Found',
      status: 404,
      detail: 'Profile must exist before adding guardian context.',
    });
  }

  const {
    guardian_name,
    relationship_to_student = 'Parent',
    guardian_priorities = [],
    financial_ceiling_inr,
    relocation_restriction = 'within_state',
    notes_and_concerns,
  } = req.body;

  const guardianCtx = {
    id: `guard-${Date.now().toString(36)}`,
    student_id: user.id,
    guardian_name: guardian_name || null,
    relationship_to_student,
    guardian_priorities: guardian_priorities || [],
    financial_ceiling_inr: financial_ceiling_inr || null,
    relocation_restriction: relocation_restriction || 'within_state',
    notes_and_concerns: notes_and_concerns || null,
    created_at: new Date().toISOString(),
  };

  profile.guardian_contexts.push(guardianCtx);
  return res.status(200).json(guardianCtx);
});

export default router;
