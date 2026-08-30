/**
 * Chatbot state.
 *
 * The API is single-turn and stateless by design (FR-16), so the transcript lives here
 * in component state only. It is deliberately not persisted: a student's questions
 * about their own future are not something to leave sitting in localStorage on a
 * shared family device.
 */

import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { chatApi } from '@/services/endpoints';
import type { ChatTurn } from '@/types/models';

let turnCounter = 0;
const nextTurnId = (): string => `turn-${(turnCounter += 1)}`;

export function useChatbot(focusCareerId?: string | null) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const mutation = useMutation({
    mutationFn: ({ question }: { question: string; turnId: string }) =>
      chatApi.send(question, focusCareerId),
    onSuccess: (response, variables) => {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === variables.turnId ? { ...turn, response, pending: false } : turn,
        ),
      );
    },
    onError: (_error, variables) => {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === variables.turnId ? { ...turn, pending: false, failed: true } : turn,
        ),
      );
    },
  });

  const ask = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      const turnId = nextTurnId();
      setTurns((current) => [
        ...current,
        { id: turnId, question: trimmed, response: null, pending: true },
      ]);
      mutation.mutate({ question: trimmed, turnId });
    },
    [mutation],
  );

  const clear = useCallback(() => setTurns([]), []);

  return {
    turns,
    ask,
    clear,
    isSending: mutation.isPending,
    /** True once a crisis reply has appeared — the UI stays in support mode. */
    hasCrisisResponse: turns.some((turn) => turn.response?.is_crisis_response),
  };
}
