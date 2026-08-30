/**
 * Guardian consent gate for minors (FR-20, Story 1.5 state 2).
 *
 * Deliberately not dismissible: closing it would leave the student looking at an
 * unlocked-looking app that will 403 on the next step. The gate is the product
 * behaviour, not an obstacle to route around.
 */

import { useState } from 'react';

import { Button, Callout, Field, Input, Modal, Select } from '@/components/ui';
import { ApiError } from '@/services/api_client';
import { authApi } from '@/services/endpoints';

const RELATIONSHIPS = ['Mother', 'Father', 'Legal Guardian', 'Grandparent', 'Other relative'];

export function MinorConsentModal({
  open,
  studentProfileId,
  onClose,
  onRecorded,
}: {
  open: boolean;
  studentProfileId: string | null;
  onClose: () => void;
  onRecorded: () => void;
}): JSX.Element {
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [relationship, setRelationship] = useState('Mother');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<void> {
    if (!studentProfileId) return;
    setError(null);
    setSubmitting(true);
    try {
      await authApi.recordMinorConsent({
        student_profile_id: studentProfileId,
        guardian_email: guardianEmail.trim(),
        guardian_full_name: guardianName.trim(),
        guardian_phone: null,
        relationship_to_student: relationship,
        consent_confirmed: true,
      });
      onRecorded();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'We could not record consent. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="A parent or guardian needs to agree first"
      onClose={onClose}
      dismissible={false}
    >
      <div className="flex flex-col gap-md">
        <p className="text-body-sm text-ink-secondary">
          You are under 18, so we need a parent or guardian to confirm before we generate
          your career options. They need their own Next_Path account — signing in on it
          and submitting this form records their consent.
        </p>

        <Field label="Guardian's email address" required>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="email"
              value={guardianEmail}
              invalid={invalid}
              onChange={(event) => setGuardianEmail(event.target.value)}
              placeholder="parent@example.com"
              autoComplete="email"
            />
          )}
        </Field>

        <Field label="Guardian's full name" required>
          {({ id }) => (
            <Input
              id={id}
              value={guardianName}
              onChange={(event) => setGuardianName(event.target.value)}
              placeholder="Full name"
            />
          )}
        </Field>

        <Field label="How are they related to you?" required>
          {({ id }) => (
            <Select
              id={id}
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
            >
              {RELATIONSHIPS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <label className="flex items-start gap-xs text-body-sm text-ink-secondary">
          <input
            type="checkbox"
            className="mt-xxs h-5 w-5"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            As the parent or guardian, I agree to Next_Path processing this student's
            profile to generate career guidance. I understand the results are options to
            discuss, not a prediction, and that we can delete this data at any time.
          </span>
        </label>

        {error && <Callout variant="error">{error}</Callout>}

        <Callout variant="info">
          Not with your guardian right now? Your answers are saved. Come back and finish
          this together — nothing is lost.
        </Callout>

        <div className="flex flex-wrap gap-xs">
          <Button
            onClick={() => void submit()}
            loading={submitting}
            disabled={!confirmed || !guardianEmail.trim() || !guardianName.trim()}
          >
            Record consent
          </Button>
          <Button variant="utility" onClick={onClose}>
            I'll do this later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
