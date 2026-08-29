import { Router, Request, Response } from 'express';
import { store, ProjectSubmission } from '../store';
import { getAuthUser } from './auth';

const router = Router();

// POST /projects/:projectId/submit
router.post('/:projectId/submit', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const { projectId } = req.params;
  const { repository_or_live_url, reflection_notes } = req.body;

  if (!repository_or_live_url) {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'A repository or live project link is required.',
    });
  }

  const submission: ProjectSubmission = {
    id: `sub-${Date.now().toString(36)}`,
    student_id: user.id,
    project_id: projectId,
    repository_or_live_url,
    reflection_notes: reflection_notes || null,
    submitted_at: new Date().toISOString(),
  };

  const list = store.projectSubmissions.get(user.id) || [];
  list.push(submission);
  store.projectSubmissions.set(user.id, list);

  return res.status(201).json(submission);
});

// GET /projects/my-submissions
router.get('/my-submissions', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const list = store.projectSubmissions.get(user.id) || [];
  return res.status(200).json(list);
});

export default router;
