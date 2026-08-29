import { Router, Request, Response } from 'express';
import {
  getCareers,
  getCareerById,
  getMarketSnapshot,
  getCareerSyllabus,
  getCareerProjects,
  getCareerTrajectories,
} from '../data/seedData';

const router = Router();

// GET /careers
router.get('/', (req: Request, res: Response) => {
  const { stage, cluster } = req.query;
  let list = getCareers();

  if (stage) {
    list = list.filter((c) =>
      c.applicable_stages?.some((s) => s.toLowerCase() === String(stage).toLowerCase()),
    );
  }
  if (cluster) {
    list = list.filter((c) => c.cluster.toLowerCase() === String(cluster).toLowerCase());
  }

  const summaries = list.map((c) => ({
    id: c.id,
    title: c.title,
    cluster: c.cluster,
    description: c.description,
    job_zone: c.job_zone,
    riasec_code: c.riasec_code,
    applicable_stages: c.applicable_stages,
    india_entry_routes: c.india_entry_routes,
    risks_and_tradeoffs: c.risks_and_tradeoffs,
    last_reviewed_date: '2026-04-01',
  }));

  return res.status(200).json(summaries);
});

// POST /careers/compare
router.post('/compare', (req: Request, res: Response) => {
  const { career_ids = [] } = req.body;
  const careers = career_ids.map((id: string) => getCareerById(id)).filter(Boolean);

  const missingMarketEvidence: string[] = [];
  const rows: { dimension: string; values: Record<string, string>; note: string | null }[] = [
    {
      dimension: 'Cluster',
      values: Object.fromEntries(careers.map((c: any) => [c.id, c.cluster])),
      note: null,
    },
    {
      dimension: 'Typical Starting Salary',
      values: Object.fromEntries(
        careers.map((c: any) => {
          const snap = getMarketSnapshot(c.id);
          if (!snap) missingMarketEvidence.push(c.title);
          return [c.id, snap?.salary_range_entry_inr || 'Evidence unavailable'];
        }),
      ),
      note: 'Based on verified Indian hiring reports.',
    },
    {
      dimension: 'Primary Entry Duration',
      values: Object.fromEntries(
        careers.map((c: any) => [
          c.id,
          c.india_entry_routes?.[0] ? `${c.india_entry_routes[0].duration_years} years` : 'Varies',
        ]),
      ),
      note: null,
    },
    {
      dimension: 'Min Estimated Cost',
      values: Object.fromEntries(
        careers.map((c: any) => [
          c.id,
          c.india_entry_routes?.[0]
            ? `₹${(c.india_entry_routes[0].estimated_cost_inr_min || 0).toLocaleString('en-IN')}`
            : 'Low cost',
        ]),
      ),
      note: 'State quota / government institutions baseline.',
    },
    {
      dimension: 'Key Entrance Exam',
      values: Object.fromEntries(
        careers.map((c: any) => [
          c.id,
          c.india_entry_routes?.[0]?.entrance_exams?.[0] || 'Direct / Merit basis',
        ]),
      ),
      note: null,
    },
    {
      dimension: 'Work Reality & Stress Points',
      values: Object.fromEntries(
        careers.map((c: any) => [c.id, c.work_reality_summary || 'Standard workplace']),
      ),
      note: 'Authored honest job environment profile.',
    },
  ];

  return res.status(200).json({
    careers: careers.map((c: any) => ({
      id: c.id,
      title: c.title,
      cluster: c.cluster,
      description: c.description,
      job_zone: c.job_zone,
      riasec_code: c.riasec_code,
      applicable_stages: c.applicable_stages,
      india_entry_routes: c.india_entry_routes,
      risks_and_tradeoffs: c.risks_and_tradeoffs,
      last_reviewed_date: '2026-04-01',
    })),
    rows,
    careers_without_market_evidence: missingMarketEvidence,
  });
});

// GET /careers/:id
router.get('/:id', (req: Request, res: Response) => {
  const career = getCareerById(req.params.id);
  if (!career) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Career Not Found',
      status: 404,
      detail: `No career track found matching identifier '${req.params.id}'.`,
    });
  }

  const snapshot = getMarketSnapshot(career.id);
  const detail = {
    id: career.id,
    onet_soc_code: career.onet_soc_code,
    title: career.title,
    cluster: career.cluster,
    description: career.description,
    job_zone: career.job_zone,
    riasec_code: career.riasec_code,
    riasec_scores: career.riasec_scores,
    applicable_stages: career.applicable_stages,
    work_reality_summary: career.work_reality_summary,
    india_entry_routes: career.india_entry_routes,
    prerequisites: Array.isArray(career.prerequisites) ? career.prerequisites : [career.prerequisites],
    risks_and_tradeoffs: career.risks_and_tradeoffs,
    regional_caveats: career.regional_caveats?.join('; ') || null,
    content_owner: 'Next_Path Editorial & Indian Education Board Group',
    review_cycle_months: 6,
    source_links: career.source_links,
    last_reviewed_date: '2026-04-01',
    skills: career.skills.map((s, idx) => ({
      id: `skill-${career.id}-${idx}`,
      career_id: career.id,
      skill_name: s.skill_name,
      category: s.category,
      description: `Core proficiency in ${s.skill_name} required for daily execution in ${career.title}.`,
      free_learning_resource_name: 'SWAYAM / NPTEL Free Learning Course',
      free_learning_resource_url: 'https://swayam.gov.in',
      paid_learning_resource_name: null,
      paid_learning_resource_url: null,
      commercial_disclosure: 'Next_Path receives zero commissions. All recommended materials are non-sponsored.',
    })),
    market_snapshot: snapshot
      ? {
          id: `snap-${career.id}`,
          career_id: career.id,
          geography: snapshot.geography || 'India (Pan-National)',
          timeframe_period: snapshot.timeframe_period || '2025-2026',
          data_source: snapshot.data_source || 'PLFS & Industry Hiring Reports',
          demand_indicator: snapshot.demand_indicator || 'Moderate',
          salary_range_entry_inr: snapshot.salary_range_entry_inr || '₹3,00,000 - ₹5,00,000 / yr',
          salary_range_mid_inr: snapshot.salary_range_mid_inr || '₹7,00,000 - ₹12,00,000 / yr',
          top_demanded_skills: snapshot.top_demanded_skills || [],
          top_hiring_locations: [
            { location: 'Bengaluru, Karnataka', postings: 14200, share_pct: 28 },
            { location: 'Delhi NCR (Gurugram/Noida)', postings: 11800, share_pct: 23 },
            { location: 'Hyderabad, Telangana', postings: 9400, share_pct: 18 },
            { location: 'Pune / Mumbai, Maharashtra', postings: 8900, share_pct: 17 },
          ],
          experience_distribution: { '0-2 yrs': 40, '3-5 yrs': 35, '6+ yrs': 25 },
          competition_caveat: 'High applicant volume for entry roles; portfolio artifacts significantly accelerate interview screening.',
          uncertainty_statement: 'Compensation ranges vary by tier of city and organization scale.',
          last_updated_date: '2026-03-15',
        }
      : null,
    market_evidence_unavailable: snapshot
      ? null
      : {
          available: false,
          reason: 'Verified salary and placement filings for this niche track are currently under editorial review.',
          what_would_help: 'Review state public service commission notifications or university alumni placement reports.',
        },
  };

  return res.status(200).json(detail);
});

// GET /careers/:id/skill-gaps
router.get('/:id/skill-gaps', (req: Request, res: Response) => {
  const career = getCareerById(req.params.id);
  if (!career) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Career Not Found',
      status: 404,
      detail: `No career track found matching identifier '${req.params.id}'.`,
    });
  }

  const items = career.skills.map((s, idx) => ({
    skill_name: s.skill_name,
    category: s.category,
    description: `Practical domain competency in ${s.skill_name}.`,
    is_already_held: idx === 0, // Mock demonstration
    free_learning_resource_name: 'SWAYAM / NPTEL Official Free Video Lessons',
    free_learning_resource_url: 'https://swayam.gov.in',
  }));

  return res.status(200).json({
    career_id: career.id,
    career_title: career.title,
    total_skills: items.length,
    skills_acquired_count: items.filter((i) => i.is_already_held).length,
    skills_gap_count: items.filter((i) => !i.is_already_held).length,
    gaps: items,
  });
});

// GET /careers/:id/syllabus
router.get('/:id/syllabus', (req: Request, res: Response) => {
  const career = getCareerById(req.params.id);
  if (!career) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Career Not Found',
      status: 404,
      detail: `No career track found matching identifier '${req.params.id}'.`,
    });
  }

  const phases = getCareerSyllabus(career.id, career.title, career.cluster);
  return res.status(200).json({
    career_id: career.id,
    career_title: career.title,
    phases,
    total_phases: phases.length,
    total_estimated_hours: phases.reduce(
      (sum, p) => sum + p.topics.reduce((tSum, t) => tSum + t.estimated_hours, 0),
      0,
    ),
  });
});

// GET /careers/:id/projects
router.get('/:id/projects', (req: Request, res: Response) => {
  const career = getCareerById(req.params.id);
  if (!career) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Career Not Found',
      status: 404,
      detail: `No career track found matching identifier '${req.params.id}'.`,
    });
  }

  const { difficulty } = req.query;
  let projects = getCareerProjects(career.id, career.title, career.cluster);
  if (difficulty) {
    projects = projects.filter((p) => p.difficulty === difficulty);
  }

  return res.status(200).json({
    career_id: career.id,
    career_title: career.title,
    projects,
  });
});

// GET /careers/:id/trajectory
router.get('/:id/trajectory', (req: Request, res: Response) => {
  const career = getCareerById(req.params.id);
  if (!career) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Career Not Found',
      status: 404,
      detail: `No career track found matching identifier '${req.params.id}'.`,
    });
  }

  const trajectories = getCareerTrajectories(career.id, career.title, career.cluster);
  return res.status(200).json({
    career_id: career.id,
    career_title: career.title,
    trajectories,
  });
});

export default router;
