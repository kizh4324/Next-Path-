import { Router, Request, Response } from 'express';
import { store } from '../store';
import { getAuthUser } from './auth';
import { getCareers, getCareerById, getMarketSnapshot } from '../data/seedData';
import { rankAndFilterCareers } from '../scoring';
import { generateAdaptiveRoadmap } from '../roadmap';

const router = Router();

function buildBatch(studentId: string, batchNumber: number, profile: any) {
  const allCareers = getCareers();
  const snapshots: Record<string, any> = {};
  for (const c of allCareers) {
    snapshots[c.id] = getMarketSnapshot(c.id);
  }

  const scoredCareers = rankAndFilterCareers(allCareers, profile, snapshots, 3, 5);

  const recommendations = scoredCareers.map((item, idx) => {
    const career = getCareerById(item.career_id);
    return {
      id: `rec-${studentId}-${batchNumber}-${idx + 1}`,
      career_id: item.career_id,
      career_title: item.title,
      rank_position: idx + 1,
      composite_score: item.composite_score,
      fit_score: item.score_breakdown.fit_score,
      feasibility_score: item.score_breakdown.feasibility_score,
      evidence_quality_score: item.score_breakdown.evidence_quality_score,
      fit_label: item.fit_label,
      feasibility_label: item.feasibility_label,
      evidence_quality_label: item.evidence_quality_label,
      reasons: item.score_breakdown.compensating_factors.length
        ? item.score_breakdown.compensating_factors
        : ['High interest alignment with field profile and coursework requirements.'],
      concerns: item.score_breakdown.risk_factors.length
        ? item.score_breakdown.risk_factors
        : ['Competitive entrance examination cutoff scores.'],
      missing_evidence_flags:
        item.evidence_quality_label === 'Sparse' || item.evidence_quality_label === 'Preliminary'
          ? ['Upload recent mock test or academic scores to refine aptitude weightings.']
          : [],
      is_primary_selection: idx === 0,
      is_backup_selection: idx === 1,
      created_at: new Date().toISOString(),
      career: career
        ? {
            id: career.id,
            title: career.title,
            cluster: career.cluster,
            description: career.description,
            job_zone: career.job_zone,
            riasec_code: career.riasec_code,
            applicable_stages: career.applicable_stages,
            india_entry_routes: career.india_entry_routes,
            risks_and_tradeoffs: career.risks_and_tradeoffs,
            last_reviewed_date: '2026-04-01',
          }
        : null,
    };
  });

  const batch = {
    id: `batch-${studentId}-${batchNumber}`,
    student_id: studentId,
    batch_number: batchNumber,
    is_current: true,
    superseded_at: null,
    created_at: new Date().toISOString(),
    recommendations,
    decision_support_notice:
      'Next_Path provides decision support and does not replace certified counseling. Recommendations are grounded in RIASEC psychometric alignment, budget compatibility, and regional admission routes.',
  };

  return batch;
}

// POST /recommendations/evaluate
router.post('/evaluate', (req: Request, res: Response) => {
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
    return res.status(400).json({
      type: 'https://nextpath.in/errors/bad-request',
      title: 'Missing Profile',
      status: 400,
      detail: 'Please complete your onboarding profile before generating recommendations.',
    });
  }

  const history = store.recommendations.get(user.id) || [];
  for (const b of history) {
    b.is_current = false;
    b.superseded_at = new Date().toISOString();
  }

  const batchNumber = history.length + 1;
  const newBatch = buildBatch(user.id, batchNumber, profile);
  history.push(newBatch);
  store.recommendations.set(user.id, history);

  return res.status(200).json(newBatch);
});

// GET /recommendations/current
router.get('/current', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const history = store.recommendations.get(user.id) || [];
  const current = history.find((b) => b.is_current);

  if (current) {
    return res.status(200).json(current);
  }

  // Auto evaluate if profile exists
  const profile = store.profiles.get(user.id);
  if (profile) {
    const newBatch = buildBatch(user.id, 1, profile);
    store.recommendations.set(user.id, [newBatch]);
    return res.status(200).json(newBatch);
  }

  return res.status(404).json({
    type: 'https://nextpath.in/errors/not-found',
    title: 'No Recommendations Found',
    status: 404,
    detail: 'Complete your onboarding profile to evaluate career pathways.',
  });
});

// GET /recommendations/history
router.get('/history', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const history = store.recommendations.get(user.id) || [];
  return res.status(200).json(history);
});

// POST /recommendations/select-pathways
router.post('/select-pathways', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  const { primary_career_id, backup_career_id } = req.body;
  if (!primary_career_id) {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'A primary career choice is required.',
    });
  }

  const primaryCareer = getCareerById(primary_career_id);
  if (!primaryCareer) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Primary Career Not Found',
      status: 404,
      detail: `Career '${primary_career_id}' was not found in the catalogue.`,
    });
  }

  const backupCareer = backup_career_id ? getCareerById(backup_career_id) : null;
  const profile = store.profiles.get(user.id);
  const roadmapId = `road-${user.id}-${Date.now().toString(36)}`;

  const roadmap = generateAdaptiveRoadmap(
    roadmapId,
    user.id,
    primaryCareer,
    backupCareer || null,
    profile?.education_stage || 'class_11_12',
    profile?.degree,
    profile?.engineering_branch,
  );

  // Format roadmap response to match RoadmapResponse in models.ts
  const fullRoadmap = {
    id: roadmap.id,
    student_id: user.id,
    primary_career_id: primaryCareer.id,
    primary_career_title: primaryCareer.title,
    backup_career_id: backupCareer ? backupCareer.id : null,
    backup_career_title: backupCareer ? backupCareer.title : null,
    status: 'active',
    is_current: true,
    superseded_at: null,
    created_at: roadmap.created_at,
    milestones: roadmap.milestones.map((m, idx) => ({
      ...m,
      order_index: idx + 1,
      prerequisites: [],
      estimated_cost_inr: m.cost_estimate_inr,
      is_low_cost_or_free: m.is_free_or_low_cost,
      free_resource_url: m.action_url,
      is_locked: false,
      blocked_by: [],
    })),
    total_milestones: roadmap.milestones.length,
    completed_milestones: 0,
    total_estimated_cost_inr: 0,
    free_milestone_count: roadmap.milestones.filter((m) => m.is_free_or_low_cost).length,
  };

  store.roadmaps.set(user.id, fullRoadmap);

  return res.status(200).json({
    roadmap_id: fullRoadmap.id,
    primary_career_id: primaryCareer.id,
    backup_career_id: backupCareer ? backupCareer.id : null,
    milestones_created: fullRoadmap.milestones.length,
    message: `Active pathway created with ${primaryCareer.title} as primary and ${backupCareer ? backupCareer.title : 'no backup'} as secondary.`,
  });
});

// POST /recommendations/reassess
router.post('/reassess', (req: Request, res: Response) => {
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
    return res.status(400).json({
      type: 'https://nextpath.in/errors/bad-request',
      title: 'Missing Profile',
      status: 400,
      detail: 'Profile must exist to trigger reassessment.',
    });
  }

  const history = store.recommendations.get(user.id) || [];
  const supersededBatches = history.map((b) => b.id);
  for (const b of history) {
    b.is_current = false;
    b.superseded_at = new Date().toISOString();
  }

  const newBatchNumber = history.length + 1;
  const newBatch = buildBatch(user.id, newBatchNumber, profile);
  history.push(newBatch);
  store.recommendations.set(user.id, history);

  const currentRoadmap = store.roadmaps.get(user.id);
  const supersededRoadmaps: string[] = [];
  if (currentRoadmap) {
    currentRoadmap.status = 'reassessing';
    currentRoadmap.is_current = false;
    supersededRoadmaps.push(currentRoadmap.id);
  }

  return res.status(200).json({
    new_batch_id: newBatch.id,
    new_batch_number: newBatchNumber,
    superseded_batch_ids: supersededBatches,
    superseded_roadmap_ids: supersededRoadmaps,
    history_preserved: true,
    message: 'Reassessment completed while preserving historical decision snapshots.',
  });
});

export default router;
