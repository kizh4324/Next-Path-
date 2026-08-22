/**
 * Account settings, including the right to erasure (FR-20, Story 5.4).
 *
 * The retention exception is disclosed before the student confirms, not after. Telling
 * someone afterwards that a record was kept would defeat the point of asking.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Callout, Card, Modal } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api_client';
import { accountApi, escalationApi } from '@/services/endpoints';
import type { ErasureReceipt } from '@/types/models';

export function SettingsView(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<ErasureReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [counselorRequested, setCounselorRequested] = useState(false);

  async function erase(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setReceipt(await accountApi.erase());
      setConfirmOpen(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'We could not complete that request.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestCounselor(): Promise<void> {
    setError(null);
    try {
      await escalationApi.trigger('student_requested', 'Requested from account settings.');
      setCounselorRequested(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not send that request.');
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto flex max-w-wizard flex-col gap-lg">
        <h1 className="text-heading-2 text-ink">Your data has been deleted</h1>
        <Card className="flex flex-col gap-sm">
          <ul className="list-disc space-y-xxs pl-md text-body-sm text-ink-secondary">
            <li>Profile and guardian details: deleted</li>
            <li>{receipt.deleted_roadmaps} roadmap(s): deleted</li>
            <li>{receipt.deleted_recommendation_batches} recommendation cycle(s): deleted</li>
            <li>{receipt.deleted_chat_interactions} chat message(s): deleted</li>
            {receipt.anonymized_escalations > 0 && (
              <li>
                {receipt.anonymized_escalations} safety record(s): kept, with all
                identifying details removed
              </li>
            )}
          </ul>
          <Callout variant="info">{receipt.retention_note}</Callout>
          <Button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="self-start"
          >
            Close
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-wizard flex-col gap-lg">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="text-heading-2 text-ink">Settings</h1>
      </header>

      <Card>
        <h2 className="text-title text-ink">Signed in as</h2>
        <p className="mt-xxs text-body-sm text-ink-secondary">
          {user?.full_name} · {user?.email} · {user?.role}
        </p>
      </Card>

      <Card className="flex flex-col gap-sm">
        <h2 className="text-title text-ink">Talk to a counselor</h2>
        <p className="text-body-sm text-ink-secondary">
          If you are stuck, disagreeing with your family, or none of the options feel
          right, a person can help in a way this app cannot.
        </p>
        {counselorRequested ? (
          <Callout variant="info">
            Your request is in the queue. A counselor will see your profile as it stands
            right now.
          </Callout>
        ) : (
          <Button variant="utility" className="self-start" onClick={() => void requestCounselor()}>
            Request a conversation
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-sm">
        <h2 className="text-title text-ink">Delete my data</h2>
        <p className="text-body-sm text-ink-secondary">
          This removes your profile, guardian details, recommendations, roadmap, and chat
          history permanently. It cannot be undone.
        </p>
        <Callout variant="info" title="One exception, so you know before you decide">
          If you ever received a crisis-support response, that record is kept — with your
          name, email, and every identifying detail stripped out. It cannot be linked back
          to you. We keep it because we have a duty of care to review those incidents, not
          because we want your data.
        </Callout>
        {error && <Callout variant="error">{error}</Callout>}
        <Button variant="destructive" className="self-start" onClick={() => setConfirmOpen(true)}>
          Delete my data
        </Button>
      </Card>

      <Modal open={confirmOpen} title="Delete everything?" onClose={() => setConfirmOpen(false)}>
        <div className="flex flex-col gap-md">
          <p className="text-body-sm text-ink-secondary">
            Your profile, recommendations, roadmap, and chat history will be permanently
            deleted. Anonymized crisis-safety records are retained as described. You will
            be signed out.
          </p>
          {error && <Callout variant="error">{error}</Callout>}
          <div className="flex flex-wrap gap-xs">
            <Button variant="destructive" onClick={() => void erase()} loading={busy}>
              Yes, delete everything
            </Button>
            <Button variant="utility" onClick={() => setConfirmOpen(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
