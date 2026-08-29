import { Router, Request, Response } from 'express';
import { store } from '../store';
import { getAuthUser } from './auth';

const router = Router();

// DELETE /account
router.delete('/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const userId = user.id;

  // Erase all data under DPDP Act
  store.profiles.delete(userId);
  store.recommendations.delete(userId);
  store.roadmaps.delete(userId);
  store.projectSubmissions.delete(userId);
  store.users.delete(user.email);

  return res.status(200).json({
    erased_at: new Date().toISOString(),
    records_erased: [
      'student_profile',
      'recommendations_history',
      'roadmap_and_milestones',
      'project_submissions',
      'user_credentials',
    ],
    dpdp_compliance_note:
      'All personal identifiers, psychometric signals, and roadmap records have been purged in compliance with Section 12 of the Digital Personal Data Protection Act, 2023.',
  });
});

export default router;
