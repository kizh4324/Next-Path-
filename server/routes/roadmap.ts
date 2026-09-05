import { Router, Request, Response } from 'express';
import { store } from '../store';
import { getAuthUser } from './auth';
import { getCareers } from '../data/seedData';
import { generateAdaptiveRoadmap } from '../roadmap';

const router = Router();

// GET /roadmap
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

  let roadmap = store.roadmaps.get(user.id);
  if (!roadmap) {
    // Check if there is an active recommendation or create a default demo roadmap
    const careers = getCareers();
    const primary = careers[0];
    const backup = careers[1] || null;
    const profile = store.profiles.get(user.id);

    const generated = generateAdaptiveRoadmap(
      `road-${user.id}-init`,
      user.id,
      primary,
      backup,
      profile?.education_stage || 'class_11_12',
      profile?.degree,
      profile?.engineering_branch,
    );

    roadmap = {
      id: generated.id,
      student_id: user.id,
      primary_career_id: primary.id,
      primary_career_title: primary.title,
      backup_career_id: backup?.id || null,
      backup_career_title: backup?.title || null,
      status: 'active',
      is_current: true,
      superseded_at: null,
      created_at: generated.created_at,
      milestones: generated.milestones.map((m, idx) => ({
        ...m,
        order_index: idx + 1,
        prerequisites: [],
        estimated_cost_inr: m.cost_estimate_inr,
        is_low_cost_or_free: m.is_free_or_low_cost,
        free_resource_url: m.action_url,
        is_locked: false,
        blocked_by: [],
      })),
      total_milestones: generated.milestones.length,
      completed_milestones: 0,
      total_estimated_cost_inr: 0,
      free_milestone_count: generated.milestones.filter((m) => m.is_free_or_low_cost).length,
    };
    store.roadmaps.set(user.id, roadmap);
  }

  return res.status(200).json(roadmap);
});

// PATCH /roadmap/milestones/:milestoneId/complete
router.patch('/milestones/:milestoneId/complete', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const roadmap = store.roadmaps.get(user.id);
  if (!roadmap) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Roadmap Not Found',
      status: 404,
      detail: 'No active roadmap found for user.',
    });
  }

  const { milestoneId } = req.params;
  const { completion_evidence_type = 'self_report', completion_evidence_note_or_url } = req.body;

  const milestone = roadmap.milestones.find((m: any) => m.id === milestoneId);
  if (!milestone) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Milestone Not Found',
      status: 404,
      detail: `Milestone '${milestoneId}' was not found in current roadmap.`,
    });
  }

  milestone.is_completed = true;
  milestone.completion_evidence_type = completion_evidence_type;
  milestone.completion_evidence_note_or_url = completion_evidence_note_or_url || null;
  milestone.completed_at = new Date().toISOString();

  // Recalculate completed count
  roadmap.completed_milestones = roadmap.milestones.filter((m: any) => m.is_completed).length;

  return res.status(200).json(milestone);
});

export default router;
