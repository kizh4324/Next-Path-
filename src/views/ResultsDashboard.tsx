/** Career Explorer / Career Discovery experience (Redesigned Recommendation Page). */

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Compass,
  Cpu,
  FlaskConical,
  Hammer,
  HeartHandshake,
  Layers,
  Lightbulb,
  Palette,
  Scale,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

import { Button, Callout, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  useEvaluate,
  useProfile,
  useProfileStatus,
  useRecommendations,
  useSelectPathways,
} from '@/hooks/useRecommendations';
import { ApiError } from '@/services/api_client';

// 8 Core Selectable Interests
interface InterestOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Hammer;
}

const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'building_things',
    label: 'Building things',
    description: 'Crafting software, structural tools, models or physical systems.',
    icon: Hammer,
  },
  {
    id: 'solving_problems',
    label: 'Solving problems',
    description: 'Tackling complex logic puzzles, algorithm challenges and analytical hurdles.',
    icon: Lightbulb,
  },
  {
    id: 'creating_designs',
    label: 'Creating designs',
    description: 'Developing visual aesthetics, media, user interfaces and aesthetic spaces.',
    icon: Palette,
  },
  {
    id: 'working_with_people',
    label: 'Working with people',
    description: 'Communicating, mentoring, advising, counseling and collaborative teamwork.',
    icon: Users,
  },
  {
    id: 'analysing_data',
    label: 'Analysing data',
    description: 'Discovering patterns, statistics, economic trends and financial numbers.',
    icon: BarChart3,
  },
  {
    id: 'discovering_how_things_work',
    label: 'Discovering how things work',
    description: 'Exploring scientific principles, laboratory experiments and natural laws.',
    icon: Compass,
  },
  {
    id: 'leading_a_team',
    label: 'Leading a team',
    description: 'Organizing projects, making strategic decisions and guiding group initiatives.',
    icon: Award,
  },
  {
    id: 'helping_others',
    label: 'Helping others',
    description: 'Advancing healthcare, psychological wellness, education and public community good.',
    icon: HeartHandshake,
  },
];

interface CareerItem {
  id: string;
  title: string;
  summary: string;
  typicalEducation: string;
  applicableStages?: string[];
  keyStrengths?: string[];
}

interface CareerCategory {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: typeof Cpu;
  interestAffinities: string[];
  streamAffinities: string[];
  careers: CareerItem[];
}

const CAREER_CATEGORIES: CareerCategory[] = [
  {
    id: 'tech_ai',
    title: 'Technology & AI',
    tagline: 'Build, code and solve real-world problems.',
    description:
      'Design cutting-edge software, intelligent artificial intelligence models, and modern digital architectures.',
    icon: Cpu,
    interestAffinities: ['building_things', 'solving_problems', 'analysing_data'],
    streamAffinities: ['science_pcm', 'science_pcmb', 'vocational'],
    careers: [
      {
        id: 'software-developer',
        title: 'Software Developer',
        summary: 'Architect scalable web, cloud, and mobile software applications.',
        typicalEducation: 'B.Tech / B.E in CS / BCA / MCA',
        keyStrengths: ['Programming', 'System Architecture', 'Logic'],
      },
      {
        id: 'information-security-analyst',
        title: 'AI & Security Systems Engineer',
        summary: 'Train machine learning models and safeguard critical infrastructure pipelines.',
        typicalEducation: 'B.Tech in AI/Data Science / Cyber Security',
        keyStrengths: ['Machine Learning', 'Network Security', 'Python'],
      },
      {
        id: 'data-scientist',
        title: 'Data Scientist',
        summary: 'Extract predictive insights and build statistical machine learning algorithms.',
        typicalEducation: 'B.Tech / B.Sc in Math / Statistics / CS',
        keyStrengths: ['Statistical Modeling', 'Python / R', 'Data Mining'],
      },
      {
        id: 'data-analyst',
        title: 'Data Analyst',
        summary: 'Translate raw business datasets into executive dashboards and operational decisions.',
        typicalEducation: 'B.Sc in IT / B.Com / BCA',
        keyStrengths: ['SQL', 'Data Visualization', 'Business Analytics'],
      },
    ],
  },
  {
    id: 'science_research',
    title: 'Science & Research',
    tagline: 'Investigate nature, conduct experiments and expand knowledge.',
    description:
      'Explore scientific boundaries, biological phenomena, agricultural ecology and environmental conservation.',
    icon: FlaskConical,
    interestAffinities: ['discovering_how_things_work', 'solving_problems', 'analysing_data'],
    streamAffinities: ['science_pcb', 'science_pcmb', 'science_pcm'],
    careers: [
      {
        id: 'environmental-scientist',
        title: 'Environmental Scientist',
        summary: 'Research ecosystem resilience, pollution abatement and climate mitigation strategies.',
        typicalEducation: 'B.Sc / M.Sc in Environmental Science / Ecology',
        keyStrengths: ['Field Research', 'Ecology', 'Data Collection'],
      },
      {
        id: 'agricultural-scientist',
        title: 'Agricultural Scientist / Agronomist',
        summary: 'Advance crop breeding yield, soil biochemistry and sustainable food agriculture.',
        typicalEducation: 'B.Sc (Hons) in Agriculture / Agronomy',
        keyStrengths: ['Agronomy', 'Soil Testing', 'Crop Science'],
      },
      {
        id: 'clinical-psychologist',
        title: 'Research & Behavioral Scientist',
        summary: 'Investigate human cognition, mental health behaviors and empirical therapies.',
        typicalEducation: 'BA / B.Sc in Psychology followed by M.Sc / M.Phil',
        keyStrengths: ['Behavioral Analysis', 'Research Methodology', 'Diagnostics'],
      },
    ],
  },
  {
    id: 'design_product',
    title: 'Design & Product',
    tagline: 'Craft intuitive visual experiences, spaces and physical products.',
    description:
      'Shape how humans interact with technology, physical spaces, editorial communications and products.',
    icon: Palette,
    interestAffinities: ['creating_designs', 'building_things', 'solving_problems'],
    streamAffinities: ['arts_humanities', 'commerce', 'science_pcm', 'vocational'],
    careers: [
      {
        id: 'ux-designer',
        title: 'UX / Product Designer',
        summary: 'Design intuitive digital customer journeys, interactive wireframes and design systems.',
        typicalEducation: 'B.Des / NID / Self-taught Portfolio',
        keyStrengths: ['Design Thinking', 'Wireframing (Figma)', 'User Testing'],
      },
      {
        id: 'architect',
        title: 'Architect',
        summary: 'Conceive and draft functional buildings, spatial layouts and sustainable urban spaces.',
        typicalEducation: 'B.Arch via NATA / JEE Main Paper 2',
        keyStrengths: ['Spatial Reasoning', 'CAD / BIM', 'Structural Design'],
      },
      {
        id: 'graphic-designer',
        title: 'Graphic Designer',
        summary: 'Produce brand visual identities, typography systems, marketing collateral and digital media.',
        typicalEducation: 'B.Des / BFA in Applied Art',
        keyStrengths: ['Typography', 'Brand Identity', 'Visual Layout'],
      },
    ],
  },
  {
    id: 'business_management',
    title: 'Business & Management',
    tagline: 'Lead teams, build ventures and navigate modern markets.',
    description:
      'Drive organizational leadership, fiscal governance, brand marketing and human capital growth.',
    icon: Briefcase,
    interestAffinities: ['leading_a_team', 'working_with_people', 'analysing_data'],
    streamAffinities: ['commerce', 'arts_humanities', 'science_pcm'],
    careers: [
      {
        id: 'marketing-manager',
        title: 'Marketing Manager',
        summary: 'Orchestrate brand outreach, audience growth strategies and digital market acquisition.',
        typicalEducation: 'BBA / B.Com followed by MBA',
        keyStrengths: ['Strategic Growth', 'Campaign Strategy', 'Market Research'],
      },
      {
        id: 'financial-analyst',
        title: 'Financial Analyst',
        summary: 'Evaluate corporate investments, equity valuation, capital budgeting and market risk.',
        typicalEducation: 'B.Com / BBA (Finance) / CFA / MBA',
        keyStrengths: ['Financial Modeling', 'Valuation', 'Risk Analysis'],
      },
      {
        id: 'chartered-accountant',
        title: 'Chartered Accountant',
        summary: 'Direct statutory corporate audits, corporate taxation, compliance and fiscal controllership.',
        typicalEducation: 'ICAI CA Certification (Foundation -> Inter -> Final)',
        keyStrengths: ['Taxation', 'Financial Auditing', 'Corporate Law'],
      },
      {
        id: 'hr-specialist',
        title: 'Human Resources Specialist',
        summary: 'Recruit top tier talent, foster workplace culture, and build organizational learning programs.',
        typicalEducation: 'BA / BBA / MBA in Human Resources',
        keyStrengths: ['People Management', 'Conflict Resolution', 'Talent Ops'],
      },
      {
        id: 'banking-financial-manager',
        title: 'Banking Officer / Wealth Manager',
        summary: 'Manage credit portfolios, retail wealth products and branch operations.',
        typicalEducation: 'B.Com / BBA / IBPS PO Exam',
        keyStrengths: ['Credit Appraisal', 'Client Advisory', 'Banking Systems'],
      },
    ],
  },
  {
    id: 'healthcare_life',
    title: 'Healthcare & Life Sciences',
    tagline: 'Heal lives, improve patient care and advance clinical wellbeing.',
    description:
      'Provide essential clinical medicine, therapeutic interventions, pharmaceuticals, and patient care.',
    icon: Stethoscope,
    interestAffinities: ['helping_others', 'working_with_people', 'discovering_how_things_work'],
    streamAffinities: ['science_pcb', 'science_pcmb'],
    careers: [
      {
        id: 'physician-mbbs',
        title: 'Doctor (MBBS Physician)',
        summary: 'Diagnose medical conditions, prescribe clinical therapies and save lives.',
        typicalEducation: 'MBBS via NEET-UG followed by MD/MS',
        keyStrengths: ['Clinical Diagnosis', 'Patient Compassion', 'Emergency Care'],
      },
      {
        id: 'pharmacist',
        title: 'Pharmacist',
        summary: 'Formulate and dispense therapeutic drugs, verify dosages and counsel patients on safe medication.',
        typicalEducation: 'B.Pharm / Pharm.D via State Entrance',
        keyStrengths: ['Pharmacology', 'Dosage Calculation', 'Drug Safety'],
      },
      {
        id: 'physiotherapist',
        title: 'Physiotherapist',
        summary: 'Rehabilitate musculoskeletal injuries and restore physical movement through active exercise therapies.',
        typicalEducation: 'BPT (Bachelor of Physiotherapy)',
        keyStrengths: ['Kinesiology', 'Physical Rehab', 'Ergonomics'],
      },
      {
        id: 'registered-nurse',
        title: 'Nurse (B.Sc Nursing)',
        summary: 'Deliver bedside clinical care, monitor patient vitals and assist in surgical operating theaters.',
        typicalEducation: 'B.Sc Nursing via Nursing Entrance',
        keyStrengths: ['Critical Care', 'Patient Advocacy', 'Medical Procedures'],
      },
    ],
  },
  {
    id: 'engineering_trades',
    title: 'Engineering & Applied Systems',
    tagline: 'Master hands-on technical systems, infrastructure and precision engineering.',
    description:
      'Construct civil works, energy distribution grids, automotive drivetrains and mechanical machinery.',
    icon: Layers,
    interestAffinities: ['building_things', 'discovering_how_things_work', 'solving_problems'],
    streamAffinities: ['science_pcm', 'vocational'],
    careers: [
      {
        id: 'mechanical-engineer',
        title: 'Mechanical Engineer',
        summary: 'Design thermal, fluid, robotic and precision mechanical propulsion machines.',
        typicalEducation: 'B.Tech / B.E in Mechanical Engineering',
        keyStrengths: ['Thermodynamics', 'Machine Design', 'Robotics'],
      },
      {
        id: 'civil-engineer',
        title: 'Civil Engineer',
        summary: 'Supervise construction of bridges, transit corridors, tunnels and structural foundations.',
        typicalEducation: 'B.Tech / B.E in Civil Engineering',
        keyStrengths: ['Structural Analysis', 'Surveying', 'Project Management'],
      },
      {
        id: 'automotive-technician',
        title: 'Automotive Service Technician',
        summary: 'Diagnose and calibrate modern electric and internal combustion automotive control modules.',
        typicalEducation: 'Diploma in Automotive Engineering / ITI Certification',
        keyStrengths: ['Electronic Diagnostics', 'Engine Systems', 'Troubleshooting'],
      },
      {
        id: 'electrician',
        title: 'Electrical Systems Specialist',
        summary: 'Deploy industrial energy distribution lines, transformer controls and high-voltage panels.',
        typicalEducation: 'ITI Electrician / Diploma in Electrical Engineering',
        keyStrengths: ['Circuit Blueprinting', 'Grid Wiring', 'Industrial Safety'],
      },
    ],
  },
  {
    id: 'law_public_service',
    title: 'Law & Public Service',
    tagline: 'Advocate justice, serve communities and shape public policy.',
    description:
      'Uphold constitutional governance, provide legal counsel, and direct municipal and state administrations.',
    icon: Scale,
    interestAffinities: ['leading_a_team', 'helping_others', 'working_with_people', 'solving_problems'],
    streamAffinities: ['arts_humanities', 'commerce', 'science_pcm', 'science_pcb'],
    careers: [
      {
        id: 'lawyer',
        title: 'Lawyer / Advocate',
        summary: 'Represent individuals and organizations in dispute resolution, court litigation and contract advisory.',
        typicalEducation: 'BA-LLB (5-year integrated via CLAT) or 3-year LLB',
        keyStrengths: ['Legal Reasoning', 'Oral Advocacy', 'Case Law Research'],
      },
      {
        id: 'civil-services-officer',
        title: 'Civil Services Officer (IAS / IPS / State Services)',
        summary: 'Direct public administration, execute social development schemes and uphold public order.',
        typicalEducation: 'Graduation in any discipline + UPSC Civil Services Exam',
        keyStrengths: ['Public Policy', 'Crisis Management', 'Administrative Leadership'],
      },
    ],
  },
  {
    id: 'education_social',
    title: 'Education & Social Impact',
    tagline: 'Empower learners, support mental health and drive social change.',
    description:
      'Educate future generations, counsel individuals through life challenges, and advocate community welfare.',
    icon: BookOpen,
    interestAffinities: ['helping_others', 'working_with_people'],
    streamAffinities: ['arts_humanities', 'science_pcb', 'commerce'],
    careers: [
      {
        id: 'school-teacher',
        title: 'School Teacher / Educator',
        summary: 'Teach core curricula, design active learning lesson plans and guide formative intellectual growth.',
        typicalEducation: 'B.Ed along with B.A / B.Sc + CTET Qualification',
        keyStrengths: ['Pedagogy', 'Subject Mastery', 'Student Mentorship'],
      },
      {
        id: 'social-worker',
        title: 'Social Worker / Development Professional',
        summary: 'Direct grassroots community development, child welfare services and crisis outreach initiatives.',
        typicalEducation: 'BSW / MSW (Master of Social Work)',
        keyStrengths: ['Community Outreach', 'Welfare Administration', 'Counseling'],
      },
      {
        id: 'clinical-psychologist',
        title: 'Clinical Psychologist',
        summary: 'Deliver psychological counseling, cognitive assessment and therapeutic rehabilitation.',
        typicalEducation: 'BA / B.Sc in Psychology + M.Phil in Clinical Psychology (RCI approved)',
        keyStrengths: ['Psychotherapy', 'Cognitive Assessment', 'Empathy'],
      },
    ],
  },
];

export function ResultsDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const hasCompletedLocal =
    typeof window !== 'undefined' && window.localStorage.getItem('onboarding_completed') === 'true';
  const { data: status, isLoading: statusLoading } = useProfileStatus();
  const canGenerate = Boolean(status?.can_generate_recommendations || hasCompletedLocal);
  const { data: batch, isLoading } = useRecommendations(canGenerate);
  const evaluate = useEvaluate();
  const selectPathways = useSelectPathways();

  const [primary, setPrimary] = useState<string | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeCategoryModal, setActiveCategoryModal] = useState<CareerCategory | null>(null);

  let localDraft: any = null;
  try {
    if (typeof window !== 'undefined') {
      localDraft = JSON.parse(window.localStorage.getItem('nextpath_onboarding_draft') || '{}');
    }
  } catch {
    // Ignore storage parse errors
  }

  // Dynamic student name (strictly user's actual registered name or local profile name)
  const studentName =
    user?.full_name?.trim() ||
    localDraft?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Student';

  const studentInitials =
    studentName
      .split(' ')
      .filter(Boolean)
      .map((part: string) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'S';

  // Dynamic actual class
  const studentClass =
    profile?.grade_or_year?.trim() ||
    localDraft?.grade_or_year?.trim() ||
    (profile?.education_stage === 'class_8_10' || localDraft?.education_stage === 'class_8_10'
      ? 'Class 10'
      : profile?.education_stage === 'class_11_12' || localDraft?.education_stage === 'class_11_12'
        ? 'Class 11'
        : profile?.education_stage === 'early_college' || localDraft?.education_stage === 'early_college'
          ? 'Early College'
          : '');

  // Dynamic actual stream / subjects
  const streamRaw =
    profile?.current_stream?.trim() ||
    localDraft?.current_stream?.trim() ||
    profile?.degree?.trim() ||
    localDraft?.degree?.trim() ||
    '';
  const branchRaw =
    profile?.engineering_branch?.trim() ||
    localDraft?.engineering_branch?.trim() ||
    '';

  let streamSubjects = '';
  if (streamRaw && branchRaw && !streamRaw.includes(branchRaw)) {
    streamSubjects = `${streamRaw} (${branchRaw})`;
  } else if (streamRaw) {
    streamSubjects = streamRaw;
  } else if ((profile?.education_stage || localDraft?.education_stage) === 'class_8_10') {
    streamSubjects = 'General';
  }

  const studentAcademicLine = [studentClass, streamSubjects].filter(Boolean).join(' • ');

  // Intelligently pre-populate initial interests from student's profile/onboarding data
  const initialSelectedInterests = useMemo(() => {
    const rawKeywords = [
      ...(profile?.interests?.map((i) => i.label) || []),
      ...(Array.isArray(localDraft?.interest_keywords) ? localDraft.interest_keywords : []),
      ...(Array.isArray(localDraft?.interests) ? localDraft.interests : []),
    ]
      .join(' ')
      .toLowerCase();

    const selected = new Set<string>();
    const currentStream = (profile?.current_stream || localDraft?.current_stream || '').toLowerCase();
    const stage = profile?.education_stage || localDraft?.education_stage;

    // Detect from explicit keywords
    if (
      rawKeywords.includes('code') ||
      rawKeywords.includes('tech') ||
      rawKeywords.includes('robot') ||
      rawKeywords.includes('build')
    ) {
      selected.add('building_things');
    }
    if (
      rawKeywords.includes('solve') ||
      rawKeywords.includes('math') ||
      rawKeywords.includes('logic') ||
      rawKeywords.includes('puzzle')
    ) {
      selected.add('solving_problems');
    }
    if (
      rawKeywords.includes('design') ||
      rawKeywords.includes('art') ||
      rawKeywords.includes('ui') ||
      rawKeywords.includes('ux') ||
      rawKeywords.includes('creative')
    ) {
      selected.add('creating_designs');
    }
    if (
      rawKeywords.includes('people') ||
      rawKeywords.includes('talk') ||
      rawKeywords.includes('teach') ||
      rawKeywords.includes('mentor')
    ) {
      selected.add('working_with_people');
    }
    if (
      rawKeywords.includes('data') ||
      rawKeywords.includes('finance') ||
      rawKeywords.includes('stock') ||
      rawKeywords.includes('analy')
    ) {
      selected.add('analysing_data');
    }
    if (
      rawKeywords.includes('science') ||
      rawKeywords.includes('physics') ||
      rawKeywords.includes('biology') ||
      rawKeywords.includes('experiment')
    ) {
      selected.add('discovering_how_things_work');
    }
    if (
      rawKeywords.includes('lead') ||
      rawKeywords.includes('manage') ||
      rawKeywords.includes('business') ||
      rawKeywords.includes('entrepreneur')
    ) {
      selected.add('leading_a_team');
    }
    if (
      rawKeywords.includes('help') ||
      rawKeywords.includes('medic') ||
      rawKeywords.includes('health') ||
      rawKeywords.includes('doctor') ||
      rawKeywords.includes('nurse') ||
      rawKeywords.includes('social')
    ) {
      selected.add('helping_others');
    }

    // If still empty or minimal, seed sensibly based on stream/stage
    if (selected.size === 0) {
      if (currentStream.includes('pcm')) {
        selected.add('building_things');
        selected.add('solving_problems');
      } else if (currentStream.includes('pcb')) {
        selected.add('helping_others');
        selected.add('discovering_how_things_work');
      } else if (currentStream.includes('commerce')) {
        selected.add('analysing_data');
        selected.add('leading_a_team');
      } else if (currentStream.includes('arts') || currentStream.includes('humanities')) {
        selected.add('creating_designs');
        selected.add('working_with_people');
      } else if (stage === 'class_8_10') {
        selected.add('building_things');
        selected.add('solving_problems');
      } else {
        selected.add('solving_problems');
        selected.add('working_with_people');
      }
    }

    return Array.from(selected);
  }, [profile, localDraft]);

  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialSelectedInterests);

  // Sync initial interests when profile data loads if user hasn't toggled yet
  useEffect(() => {
    if (initialSelectedInterests.length > 0 && selectedInterests.length === 0) {
      setSelectedInterests(initialSelectedInterests);
    }
  }, [initialSelectedInterests, selectedInterests.length]);

  // If recommendations have not yet been evaluated, evaluate once profile exists
  useEffect(() => {
    if (
      (status?.profile_exists || hasCompletedLocal) &&
      !batch &&
      !isLoading &&
      !evaluate.isPending &&
      !evaluate.data
    ) {
      evaluate.mutate();
    }
  }, [status?.profile_exists, hasCompletedLocal, batch, isLoading, evaluate]);

  // Toggle interest cards
  function toggleInterest(interestId: string) {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  }

  // DYNAMIC RECOMMENDATION RANKING ENGINE
  // Uses student's stream, stage, subjects, selected interests, and backend recommendations
  const rankedCategories = useMemo(() => {
    const studentStream = (profile?.current_stream || localDraft?.current_stream || '').toLowerCase();
    const studentStage = profile?.education_stage || localDraft?.education_stage;
    const existingRecCareerIds = new Set(batch?.recommendations?.map((r) => r.career_id) || []);

    return CAREER_CATEGORIES.map((cat) => {
      let score = 10; // base score

      // 1. Stream match
      if (cat.streamAffinities.some((s) => studentStream.includes(s) || s.includes(studentStream))) {
        score += 35;
      }

      // 2. Selected Interests match
      const matchingInterests = cat.interestAffinities.filter((affinity) =>
        selectedInterests.includes(affinity),
      );
      score += matchingInterests.length * 20;

      // 3. Backend evaluated recommendations presence boost
      const hasDirectRecs = cat.careers.some((c) => existingRecCareerIds.has(c.id));
      if (hasDirectRecs) {
        score += 25;
      }

      // 4. Stage compatibility
      if (studentStage === 'class_8_10') {
        // High encouragement for exploration
        score += 15;
      }

      // Generate dynamic alignment label
      let matchLabel = 'Exploration Pathway';
      let matchTone: 'top' | 'aligned' | 'general' = 'general';

      if (score >= 65) {
        matchLabel = 'Top Direction For You';
        matchTone = 'top';
      } else if (score >= 40) {
        matchLabel = 'Aligned with Your Interests';
        matchTone = 'aligned';
      }

      // Re-order careers inside the category so careers appearing in batch recommendations or interest matches appear first
      const prioritizedCareers = [...cat.careers].sort((a, b) => {
        const aInBatch = existingRecCareerIds.has(a.id) ? 1 : 0;
        const bInBatch = existingRecCareerIds.has(b.id) ? 1 : 0;
        return bInBatch - aInBatch;
      });

      return {
        ...cat,
        score,
        matchLabel,
        matchTone,
        careers: prioritizedCareers,
      };
    }).sort((a, b) => b.score - a.score);
  }, [profile, localDraft, selectedInterests, batch]);

  async function commitRoadmap(): Promise<void> {
    if (!primary) return;
    setSubmitError(null);
    try {
      await selectPathways.mutateAsync({ primary, backup });
      navigate('/roadmap');
    } catch (caught) {
      setSubmitError(
        caught instanceof ApiError ? caught.message : 'We could not save your choice.',
      );
    }
  }

  // Find career titles for display
  const primaryCareerTitle = useMemo(() => {
    if (!primary) return null;
    for (const cat of CAREER_CATEGORIES) {
      const found = cat.careers.find((c) => c.id === primary);
      if (found) return found.title;
    }
    const fromBatch = batch?.recommendations?.find((r) => r.career_id === primary);
    return fromBatch?.career_title || primary;
  }, [primary, batch]);

  const backupCareerTitle = useMemo(() => {
    if (!backup) return null;
    for (const cat of CAREER_CATEGORIES) {
      const found = cat.careers.find((c) => c.id === backup);
      if (found) return found.title;
    }
    const fromBatch = batch?.recommendations?.find((r) => r.career_id === backup);
    return fromBatch?.career_title || backup;
  }, [backup, batch]);

  if (statusLoading || (hasCompletedLocal && !status?.profile_exists)) {
    return (
      <div className="grid gap-md md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!status?.profile_exists && !hasCompletedLocal) {
    return <Navigate to="/onboarding" replace />;
  }

  if (status && !status.can_generate_recommendations && !hasCompletedLocal) {
    return (
      <EmptyState
        title="One more step"
        description={status.blocking_reason ?? 'Finish your profile to discover your career directions.'}
        action={<Button onClick={() => navigate('/onboarding')}>Continue my profile</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16 antialiased">
      {/* Student Profile Identity Card */}
      <section
        aria-label="Student profile summary"
        className="rounded-xl border border-hairline/90 bg-surface p-4 sm:p-5 shadow-xs transition-shadow"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-base font-bold text-primary shadow-xs"
            >
              {studentInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-ink">{studentName}</h2>
                <span className="inline-flex items-center rounded-full bg-[#f4f3f0] border border-hairline px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                  Student
                </span>
              </div>
              {studentAcademicLine ? (
                <p className="text-xs sm:text-sm font-medium text-ink-secondary mt-0.5">
                  {studentAcademicLine}
                </p>
              ) : null}
            </div>
          </div>

          {/* Quick Hub Navigation to Student Features */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => navigate('/roadmap')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => navigate('/scholarships')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Scholarships
            </button>
            <button
              type="button"
              onClick={() => navigate('/progress')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f4f3f0] hover:bg-[#eae8e3] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Progress
            </button>
          </div>
        </div>
      </section>

      {/* Primary Page Header */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Explore Careers That Fit You
        </h1>
        <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-3xl">
          Discover career directions based on your interests, strengths and profile.
        </p>
      </header>

      {/* SECTION 1: WHAT SOUNDS LIKE YOU? (Selectable Interest Cards) */}
      <section className="flex flex-col gap-3.5" aria-labelledby="interest-section-title">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h2 id="interest-section-title" className="text-lg sm:text-xl font-bold text-ink">
            What sounds like you?
          </h2>
          <span className="text-xs text-ink-muted font-medium">
            Select one or more to personalize your career directions in real time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INTEREST_OPTIONS.map((item) => {
            const isSelected = selectedInterests.includes(item.id);
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`relative flex flex-col text-left p-4 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  isSelected
                    ? 'border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary'
                    : 'border-hairline bg-surface hover:border-ink-faint/50 hover:bg-[#faf9f8]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      isSelected ? 'bg-primary text-white' : 'bg-[#f4f3f0] text-ink-secondary'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-ink leading-snug">{item.label}</span>
                <span className="text-xs text-ink-muted mt-1 leading-normal line-clamp-2">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: YOUR CAREER DIRECTIONS (Dynamic Career Category Cards) */}
      <section className="flex flex-col gap-4" aria-labelledby="career-directions-title">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <div>
            <h2 id="career-directions-title" className="text-lg sm:text-xl font-bold text-ink">
              Your Career Directions
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Ranked dynamically by your background ({studentAcademicLine || 'Profile'}) and selected interests.
            </p>
          </div>
          {selectedInterests.length > 0 && (
            <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5" />
              Tailored to {selectedInterests.length} selected interest{selectedInterests.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rankedCategories.map((category) => {
            const Icon = category.icon;
            const isTop = category.matchTone === 'top';
            return (
              <article
                key={category.id}
                className="flex flex-col justify-between rounded-xl border border-hairline bg-surface p-5 transition-shadow hover:shadow-sm"
              >
                <div>
                  {/* Category Header with Match Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-ink leading-tight">
                          {category.title}
                        </h3>
                        <span className="text-xs font-medium text-ink-muted block mt-0.5">
                          {category.tagline}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isTop
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-[#f4f3f0] border-hairline text-ink-secondary'
                      }`}
                    >
                      {category.matchLabel}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed mb-4">
                    {category.description}
                  </p>

                  {/* Careers in this category */}
                  <div className="rounded-lg bg-[#f8f7f5] border border-hairline/70 p-3 mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                      Careers to Explore:
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {category.careers.slice(0, 3).map((career) => {
                        const isChosenPrimary = primary === career.id;
                        const isChosenBackup = backup === career.id;
                        return (
                          <li
                            key={career.id}
                            className="flex items-center justify-between text-xs sm:text-sm text-ink"
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <Link
                                to={`/careers/${career.id}`}
                                className="hover:text-primary hover:underline"
                              >
                                {career.title}
                              </Link>
                            </span>
                            {isChosenPrimary ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-white">
                                Primary
                              </span>
                            ) : isChosenBackup ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#31302e] text-white">
                                Backup
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {/* Card Action: Explore Careers */}
                <div className="pt-2 border-t border-hairline/70 flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-muted font-medium">
                    {category.careers.length} related pathways
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveCategoryModal(category)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-[#005bab] text-white px-4 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <span>Explore Careers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: ROADMAP DIRECTION SELECTOR (Build My Roadmap) */}
      <Card className="flex flex-col gap-4 border border-hairline rounded-xl bg-surface p-5 sm:p-6 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-ink">Choose a Direction</h2>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Pick a primary path and an optional backup to personalize your action roadmap. You can revisit and adjust this anytime.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-hairline bg-[#faf9f8] p-3.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Primary Career Pathway
            </dt>
            <dd className="text-sm font-semibold text-ink mt-1">
              {primaryCareerTitle ? (
                <span className="text-primary flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {primaryCareerTitle}
                </span>
              ) : (
                <span className="text-ink-muted font-normal">
                  Tap &quot;Explore Careers&quot; above to select your primary path
                </span>
              )}
            </dd>
          </div>

          <div className="rounded-xl border border-hairline bg-[#faf9f8] p-3.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Backup Career Pathway (Optional)
            </dt>
            <dd className="text-sm font-semibold text-ink mt-1">
              {backupCareerTitle ? (
                <span className="text-ink flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-ink-secondary" />
                  {backupCareerTitle}
                </span>
              ) : (
                <span className="text-ink-muted font-normal">Optional realistic backup</span>
              )}
            </dd>
          </div>
        </dl>

        {submitError && <Callout variant="error">{submitError}</Callout>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={() => void commitRoadmap()}
            disabled={!primary || selectPathways.isPending}
            loading={selectPathways.isPending}
            className="rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Build my roadmap
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/onboarding')}
            className="text-xs font-semibold text-ink-secondary hover:text-ink"
          >
            Update onboarding responses
          </Button>
        </div>
      </Card>

      {/* EXPLORE CAREERS MODAL */}
      {activeCategoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
        >
          <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl bg-surface border border-hairline shadow-level-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-hairline bg-[#faf9f8]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <activeCategoryModal.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink leading-tight">
                    {activeCategoryModal.title}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {activeCategoryModal.tagline}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategoryModal(null)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-[#ece9e4] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Career list */}
            <div className="p-5 overflow-y-auto flex flex-col gap-3.5">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Select a pathway to set as your primary or backup direction:
              </span>

              {activeCategoryModal.careers.map((career) => {
                const isPrimary = primary === career.id;
                const isBackup = backup === career.id;

                return (
                  <div
                    key={career.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col gap-2.5 ${
                      isPrimary
                        ? 'border-primary bg-primary/[0.03] ring-1 ring-primary'
                        : isBackup
                          ? 'border-ink-secondary/50 bg-[#f8f7f5]'
                          : 'border-hairline bg-surface hover:border-ink-faint/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-ink">{career.title}</h4>
                        {isPrimary && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-white">
                            Primary Path
                          </span>
                        )}
                        {isBackup && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#31302e] text-white">
                            Backup Path
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/careers/${career.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline self-start sm:self-auto"
                      >
                        <span>View full profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                      {career.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span className="font-semibold text-ink-secondary">Typical Route:</span>
                      <span>{career.typicalEducation}</span>
                    </div>

                    {career.keyStrengths && career.keyStrengths.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-ink-muted font-medium mr-1">Skills:</span>
                        {career.keyStrengths.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f4f3f0] border border-hairline text-[11px] text-ink-secondary font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Choose Primary / Backup Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (isPrimary) {
                            setPrimary(null);
                          } else {
                            if (backup === career.id) setBackup(null);
                            setPrimary(career.id);
                          }
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isPrimary
                            ? 'bg-primary text-white'
                            : 'bg-[#f4f3f0] hover:bg-[#eae8e3] text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {isPrimary ? 'Chosen as Primary' : 'Set as Primary Path'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isBackup) {
                            setBackup(null);
                          } else {
                            if (primary === career.id) setPrimary(null);
                            setBackup(career.id);
                          }
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isBackup
                            ? 'bg-[#31302e] text-white'
                            : 'bg-[#f4f3f0] hover:bg-[#eae8e3] text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {isBackup ? 'Chosen as Backup' : 'Set as Backup Path'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-hairline bg-[#faf9f8]">
              <span className="text-xs text-ink-muted">
                {primary ? `Primary path: ${primaryCareerTitle}` : 'No primary path selected'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setActiveCategoryModal(null)} className="text-xs">
                  Done
                </Button>
                {primary && (
                  <Button
                    onClick={() => {
                      setActiveCategoryModal(null);
                      void commitRoadmap();
                    }}
                    className="rounded-full text-xs font-semibold"
                  >
                    Build my roadmap
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
