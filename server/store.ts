import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'nextpath_super_secret_jwt_key_2026';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'student' | 'guardian' | 'counselor' | 'admin';
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  linked_student_id?: string | null;
}

export interface InterestEntry {
  label: string;
  riasec: 'R' | 'I' | 'A' | 'S' | 'E' | 'C' | null;
  strength: number;
}

export interface GuardianContext {
  id: string;
  student_id: string;
  guardian_name: string | null;
  relationship_to_student: string;
  guardian_priorities: string[];
  financial_ceiling_inr: number | null;
  relocation_restriction: 'home_district_only' | 'within_state' | 'anywhere_in_india' | 'abroad';
  notes_and_concerns: string | null;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  education_stage: 'class_8_10' | 'class_11_12' | 'early_college';
  grade_or_year: string;
  current_stream: string | null;
  degree?: string | null;
  engineering_branch?: string | null;
  interests: InterestEntry[];
  aptitude_signals: Record<string, number>;
  work_style_preferences: Record<string, string>;
  budget_tier: 'low_cost_only' | 'moderate_up_to_2_lakhs' | 'flexible_above_2_lakhs';
  relocation_willingness: 'home_district_only' | 'within_state' | 'anywhere_in_india' | 'abroad';
  preferred_languages: string[];
  consent_type: 'guardian_consent_minor' | 'self_consent_adult';
  consent_given_by: string | null;
  consent_recorded_at: string;
  academic_records_available: boolean;
  profile_completeness_pct: number;
  created_at: string;
  updated_at: string;
  guardian_contexts: GuardianContext[];
}

export interface Escalation {
  id: string;
  student_id: string;
  student_name: string;
  trigger_reason: string;
  student_note: string | null;
  status: 'pending' | 'under_review' | 'session_scheduled' | 'resolved' | 'overridden';
  counselor_id: string | null;
  counselor_notes: string | null;
  counselor_override_decision: string | null;
  counselor_override_rationale: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ProjectSubmission {
  id: string;
  student_id: string;
  project_id: string;
  repository_or_live_url: string;
  reflection_notes: string | null;
  submitted_at: string;
}

class InMemoryStore {
  users: Map<string, User> = new Map();
  profiles: Map<string, StudentProfile> = new Map(); // key: user_id
  recommendations: Map<string, any[]> = new Map(); // key: user_id
  roadmaps: Map<string, any> = new Map(); // key: user_id
  escalations: Map<string, Escalation> = new Map(); // key: escalation_id
  projectSubmissions: Map<string, ProjectSubmission[]> = new Map(); // key: user_id

  constructor() {
    this.seedDefaults();
  }

  getUserById(id: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return undefined;
  }

  private seedDefaults() {
    const studentUser: User = {
      id: 'usr-student-demo-1',
      email: 'student@nextpath.in',
      password_hash: 'student123',
      full_name: 'Aarav Sharma',
      role: 'student',
      phone_number: '+91 98765 43210',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const parentUser: User = {
      id: 'usr-guardian-demo-1',
      email: 'parent@nextpath.in',
      password_hash: 'parent123',
      full_name: 'Rajesh Sharma',
      role: 'guardian',
      phone_number: '+91 98765 43210',
      is_active: true,
      created_at: new Date().toISOString(),
      linked_student_id: studentUser.id,
    };

    const counselorUser: User = {
      id: 'usr-counselor-demo-1',
      email: 'counselor@nextpath.in',
      password_hash: 'counselor123',
      full_name: 'Dr. Priya Ramanathan',
      role: 'counselor',
      phone_number: '+91 98765 12345',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const adminUser: User = {
      id: 'usr-admin-demo-1',
      email: 'admin@nextpath.in',
      password_hash: 'admin123',
      full_name: 'System Administrator',
      role: 'admin',
      phone_number: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.users.set(studentUser.email, studentUser);
    this.users.set(parentUser.email, parentUser);
    this.users.set(counselorUser.email, counselorUser);
    this.users.set(adminUser.email, adminUser);

    // Initial student profile
    const studentProfile: StudentProfile = {
      id: 'prof-student-demo-1',
      user_id: studentUser.id,
      education_stage: 'class_11_12',
      grade_or_year: 'Class 11',
      current_stream: 'Science (PCM)',
      interests: [
        { label: 'Coding and software problem solving', riasec: 'I', strength: 5 },
        { label: 'Building tools and systems', riasec: 'R', strength: 4 },
        { label: 'Designing user interfaces', riasec: 'A', strength: 4 },
      ],
      aptitude_signals: {
        mathematics: 4,
        computers: 5,
        physics: 4,
        language: 4,
      },
      work_style_preferences: {
        pace: 'Collaborative & Agile',
        work_environment: 'Hybrid / Tech Office',
      },
      budget_tier: 'moderate_up_to_2_lakhs',
      relocation_willingness: 'anywhere_in_india',
      preferred_languages: ['English', 'Hindi'],
      consent_type: 'self_consent_adult',
      consent_given_by: 'Aarav Sharma',
      consent_recorded_at: new Date().toISOString(),
      academic_records_available: true,
      profile_completeness_pct: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      guardian_contexts: [
        {
          id: 'guard-1',
          student_id: studentUser.id,
          guardian_name: 'Rajesh Sharma',
          relationship_to_student: 'Father',
          guardian_priorities: ['Good starting salary', 'Job stability', 'Reputed institute'],
          financial_ceiling_inr: 200000,
          relocation_restriction: 'anywhere_in_india',
          notes_and_concerns: 'Prefers government-approved college degree over unaccredited private bootcamps.',
          created_at: new Date().toISOString(),
        },
      ],
    };

    this.profiles.set(studentUser.id, studentProfile);

    // Initial escalation for counselor queue
    const demoEscalation: Escalation = {
      id: 'esc-sample-1',
      student_id: studentUser.id,
      student_name: studentUser.full_name,
      trigger_reason: 'high_stakes_choice',
      student_note:
        'Torn between Data Science degree and competitive JEE Advanced preparation for engineering. Need guidance on scholarship options.',
      status: 'pending',
      counselor_id: null,
      counselor_notes: null,
      counselor_override_decision: null,
      counselor_override_rationale: null,
      created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      resolved_at: null,
    };

    this.escalations.set(demoEscalation.id, demoEscalation);
  }

  createToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
  }

  verifyToken(token: string): { sub: string; email: string; role: string; full_name: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch {
      return null;
    }
  }
}

export const store = new InMemoryStore();
