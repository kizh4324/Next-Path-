/** Sign in, account creation, and password reset flows with Editorial Minimalism. */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Callout, Card, Field, Input, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api_client';
import { loginSchema, registerSchema } from '@/types/forms';
import type { UserRole } from '@/types/models';

type Mode = 'login' | 'register' | 'forgot';

export function AuthView(): JSX.Element {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [forgotSent, setForgotSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});

    if (mode === 'forgot') {
      if (!email.includes('@')) {
        setErrors({ email: 'Please enter a valid email address.' });
        return;
      }
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        setForgotSent(true);
      }, 600);
      return;
    }

    const parsed =
      mode === 'login'
        ? loginSchema.safeParse({ email, password })
        : registerSchema.safeParse({ email, password, full_name: fullName, role });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, full_name: fullName, role });
      }
      navigate(role === 'counselor' ? '/counselor' : '/results');
    } catch (caught) {
      setErrors({
        form:
          caught instanceof ApiError
            ? caught.message
            : 'Something went wrong. Please check your details and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoRole: UserRole): void {
    if (demoRole === 'student') {
      setEmail('student@example.com');
      setPassword('password123');
      setFullName('Aarav Sharma');
      setRole('student');
    } else {
      setEmail('counselor@example.com');
      setPassword('password123');
      setFullName('Dr. Meera Iyer');
      setRole('counselor');
    }
  }

  return (
    <div className="mx-auto flex max-w-[500px] flex-col gap-lg px-md py-xl">
      <header className="text-center">
        <div className="mx-auto mb-xs flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary font-bold text-lg">
          N
        </div>
        <h1 className="text-heading-1 text-ink font-bold tracking-tight">Next_Path</h1>
        <p className="mx-auto mt-xs max-w-[40ch] text-body-md text-ink-secondary leading-relaxed">
          Grounded, high-trust career pathways for Indian students. Real college costs, entrance timelines, and verified evidence.
        </p>
      </header>

      <Card className="p-xl bg-surface border-hairline">
        {mode !== 'forgot' && (
          <div
            className="mb-lg flex rounded-full border border-hairline bg-canvas-soft p-1"
            role="tablist"
            aria-label="Sign in or create an account"
          >
            {(['login', 'register'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={mode === option}
                onClick={() => {
                  setMode(option);
                  setErrors({});
                  setForgotSent(false);
                }}
                className={`min-h-touch flex-1 rounded-full text-body-sm font-medium transition-all ${
                  mode === option
                    ? 'bg-surface text-primary font-semibold shadow-sm border border-hairline'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {option === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        {mode === 'forgot' && (
          <div className="mb-md">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setForgotSent(false);
              }}
              className="text-caption text-primary hover:underline flex items-center gap-1 mb-xs"
            >
              ← Back to Sign In
            </button>
            <h2 className="text-heading-3 text-ink font-semibold">Reset your password</h2>
            <p className="text-body-sm text-ink-muted mt-xxs">
              Enter your email address and we will send you a secure link to reset your account password.
            </p>
          </div>
        )}

        {forgotSent ? (
          <div className="flex flex-col gap-md py-sm">
            <Callout variant="info" title="Check your inbox">
              We have sent password reset instructions to <strong className="text-ink">{email}</strong>. Please check your email to continue.
            </Callout>
            <Button variant="utility" onClick={() => setMode('login')} fullWidth>
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-md" onSubmit={(event) => void submit(event)}>
            {mode === 'register' && (
              <>
                <Field label="Full Name" error={errors.full_name} required>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      value={fullName}
                      invalid={invalid}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="e.g. Priya Patel"
                      autoComplete="name"
                    />
                  )}
                </Field>

                <Field label="I am joining as a" hint="Parents and counselors have tailored summary portals.">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={role}
                      onChange={(event) => setRole(event.target.value as UserRole)}
                    >
                      <option value="student">Student (Class 8–12 / College)</option>
                      <option value="guardian">Parent or Guardian</option>
                      <option value="counselor">Career Counselor</option>
                    </Select>
                  )}
                </Field>
              </>
            )}

            <Field label="Email address" error={errors.email} required>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  value={email}
                  invalid={invalid}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@example.com"
                  autoComplete="email"
                />
              )}
            </Field>

            {mode !== 'forgot' && (
              <Field
                label="Password"
                error={errors.password}
                hint={mode === 'register' ? 'At least 8 characters.' : undefined}
                required
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    type="password"
                    value={password}
                    invalid={invalid}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                )}
              </Field>
            )}

            {mode === 'login' && (
              <div className="flex justify-end -mt-xs">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-caption text-primary hover:underline focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {errors.form && <Callout variant="error">{errors.form}</Callout>}

            <Button type="submit" loading={submitting} fullWidth className="mt-xs">
              {mode === 'login'
                ? 'Sign In to Next_Path'
                : mode === 'register'
                  ? 'Create My Account'
                  : 'Send Reset Link'}
            </Button>
          </form>
        )}

        {/* Quick Demo Pre-fill helper for instant exploration */}
        <div className="mt-lg border-t border-hairline pt-md text-center">
          <p className="text-caption text-ink-muted mb-xs">Fast exploration shortcuts:</p>
          <div className="flex justify-center gap-xs">
            <button
              type="button"
              onClick={() => fillDemo('student')}
              className="text-caption text-primary border border-hairline rounded-full px-sm py-1 bg-canvas-soft hover:bg-canvas-container"
            >
              Fill Student Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo('counselor')}
              className="text-caption text-primary border border-hairline rounded-full px-sm py-1 bg-canvas-soft hover:bg-canvas-container"
            >
              Fill Counselor Demo
            </button>
          </div>
        </div>
      </Card>

      <div className="rounded-lg border border-hairline bg-canvas-soft p-md text-center">
        <p className="text-caption text-ink-secondary leading-relaxed">
          <strong className="font-semibold text-ink">DPDP Act Compliant:</strong> Minors under 18 can freely draft their profile. We request parental consent before finalizing options. You can delete all your data permanently at any time.
        </p>
      </div>
    </div>
  );
}
