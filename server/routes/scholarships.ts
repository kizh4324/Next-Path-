import { Router, Request, Response } from 'express';
import { getScholarships } from '../data/seedData';

const router = Router();

// GET /scholarships
router.get('/', (req: Request, res: Response) => {
  const { state, target_category, min_qualification, max_income_inr, limit = 50, offset = 0 } = req.query;

  let list = getScholarships();

  if (state && state !== 'All India') {
    list = list.filter(
      (s) => s.state.toLowerCase() === String(state).toLowerCase() || s.state === 'All India',
    );
  }

  if (target_category) {
    list = list.filter((s) =>
      s.target_category.toLowerCase().includes(String(target_category).toLowerCase()),
    );
  }

  if (min_qualification) {
    list = list.filter((s) =>
      s.min_qualification.toLowerCase().includes(String(min_qualification).toLowerCase()),
    );
  }

  if (max_income_inr) {
    const incomeNum = Number(max_income_inr);
    if (!isNaN(incomeNum) && incomeNum > 0) {
      list = list.filter((s) => s.income_ceiling_inr >= incomeNum || s.income_ceiling_inr === 0);
    }
  }

  const total = list.length;
  const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const pageOffset = Math.max(0, Number(offset) || 0);
  const results = list.slice(pageOffset, pageOffset + pageLimit);

  return res.status(200).json({
    total,
    results,
    coverage_note:
      'Verified central, state, and institutional scholarship schemes indexed from National Scholarship Portal (NSP) and State Education Portals.',
  });
});

export default router;
