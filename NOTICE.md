# Third-Party Data Attributions

Next_Path is built on third-party datasets. The attributions below are required by the
licenses those datasets are distributed under. Do not remove them.

---

## O*NET® 30.3 Database — Career Library & Skills (`Dataset/Career library/`)

This product includes information from the **O*NET 30.3 Database** by the U.S. Department
of Labor, Employment and Training Administration (USDOL/ETA). Used under the
**CC BY 4.0** license. O*NET® is a trademark of USDOL/ETA.

- Source: <https://www.onetcenter.org/database.html>
- License: <https://creativecommons.org/licenses/by/4.0/>
- Release: 30.3, May 2026

**Modifications made by Next_Path.** The O*NET data has been modified. Next_Path does not
distribute the O*NET database as-is; it derives a curated subset:

1. Importance ratings (Scale ID `IM`, raw 1.0–5.0) are linearly normalized to 0–100 via
   `(raw − 1.0) / 4.0 × 100` and bucketed into `essential` (≥ 70), `useful` (50–69),
   and `optional` (< 50) tiers.
2. RIASEC interest vectors and Job Zones are mapped onto a curated set of 26 career
   entries relevant to Indian students.
3. Indian entry routes, entrance examinations, INR cost bands, regional caveats, and
   risk/trade-off notes are **authored by Next_Path and are not O*NET content**.

USDOL/ETA has not reviewed, approved, or endorsed Next_Path, and neither sponsors nor
endorses any conclusions drawn from the modified data.

---

## Naukri India Job Postings Sample — Market Snapshots (`Dataset/Job Market/`)

Aggregated job-posting sample used to derive `market_snapshots` (demand indicators,
salary bands, skill frequency, hiring locations).

**Coverage limitation, surfaced in-product:** this sample covers **Data Science and Data
Analytics roles only**. Careers outside that scope carry no dataset-derived market
evidence, and the application displays an explicit missing-evidence state for them rather
than presenting unsourced figures (PRD Section 13.2, FR-14).

Salary and demand figures are descriptive of the sample and its collection period only.
They are not forecasts and are presented in-product with an explicit uncertainty
statement and competition caveat.

---

## Scholar-Spot Indian Scholarships Dataset (`Dataset/Scholarship/dataset.csv`)

Seeds the `scholarships` catalogue.

**Coverage limitation, surfaced in-product:** 96 entries covering **Maharashtra state
(62) and All-India (34) schemes only**. No other state is represented. Scholarship
filters honestly return empty results for unrepresented states rather than substituting
approximate matches.

Every entry links to its official government or institutional portal
(`official_source_url`) and carries a `last_verified_date`. Verification dates reflect
when the entry was checked against its source; scheme terms, amounts, and deadlines
change without notice, and the official portal is always authoritative over this cache.

---

## Note on learning-resource links

Free-resource links attached to career skills (NPTEL, SWAYAM, Khan Academy, and similar)
point to **stable portal or course-catalogue roots**, not to deep links that silently rot.
Next_Path has no commercial relationship with, and receives no commission from, any
listed provider — this is recorded per row in `career_skills.commercial_disclosure`
(PRD Section 13.3, FR-12).

---

## Project license

The Next_Path source code has no license file yet — pick one before publishing or
accepting outside contributions. The attributions above are independent of that choice
and apply regardless.
