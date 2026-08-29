import { Router, Request, Response } from 'express';
import { getCareerById } from '../data/seedData';
import { answerCareerQuery } from '../gemini';
import { getAuthUser } from './auth';
import { store } from '../store';

const router = Router();

// POST /chat/message
router.post('/message', async (req: Request, res: Response) => {
  const { question, career_id } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      type: 'https://nextpath.in/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Question text is required.',
    });
  }

  const user = getAuthUser(req);
  const profile = user ? store.profiles.get(user.id) : null;
  const career = career_id ? getCareerById(career_id) || null : null;

  try {
    const result = await answerCareerQuery(question, career, {
      educationStage: profile?.education_stage,
      budgetTier: profile?.budget_tier,
    });

    // If safety crisis flag triggered, auto log an escalation in counselor queue
    if (result.safety_flag && user) {
      const escalation = {
        id: `esc-crisis-${Date.now().toString(36)}`,
        student_id: user.id,
        student_name: user.full_name,
        trigger_reason: 'crisis_safety_flag',
        student_note: `Automated safety trigger: "${question.substring(0, 120)}"`,
        status: 'pending' as const,
        counselor_id: null,
        counselor_notes: null,
        counselor_override_decision: null,
        counselor_override_rationale: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
      };
      store.escalations.set(escalation.id, escalation);
    }

    return res.status(200).json({
      answer: result.answer,
      safety_flag: result.safety_flag,
      suggested_next_questions: result.suggested_next_questions,
      sources: result.sources,
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({
      type: 'https://nextpath.in/errors/internal-error',
      title: 'Chat Service Unavailable',
      status: 500,
      detail: 'Could not process question. Please try again.',
    });
  }
});

export default router;
