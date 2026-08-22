/** Sign in and account creation. */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Callout, Card, Field, Input, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api_client';
import { loginSchema, registerSchema } from '@/types/forms';
import type { UserRole } from '@/types/models';

type Mode = 'login' | 'register';

export function AuthView(): JSX.Element {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});

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
            : 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-lg py-xl">
      <header className="text-center">
        <h1 className="text-heading-1 text-ink">Next_Path</h1>
        <p className="mx-auto mt-xs max-w-[42ch] text-body-md text-ink-secondary">
          Work out what to do next — with honest options, real costs, and no pretence
          about what we do not know.
        </p>
      </header>

      <Card>
        <div
          className="mb-lg flex rounded-md border border-hairline p-xxs"
          role="tablist"
          aria-label="Sign in or create an account"
        >
          {(['login', 'register'] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => {
                setMode(option);
                setErrors({});
              }}
              className={`min-h-touch flex-1 rounded-sm text-body-sm transition-colors ${
                mode === option ? 'bg-primary text-on-primary' : 'text-ink-secondary'
              }`}
            >
              {option === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form className="flex flex-col gap-md" onSubmit={(event) => void submit(event)}>
          {mode === 'register' && (
            <>
              <Field label="Your name" error={errors.full_name} required>
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    value={fullName}
                    invalid={invalid}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                  />
                )}
              </Field>

              <Field label="I am a" hint="Guardians and counselors need their own account.">
                {({ id }) => (
                  <Select
                    id={id}
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                  >
                    <option value="student">Student</option>
                    <option value="guardian">Parent or guardian</option>
                    <option value="counselor">Counselor</option>
                  </Select>
                )}
              </Field>
            </>
          )}

          <Field label="Email" error={errors.email} required>
            {({ id, invalid }) => (
              <Input
                id={id}
                type="email"
                value={email}
                invalid={invalid}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            )}
          </Field>

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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            )}
          </Field>

          {errors.form && <Callout variant="error">{errors.form}</Callout>}

          <Button type="submit" loading={submitting} fullWidth>
            {mode === 'login' ? 'Sign in' : 'Create my account'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-caption text-ink-muted">
        Under 18? You can fill in everything yourself — we will ask a parent or guardian
        to agree before generating your options.
      </p>
    </div>
  );
}
