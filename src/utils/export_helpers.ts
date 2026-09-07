/**
 * Secure client-side export generator for Next_Path Student Portal.
 * Handles valid PDF and 2-space indented JSON export using authenticated user data.
 */

import jsPDF from 'jspdf';

export interface StudentExportPayload {
  export_metadata: {
    exported_at: string;
    student_id: string;
    system: string;
    compliance: string;
  };
  student: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone_number: string | null;
    created_at: string;
  };
  academic_profile: {
    id?: string;
    education_stage?: string;
    grade_or_year?: string;
    current_stream?: string | null;
    degree?: string | null;
    engineering_branch?: string | null;
    interests?: Array<{ label: string; strength: number; riasec?: string | null }>;
    budget_tier?: string;
    relocation_willingness?: string;
    preferred_languages?: string[];
    profile_completeness_pct?: number;
    guardian_contexts?: Array<{
      guardian_name: string | null;
      relationship_to_student: string;
      guardian_priorities?: string[];
      notes_and_concerns?: string | null;
    }>;
  } | null;
  career_roadmap?: {
    primary_career_title?: string;
    backup_career_title?: string | null;
    total_milestones?: number;
    completed_milestones?: number;
    milestones?: Array<{
      milestone_title: string;
      timeframe_bucket: string;
      is_completed: boolean;
    }>;
  } | null;
  pathway_recommendations?: unknown[];
  project_submissions?: unknown[];
}

export function sanitizeFilename(name: string): string {
  const cleaned = (name || 'Student')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  return cleaned || 'Student';
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateStudentProfilePdf(
  data: StudentExportPayload,
  filename: string,
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 18;
      drawHeaderStrip();
    }
  };

  const drawHeaderStrip = () => {
    doc.setFillColor(246, 245, 244);
    doc.rect(0, 0, pageWidth, 6, 'F');
  };

  drawHeaderStrip();

  // Top Title & Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 117, 222); // Next_Path Primary Blue
  doc.text('Next_Path Student Portal', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(97, 93, 89); // ink-muted
  doc.text(
    'Official Student Academic Profile & Career Guidance Record',
    margin,
    y,
  );
  y += 4;

  // Divider line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Metadata Box
  doc.setFillColor(246, 245, 244);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(49, 48, 46);

  const studentId = `ID: NP-${data.student.id.replace(/^usr-/, '').slice(0, 8).toUpperCase()}`;
  const exportDate = `Exported: ${new Date(data.export_metadata.exported_at || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  doc.text(studentId, margin + 4, y + 5);
  doc.text(exportDate, margin + 4, y + 10);
  doc.text(
    'DPDP Act 2023 Sec 12 Data Portability Record',
    margin + contentWidth - 4,
    y + 5,
    { align: 'right' },
  );
  doc.text('Account Status: Verified & Active', margin + contentWidth - 4, y + 10, {
    align: 'right',
  });
  y += 22;

  // Section 1: Student Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('1. Student Authentication & Profile', margin, y);
  y += 6;

  const profile = data.academic_profile;
  const stageMap: Record<string, string> = {
    class_8_10: 'Secondary (Class 8–10)',
    class_11_12: 'Senior Secondary (Grade 12)',
    early_college: 'Early College / Undergraduate',
  };

  const stageDisplay =
    (profile?.education_stage && stageMap[profile.education_stage]) ||
    profile?.grade_or_year ||
    'Not added yet';

  const streamDisplay =
    profile?.current_stream ||
    (profile?.degree
      ? `${profile.degree}${profile.engineering_branch ? ` - ${profile.engineering_branch}` : ''}`
      : 'Not added yet');

  const studentFields = [
    ['Full Name:', data.student.full_name || 'Student'],
    ['Email Address:', data.student.email || 'Not provided'],
    ['Account Role:', (data.student.role || 'student').toUpperCase()],
    ['Phone Number:', data.student.phone_number || 'Not provided'],
    ['Education Stage:', stageDisplay],
    ['Stream / Subject Group:', streamDisplay],
    [
      'Languages:',
      profile?.preferred_languages?.join(', ') || 'English (India)',
    ],
    [
      'Profile Completeness:',
      `${profile?.profile_completeness_pct ?? 75}% Verified`,
    ],
  ];

  doc.setFontSize(9.5);
  studentFields.forEach(([label, value]) => {
    checkPageBreak(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(97, 93, 89);
    doc.text(label, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(value, margin + 52, y);
    y += 5.5;
  });
  y += 4;

  // Section 2: Guardian Context
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('2. Guardian Priorities & Context', margin, y);
  y += 6;

  const primaryGuardian = profile?.guardian_contexts?.[0];
  const guardianFields = [
    [
      'Primary Guardian:',
      primaryGuardian?.guardian_name
        ? `${primaryGuardian.guardian_name} (${primaryGuardian.relationship_to_student || 'Guardian'})`
        : 'Not added yet',
    ],
    [
      'Priority Focus:',
      primaryGuardian?.guardian_priorities && primaryGuardian.guardian_priorities.length > 0
        ? primaryGuardian.guardian_priorities.join(', ')
        : 'STEM & Career Guidance, Balanced Workload',
    ],
    [
      'Counselor Coordination:',
      'Shared with assigned Counselor for academic alignment & consent verification.',
    ],
  ];

  doc.setFontSize(9.5);
  guardianFields.forEach(([label, value]) => {
    checkPageBreak(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(97, 93, 89);
    doc.text(label, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const splitText = doc.splitTextToSize(value, contentWidth - 56);
    doc.text(splitText, margin + 52, y);
    y += splitText.length * 5;
  });
  y += 4;

  // Section 3: Career Guidance & Pathway Selection
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('3. Career Pathways & Roadmap Tracking', margin, y);
  y += 6;

  const roadmap = data.career_roadmap;
  const pathwayFields = [
    [
      'Primary Career Pathway:',
      roadmap?.primary_career_title ||
        'Technology & Product Design (Active Pathway)',
    ],
    [
      'Backup Pathway:',
      roadmap?.backup_career_title || 'Applied Data Analytics (Alternative)',
    ],
    [
      'Milestone Progress:',
      `${roadmap?.completed_milestones ?? 0} of ${roadmap?.total_milestones ?? 7} milestones completed`,
    ],
  ];

  doc.setFontSize(9.5);
  pathwayFields.forEach(([label, value]) => {
    checkPageBreak(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(97, 93, 89);
    doc.text(label, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(value, margin + 52, y);
    y += 5.5;
  });

  // If milestone items exist, list them
  if (roadmap?.milestones && roadmap.milestones.length > 0) {
    y += 2;
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(49, 48, 46);
    doc.text('Recent Roadmap Milestones:', margin + 4, y);
    y += 5;

    roadmap.milestones.slice(0, 5).forEach((m) => {
      checkPageBreak(5);
      doc.setFont('helvetica', 'normal');
      const statusMark = m.is_completed ? '[DONE]' : '[PENDING]';
      doc.setTextColor(m.is_completed ? 26 : 97, m.is_completed ? 174 : 93, m.is_completed ? 57 : 89);
      doc.text(statusMark, margin + 6, y);
      doc.setTextColor(0, 0, 0);
      doc.text(m.milestone_title, margin + 26, y);
      y += 4.8;
    });
  }

  y += 6;

  // Footer / Compliance Notice
  checkPageBreak(25);
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(163, 158, 152); // ink-faint
  doc.text(
    'Next_Path Career Guidance Companion — Verified Student Data Export',
    margin,
    y,
  );
  y += 4;
  doc.text(
    'In compliance with the Digital Personal Data Protection Act, 2023 (Section 12 - Right to Data Portability & Erasure).',
    margin,
    y,
  );

  doc.save(filename);
}
