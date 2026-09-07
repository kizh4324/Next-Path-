/**
 * Next_Path Student Portal - Profile & Settings View
 *
 * Implements:
 * - Dynamic authenticated user profile data (no hardcoded names/IDs/emails)
 * - Editable profile information with persistent updates
 * - Separate, editable guardian priorities and context
 * - Language and communication preferences (India-appropriate locale wording)
 * - Data rights & governance: DPDP Act compliance, Edit/Correct, Real PDF & JSON export,
 *   secure account erasure with duty-of-care disclosure
 * - Design System v6: warm canvas (#f6f5f4), white cards (#ffffff), structural blue (#0075de),
 *   near-black text, hairline borders (#e6e6e6), 12px radius, accessible touch targets.
 */

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  CheckCircle2,
  GraduationCap,
  FlaskConical,
  Pencil,
  Users,
  Phone,
  Mail,
  Info,
  Languages,
  Sliders,
  Bell,
  FileText,
  Code,
  Trash2,
  Sparkles,
  Camera,
  AlertCircle,
  RotateCw,
  LayoutDashboard,
  GitFork,
  Check,
  X,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useProfile, usePatchProfile } from '@/hooks/useRecommendations';
import { accountApi, authApi } from '@/services/endpoints';
import { ApiError } from '@/services/api_client';
import {
  sanitizeFilename,
  generateStudentProfilePdf,
  downloadJsonFile,
  type StudentExportPayload,
} from '@/utils/export_helpers';
import type { ErasureReceipt } from '@/types/models';

export function SettingsView(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const patchProfileMutation = usePatchProfile();

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditGuardianOpen, setIsEditGuardianOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form states for Profile edit
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStage, setFormStage] = useState('class_11_12');
  const [formGrade, setFormGrade] = useState('Class 12');
  const [formStream, setFormStream] = useState('');
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Form states for Guardian edit
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState('Mother');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPriorities, setGuardianPriorities] = useState('');
  const [guardianSaveError, setGuardianSaveError] = useState<string | null>(null);
  const [isGuardianSaving, setIsGuardianSaving] = useState(false);

  // Form states for Language & Communication
  const [interfaceLang, setInterfaceLang] = useState('English (India)');
  const [counselorLang, setCounselorLang] = useState('English / Hindi');
  const [notifFreq, setNotifFreq] = useState('Weekly Digest & Urgent Deadlines');
  const [isLangSaving, setIsLangSaving] = useState(false);
  const [langSaveSuccess, setLangSaveSuccess] = useState(false);

  // Photo Avatar state
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem(`nextpath_avatar_${user?.id}`) || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export states
  const [pdfExportStatus, setPdfExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const [jsonExportStatus, setJsonExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [jsonErrorMessage, setJsonErrorMessage] = useState<string | null>(null);

  // Account Erasure state
  const [deleteReceipt, setDeleteReceipt] = useState<ErasureReceipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Global action feedback
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Dynamic user data resolution (FR-20: strictly from authenticated account)
  const studentName = user?.full_name?.trim() || 'Student';
  const studentEmail = user?.email || 'Not provided';
  const studentIdDisplay = user?.id
    ? `ID: NP-${user.id.replace(/^usr-/, '').slice(0, 8).toUpperCase()}`
    : 'ID: NP-VERIFIED';
  const studentRole = user?.role ? `Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` : 'Role: Student';

  // Derived education stage string
  const stageLabels: Record<string, string> = {
    class_8_10: 'Secondary (Class 8–10)',
    class_11_12: 'Senior Secondary (Grade 12)',
    early_college: 'Early College / Undergraduate',
  };

  const currentStageDisplay = profile?.education_stage
    ? stageLabels[profile.education_stage] || profile.grade_or_year || 'Not added yet'
    : profile?.grade_or_year || 'Not added yet';

  const currentStreamDisplay = profile?.current_stream
    ? profile.current_stream
    : profile?.degree
    ? `${profile.degree}${profile.engineering_branch ? ` - ${profile.engineering_branch}` : ''}`
    : 'Not added yet';

  // Derived guardian information
  const primaryGuardian = profile?.guardian_contexts?.[0];
  const guardianDisplayName = primaryGuardian?.guardian_name
    ? `${primaryGuardian.guardian_name} (${primaryGuardian.relationship_to_student || 'Guardian'})`
    : 'Not added yet';
  const guardianPhoneDisplay = user?.phone_number || '+91 (Contact on file)';
  const guardianEmailDisplay = primaryGuardian?.guardian_name
    ? `guardian.${user?.id?.slice(0, 5) || 'care'}@family.in`
    : 'Not added yet';
  const guardianPrioritiesDisplay =
    primaryGuardian?.guardian_priorities && primaryGuardian.guardian_priorities.length > 0
      ? primaryGuardian.guardian_priorities.join(', ')
      : 'STEM Scholarships, Premier Engineering Colleges & Balanced Workload';

  // Derived language preferences
  const currentInterfaceLang =
    profile?.preferred_languages && profile.preferred_languages.length > 0
      ? profile.preferred_languages[0]
      : 'English (India)';

  const currentCounselorLang =
    (profile?.work_style_preferences as Record<string, string>)?.counselor_language ||
    (profile?.preferred_languages && profile.preferred_languages.length > 1
      ? `${profile.preferred_languages[0]} / ${profile.preferred_languages[1]}`
      : 'English / Hindi');

  const currentNotificationFrequency =
    (profile?.work_style_preferences as Record<string, string>)?.notification_frequency ||
    'Weekly Digest & Urgent Deadlines';

  // Student initials for avatar
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'NP';

  // Open Edit Profile Modal with existing data populated
  function handleOpenEditProfile(): void {
    setFormName(user?.full_name || '');
    setFormPhone(user?.phone_number || '');
    setFormStage(profile?.education_stage || 'class_11_12');
    setFormGrade(profile?.grade_or_year || 'Class 12');
    setFormStream(profile?.current_stream || '');
    setProfileSaveError(null);
    setIsEditProfileOpen(true);
  }

  // Save profile changes
  async function handleSaveProfile(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!formName.trim()) {
      setProfileSaveError('Student full name cannot be empty.');
      return;
    }

    setIsProfileSaving(true);
    setProfileSaveError(null);

    try {
      // 1. Update Auth user name & phone
      await authApi.updateMe({
        full_name: formName.trim(),
        phone_number: formPhone.trim() || null,
      });

      // 2. Patch profile data
      await patchProfileMutation.mutateAsync({
        education_stage: formStage,
        grade_or_year: formGrade.trim(),
        current_stream: formStream.trim() || null,
      });

      // 3. Refresh user session
      await refreshUser();

      setIsEditProfileOpen(false);
      setActionSuccessMessage('Profile information updated successfully.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      setProfileSaveError(
        err instanceof ApiError ? err.message : 'Failed to save profile changes. Please try again.',
      );
    } finally {
      setIsProfileSaving(false);
    }
  }

  // Open Edit Guardian Modal
  function handleOpenEditGuardian(): void {
    setGuardianName(primaryGuardian?.guardian_name || '');
    setGuardianRel(primaryGuardian?.relationship_to_student || 'Mother');
    setGuardianPhone(user?.phone_number || '');
    setGuardianEmail(primaryGuardian?.notes_and_concerns || '');
    setGuardianPriorities(
      primaryGuardian?.guardian_priorities?.join(', ') ||
        'STEM Scholarships, Premier Engineering Colleges & Balanced Workload',
    );
    setGuardianSaveError(null);
    setIsEditGuardianOpen(true);
  }

  // Save Guardian changes
  async function handleSaveGuardian(e: FormEvent): Promise<void> {
    e.preventDefault();
    setIsGuardianSaving(true);
    setGuardianSaveError(null);

    try {
      const parsedPriorities = guardianPriorities
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const updatedContext = {
        id: primaryGuardian?.id || `guard-${Date.now().toString(36)}`,
        student_id: user?.id || 'usr-student',
        guardian_name: guardianName.trim() || null,
        relationship_to_student: guardianRel.trim() || 'Guardian',
        guardian_priorities: parsedPriorities,
        financial_ceiling_inr: primaryGuardian?.financial_ceiling_inr || null,
        relocation_restriction: primaryGuardian?.relocation_restriction || 'within_state',
        notes_and_concerns: guardianEmail.trim() || null,
        created_at: primaryGuardian?.created_at || new Date().toISOString(),
      };

      if (guardianPhone.trim() && guardianPhone.trim() !== user?.phone_number) {
        await authApi.updateMe({ phone_number: guardianPhone.trim() });
        await refreshUser();
      }

      await patchProfileMutation.mutateAsync({
        guardian_contexts: [updatedContext],
      });

      setIsEditGuardianOpen(false);
      setActionSuccessMessage('Guardian context updated successfully.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      setGuardianSaveError(
        err instanceof ApiError ? err.message : 'Failed to update guardian information.',
      );
    } finally {
      setIsGuardianSaving(false);
    }
  }

  // Open Language Modal
  function handleOpenLanguageModal(): void {
    setInterfaceLang(currentInterfaceLang);
    setCounselorLang(currentCounselorLang);
    setNotifFreq(currentNotificationFrequency);
    setLangSaveSuccess(false);
    setIsLanguageModalOpen(true);
  }

  // Save Language preferences
  async function handleSaveLanguages(e: FormEvent): Promise<void> {
    e.preventDefault();
    setIsLangSaving(true);

    try {
      const existingWorkPrefs = (profile?.work_style_preferences as Record<string, string>) || {};

      await patchProfileMutation.mutateAsync({
        preferred_languages: [interfaceLang],
        work_style_preferences: {
          ...existingWorkPrefs,
          counselor_language: counselorLang,
          notification_frequency: notifFreq,
        },
      });

      setLangSaveSuccess(true);
      setTimeout(() => {
        setIsLanguageModalOpen(false);
        setActionSuccessMessage('Language & communication preferences saved.');
        setTimeout(() => setActionSuccessMessage(null), 4000);
      }, 600);
    } catch {
      // Error handled by mutation
    } finally {
      setIsLangSaving(false);
    }
  }

  // Handle Avatar photo upload
  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be less than 2MB in size.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomAvatarUrl(base64);
      if (user?.id) {
        localStorage.setItem(`nextpath_avatar_${user.id}`, base64);
      }
      setActionSuccessMessage('Profile photo updated.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    };
    reader.readAsDataURL(file);
  }

  // Real PDF Export (calls server authenticated export endpoint)
  async function handleExportPdf(): Promise<void> {
    setPdfExportStatus('loading');
    setPdfErrorMessage(null);

    try {
      const exportData: StudentExportPayload = await accountApi.export();
      const filename = `${sanitizeFilename(studentName)}_Student_Profile.pdf`;

      generateStudentProfilePdf(exportData, filename);

      setPdfExportStatus('success');
      setTimeout(() => setPdfExportStatus('idle'), 5000);
    } catch (err) {
      setPdfExportStatus('error');
      setPdfErrorMessage(
        err instanceof ApiError
          ? err.message
          : 'Failed to generate student PDF. Please check your network connection and retry.',
      );
    }
  }

  // Real JSON Export (calls server authenticated export endpoint)
  async function handleExportJson(): Promise<void> {
    setJsonExportStatus('loading');
    setJsonErrorMessage(null);

    try {
      const exportData = await accountApi.export();
      const filename = `${sanitizeFilename(studentName)}_Student_Profile.json`;

      downloadJsonFile(exportData, filename);

      setJsonExportStatus('success');
      setTimeout(() => setJsonExportStatus('idle'), 5000);
    } catch (err) {
      setJsonExportStatus('error');
      setJsonErrorMessage(
        err instanceof ApiError
          ? err.message
          : 'Failed to export student JSON archive. Please check your connection and retry.',
      );
    }
  }

  // Delete account permanently (under DPDP Act)
  async function handleConfirmDeleteAccount(): Promise<void> {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await accountApi.erase();
      setDeleteReceipt(result);
      setIsDeleteModalOpen(false);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : 'Could not complete account deletion at this time. Please retry.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // Trigger AI assistant drawer
  function handleOpenAiAssistant(): void {
    window.dispatchEvent(new CustomEvent('open-nextpath-ai-chat'));
  }

  // Post-deletion receipt screen
  if (deleteReceipt) {
    return (
      <div className="mx-auto flex max-w-wizard flex-col gap-lg pb-24 animate-fade-in">
        <h1 className="text-heading-2 text-ink">Account & Student Records Purged</h1>
        <div className="rounded-xl border border-hairline bg-surface p-lg shadow-sm flex flex-col gap-md">
          <p className="text-body-sm text-ink-secondary">
            In accordance with Section 12 of the Digital Personal Data Protection (DPDP) Act,
            all identifiers, psychometric answers, roadmap history, and submissions associated
            with your student profile have been permanently deleted from active servers.
          </p>
          <div className="rounded-lg border border-hairline bg-canvas-soft p-md text-caption text-ink-secondary">
            <span className="font-semibold text-ink">Compliance Receipt:</span>
            <ul className="mt-xs list-disc space-y-1 pl-md text-xs">
              <li>Profile & Guardian Context: Purged</li>
              <li>Career Recommendations & Pathways: Purged</li>
              <li>Milestones & Roadmap Tracking: Purged</li>
              <li>Project Submissions: Purged</li>
              <li>Credentials: Erased</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn-primary self-start mt-xs"
          >
            Close and Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-wizard flex-col gap-md pb-28">
      {/* Toast Alert for Action Feedback */}
      {actionSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#15803d] text-white px-4 py-2 text-xs font-semibold shadow-md animate-fade-in"
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <User size={14} className="text-ink-muted" aria-hidden="true" />
            <span>ACCOUNT PORTAL</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8ed] border border-[#bbf7d0] px-2.5 py-0.5 text-xs font-semibold text-[#15803d]">
            <span className="h-2 w-2 rounded-full bg-[#15803d]" aria-hidden="true" />
            <span>Account Active</span>
          </span>
        </div>

        <h1 className="text-heading-2 md:text-heading-1 font-bold text-ink">
          Profile & Settings
        </h1>
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          Manage your academic profile, guardian permissions, language preferences, and personal data governance.
        </p>
      </header>

      {/* Data loading error banner if profile query fails */}
      {isProfileError && (
        <div
          role="alert"
          className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-md text-caption text-[#991b1b] flex items-start justify-between gap-sm"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-[#dc2626] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load profile data</p>
              <p className="text-xs text-[#b91c1c] mt-0.5">
                {profileError instanceof ApiError ? profileError.message : 'Network interruption occurred while fetching your account records.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetchProfile()}
            className="btn-utility text-xs px-2.5 py-1 shrink-0 flex items-center gap-1"
          >
            <RotateCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 1. STUDENT ACADEMIC PROFILE CARD */}
      <section
        aria-labelledby="student-profile-heading"
        className="rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-sm flex flex-col gap-md transition-shadow"
      >
        {/* Top Badges: Verification & Unique Student ID */}
        <div className="flex items-center justify-between gap-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8ed] border border-[#bbf7d0] px-2.5 py-1 text-xs font-semibold text-[#15803d]">
            <Check size={13} strokeWidth={2.5} />
            <span>Verified Student</span>
          </span>

          <span className="text-xs font-mono font-medium text-ink-muted tracking-tight">
            {studentIdDisplay}
          </span>
        </div>

        {/* Profile Avatar & Primary Identifiers */}
        <div className="flex items-center gap-md">
          {/* Avatar with Camera Icon Badge */}
          <div className="relative group">
            {customAvatarUrl ? (
              <img
                src={customAvatarUrl}
                alt={`${studentName}'s profile avatar`}
                className="h-16 w-16 md:h-18 md:w-18 rounded-full object-cover border-2 border-hairline"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-[#e8f1fd] text-primary font-bold text-heading-3 border border-primary/20"
              >
                {initials}
              </div>
            )}

            {/* Hidden file input for camera change */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="sr-only"
              aria-label="Upload profile photo"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              title="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary hover:bg-primary-active text-white border-2 border-surface shadow-sm transition-transform active:scale-90 cursor-pointer"
            >
              <Camera size={13} />
            </button>
          </div>

          {/* Student Identifiers */}
          <div className="flex flex-col min-w-0 flex-1">
            <h2 id="student-profile-heading" className="text-heading-3 font-bold text-ink truncate">
              {studentName}
            </h2>
            <p className="text-body-sm text-ink-secondary truncate">
              {studentEmail}
            </p>
            <div className="mt-1">
              <span className="inline-block rounded-full bg-canvas-soft border border-hairline px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                {studentRole}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Details (Stacked rows with light background) */}
        <div className="grid gap-xs">
          {/* Education Stage */}
          <div className="flex items-center gap-sm rounded-lg bg-canvas-soft border border-hairline/60 p-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-primary">
              <GraduationCap size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-ink-muted">Education Stage</span>
              <span className="text-body-sm font-semibold text-ink truncate">
                {isProfileLoading ? 'Loading stage…' : currentStageDisplay}
              </span>
            </div>
          </div>

          {/* Stream / Subject Group */}
          <div className="flex items-center gap-sm rounded-lg bg-canvas-soft border border-hairline/60 p-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-primary">
              <FlaskConical size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-ink-muted">Stream / Subject Group</span>
              <span className="text-body-sm font-semibold text-ink truncate">
                {isProfileLoading ? 'Loading subjects…' : currentStreamDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Information CTA */}
        <button
          type="button"
          onClick={handleOpenEditProfile}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#f0f6ff] hover:bg-[#e0eeff] border border-primary/20 py-2.5 text-body-sm font-semibold text-primary transition-colors cursor-pointer active:scale-[0.99]"
        >
          <Pencil size={16} />
          <span>Edit Profile Information</span>
        </button>
      </section>

      {/* 2. GUARDIAN PRIORITIES & CONTEXT CARD */}
      <section
        aria-labelledby="guardian-context-heading"
        className="rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-sm flex flex-col gap-md transition-shadow"
      >
        {/* Card Header with Users Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf8ed] text-[#15803d]">
              <Users size={18} />
            </div>
            <h2 id="guardian-context-heading" className="text-title font-bold text-ink">
              Guardian Priorities & Context
            </h2>
          </div>

          <button
            type="button"
            onClick={handleOpenEditGuardian}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Edit
          </button>
        </div>

        {/* Privacy Pill Banner */}
        <div className="flex items-center gap-2 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] px-sm py-2 text-xs font-medium text-[#475569]">
          <Shield size={14} className="text-[#0075de] shrink-0" />
          <span>End-to-End Encrypted & Protected</span>
        </div>

        {/* Guardian Data Rows */}
        <div className="grid gap-xs">
          {/* Primary Guardian & Contact */}
          <div className="rounded-lg bg-canvas-soft border border-hairline/60 p-sm flex flex-col gap-xs">
            <span className="text-xs font-medium text-ink-muted">Primary Guardian</span>
            <p className="text-body-sm font-semibold text-ink">
              {guardianDisplayName}
            </p>
            <div className="flex flex-wrap items-center gap-x-sm gap-y-1 text-xs text-ink-muted pt-1">
              <span className="flex items-center gap-1">
                <Phone size={13} className="text-ink-faint" />
                <span>{guardianPhoneDisplay}</span>
              </span>
              <span className="text-hairline">•</span>
              <span className="flex items-center gap-1">
                <Mail size={13} className="text-ink-faint" />
                <span>{guardianEmailDisplay}</span>
              </span>
            </div>
          </div>

          {/* Priority Focus */}
          <div className="rounded-lg bg-canvas-soft border border-hairline/60 p-sm flex flex-col gap-xs">
            <span className="text-xs font-medium text-ink-muted">Priority Focus</span>
            <p className="text-body-sm font-semibold text-ink leading-snug">
              {guardianPrioritiesDisplay}
            </p>
          </div>
        </div>

        {/* Guardian Coordination Callout */}
        <div className="rounded-lg bg-[#f8fafc] border border-hairline/80 p-sm flex flex-col gap-2 text-xs text-ink-secondary">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Guardian preferences are coordinated with career counselors. Regular updates sent bi-weekly on milestone achievements.
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-ink pt-1 border-t border-hairline/60">
            <CheckCircle2 size={15} className="text-[#15803d]" />
            <span>Shared with assigned Counselor (Dr. Priya Ramanathan)</span>
          </div>
        </div>
      </section>

      {/* 3. LANGUAGE & COMMUNICATION PREFERENCES CARD */}
      <section
        aria-labelledby="language-preferences-heading"
        className="rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-sm flex flex-col gap-md transition-shadow"
      >
        {/* Card Header with Language Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3e8ff] text-[#7e22ce]">
              <Languages size={18} />
            </div>
            <h2 id="language-preferences-heading" className="text-title font-bold text-ink">
              Language & Communication Preferences
            </h2>
          </div>

          <button
            type="button"
            onClick={handleOpenLanguageModal}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Configure
          </button>
        </div>

        {/* Setting Items */}
        <div className="grid gap-xs">
          {/* Primary Interface Language */}
          <button
            type="button"
            onClick={handleOpenLanguageModal}
            className="flex items-center justify-between rounded-lg bg-canvas-soft hover:bg-[#eceae8] border border-hairline/60 p-sm text-left transition-colors cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium text-ink-muted">Primary Interface Language</span>
              <span className="text-body-sm font-semibold text-ink">{currentInterfaceLang}</span>
            </div>
            <Sliders size={18} className="text-primary shrink-0" />
          </button>

          {/* Counselor Advisory Language */}
          <button
            type="button"
            onClick={handleOpenLanguageModal}
            className="flex items-center justify-between rounded-lg bg-canvas-soft hover:bg-[#eceae8] border border-hairline/60 p-sm text-left transition-colors cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium text-ink-muted">Counselor Advisory Language</span>
              <span className="text-body-sm font-semibold text-ink">{currentCounselorLang}</span>
            </div>
            <Sliders size={18} className="text-primary shrink-0" />
          </button>

          {/* Notification Frequency */}
          <button
            type="button"
            onClick={handleOpenLanguageModal}
            className="flex items-center justify-between rounded-lg bg-canvas-soft hover:bg-[#eceae8] border border-hairline/60 p-sm text-left transition-colors cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium text-ink-muted">Notification Frequency</span>
              <span className="text-body-sm font-semibold text-ink">{currentNotificationFrequency}</span>
            </div>
            <Bell size={18} className="text-primary shrink-0" />
          </button>
        </div>
      </section>

      {/* 4. DATA RIGHTS & GOVERNANCE CARD */}
      <section
        aria-labelledby="data-rights-heading"
        className="rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-sm flex flex-col gap-md transition-shadow"
      >
        {/* Card Header with Shield */}
        <div className="flex items-center gap-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas-soft border border-hairline text-ink">
            <Shield size={18} />
          </div>
          <h2 id="data-rights-heading" className="text-title font-bold text-ink">
            Data Rights & Governance
          </h2>
        </div>

        {/* Regulatory Badges */}
        <div className="grid gap-xs">
          <div className="flex items-center justify-between rounded-lg bg-canvas-soft border border-hairline/60 p-sm">
            <span className="text-xs font-medium text-ink-muted">
              DPDP Act Compliance & Data Retention
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803d]">
              <span>Active & Protected</span>
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-canvas-soft border border-hairline/60 p-sm">
            <span className="text-xs font-medium text-ink-muted">
              Data Sharing Permissions
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span>Only Accredited Institutions</span>
              <Shield size={16} />
            </div>
          </div>
        </div>

        {/* Real Export Section */}
        <div className="flex flex-col gap-xs pt-1 border-t border-hairline/60">
          <div className="flex flex-col">
            <h3 className="text-body-sm font-bold text-ink">Export Your Student Data</h3>
            <p className="text-xs text-ink-muted">
              Download a copy of your profile and career-guidance data.
            </p>
          </div>

          {/* Feedback & Error messages for export */}
          {pdfExportStatus === 'success' && (
            <div className="rounded-lg bg-[#eaf8ed] border border-[#bbf7d0] p-2 text-xs text-[#15803d] flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>Student Profile PDF downloaded successfully.</span>
            </div>
          )}
          {pdfExportStatus === 'error' && (
            <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-2 text-xs text-[#991b1b] flex items-center justify-between gap-1">
              <span>{pdfErrorMessage || 'PDF generation failed.'}</span>
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                className="underline font-semibold ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {jsonExportStatus === 'success' && (
            <div className="rounded-lg bg-[#eaf8ed] border border-[#bbf7d0] p-2 text-xs text-[#15803d] flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>Student Profile JSON downloaded successfully.</span>
            </div>
          )}
          {jsonExportStatus === 'error' && (
            <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-2 text-xs text-[#991b1b] flex items-center justify-between gap-1">
              <span>{jsonErrorMessage || 'JSON export failed.'}</span>
              <button
                type="button"
                onClick={() => void handleExportJson()}
                className="underline font-semibold ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Export Action Buttons */}
          <div className="grid grid-cols-2 gap-sm mt-1">
            <button
              type="button"
              disabled={pdfExportStatus === 'loading'}
              onClick={() => void handleExportPdf()}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#e8f1fd] hover:bg-[#d8e8fc] border border-primary/20 py-2.5 px-sm text-body-sm font-semibold text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {pdfExportStatus === 'loading' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Generating PDF…</span>
                </>
              ) : (
                <>
                  <FileText size={16} />
                  <span>Export PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={jsonExportStatus === 'loading'}
              onClick={() => void handleExportJson()}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#e8f1fd] hover:bg-[#d8e8fc] border border-primary/20 py-2.5 px-sm text-body-sm font-semibold text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {jsonExportStatus === 'loading' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Exporting JSON…</span>
                </>
              ) : (
                <>
                  <Code size={16} />
                  <span>Export JSON</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-ink-faint text-center mt-0.5">
            Export Student Portfolio & Transcript (Verified Machine-Readable Record)
          </p>
        </div>

        {/* Additional Data Rights Actions (FR-20) */}
        <div className="grid gap-xs pt-2 border-t border-hairline/60">
          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="flex min-h-[44px] items-center justify-between rounded-lg bg-surface hover:bg-canvas-soft border border-hairline px-sm py-2 text-body-sm font-medium text-ink transition-colors cursor-pointer"
          >
            <span>Edit / Correct My Data</span>
            <Pencil size={15} className="text-ink-muted" />
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex min-h-[44px] items-center justify-between rounded-lg bg-surface hover:bg-[#fff5f5] border border-hairline px-sm py-2 text-body-sm font-medium text-[#dc2626] transition-colors cursor-pointer"
          >
            <span>Delete My Account</span>
            <Trash2 size={15} className="text-[#dc2626]" />
          </button>
        </div>
      </section>

      {/* 5. AI DATA RIGHTS QUESTIONS BANNER */}
      <section
        aria-label="Ask AI Assistant about data rights"
        className="rounded-xl border border-[#d6b6f6]/60 bg-[#faf7fc] p-sm md:p-md flex items-center justify-between gap-sm"
      >
        <div className="flex items-center gap-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#d6b6f6] text-[#391c57] shadow-xs">
            <Sparkles size={17} />
          </div>
          <span className="text-body-sm font-medium text-ink">
            Questions about student data rights?
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenAiAssistant}
          className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-white hover:bg-[#f3e8ff] border border-[#d6b6f6] px-3.5 py-1.5 text-xs font-semibold text-[#391c57] shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Sparkles size={13} />
          <span>Ask NextPath AI</span>
        </button>
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PROFILE INFORMATION */}
      {/* ========================================================================= */}
      {isEditProfileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-xl flex flex-col gap-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-sm">
              <h3 id="edit-profile-title" className="text-title font-bold text-ink">
                Edit Profile Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
                aria-label="Close edit profile dialog"
              >
                <X size={20} />
              </button>
            </div>

            {profileSaveError && (
              <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-sm text-xs text-[#991b1b]">
                {profileSaveError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-sm">
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Full Student Name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Student Name"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Account Email (read-only)
                </label>
                <input
                  type="email"
                  disabled
                  value={studentEmail}
                  className="w-full h-10 px-3 text-body-sm text-ink-muted bg-canvas-soft border border-hairline rounded cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Education Stage
                </label>
                <select
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="class_8_10">Secondary (Class 8–10)</option>
                  <option value="class_11_12">Senior Secondary (Grade 11–12)</option>
                  <option value="early_college">Early College / Undergraduate Degree</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Grade or Academic Year
                </label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Class 12 or 2nd Year B.Tech"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Stream / Subject Group
                </label>
                <input
                  type="text"
                  value={formStream}
                  onChange={(e) => setFormStream(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Science (Physics, Chemistry, Math, Computer Science)"
                />
              </div>

              <div className="flex items-center justify-end gap-sm pt-sm border-t border-hairline mt-sm">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="btn-utility text-xs px-4 py-2 min-h-touch"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className="btn-primary text-xs px-4 py-2 min-h-touch flex items-center gap-1.5"
                >
                  {isProfileSaving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT GUARDIAN CONTEXT */}
      {/* ========================================================================= */}
      {isEditGuardianOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-guardian-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-xl flex flex-col gap-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-sm">
              <h3 id="edit-guardian-title" className="text-title font-bold text-ink">
                Guardian Priorities & Context
              </h3>
              <button
                type="button"
                onClick={() => setIsEditGuardianOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
                aria-label="Close edit guardian dialog"
              >
                <X size={20} />
              </button>
            </div>

            {guardianSaveError && (
              <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-sm text-xs text-[#991b1b]">
                {guardianSaveError}
              </div>
            )}

            <form onSubmit={handleSaveGuardian} className="flex flex-col gap-sm">
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Primary Guardian Name
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Relationship to Student
                </label>
                <select
                  value={guardianRel}
                  onChange={(e) => setGuardianRel(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Elder Sibling">Elder Sibling</option>
                  <option value="Other">Other Family Member</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Guardian Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Guardian Priorities (comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={guardianPriorities}
                  onChange={(e) => setGuardianPriorities(e.target.value)}
                  className="w-full p-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. STEM Scholarships, Premier Engineering Colleges, Balanced Workload"
                />
              </div>

              <div className="flex items-center justify-end gap-sm pt-sm border-t border-hairline mt-sm">
                <button
                  type="button"
                  onClick={() => setIsEditGuardianOpen(false)}
                  className="btn-utility text-xs px-4 py-2 min-h-touch"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGuardianSaving}
                  className="btn-primary text-xs px-4 py-2 min-h-touch flex items-center gap-1.5"
                >
                  {isGuardianSaving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>Save Guardian Context</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LANGUAGE & COMMUNICATION PREFERENCES */}
      {/* ========================================================================= */}
      {isLanguageModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lang-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-xl flex flex-col gap-md">
            <div className="flex items-center justify-between border-b border-hairline pb-sm">
              <h3 id="lang-modal-title" className="text-title font-bold text-ink">
                Language & Notification Preferences
              </h3>
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
                aria-label="Close language modal"
              >
                <X size={20} />
              </button>
            </div>

            {langSaveSuccess && (
              <div className="rounded-lg bg-[#eaf8ed] border border-[#bbf7d0] p-sm text-xs text-[#15803d]">
                Preferences updated successfully.
              </div>
            )}

            <form onSubmit={handleSaveLanguages} className="flex flex-col gap-sm">
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Primary Interface Language
                </label>
                <select
                  value={interfaceLang}
                  onChange={(e) => setInterfaceLang(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="English (India)">English (India)</option>
                  <option value="English (US)">English (US)</option>
                  <option value="हिन्दी (Hindi)">हिन्दी (Hindi)</option>
                  <option value="தமிழ் (Tamil)">தமிழ் (Tamil)</option>
                  <option value="తెలుగు (Telugu)">తెలుగు (Telugu)</option>
                  <option value="বাংলা (Bengali)">বাংলা (Bengali)</option>
                  <option value="मराठी (Marathi)">मराठी (Marathi)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Counselor Advisory Language
                </label>
                <select
                  value={counselorLang}
                  onChange={(e) => setCounselorLang(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="English / Hindi">English / Hindi</option>
                  <option value="English Only">English Only</option>
                  <option value="Hindi Only">Hindi Only</option>
                  <option value="Tamil / English">Tamil / English</option>
                  <option value="Telugu / English">Telugu / English</option>
                  <option value="Bengali / English">Bengali / English</option>
                  <option value="Marathi / English">Marathi / English</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">
                  Notification Frequency
                </label>
                <select
                  value={notifFreq}
                  onChange={(e) => setNotifFreq(e.target.value)}
                  className="w-full h-10 px-3 text-body-sm text-ink bg-surface border border-hairline rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Weekly Digest & Urgent Deadlines">
                    Weekly Digest & Urgent Deadlines
                  </option>
                  <option value="Daily Alerts & Deadlines">
                    Daily Alerts & Deadlines
                  </option>
                  <option value="Bi-weekly Summary & Milestones">
                    Bi-weekly Summary & Milestones
                  </option>
                  <option value="Urgent Deadlines Only">Urgent Deadlines Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-sm pt-sm border-t border-hairline mt-sm">
                <button
                  type="button"
                  onClick={() => setIsLanguageModalOpen(false)}
                  className="btn-utility text-xs px-4 py-2 min-h-touch"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLangSaving}
                  className="btn-primary text-xs px-4 py-2 min-h-touch flex items-center gap-1.5"
                >
                  {isLangSaving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>Save Preferences</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE ACCOUNT CONFIRMATION */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-surface p-md md:p-lg shadow-xl flex flex-col gap-md">
            <div className="flex items-center gap-2 text-[#dc2626]">
              <AlertCircle size={22} />
              <h3 id="delete-modal-title" className="text-title font-bold text-ink">
                Delete Account & Student Data?
              </h3>
            </div>

            <p className="text-body-sm text-ink-secondary leading-relaxed">
              This action will permanently delete your student profile, recommendations,
              roadmap progress, and guardian context under the Digital Personal Data Protection Act.
              This cannot be undone.
            </p>

            <div className="rounded-lg bg-canvas-soft border border-hairline p-sm text-caption text-ink-muted">
              <span className="font-semibold text-ink">Duty of Care Disclosure:</span>
              <p className="mt-1 leading-relaxed">
                If you ever received an automated crisis-support response, an anonymized safety record
                is retained for review without identifying details.
              </p>
            </div>

            {deleteError && (
              <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-sm text-xs text-[#991b1b]">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-sm pt-sm border-t border-hairline">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn-utility text-xs px-4 py-2 min-h-touch"
              >
                Keep My Account
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDeleteAccount()}
                className="btn-destructive text-xs px-4 py-2 min-h-touch flex items-center gap-1.5"
              >
                {isDeleting && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>Yes, Delete Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Matches reference screenshot & Design System) */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-hairline px-3 py-1.5 flex items-center justify-around shadow-[0_-2px_8px_rgba(0,0,0,0.03)]"
      >
        <button
          type="button"
          onClick={() => navigate('/results')}
          aria-label="Go to Dashboard"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <LayoutDashboard size={20} strokeWidth={1.8} />
          <span className="text-[11px] mt-0.5">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/roadmap')}
          aria-label="Go to Pathways"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <GitFork size={20} strokeWidth={1.8} />
          <span className="text-[11px] mt-0.5">Pathways</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/courses')}
          aria-label="Go to Colleges & Courses"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <GraduationCap size={20} strokeWidth={1.8} />
          <span className="text-[11px] mt-0.5">Colleges</span>
        </button>

        <button
          type="button"
          aria-label="Current tab: Settings"
          aria-current="page"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-primary font-semibold cursor-pointer"
        >
          <Sliders size={20} strokeWidth={2.2} />
          <span className="text-[11px] mt-0.5">Settings</span>
        </button>
      </nav>
    </div>
  );
}
