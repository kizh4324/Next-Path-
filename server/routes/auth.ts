import { Router, Request, Response } from 'express';
import { store, User } from '../store';

const router = Router();

// Middleware to extract user from Authorization header
export function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const payload = store.verifyToken(token);
  if (!payload) return null;
  return store.users.get(payload.email) || null;
}

// POST /auth/register
router.post('/register', (req: Request, res: Response) => {
  const { email, password, full_name, phone_number } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Email, password, and full name are required.',
    });
  }

  if (store.users.has(email.toLowerCase())) {
    return res.status(409).json({
      type: 'https://nextpath.in/errors/conflict',
      title: 'Email Already Exists',
      status: 409,
      detail: 'An account with this email address is already registered.',
    });
  }

  const newUser: User = {
    id: `usr-${Date.now().toString(36)}`,
    email: email.toLowerCase(),
    password_hash: password, // In memory demo representation
    full_name,
    role: 'student',
    phone_number: phone_number || null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  store.users.set(newUser.email, newUser);
  const token = store.createToken(newUser);

  return res.status(200).json({
    access_token: token,
    token_type: 'bearer',
    expires_in_minutes: 10080,
    user_id: newUser.id,
    role: newUser.role,
    full_name: newUser.full_name,
  });
});

// POST /auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Email and password are required.',
    });
  }

  const user = store.users.get(email.toLowerCase());
  if (!user || user.password_hash !== password) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Authentication Failed',
      status: 401,
      detail: 'Invalid email or password. Please check your credentials.',
    });
  }

  const token = store.createToken(user);
  return res.status(200).json({
    access_token: token,
    token_type: 'bearer',
    expires_in_minutes: 10080,
    user_id: user.id,
    role: user.role,
    full_name: user.full_name,
  });
});

// GET /auth/me
router.get('/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  return res.status(200).json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    phone_number: user.phone_number,
    is_active: user.is_active,
    created_at: user.created_at,
  });
});

// PATCH /auth/me
router.patch('/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const { full_name, phone_number } = req.body;
  if (full_name && typeof full_name === 'string') {
    user.full_name = full_name.trim();
  }
  if (phone_number !== undefined) {
    user.phone_number = phone_number ? String(phone_number).trim() : null;
  }

  store.users.set(user.email, user);

  return res.status(200).json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    phone_number: user.phone_number,
    is_active: user.is_active,
    created_at: user.created_at,
  });
});

// POST /auth/minor-consent
router.post('/minor-consent', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const { guardian_name, relationship_to_student, consent_checkbox } = req.body;
  if (!consent_checkbox) {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Consent checkbox must be confirmed.',
    });
  }

  const profile = store.profiles.get(user.id);
  const now = new Date().toISOString();
  if (profile) {
    profile.consent_type = 'guardian_consent_minor';
    profile.consent_given_by = guardian_name || user.full_name;
    profile.consent_recorded_at = now;
    if (guardian_name) {
      profile.guardian_contexts.push({
        id: `guard-${Date.now().toString(36)}`,
        student_id: user.id,
        guardian_name,
        relationship_to_student: relationship_to_student || 'Guardian',
        guardian_priorities: [],
        financial_ceiling_inr: null,
        relocation_restriction: profile.relocation_willingness,
        notes_and_concerns: null,
        created_at: now,
      });
    }
  }

  return res.status(200).json({
    student_profile_id: profile?.id || `prof-${user.id}`,
    consent_type: 'guardian_consent_minor',
    consent_given_by: guardian_name || user.full_name,
    consent_recorded_at: now,
    message: 'Guardian consent recorded successfully under Indian DPDP act framework.',
  });
});

export default router;
