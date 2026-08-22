import { describe, expect, it } from 'vitest';

import { formatBucket, formatInr, formatInrRange, formatStage, humanize } from '@/utils/format';

describe('formatInr', () => {
  it('uses Indian digit grouping, not Western thousands', () => {
    // ₹2,50,000 — grouping by two after the first three digits. Getting this wrong is
    // a small thing that makes a product feel foreign to its users.
    expect(formatInr(250000).replace(/ /g, ' ')).toContain('2,50,000');
    expect(formatInr(10000000).replace(/ /g, ' ')).toContain('1,00,00,000');
  });

  it('drops decimal paise', () => {
    expect(formatInr(1500)).not.toContain('.');
  });
});

describe('formatInrRange', () => {
  it('collapses to one figure when both ends match', () => {
    expect(formatInrRange(50000, 50000)).toBe(formatInr(50000));
  });

  it('renders a range when the ends differ', () => {
    expect(formatInrRange(50000, 200000)).toContain('–');
  });
});

describe('label helpers', () => {
  it('formats education stages readably', () => {
    expect(formatStage('class_8_10')).toBe('Class 8–10');
    expect(formatStage('early_college')).toBe('Early college');
  });

  it('formats timeframe buckets in plain language', () => {
    expect(formatBucket('next_7_days')).toBe('This week');
    expect(formatBucket('day_180')).toBe('By day 180');
  });

  it('falls back to the raw value for an unknown key rather than rendering blank', () => {
    expect(formatStage('something_new')).toBe('something_new');
    expect(formatBucket('day_365')).toBe('day_365');
  });

  it('humanizes snake_case keys', () => {
    expect(humanize('social_science')).toBe('Social science');
  });
});
