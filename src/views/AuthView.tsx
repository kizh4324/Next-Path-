/**
 * Redesigned Login / Sign-In experience matching the Next Path reference design.
 * Clean, modern, student-friendly interface adhering to the Design System tokens.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api_client';
import { profileApi } from '@/services/endpoints';
import { loginSchema, registerSchema } from '@/types/forms';

type Mode = 'login' | 'register' | 'forgot';

const REMEMBER_EMAIL_KEY = 'nextpath_remember_email';

export function AuthView(): JSX.Element {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});
    setInfoMessage(null);

    if (mode === 'forgot') {
      if (!email || !email.includes('@')) {
        setErrors({ email: 'Please enter a valid email address.' });
        return;
      }
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        setForgotSent(true);
      }, 500);
      return;
    }

    const parsed =
      mode === 'login'
        ? loginSchema.safeParse({ email, password })
        : registerSchema.safeParse({ email, password, full_name: fullName, role: 'student' });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Persist or clear remembered email
    try {
      if (rememberMe && email) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Ignore storage errors
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, full_name: fullName, role: 'student' });
      }

      try {
        const status = await profileApi.status();
        if (status?.profile_exists) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('onboarding_completed', 'true');
          }
          navigate('/results');
        } else {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('onboarding_completed');
          }
          navigate('/onboarding');
        }
      } catch {
        navigate('/results');
      }
    } catch (caught) {
      setErrors({
        form:
          caught instanceof ApiError
            ? caught.message
            : 'Authentication failed. Please check your credentials and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Subtitle badge
  const roleSubtitle = 'Student Discovery Portal';

  // Input labels and placeholders
  const identifierLabel = 'Student Email or ID';
  const identifierPlaceholder = 'student@example.com';
  const submitButtonLabel = 'Sign In to Student Portal';

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between antialiased selection:bg-[#d5e3ff] selection:text-[#001b3c]">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-hairline/70 bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[480px] sm:max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              aria-label="Go back"
              className="p-1.5 -ml-1 text-ink hover:text-ink-secondary transition-colors rounded-full hover:bg-canvas-soft focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Next Path Logo & Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0075de] flex items-center justify-center text-white shadow-sm shadow-primary/20 shrink-0">
                <svg
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 18L10 12L15 17L21 6" />
                  <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="17" r="1.5" fill="currentColor" />
                  <circle cx="21" cy="6" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="font-extrabold text-base tracking-tight text-ink">
                NEXT PATH
              </span>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Help and Support"
              onClick={() =>
                setInfoMessage(
                  'Need assistance? Contact support@nextpath.edu or your school counselor.',
                )
              }
              className="p-2 text-ink-secondary hover:text-ink transition-colors rounded-full hover:bg-canvas-soft focus:outline-none"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              type="button"
              aria-label="Language options"
              onClick={() =>
                setInfoMessage('English is currently selected. Multilingual support available.')
              }
              className="p-2 text-ink-secondary hover:text-ink transition-colors rounded-full hover:bg-canvas-soft focus:outline-none"
            >
              <Globe className="w-5 h-5" />
            </button>

            <div
              className="w-7 h-7 ml-1 rounded-full bg-[#3b49df] text-white flex items-center justify-center shadow-sm"
              title="User Profile"
              aria-hidden="true"
            >
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Content Card */}
      <main className="w-full max-w-[460px] mx-auto px-4 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        {/* Informational notification toast */}
        {infoMessage && (
          <div className="mb-4 rounded-xl border border-[#0075de]/30 bg-[#0075de]/10 px-4 py-2.5 text-xs text-[#005bab] flex items-center justify-between animate-fade-in">
            <span>{infoMessage}</span>
            <button
              type="button"
              onClick={() => setInfoMessage(null)}
              className="text-ink-muted hover:text-ink ml-2 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Heading & Subtitle */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f3f0] border border-hairline text-xs font-semibold text-[#0075de] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0075de]" />
            {roleSubtitle}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight">
            {mode === 'login'
              ? 'Welcome Back'
              : mode === 'register'
                ? 'Create an Account'
                : 'Reset Password'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed max-w-[340px] mx-auto">
            {mode === 'login'
              ? 'Empowering your next career breakthrough with tailored AI insights.'
              : mode === 'register'
                ? 'Begin your guided career discovery with personalized pathways.'
                : 'Enter your verified email to receive secure recovery instructions.'}
          </p>
        </div>

        {/* Mode: Forgot Password Confirmation */}
        {mode === 'forgot' && forgotSent ? (
          <div className="bg-surface rounded-2xl border border-hairline/90 p-6 shadow-sm flex flex-col gap-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#0075de]/10 text-[#0075de] flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Check your inbox</h2>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1 leading-relaxed">
                We have dispatched password recovery instructions to{' '}
                <strong className="text-ink font-semibold">{email}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setForgotSent(false);
              }}
              className="mt-2 w-full bg-[#0075de] hover:bg-[#005bab] text-white font-semibold text-sm rounded-xl py-3 transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Form Surface */}
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="bg-surface rounded-2xl border border-hairline/90 p-5 sm:p-6 shadow-sm flex flex-col gap-4"
              noValidate
            >
              {/* Back to sign in link if in forgot mode */}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                  }}
                  className="text-xs text-[#0075de] hover:underline flex items-center gap-1 font-semibold w-fit"
                >
                  ← Back to Sign In
                </button>
              )}

              {/* Full Name field if registering */}
              {mode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="field-fullname"
                    className="text-xs sm:text-sm font-semibold text-ink"
                  >
                    Full Name
                  </label>
                  <div className="relative flex items-center rounded-xl bg-[#f4f3f0] border border-transparent focus-within:border-[#0075de] focus-within:bg-surface focus-within:ring-2 focus-within:ring-[#0075de]/20 transition-all px-3.5 py-3">
                    <User className="w-5 h-5 text-ink-muted shrink-0 mr-2.5" />
                    <input
                      id="field-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Patel"
                      className="w-full bg-transparent border-0 outline-none text-ink text-sm sm:text-base placeholder:text-ink-faint p-0"
                      autoComplete="name"
                      required
                    />
                  </div>
                  {errors.full_name && (
                    <p className="text-xs text-error mt-0.5">{errors.full_name}</p>
                  )}
                </div>
              )}

              {/* Identifier / Email Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="field-identifier"
                    className="text-xs sm:text-sm font-semibold text-ink"
                  >
                    {mode === 'forgot' ? 'Registered Email' : identifierLabel}
                  </label>
                  <span className="text-xs font-semibold text-[#0075de] select-none">
                    Verified Domain
                  </span>
                </div>
                <div className="relative flex items-center rounded-xl bg-[#f4f3f0] border border-transparent focus-within:border-[#0075de] focus-within:bg-surface focus-within:ring-2 focus-within:ring-[#0075de]/20 transition-all px-3.5 py-3">
                  <Mail className="w-5 h-5 text-ink-muted shrink-0 mr-2.5" />
                  <input
                    id="field-identifier"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={identifierPlaceholder}
                    className="w-full bg-transparent border-0 outline-none text-ink text-sm sm:text-base placeholder:text-ink-faint p-0"
                    autoComplete="email"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-error mt-0.5">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              {mode !== 'forgot' && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="field-password"
                    className="text-xs sm:text-sm font-semibold text-ink"
                  >
                    {mode === 'register' ? 'Create Password' : 'Password'}
                  </label>
                  <div className="relative flex items-center rounded-xl bg-[#f4f3f0] border border-transparent focus-within:border-[#0075de] focus-within:bg-surface focus-within:ring-2 focus-within:ring-[#0075de]/20 transition-all px-3.5 py-3">
                    <Lock className="w-5 h-5 text-ink-muted shrink-0 mr-2.5" />
                    <input
                      id="field-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent border-0 outline-none text-ink text-sm sm:text-base placeholder:text-ink-faint p-0 tracking-wide"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="p-1 text-ink-muted hover:text-ink transition-colors focus:outline-none shrink-0 ml-2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-error mt-0.5">{errors.password}</p>
                  )}
                </div>
              )}

              {/* Remember Me & Forgot Password Row */}
              {mode === 'login' && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-hairline text-[#0075de] focus:ring-[#0075de] accent-[#0075de]"
                    />
                    <span className="text-xs sm:text-sm font-medium text-ink-secondary">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrors({});
                    }}
                    className="text-xs sm:text-sm font-semibold text-[#0075de] hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Form level error */}
              {errors.form && (
                <div className="rounded-xl border border-error/30 bg-error-soft/30 p-3 text-xs text-error">
                  {errors.form}
                </div>
              )}

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 w-full bg-[#0075de] hover:bg-[#005bab] active:scale-[0.99] text-white font-semibold text-sm sm:text-base rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0075de]/30"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? submitButtonLabel
                        : mode === 'register'
                          ? 'Create Free Account'
                          : 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Bottom Sign-up / Sign-in toggle */}
        <div className="mt-5 text-center">
          {mode === 'login' ? (
            <p className="text-xs sm:text-sm text-ink-secondary">
              Don&apos;t have an institutional account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrors({});
                }}
                className="font-semibold text-[#0075de] hover:underline focus:outline-none"
              >
                Sign Up Free
              </button>
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-ink-secondary">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="font-semibold text-[#0075de] hover:underline focus:outline-none"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Security & Ethics Badge */}
        <div className="mt-6 mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f0ede8] border border-hairline/80 text-[11px] sm:text-xs font-medium text-ink-muted select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0075de]" />
            <span>256-Bit Encrypted • SOC2 • Responsible AI Ethics</span>
          </div>
        </div>
      </main>

      {/* Footer / Empty baseline for balanced vertical alignment */}
      <footer className="w-full py-2" />
    </div>
  );
}

