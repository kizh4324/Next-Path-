import { Router, Request, Response } from 'express';
import { store, Escalation } from '../store';
import { getAuthUser } from './auth';

const router = Router();

// POST /escalations/trigger
router.post('/trigger', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const { trigger_reason, student_note } = req.body;

  if (!trigger_reason) {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'A trigger reason is required to request counselor intervention.',
    });
  }

  const escalation: Escalation = {
    id: `esc-${Date.now().toString(36)}`,
    student_id: user.id,
    student_name: user.full_name,
    trigger_reason,
    student_note: student_note || null,
    status: 'pending',
    counselor_id: null,
    counselor_notes: null,
    counselor_override_decision: null,
    counselor_override_rationale: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  store.escalations.set(escalation.id, escalation);
  return res.status(201).json(escalation);
});

export default router;
