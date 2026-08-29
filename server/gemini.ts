import { GoogleGenAI } from '@google/genai';
import { Career } from './data/seedData';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'self harm',
  'hopeless',
  'cannot live',
  'die',
  'abuse',
  'beaten',
  'depressed to death',
];

export function detectCrisisFlag(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

export const CRISIS_RESPONSE = {
  answer:
    "I hear how overwhelming things feel right now, but please know that you are not alone and help is available immediately.\n\n" +
    "**Immediate Free & Confidential Helplines in India:**\n" +
    "- **Tele-MANAS (Govt of India):** 14416 or 1800-891-4416 (24/7, Toll-Free, Multi-lingual)\n" +
    "- **KIRAN (Mental Health Helpline):** 1800-599-0019 (24/7)\n" +
    "- **Vandrevala Foundation:** 9999 666 555\n" +
    "- **AASRA:** +91 98204 66726 (24/7)\n\n" +
    "We have also flagged this for a certified counselor to reach out with personalized guidance and care.",
  safety_flag: true,
  suggested_next_questions: [
    'How do I talk to a counselor?',
    'What free mental health resources are available?',
  ],
  sources: ['Tele-MANAS National Tele-Mental Health Programme (Govt. of India)'],
};

export async function answerCareerQuery(
  question: string,
  career: Career | null,
  studentContext?: {
    educationStage?: string;
    budgetTier?: string;
  },
): Promise<{
  answer: string;
  safety_flag: boolean;
  suggested_next_questions: string[];
  sources: string[];
}> {
  if (detectCrisisFlag(question)) {
    return CRISIS_RESPONSE;
  }

  const client = getGeminiClient();
  const careerContext = career
    ? `Career: ${career.title} (Cluster: ${career.cluster})\n` +
      `Description: ${career.description}\n` +
      `Work Reality Summary: ${career.work_reality_summary}\n` +
      `Prerequisites: ${career.prerequisites}\n` +
      `Entry Routes in India: ${JSON.stringify(career.india_entry_routes, null, 2)}\n` +
      `Risks & Tradeoffs: ${career.risks_and_tradeoffs.join('; ')}\n` +
      `Regional Caveats: ${career.regional_caveats.join('; ')}\n`
    : 'No specific career selected. General Indian career guidance context.';

  const studentInfo = studentContext
    ? `Student Stage: ${studentContext.educationStage || 'Not specified'}, Family Budget Tier: ${studentContext.budgetTier || 'Not specified'}\n`
    : '';

  const systemInstruction =
    `You are Next_Path AI, an honest, grounded career counseling companion for Indian students.\n` +
    `CRITICAL DIRECTIVES:\n` +
    `1. Be empathetic, realistic, and objective about job realities in India.\n` +
    `2. Never give fake hype or promise guaranteed placements. Mention real entrance exams, typical fee ranges, and practical milestones.\n` +
    `3. Always reference official Indian portals (e.g. NTA, SWAYAM, scholarships.gov.in, NCS) when applicable.\n` +
    `4. Keep answers concise, clear, and structured with bullet points where appropriate.\n\n` +
    `${studentInfo}` +
    `CAREER CATALOGUE FACTS:\n${careerContext}`;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemInstruction },
              { text: `Student Question: ${question}` },
            ],
          },
        ],
      });

      const text = response.text || '';
      return {
        answer: text,
        safety_flag: false,
        suggested_next_questions: [
          `What are the typical entrance exams for this path?`,
          `Are there low-cost or scholarship routes available?`,
          `What beginner projects can I start this week?`,
        ],
        sources: career?.source_links?.length
          ? career.source_links
          : ['National Career Service (ncs.gov.in)', 'SWAYAM / NPTEL (swayam.gov.in)'],
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to grounded rule template:', err);
    }
  }

  // Grounded fallback response if API key is not configured or offline
  if (career) {
    const route = career.india_entry_routes?.[0];
    const exam = route?.entrance_exams?.join(', ') || 'Direct / Merit basis';
    const cost = `₹${(route?.estimated_cost_inr_min || 0).toLocaleString('en-IN')} - ₹${(route?.estimated_cost_inr_max || 0).toLocaleString('en-IN')}`;
    return {
      answer:
        `Here is the key guidance regarding **${career.title}** for Indian students:\n\n` +
        `• **Day-to-Day Reality:** ${career.work_reality_summary}\n\n` +
        `• **Standard Entry Route:** ${route?.route_name || 'Degree / Diploma'} (Duration: ~${route?.duration_years || 3} years)\n` +
        `• **Key Entrance Exams:** ${exam}\n` +
        `• **Estimated Cost Tier:** ${cost} (${route?.cost_tier?.replace(/_/g, ' ') || 'standard'})\n` +
        `• **Low-Cost Alternate:** ${route?.low_cost_alternative_route || 'State government colleges or polytechnics with subsidized fee structures'}\n\n` +
        `• **Prerequisites & Caveats:** ${career.prerequisites}. Note: ${career.regional_caveats?.[0] || 'Check state-specific eligibility criteria.'}`,
      safety_flag: false,
      suggested_next_questions: [
        `What scholarships apply to ${career.title}?`,
        `What are the top skills needed for ${career.title}?`,
        `Show me beginner practice projects.`,
      ],
      sources: career.source_links || ['National Career Service (ncs.gov.in)'],
    };
  }

  return {
    answer:
      `Next_Path helps you evaluate 3-5 grounded career trajectories in India with transparent fit, budget feasibility, and actionable milestones.\n\n` +
      `To get tailored guidance, choose a career track or complete your onboarding profile to view your RIASEC score match, entrance exam requirements, and verified scholarships.`,
    safety_flag: false,
    suggested_next_questions: [
      'How does Next_Path score fit and feasibility?',
      'What scholarships are available in Maharashtra and across India?',
      'How do I build my portfolio projects?',
    ],
    sources: ['Next_Path Decision Engine', 'O*NET 30.3 & India Authoring Data'],
  };
}

export async function generateParentSummary(
  studentName: string,
  primaryCareer: Career,
  backupCareer: Career | null,
  budgetTier: string,
  language: string = 'English',
): Promise<{
  summary_text: string;
  language: string;
  key_points: string[];
  action_items_for_parents: string[];
}> {
  const client = getGeminiClient();

  const prompt =
    `Generate a respectful, reassuring, and realistic parent/guardian summary for an Indian household about their child's career trajectory.\n` +
    `Child Name: ${studentName}\n` +
    `Primary Career: ${primaryCareer.title} (Cluster: ${primaryCareer.cluster})\n` +
    `Primary Entry Cost: ₹${(primaryCareer.india_entry_routes?.[0]?.estimated_cost_inr_min || 0).toLocaleString('en-IN')} - ₹${(primaryCareer.india_entry_routes?.[0]?.estimated_cost_inr_max || 0).toLocaleString('en-IN')}\n` +
    `Backup Career: ${backupCareer ? backupCareer.title : 'None selected'}\n` +
    `Family Budget Tier: ${budgetTier.replace(/_/g, ' ')}\n` +
    `Language: ${language}\n\n` +
    `Structure your summary with:\n` +
    `1. Summary overview explaining the rationale and honest employment prospects.\n` +
    `2. 3-4 bullet points on budget, safety, and academic timeline.\n` +
    `3. 2 actionable ways parents can support without undue financial stress.`;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = response.text || '';
      return {
        summary_text: text,
        language,
        key_points: [
          `Primary pathway: ${primaryCareer.title} with transparent fee breakdown`,
          backupCareer ? `Safe backup plan: ${backupCareer.title}` : 'Backup pathway is being planned',
          `Scholarships and fee-waivers can subsidize tuition costs`,
        ],
        action_items_for_parents: [
          'Review entrance exam dates and local college options together with your student.',
          'Verify family eligibility for state and central government scholarship schemes on scholarships.gov.in.',
        ],
      };
    } catch (err) {
      console.warn('Gemini guardian summary failed, using grounded template:', err);
    }
  }

  // Grounded template
  return {
    summary_text:
      `Dear Parent / Guardian,\n\n` +
      `Your student ${studentName} has evaluated career options using Next_Path and identified **${primaryCareer.title}** as their primary pathway` +
      (backupCareer ? ` with **${backupCareer.title}** as a secure backup.` : '.') +
      `\n\n**Key Facts:**\n` +
      `• **Career Focus:** ${primaryCareer.cluster} — ${primaryCareer.description}\n` +
      `• **Estimated Education Cost:** ₹${(primaryCareer.india_entry_routes?.[0]?.estimated_cost_inr_min || 0).toLocaleString('en-IN')} to ₹${(primaryCareer.india_entry_routes?.[0]?.estimated_cost_inr_max || 0).toLocaleString('en-IN')} depending on state vs private institution.\n` +
      `• **Cost Protection:** Multiple central and state scholarships exist to bridge financial requirements.\n` +
      `• **Next Steps:** The student has a 7-day to 180-day milestone roadmap to test foundational skills with zero-cost learning resources before making financial commitments.`,
    language,
    key_points: [
      `Primary Career: ${primaryCareer.title}`,
      backupCareer ? `Backup Career: ${backupCareer.title}` : 'Backup pathway explored',
      `Clear timeline with free learning modules and entrance exam checkpoints`,
    ],
    action_items_for_parents: [
      'Encourage completion of the 7-day exploration milestone.',
      'Check family eligibility documents for state scholarship portals.',
    ],
  };
}
