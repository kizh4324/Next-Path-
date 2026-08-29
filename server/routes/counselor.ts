import { Router, Request, Response } from 'express';
import { store } from '../store';
import { getAuthUser } from './auth';

const router = Router();

// GET /counselor/queue
router.get('/queue', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid counselor or admin authentication token required.',
    });
  }

  const { status } = req.query;
  let list = Array.from(store.escalations.values());

  if (status) {
    list = list.filter((e) => e.status === status);
  }

  // Sort by created_at desc
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.status(200).json({
    total: list.length,
    items: list,
  });
});

// POST /counselor/review/:escalationId
router.post('/review/:escalationId', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid counselor or admin authentication token required.',
    });
  }

  const { escalationId } = req.params;
  const escalation = store.escalations.get(escalationId);

  if (!escalation) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Escalation Case Not Found',
      status: 404,
      detail: `Escalation '${escalationId}' was not found.`,
    });
  }

  const {
    status,
    counselor_notes,
    counselor_override_decision,
    counselor_override_rationale,
  } = req.body;

  escalation.status = status || escalation.status;
  escalation.counselor_id = user.id;
  escalation.counselor_notes = counselor_notes || escalation.counselor_notes;
  escalation.counselor_override_decision =
    counselor_override_decision || escalation.counselor_override_decision;
  escalation.counselor_override_rationale =
    counselor_override_rationale || escalation.counselor_override_rationale;

  if (status === 'resolved' || status === 'overridden') {
    escalation.resolved_at = new Date().toISOString();
  }

  store.escalations.set(escalation.id, escalation);
  return res.status(200).json(escalation);
});

export default router;
