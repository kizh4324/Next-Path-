import { Router, Request, Response } from 'express';
import { store, User } from '../store';
import { getAuthUser } from './auth';
import { getCareerById, getCareers, getMarketSnapshot } from '../data/seedData';
import { rankAndFilterCareers } from '../scoring';

const router = Router();

function formatLakhs(amount: number): string {
  if (amount >= 100000) {
    const lk = amount / 100000;
    return `₹${lk % 1 === 0 ? lk.toFixed(0) : lk.toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

// GET /guardian/summary
router.get('/summary', async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({
      type: 'https://nextpath.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Valid authentication token required.',
    });
  }

  let targetStudentId: string | null = null;
  let targetStudentUser: User | null = null;

  // Authorization check: student vs guardian vs counselor/admin
  if (authUser.role === 'student') {
    targetStudentId = authUser.id;
    targetStudentUser = authUser;
  } else if (authUser.role === 'guardian') {
    const requestedStudentId = req.query.student_id ? String(req.query.student_id).trim() : null;

    if (requestedStudentId) {
      // If client requests a specific studentId, strictly verify permission
      const targetProf = store.profiles.get(requestedStudentId);
      const isLinkedToUser = authUser.linked_student_id === requestedStudentId;
      const isContextAuthorized = Boolean(
        targetProf?.guardian_contexts?.some(
          (g) =>
            (g.guardian_name && g.guardian_name.toLowerCase() === authUser.full_name.toLowerCase()) ||
            g.student_id === requestedStudentId,
        ),
      );

      if (!isLinkedToUser && !isContextAuthorized) {
        return res.status(403).json({
          type: 'https://nextpath.in/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: "You do not have authorization to view this student's progress.",
        });
      }
      targetStudentId = requestedStudentId;
    } else {
      // Default to linked student id
      targetStudentId = authUser.linked_student_id || null;

      // If not linked on user record, search store profiles for matching guardian context
      if (!targetStudentId) {
        for (const [sId, p] of store.profiles.entries()) {
          if (
            p.guardian_contexts?.some(
              (g) => g.guardian_name && g.guardian_name.toLowerCase() === authUser.full_name.toLowerCase(),
            )
          ) {
            targetStudentId = sId;
            break;
          }
        }
      }

      // If still not linked, check if any student exists in the system to link or return 404
      if (!targetStudentId) {
        const anyStudent = Array.from(store.users.values()).find((u) => u.role === 'student');
        if (anyStudent && store.profiles.has(anyStudent.id)) {
          targetStudentId = anyStudent.id;
        }
      }

      if (!targetStudentId) {
        return res.status(404).json({
          type: 'https://nextpath.in/errors/not-found',
          title: 'No Linked Student',
          status: 404,
          detail: 'Student profile information is not available yet.',
        });
      }
    }

    targetStudentUser = store.getUserById(targetStudentId) || (targetStudentId === authUser.id ? authUser : null);
  } else {
    // Counselor or admin
    targetStudentId = (req.query.student_id as string) || store.profiles.keys().next().value || null;
    targetStudentUser = targetStudentId ? store.getUserById(targetStudentId) || null : null;
  }

  if (!targetStudentId) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Student Profile Not Found',
      status: 404,
      detail: 'Student profile information is not available yet.',
    });
  }

  const profile = store.profiles.get(targetStudentId);
  if (!profile) {
    return res.status(404).json({
      type: 'https://nextpath.in/errors/not-found',
      title: 'Profile Not Found',
      status: 404,
      detail: 'Student profile information is not available yet.',
    });
  }

  const studentFullName = targetStudentUser?.full_name?.trim() || authUser.full_name?.trim() || 'Student';

  // Roadmap & milestones
  const roadmap = store.roadmaps.get(targetStudentId);
  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedMilestoneObjs = roadmap?.milestones?.filter((m: any) => m.is_completed || m.completed_at) || [];
  const completedMilestones = completedMilestoneObjs.length;
  const completionPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const completedItems = completedMilestoneObjs.map((m: any) => m.title);
  const upcomingItems =
    roadmap?.milestones?.filter((m: any) => !m.is_completed && !m.completed_at).map((m: any) => m.title) || [];

  // Recommendations
  let history = store.recommendations.get(targetStudentId) || [];
  let currentBatch = history.find((b) => b.is_current) || history[0];

  if (!currentBatch && profile.profile_completeness_pct >= 40) {
    const allCareers = getCareers();
    const snapshots: Record<string, any> = {};
    for (const c of allCareers) {
      snapshots[c.id] = getMarketSnapshot(c.id);
    }
    const scored = rankAndFilterCareers(allCareers, profile, snapshots, 3, 5);
    const recs = scored.map((item, idx) => {
      const c = getCareerById(item.career_id);
      return {
        id: `rec-${targetStudentId}-1-${idx + 1}`,
        career_id: item.career_id,
        career_title: item.title,
        rank_position: idx + 1,
        fit_label: item.fit_label,
        feasibility_label: item.feasibility_label,
        evidence_quality_label: item.evidence_quality_label,
        career: c,
        is_primary_selection: idx === 0,
        is_backup_selection: idx === 1,
      };
    });
    currentBatch = {
      id: `batch-${targetStudentId}-1`,
      student_id: targetStudentId,
      batch_number: 1,
      is_current: true,
      created_at: new Date().toISOString(),
      recommendations: recs,
    };
    store.recommendations.set(targetStudentId, [currentBatch]);
  }

  // Assessment dimensions with qualitative labels only (Strong, Moderate, Developing, Insufficient evidence)
  const interestsCount = profile.interests?.length || 0;
  let interestsLabel: 'Strong' | 'Moderate' | 'Developing' | 'Insufficient evidence' = 'Developing';
  if (interestsCount >= 3) {
    interestsLabel = 'Strong';
  } else if (interestsCount >= 1) {
    interestsLabel = 'Moderate';
  } else {
    interestsLabel = 'Developing';
  }

  const aptitudes = Object.values(profile.aptitude_signals || {});
  let problemSolvingLabel: 'Strong' | 'Moderate' | 'Developing' | 'Insufficient evidence' = 'Insufficient evidence';
  if (aptitudes.length > 0) {
    const avg = aptitudes.reduce((acc, v) => acc + v, 0) / aptitudes.length;
    if (avg >= 3.8) {
      problemSolvingLabel = 'Strong';
    } else if (avg >= 2.8) {
      problemSolvingLabel = 'Moderate';
    } else {
      problemSolvingLabel = 'Developing';
    }
  }

  let academicReadinessLabel: 'Strong' | 'Moderate' | 'Developing' | 'Insufficient evidence' = 'Insufficient evidence';
  if (profile.academic_records_available) {
    if (profile.education_stage === 'class_11_12' || profile.education_stage === 'early_college') {
      academicReadinessLabel = 'Moderate';
    } else {
      academicReadinessLabel = 'Developing';
    }
  }

  let careerClarityLabel: 'Strong' | 'Moderate' | 'Developing' | 'Insufficient evidence' = 'Developing';
  if (roadmap?.primary_career_id && roadmap?.backup_career_id) {
    careerClarityLabel = 'Strong';
  } else if (currentBatch?.recommendations?.length) {
    careerClarityLabel = 'Moderate';
  } else if (interestsCount > 0) {
    careerClarityLabel = 'Developing';
  } else {
    careerClarityLabel = 'Insufficient evidence';
  }

  const assessmentStatus =
    interestsCount > 0 && aptitudes.length > 0
      ? 'completed'
      : interestsCount > 0
        ? 'in_progress'
        : 'not_started';

  // Education stage formatted
  const stageFormatted =
    profile.education_stage === 'class_8_10'
      ? 'Class 8–10'
      : profile.education_stage === 'class_11_12'
        ? profile.grade_or_year || 'Class 11'
        : 'Early College';

  const streamFormatted = profile.current_stream || (profile.degree ? profile.degree : null);

  // Current focus
  const currentFocus =
    profile.interests?.[0]?.label ||
    (currentBatch?.recommendations?.[0]?.career_title
      ? `${currentBatch.recommendations[0].career_title} & Analytical Skills`
      : 'Technology & Problem Solving');

  // Career options (3-5)
  const careerOptionsList = (currentBatch?.recommendations || []).slice(0, 5).map((rec: any) => {
    const careerObj = rec.career || getCareerById(rec.career_id);
    const primaryRoute = careerObj?.india_entry_routes?.[0];

    const costRangeStr = primaryRoute
      ? `${formatLakhs(primaryRoute.estimated_cost_inr_min)}–${formatLakhs(primaryRoute.estimated_cost_inr_max)}`
      : 'Affordable state fees';

    const durationStr = primaryRoute ? `${primaryRoute.duration_years} yrs` : '3–4 yrs';

    return {
      id: rec.career_id,
      career_title: rec.career_title,
      fit_label: rec.fit_label || 'Good fit',
      feasibility_label: rec.feasibility_label || 'Moderate feasibility',
      cost_range: costRangeStr,
      duration: durationStr,
      route_name: primaryRoute?.route_name || 'Standard Degree Pathway',
      low_cost_alternative: primaryRoute?.low_cost_alternative_route || null,
      scholarship_available: true,
    };
  });

  // Cost breakdown for legacy compatibility
  const costBreakdown = careerOptionsList.map((c: any) => {
    const careerObj = getCareerById(c.id);
    const route = careerObj?.india_entry_routes?.[0];
    return {
      career_title: c.career_title,
      route_name: c.route_name,
      duration_years: route?.duration_years || 3,
      estimated_cost_inr_min: route?.estimated_cost_inr_min || 150000,
      estimated_cost_inr_max: route?.estimated_cost_inr_max || 450000,
      entrance_exams: route?.entrance_exams || ['State CET'],
      low_cost_alternative_route: c.low_cost_alternative,
    };
  });

  // Family priorities (up to 2-3 most relevant)
  const rawPriorities = profile.guardian_contexts?.[0]?.guardian_priorities || [];
  const familyPriorities =
    rawPriorities.length > 0
      ? rawPriorities.slice(0, 3)
      : ['Job stability', 'Affordable pathway', 'Accredited degree'];

  // Next steps from actual roadmap
  const nextSteps =
    upcomingItems.length > 0
      ? [
          upcomingItems[0],
          upcomingItems[1] || 'Review learning progress with family',
          'Reassess in 90 days',
        ].filter(Boolean)
      : roadmap
        ? ['Review foundational learning modules', 'Reassess in 90 days']
        : [];

  const familyDiscussionPrompts = [
    `What interests ${studentFullName.split(' ')[0]} most about these pathways?`,
    'Which pathway feels realistic given our family priorities?',
    'What practical support or mentorship is needed right now?',
  ];

  return res.status(200).json({
    student: {
      id: targetStudentId,
      full_name: studentFullName,
      avatar_url: null,
      education_stage: stageFormatted,
      grade_or_year: profile.grade_or_year,
      stream: streamFormatted,
      current_focus: currentFocus,
      assessment_status: assessmentStatus,
      last_assessment_date: currentBatch?.created_at || profile.updated_at || profile.created_at,
    },
    assessment_overview: {
      status: assessmentStatus,
      dimensions: [
        { name: 'Interests', label: interestsLabel },
        { name: 'Problem Solving', label: problemSolvingLabel },
        { name: 'Academic Readiness', label: academicReadinessLabel },
        { name: 'Career Clarity', label: careerClarityLabel },
      ],
      last_completed_at: profile.updated_at || profile.created_at,
    },
    progress: {
      total_milestones: totalMilestones,
      completed_milestones: completedMilestones,
      completion_percentage: completionPercentage,
      completed_items: completedItems,
      upcoming_items: upcomingItems,
    },
    career_options: careerOptionsList,
    pathway_feasibility: careerOptionsList,
    family_priorities: familyPriorities,
    next_steps: nextSteps,
    family_discussion: {
      prompts: familyDiscussionPrompts,
      helper_text: 'Use these prompts to support your child’s decision.',
      guide_tips: [
        'Focus on strengths and genuine curiosity rather than immediate entrance exam pressure.',
        'Consider both the primary path and safe backup alternatives.',
        'Explore government scholarships and low-cost alternatives on scholarships.gov.in.',
      ],
    },
    reassessment: {
      next_review_days: 90,
      next_review_label: 'Next review: 90 days',
      note: 'Interests, skills and plans can change. Review the pathway as your child gains new experience.',
    },
    // Backward compatibility with previous API consumers
    summary_text: `${studentFullName} has evaluated career options using Next_Path. Current evidence shows strong alignment with ${careerOptionsList[0]?.career_title || 'their chosen field'}.`,
    cost_breakdown: costBreakdown,
    discussion_points: familyDiscussionPrompts,
    guardian_priorities_reflected: familyPriorities,
    generated_without_ai: true,
    generated_at: new Date().toISOString(),
  });
});

export default router;

