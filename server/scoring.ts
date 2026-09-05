import { Career, IndiaEntryRoute } from './data/seedData';

export type EducationStage = 'class_8_10' | 'class_11_12' | 'early_college';
export type BudgetTier = 'low_cost_only' | 'moderate_up_to_2_lakhs' | 'flexible_above_2_lakhs';
export type RelocationWillingness =
  | 'home_district_only'
  | 'within_state'
  | 'anywhere_in_india'
  | 'abroad';

export type FitLabel = 'Strong' | 'Moderate' | 'Emerging' | 'Insufficient evidence';
export type FeasibilityLabel = 'High' | 'Moderate' | 'Challenging' | 'Low';
export type EvidenceQualityLabel = 'High' | 'Moderate' | 'Preliminary' | 'Sparse';

export interface ScoreBreakdown {
  riasec_alignment: number;
  aptitude_signal_match: number;
  fit_score: number;
  budget_compatibility: number;
  relocation_fit: number;
  stage_eligibility: number;
  feasibility_score: number;
  profile_completeness_pct: number;
  academic_records_weight: number;
  evidence_quality_score: number;
  composite_score: number;
  fit_label: FitLabel;
  feasibility_label: FeasibilityLabel;
  evidence_quality_label: EvidenceQualityLabel;
  risk_factors: string[];
  compensating_factors: string[];
}

export interface ScoredCareerPreview {
  career_id: string;
  onet_soc_code: string;
  title: string;
  cluster: string;
  description: string;
  job_zone: number;
  work_reality_summary: string;
  fit_label: FitLabel;
  feasibility_label: FeasibilityLabel;
  evidence_quality_label: EvidenceQualityLabel;
  composite_score: number;
  rank: number;
  score_breakdown: ScoreBreakdown;
  cheapest_route_cost_inr: number;
  primary_entrance_exam: string | null;
  demand_indicator: 'High' | 'Moderate' | 'Emerging' | 'Stable' | 'Niche' | null;
  salary_range_entry_inr: string | null;
}

const RIASEC_KEYS = ['R', 'I', 'A', 'S', 'E', 'C'] as const;

const RELOCATION_ORDER: Record<RelocationWillingness, number> = {
  home_district_only: 0,
  within_state: 1,
  anywhere_in_india: 2,
  abroad: 3,
};

const BUDGET_TIER_ANNUAL_CEILING_INR: Record<BudgetTier, number> = {
  low_cost_only: 50000,
  moderate_up_to_2_lakhs: 200000,
  flexible_above_2_lakhs: 1000000,
};

const APTITUDE_DOMAIN_KEYWORDS: Record<string, string[]> = {
  mathematics: ['mathematic', 'maths', 'calculus', 'algebra', 'statistic', 'quantitative'],
  physics: ['physic', 'mechanic', 'electrical', 'electronic', 'thermodynamic'],
  chemistry: ['chemistry', 'chemical', 'pharmacolog'],
  biology: ['biolog', 'botany', 'zoolog', 'anatomy', 'physiolog', 'medicine', 'clinical'],
  computers: ['comput', 'programming', 'software', 'coding', 'python', 'sql', 'data'],
  language: ['english', 'language', 'writing', 'communicat', 'literature', 'content'],
  social_science: ['history', 'civic', 'polit', 'sociolog', 'psycholog', 'law', 'public'],
  commerce: ['commerce', 'account', 'finance', 'economic', 'business', 'audit', 'tax'],
  art_design: ['design', 'art', 'drawing', 'visual', 'aesthetic', 'creative', 'craft'],
  practical_skills: ['workshop', 'repair', 'field', 'hands-on', 'technician', 'operat'],
};

export function calculateRiasecAlignment(
  studentInterests: { label?: string; riasec?: string | null; strength?: number }[],
  careerRiasec: Record<string, number>,
): number {
  if (!studentInterests || studentInterests.length === 0) return 50.0;

  // Build student RIASEC vector
  const studentScores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  let hasRiasec = false;
  for (const item of studentInterests) {
    if (item.riasec && studentScores[item.riasec] !== undefined) {
      studentScores[item.riasec] += Number(item.strength ?? 1);
      hasRiasec = true;
    }
  }

  if (!hasRiasec) return 50.0;

  // Cosine similarity or normalized distance
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key of RIASEC_KEYS) {
    const a = studentScores[key] || 0;
    const b = (careerRiasec[key] || 0) / 100;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 50.0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(100, Math.max(0, similarity * 100));
}

export function calculateAptitudeMatch(
  signals: Record<string, number> | undefined,
  career: Career,
): number {
  if (!signals || Object.keys(signals).length === 0) return 50.0;

  let totalWeight = 0;
  let totalScore = 0;

  const essentialSkills = career.skills.filter((s) => s.category === 'essential');
  const careerText = `${career.title} ${career.prerequisites} ${essentialSkills.map((s) => s.skill_name).join(' ')}`.toLowerCase();

  for (const [domain, rating] of Object.entries(signals)) {
    const keywords = APTITUDE_DOMAIN_KEYWORDS[domain] || [domain.toLowerCase()];
    const matches = keywords.some((kw) => careerText.includes(kw));

    if (matches) {
      totalWeight += 2;
      // rating is 1 to 5
      totalScore += ((rating - 1) / 4) * 100 * 2;
    } else {
      totalWeight += 0.5;
      totalScore += ((rating - 1) / 4) * 100 * 0.5;
    }
  }

  if (totalWeight === 0) return 50.0;
  return Math.min(100, Math.max(0, totalScore / totalWeight));
}

export function calculateBudgetCompatibility(
  studentTier: BudgetTier,
  routes: IndiaEntryRoute[],
): { score: number; cheapestCost: number; hasRouteUnderBudget: boolean } {
  if (!routes || routes.length === 0) return { score: 70, cheapestCost: 0, hasRouteUnderBudget: true };

  const annualCeiling = BUDGET_TIER_ANNUAL_CEILING_INR[studentTier] || 200000;
  let minTotalCost = Infinity;
  let hasUnderBudget = false;

  for (const r of routes) {
    const cost = Number(r.estimated_cost_inr_min || 0);
    if (cost < minTotalCost) minTotalCost = cost;
    const duration = r.duration_years || 3;
    const annualCost = cost / Math.max(1, duration);
    if (annualCost <= annualCeiling || r.cost_tier === studentTier) {
      hasUnderBudget = true;
    }
  }

  if (hasUnderBudget) {
    return { score: 100.0, cheapestCost: minTotalCost === Infinity ? 0 : minTotalCost, hasRouteUnderBudget: true };
  }

  // If over budget, calculate gap
  const duration = 3;
  const annualCost = (minTotalCost === Infinity ? 100000 : minTotalCost) / duration;
  const ratio = annualCeiling / Math.max(1, annualCost);
  const score = Math.max(25.0, Math.min(90.0, ratio * 80.0));
  return { score, cheapestCost: minTotalCost === Infinity ? 0 : minTotalCost, hasRouteUnderBudget: false };
}

export function calculateRelocationFit(
  studentWillingness: RelocationWillingness,
  routes: IndiaEntryRoute[],
): number {
  if (!routes || routes.length === 0) return 100.0;
  const studentLevel = RELOCATION_ORDER[studentWillingness] ?? 2;

  let anyFit = false;
  for (const r of routes) {
    const routeLevel = RELOCATION_ORDER[r.availability_scope] ?? 2;
    if (routeLevel <= studentLevel) {
      anyFit = true;
      break;
    }
  }
  return anyFit ? 100.0 : 40.0;
}

export function calculateStageEligibility(
  studentStage: EducationStage,
  careerStages: string[],
): number {
  if (!careerStages || careerStages.length === 0) return 100.0;
  return careerStages.includes(studentStage) ? 100.0 : 50.0;
}

export function toFitLabel(score: number): FitLabel {
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Emerging';
  return 'Insufficient evidence';
}

export function toFeasibilityLabel(score: number): FeasibilityLabel {
  if (score >= 75) return 'High';
  if (score >= 55) return 'Moderate';
  if (score >= 35) return 'Challenging';
  return 'Low';
}

export function toEvidenceQualityLabel(score: number): EvidenceQualityLabel {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Moderate';
  if (score >= 25) return 'Preliminary';
  return 'Sparse';
}

interface AcademicMatchResult {
  bonus: number;
  rationale: string | null;
  directMatch: boolean;
}

export function calculateAcademicAlignment(
  career: Career,
  degree?: string | null,
  engineeringBranch?: string | null,
  currentStream?: string | null,
): AcademicMatchResult {
  const normDegree = (degree || '').trim();
  const normBranch = (engineeringBranch || '').trim();
  const normStream = (currentStream || '').trim();
  const cid = career.id;

  // 1. If enrolled in B.E / B.Tech with an engineering branch
  if (normDegree === 'B.E / B.Tech' || normStream.startsWith('B.E / B.Tech')) {
    const branch = normBranch || (normStream.includes(' - ') ? normStream.split(' - ')[1] : '');

    // Computer Science Engineering (CSE)
    if (branch === 'Computer Science Engineering (CSE)') {
      if (cid === 'software-developer') {
        return {
          bonus: 25,
          rationale: 'Direct core curriculum alignment with your Computer Science Engineering (CSE) degree.',
          directMatch: true,
        };
      }
      if (cid === 'data-scientist' || cid === 'data-analyst') {
        return {
          bonus: 22,
          rationale: 'Strong algorithmic, database, and mathematics grounding from your CSE coursework.',
          directMatch: true,
        };
      }
      if (cid === 'information-security-analyst') {
        return {
          bonus: 20,
          rationale: 'Operating systems and networking fundamentals from CSE directly support cybersecurity roles.',
          directMatch: true,
        };
      }
      if (cid === 'ux-designer') {
        return {
          bonus: 15,
          rationale: 'Front-end development and human-computer interaction concepts from CSE enhance UX engineering.',
          directMatch: false,
        };
      }
    }

    // Information Technology (IT)
    if (branch === 'Information Technology (IT)') {
      if (cid === 'software-developer' || cid === 'information-security-analyst') {
        return {
          bonus: 25,
          rationale: 'Direct degree specialization match for software and network systems from IT.',
          directMatch: true,
        };
      }
      if (cid === 'data-analyst' || cid === 'data-scientist') {
        return {
          bonus: 20,
          rationale: 'Database management and cloud systems coursework in IT directly supports data careers.',
          directMatch: true,
        };
      }
    }

    // Artificial Intelligence & Data Science (AI & DS)
    if (branch === 'Artificial Intelligence & Data Science (AI & DS)') {
      if (cid === 'data-scientist') {
        return {
          bonus: 28,
          rationale: 'Exact field specialization match with your AI & Data Science engineering degree.',
          directMatch: true,
        };
      }
      if (cid === 'data-analyst' || cid === 'software-developer') {
        return {
          bonus: 24,
          rationale: 'Advanced statistical modeling and Python/machine learning foundation from AI & DS.',
          directMatch: true,
        };
      }
    }

    // Artificial Intelligence & Machine Learning (AI & ML)
    if (branch === 'Artificial Intelligence & Machine Learning (AI & ML)') {
      if (cid === 'data-scientist') {
        return {
          bonus: 28,
          rationale: 'Direct departmental specialization with machine learning and deep learning pipelines.',
          directMatch: true,
        };
      }
      if (cid === 'software-developer' || cid === 'data-analyst') {
        return {
          bonus: 24,
          rationale: 'Deep algorithmic coding and intelligent systems coursework from AI & ML.',
          directMatch: true,
        };
      }
    }

    // Cyber Security
    if (branch === 'Cyber Security') {
      if (cid === 'information-security-analyst') {
        return {
          bonus: 30,
          rationale: 'Direct departmental specialization in Cyber Security and network defense.',
          directMatch: true,
        };
      }
      if (cid === 'software-developer') {
        return {
          bonus: 20,
          rationale: 'Secure coding, systems architecture, and cryptography foundations align with software roles.',
          directMatch: true,
        };
      }
    }

    // Electronics & Communication Engineering (ECE)
    if (branch === 'Electronics & Communication Engineering (ECE)') {
      if (cid === 'software-developer' || cid === 'information-security-analyst') {
        return {
          bonus: 18,
          rationale: 'Embedded systems, signal processing, and telecommunications coursework in ECE.',
          directMatch: true,
        };
      }
      if (cid === 'data-analyst') {
        return {
          bonus: 15,
          rationale: 'Quantitative signal analysis and mathematics foundation from ECE.',
          directMatch: false,
        };
      }
    }

    // Electrical & Electronics Engineering (EEE)
    if (branch === 'Electrical & Electronics Engineering (EEE)') {
      if (cid === 'electrician') {
        return {
          bonus: 25,
          rationale: 'Advanced electrical theory and power engineering expertise from EEE.',
          directMatch: true,
        };
      }
      if (cid === 'software-developer' || cid === 'mechanical-engineer') {
        return {
          bonus: 15,
          rationale: 'Control systems and automation background from Electrical Engineering.',
          directMatch: false,
        };
      }
    }

    // Mechanical Engineering
    if (branch === 'Mechanical Engineering') {
      if (cid === 'mechanical-engineer') {
        return {
          bonus: 30,
          rationale: 'Direct core engineering degree match in Mechanical Engineering.',
          directMatch: true,
        };
      }
      if (cid === 'automotive-technician') {
        return {
          bonus: 22,
          rationale: 'Thermodynamics, machine design, and automotive system knowledge from Mechanical Engineering.',
          directMatch: true,
        };
      }
      if (cid === 'civil-engineer') {
        return {
          bonus: 12,
          rationale: 'Shared solid mechanics, materials science, and engineering drafting coursework.',
          directMatch: false,
        };
      }
    }

    // Civil Engineering
    if (branch === 'Civil Engineering') {
      if (cid === 'civil-engineer') {
        return {
          bonus: 30,
          rationale: 'Direct core engineering branch match in Civil Engineering.',
          directMatch: true,
        };
      }
      if (cid === 'architect') {
        return {
          bonus: 18,
          rationale: 'Structural analysis, surveying, and CAD drafting background from Civil Engineering.',
          directMatch: true,
        };
      }
      if (cid === 'environmental-scientist') {
        return {
          bonus: 15,
          rationale: 'Hydrology, sanitation, and environmental engineering coursework from Civil branch.',
          directMatch: false,
        };
      }
    }

    // Biomedical Engineering
    if (branch === 'Biomedical Engineering') {
      if (cid === 'pharmacist' || cid === 'physiotherapist' || cid === 'physician-mbbs' || cid === 'registered-nurse') {
        return {
          bonus: 22,
          rationale: 'Medical instrumentation, biomaterials, and clinical technology background from Biomedical Engineering.',
          directMatch: true,
        };
      }
    }

    // Biotechnology
    if (branch === 'Biotechnology') {
      if (cid === 'agricultural-scientist' || cid === 'environmental-scientist' || cid === 'pharmacist') {
        return {
          bonus: 25,
          rationale: 'Molecular biology, bioprocess engineering, and biochemistry coursework from Biotechnology.',
          directMatch: true,
        };
      }
    }

    // Chemical Engineering
    if (branch === 'Chemical Engineering') {
      if (cid === 'environmental-scientist' || cid === 'agricultural-scientist') {
        return {
          bonus: 22,
          rationale: 'Reaction kinetics, materials engineering, and environmental treatment coursework from Chemical Engineering.',
          directMatch: true,
        };
      }
    }

    // Other Engineering / Technology or generic B.E / B.Tech
    if (career.cluster === 'Engineering & Technology' || career.cluster === 'Data & AI') {
      return {
        bonus: 15,
        rationale: 'Strong analytical, mathematics, and technical problem-solving background from engineering studies.',
        directMatch: true,
      };
    }
  }

  // 2. BCA
  if (normDegree === 'BCA') {
    if (cid === 'software-developer') {
      return {
        bonus: 25,
        rationale: 'Direct applied computer science and application programming curriculum in BCA.',
        directMatch: true,
      };
    }
    if (cid === 'data-analyst' || cid === 'information-security-analyst') {
      return {
        bonus: 20,
        rationale: 'Database systems and computer network modules from BCA coursework.',
        directMatch: true,
      };
    }
  }

  // 3. B.Com
  if (normDegree === 'B.Com') {
    if (cid === 'chartered-accountant' || cid === 'banking-financial-manager' || cid === 'financial-analyst') {
      return {
        bonus: 28,
        rationale: 'Direct degree synergy with your B.Com accounting, taxation, and financial markets coursework.',
        directMatch: true,
      };
    }
    if (cid === 'data-analyst') {
      return {
        bonus: 15,
        rationale: 'Business economics and quantitative commerce skills align well with financial/business analytics.',
        directMatch: false,
      };
    }
    if (cid === 'marketing-manager' || cid === 'hr-specialist') {
      return {
        bonus: 18,
        rationale: 'Business administration, commerce, and consumer behavior principles from B.Com.',
        directMatch: true,
      };
    }
  }

  // 4. B.Sc
  if (normDegree === 'B.Sc') {
    if (cid === 'environmental-scientist' || cid === 'agricultural-scientist') {
      return {
        bonus: 25,
        rationale: 'Natural science laboratory methods, chemistry, and research training from B.Sc.',
        directMatch: true,
      };
    }
    if (cid === 'data-analyst' || cid === 'data-scientist') {
      return {
        bonus: 18,
        rationale: 'Mathematical rigor, statistics, and empirical research methodology from B.Sc degree.',
        directMatch: true,
      };
    }
    if (cid === 'pharmacist' || cid === 'physiotherapist' || cid === 'registered-nurse') {
      return {
        bonus: 20,
        rationale: 'Life sciences and biological systems foundation from B.Sc coursework.',
        directMatch: true,
      };
    }
  }

  // 5. BA / Humanities
  if (normDegree === 'BA / Humanities') {
    if (
      cid === 'civil-services-officer' ||
      cid === 'lawyer' ||
      cid === 'clinical-psychologist' ||
      cid === 'social-worker' ||
      cid === 'school-teacher'
    ) {
      return {
        bonus: 26,
        rationale: 'Critical inquiry, public administration, polity, and human development foundation from BA / Humanities.',
        directMatch: true,
      };
    }
    if (cid === 'graphic-designer' || cid === 'ux-designer') {
      return {
        bonus: 18,
        rationale: 'Visual culture, human psychology, and communications perspective from humanities studies.',
        directMatch: true,
      };
    }
  }

  // 6. Diploma
  if (normDegree === 'Diploma') {
    if (cid === 'automotive-technician' || cid === 'electrician') {
      return {
        bonus: 28,
        rationale: 'Direct vocational workshop and applied polytechnic diploma training.',
        directMatch: true,
      };
    }
    if (cid === 'civil-engineer' || cid === 'mechanical-engineer') {
      return {
        bonus: 18,
        rationale: 'Diploma provides accredited lateral-entry eligibility directly into second-year engineering.',
        directMatch: true,
      };
    }
  }

  // 7. Class 8–10 or Class 11–12
  if (normDegree === 'Class 8–10' || normDegree === 'Class 11–12') {
    if (career.applicable_stages?.includes(normDegree === 'Class 8–10' ? 'class_8_10' : 'class_11_12')) {
      return {
        bonus: 10,
        rationale: `Optimal exploratory stage: plenty of time to pursue prerequisite subject groups and entrance pathways.`,
        directMatch: true,
      };
    }
  }

  return { bonus: 0, rationale: null, directMatch: false };
}

export function scoreCareer(
  career: Career,
  profile: {
    education_stage: EducationStage;
    budget_tier: BudgetTier;
    relocation_willingness: RelocationWillingness;
    interests?: { label?: string; riasec?: string | null; strength?: number }[];
    aptitude_signals?: Record<string, number>;
    profile_completeness_pct?: number;
    academic_records_available?: boolean;
    current_stream?: string | null;
    degree?: string | null;
    engineering_branch?: string | null;
  },
  snapshot?: any,
): ScoredCareerPreview {
  const riasecAlignment = calculateRiasecAlignment(profile.interests || [], career.riasec_scores || {});
  const aptitudeSignalMatch = calculateAptitudeMatch(profile.aptitude_signals, career);
  let fitScore = 0.6 * riasecAlignment + 0.4 * aptitudeSignalMatch;

  const budgetRes = calculateBudgetCompatibility(profile.budget_tier, career.india_entry_routes || []);
  const relocationFit = calculateRelocationFit(profile.relocation_willingness, career.india_entry_routes || []);
  let stageEligibility = calculateStageEligibility(profile.education_stage, career.applicable_stages || []);

  // Incorporate Degree and Engineering Branch alignment into career scoring
  const academicMatch = calculateAcademicAlignment(
    career,
    profile.degree,
    profile.engineering_branch,
    profile.current_stream,
  );

  if (academicMatch.bonus > 0) {
    fitScore = Math.min(100, fitScore + academicMatch.bonus);
    if (academicMatch.directMatch) {
      stageEligibility = 100.0;
    }
  }

  const feasibilityScore = 0.45 * budgetRes.score + 0.35 * relocationFit + 0.2 * stageEligibility;

  const completeness = profile.profile_completeness_pct ?? 80;
  const recordsWeight = profile.academic_records_available ? 100.0 : 40.0;
  const evidenceQualityScore = 0.7 * completeness + 0.3 * recordsWeight;

  const compositeScore = Math.max(
    0,
    0.55 * fitScore + 0.45 * feasibilityScore - 0.1 * (100 - evidenceQualityScore),
  );

  const riskFactors: string[] = [];
  const compensatingFactors: string[] = [];

  if (academicMatch.rationale) {
    compensatingFactors.push(academicMatch.rationale);
  }

  if (!budgetRes.hasRouteUnderBudget) {
    riskFactors.push('Direct entry routes exceed current declared annual budget tier');
    compensatingFactors.push('National and state government scholarships can offset degree tuition');
  }
  if (relocationFit < 60) {
    riskFactors.push('Specialized training institutes may require travel outside home district');
  }
  if (stageEligibility < 70) {
    riskFactors.push('May require bridge certifications or entrance prerequisites');
  }
  if (fitScore >= 70) {
    compensatingFactors.push('High psychological RIASEC congruence with declared student interests');
  }
  if (aptitudeSignalMatch >= 70) {
    compensatingFactors.push('Strong alignment with reported subject aptitudes');
  }

  const breakdown: ScoreBreakdown = {
    riasec_alignment: Math.round(riasecAlignment * 10) / 10,
    aptitude_signal_match: Math.round(aptitudeSignalMatch * 10) / 10,
    fit_score: Math.round(fitScore * 10) / 10,
    budget_compatibility: Math.round(budgetRes.score * 10) / 10,
    relocation_fit: Math.round(relocationFit * 10) / 10,
    stage_eligibility: Math.round(stageEligibility * 10) / 10,
    feasibility_score: Math.round(feasibilityScore * 10) / 10,
    profile_completeness_pct: completeness,
    academic_records_weight: recordsWeight,
    evidence_quality_score: Math.round(evidenceQualityScore * 10) / 10,
    composite_score: Math.round(compositeScore * 10) / 10,
    fit_label: toFitLabel(fitScore),
    feasibility_label: toFeasibilityLabel(feasibilityScore),
    evidence_quality_label: toEvidenceQualityLabel(evidenceQualityScore),
    risk_factors: riskFactors,
    compensating_factors: compensatingFactors,
  };

  const primaryExam =
    career.india_entry_routes?.[0]?.entrance_exams?.[0] || null;

  return {
    career_id: career.id,
    onet_soc_code: career.onet_soc_code,
    title: career.title,
    cluster: career.cluster,
    description: career.description,
    job_zone: career.job_zone,
    work_reality_summary: career.work_reality_summary,
    fit_label: breakdown.fit_label,
    feasibility_label: breakdown.feasibility_label,
    evidence_quality_label: breakdown.evidence_quality_label,
    composite_score: breakdown.composite_score,
    rank: 1,
    score_breakdown: breakdown,
    cheapest_route_cost_inr: budgetRes.cheapestCost,
    primary_entrance_exam: primaryExam,
    demand_indicator: snapshot?.demand_indicator ?? null,
    salary_range_entry_inr: snapshot?.salary_range_entry_inr ?? null,
  };
}

export function rankAndFilterCareers(
  allCareers: Career[],
  profile: any,
  marketSnapshots: Record<string, any>,
  _minCount = 3,
  maxCount = 5,
): ScoredCareerPreview[] {
  const scored = allCareers.map((c) =>
    scoreCareer(c, profile, marketSnapshots[c.id]),
  );

  // Sort descending by composite score
  scored.sort((a, b) => b.composite_score - a.composite_score);

  // Take top 3-5
  const top = scored.slice(0, maxCount).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  return top;
}
