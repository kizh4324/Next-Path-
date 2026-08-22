/** Scholarship search and detail drawer (FR-13, Story 3.5). */

import { useState } from 'react';

import { Badge, Button, Callout, Card, Field, Input, Modal, Select, SkeletonCard } from '@/components/ui';
import { useScholarships } from '@/hooks/useRoadmap';
import { formatDate, formatInr } from '@/utils/format';
import type { Scholarship } from '@/types/models';

const STATES = ['Maharashtra', 'All India', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'Kerala'];
const CATEGORIES = ['all', 'SC', 'ST', 'OBC', 'Minority', 'PWD', 'General'];
const QUALIFICATIONS = ['10th', '12th', 'Graduation', 'Post-Graduation'];

export function ScholarshipsView(): JSX.Element {
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [qualification, setQualification] = useState('');
  const [income, setIncome] = useState('');
  const [selected, setSelected] = useState<Scholarship | null>(null);

  const { data, isLoading } = useScholarships({
    state: state || undefined,
    target_category: category || undefined,
    min_qualification: qualification || undefined,
    max_income_inr: income ? Number(income) : undefined,
  });

  return (
    <div className="flex flex-col gap-lg">
      <header>
        <p className="eyebrow">Financial support</p>
        <h1 className="text-heading-2 text-ink">Scholarships you may be eligible for</h1>
        <p className="mt-xs max-w-[60ch] text-body-sm text-ink-muted">
          Every entry links to its official portal. Applications usually need an income
          certificate and a domicile certificate, and those take weeks to obtain — start
          collecting them before a deadline is close.
        </p>
      </header>

      <Card>
        <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="State">
            {({ id }) => (
              <Select id={id} value={state} onChange={(event) => setState(event.target.value)}>
                <option value="">Any state</option>
                {STATES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Category">
            {({ id }) => (
              <Select id={id} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Any category</option>
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Your level">
            {({ id }) => (
              <Select
                id={id}
                value={qualification}
                onChange={(event) => setQualification(event.target.value)}
              >
                <option value="">Any level</option>
                {QUALIFICATIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Family income (₹ per year)" hint="Optional">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                value={income}
                onChange={(event) => setIncome(event.target.value)}
                placeholder="e.g. 250000"
              />
            )}
          </Field>
        </div>
      </Card>

      {isLoading && <SkeletonCard />}

      {data && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-xs">
            <p className="text-body-sm text-ink-secondary">
              {data.total} {data.total === 1 ? 'scholarship' : 'scholarships'} found
            </p>
          </div>

          {data.total === 0 && (
            <Callout variant="evidence" title="Nothing matched — and that is worth reading">
              {data.coverage_note}
            </Callout>
          )}

          <ul className="grid gap-md md:grid-cols-2">
            {data.results.map((scholarship) => (
              <Card as="li" key={scholarship.id} className="flex flex-col gap-sm">
                <div className="flex flex-wrap items-start justify-between gap-xs">
                  <h2 className="text-title text-ink">{scholarship.name}</h2>
                  <Badge>{scholarship.sponsor_type}</Badge>
                </div>
                <div className="flex flex-wrap gap-xxs">
                  <Badge>{scholarship.state}</Badge>
                  <Badge>{scholarship.target_category}</Badge>
                  <Badge>{scholarship.min_qualification}</Badge>
                </div>
                <p className="text-body-sm text-ink-secondary line-clamp-3">
                  {scholarship.amount_description}
                </p>
                <p className="text-caption text-ink-muted">
                  {scholarship.income_ceiling_inr === 0
                    ? 'No stated income ceiling'
                    : `Family income up to ${formatInr(scholarship.income_ceiling_inr)}`}
                </p>
                <Button
                  variant="utility"
                  className="mt-auto self-start"
                  onClick={() => setSelected(scholarship)}
                >
                  See what you need
                </Button>
              </Card>
            ))}
          </ul>

          <p className="text-caption text-ink-faint">{data.coverage_note}</p>
        </>
      )}

      <Modal
        open={selected !== null}
        title={selected?.name ?? ''}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="flex flex-col gap-md">
            <div>
              <p className="eyebrow">Who can apply</p>
              <p className="text-body-sm text-ink-secondary">{selected.eligibility_summary}</p>
            </div>
            <div>
              <p className="eyebrow">What you get</p>
              <p className="text-body-sm text-ink-secondary">{selected.amount_description}</p>
            </div>
            <div>
              <p className="eyebrow">Deadline</p>
              <p className="text-body-sm text-ink-secondary">{selected.deadline_description}</p>
            </div>
            <div>
              <p className="eyebrow">Documents to gather</p>
              <ul className="mt-xxs list-disc space-y-xxs pl-md text-body-sm text-ink-secondary">
                {selected.required_documents.map((document) => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </div>
            {selected.renewal_conditions && (
              <div>
                <p className="eyebrow">Renewal</p>
                <p className="text-body-sm text-ink-secondary">{selected.renewal_conditions}</p>
              </div>
            )}

            <Callout variant="evidence">
              We last checked this entry on {formatDate(selected.last_verified_date)}. Terms
              and deadlines change without notice — the official portal is always right,
              and this page is only a pointer to it.
            </Callout>

            <a
              href={selected.official_source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-primary self-start"
            >
              Open the official portal
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}
