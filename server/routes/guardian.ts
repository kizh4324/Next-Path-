import { Router, Request, Response } from 'express';
import { store } from '../store';
import { getAuthUser } from './auth';
import { getCareerById, getCareers } from '../data/seedData';
import { generateParentSummary } from '../gemini';

const router = Router();

// GET /guardian/summary
router.get('/summary', async (req: Request, res: Response) => {
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
  const roadmap = store.roadmaps.get(user.id);
  const history = store.recommendations.get(user.id) || [];
  const currentBatch = history.find((b) => b.is_current) || history[0];

  const primaryCareerId =
    roadmap?.primary_career_id ||
    currentBatch?.recommendations?.[0]?.career_id ||
    getCareers()[0]?.id;

  const backupCareerId =
    roadmap?.backup_career_id ||
    currentBatch?.recommendations?.[1]?.career_id ||
    null;

  const primaryCareer = getCareerById(primaryCareerId) || getCareers()[0];
  const backupCareer = backupCareerId ? getCareerById(backupCareerId) || null : null;

  const { language = 'English' } = req.query;

  try {
    const summary = await generateParentSummary(
      user.full_name,
      primaryCareer,
      backupCareer,
      profile?.budget_tier || 'moderate_up_to_2_lakhs',
      String(language),
    );

    return res.status(200).json({
      summary_text: summary.summary_text,
      language: summary.language,
      key_points: summary.key_points,
      action_items_for_parents: summary.action_items_for_parents,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error generating parent summary:', err);
    return res.status(500).json({
      type: 'https://nextpath.in/errors/internal-error',
      title: 'Summary Generation Error',
      status: 500,
      detail: 'Failed to generate guardian summary.',
    });
  }
});

export default router;
