# Next_Path — UI/UX Specification

**Document Version:** 1.2.0  
**Design System Baseline:** `docs/AI_Career_Guidance_Design_System-6.md` (LOCKED Token Set with Verified Error Pair)  
**Requirements Traceability:** `docs/Refined_PRD_AI_Career_Guidance.md` & `docs/planning-artifacts/epics.md`  
**Component Reference:** `docs/architecture/components.md` & `docs/architecture/source-tree.md`  
**Author:** Sally — UX Designer (BMad UX Persona)

---

## 1. Executive Summary & Design System Invariants

This specification details the interaction patterns, view hierarchies, UI states, responsive behaviors, and accessibility requirements for all screens in the **Next_Path** AI-Based Career Decision & Pathway Companion.

### Locked Design System Rules (v6 Invariants)
1. **Single Structural Accent:** `{colors.primary}` (#0075de) is strictly reserved for the primary CTA, active/focus states, inline links, and functional progress fills. No secondary structural colors are permitted.
2. **Decorative AI Marker:** `{colors.ai-accent}` (#391c57) and `{colors.ai-accent-soft}` (#d6b6f6) are strictly decorative accents applied solely to the `ChatbotFAB`, AI suggestion badges, and chatbot drawer header strips.
3. **Warm Paper Canvas:** The page canvas is `{colors.canvas-soft}` (#f6f5f4); cards and input surfaces are pure white `{colors.surface}` (#ffffff).
4. **Hairline-First Depth:** Elevation relies on 1px `{colors.hairline}` (#e6e6e6) borders and soft subtle shadows (Level-0 Flat for cards, Level-1 Soft for flyouts/drawers, Level-2 for modals). No heavy drop-shadows.
5. **Calm Typography:** Strict use of **Inter** across all 11 standardized scale tiers (`{typography.display-1}` down to `{typography.eyebrow}`).
6. **No Bare Percentages (Option A Approved):** Every match score numeral (`{typography.heading-1}`) is paired with a mandatory decomposed 3-part indicator (Fit Evidence, Feasibility, Evidence Quality) using **neutral semantic text-only badges** (`{colors.surface}`, hairline border, `{typography.eyebrow}` in `{colors.ink}` / `{colors.ink-muted}`). Zero colored dots are used on fit/reasons to preserve visual calm and avoid pass/fail ambiguity.
7. **Scoped Error & Destructive Token Pair:** `{colors.error}` (#d32f2f — verified WCAG AA contrast: 4.98:1 against `{colors.surface}`, 4.57:1 against `{colors.canvas-soft}`) and `{colors.error-soft}` (#fdf2f2) are strictly reserved for form validation errors, API failure callouts, and destructive account deletion actions.
8. **Scoped Warning Token:** `{colors.warning}` (#dd5b00) is strictly reserved for skill-gap signaling and roadmap attention dots. It is **never** used for destructive actions, error states, or crisis interventions. Crisis states utilize supportive, high-contrast, calm surface containers.

---

## 2. Epic-by-Epic Screen Specifications

---

### Epic 1: Foundation, Data Grounding & Minor-Safe Onboarding

#### Screen 1.1: `OnboardingWizard`
- **Component File:** `src/views/OnboardingWizard.tsx` (supports sub-modal `src/components/auth/MinorConsentModal.tsx`)
- **Route:** `/onboarding`
- **Purpose:** Guided stage-aware self-discovery questionnaire collecting interests, aptitude signals, budget tiers, and relocation preferences without mandating academic marks (FR-01, FR-02, FR-03, FR-20).

##### Layout & Styling
- **Page Container:** `{colors.canvas-soft}` background, centered max-width `720px` container with `{spacing.xxl}` top/bottom padding.
- **Wizard Header:** Progress bar with track in `{colors.canvas-soft}` and fill in `{colors.primary}` (`{rounded.full}`). Step eyebrow in `{typography.eyebrow}` (`{colors.ink-muted}`). Stage headline in `{typography.heading-2}` (`{colors.ink}`).
- **Question Cards:** Surface in `{colors.surface}`, `{rounded.lg}`, interior padding `{spacing.lg}`, border `1px solid {colors.hairline}`, Level-0 flat elevation.
- **Form Inputs & Selectors:**
  - Option chips (Interests, RIASEC tags): White `{colors.surface}`, `{rounded.full}`, `{spacing.sm}` horizontal padding, border `1px solid {colors.hairline}`. Active selected state uses `{colors.primary}` outline with subtle background tint.
  - Text fields & budget dropdowns: `{colors.surface}`, text in `{typography.body-sm}`, `{rounded.xs}` (4px), border `1px solid {colors.hairline}`.
- **Navigation Controls:** Bottom action bar with `button-primary` ("Continue" / "Save & Review") in `{colors.primary}` (`{rounded.full}`) and `button-utility` ("Back") on `{colors.surface}` with `{rounded.md}`.

##### UI States
1. **Default State:** Stage selection cards (Class 8–10 Stream Exploration, Class 11–12 Degree/Entrance, Early College Pathway Correction) followed by stage-branched question steps.
2. **Minor Consent Trigger State (Product-Specific / FR-20):** When Class 8–10 or Class 11–12 is selected, a mandatory modal (`{rounded.xl}`, Level-2 elevation) halts questionnaire finalization, requiring guardian email/phone and explicit consent confirmation before recommendation evaluation can unlock.
3. **Adult Exemption State:** For Early College students (18+), renders a single self-consent acknowledgement checkbox without triggering the guardian modal.
4. **Draft / Cached State (FR-19):** Progress indicator shows "Draft saved offline" tag in `{typography.caption}` (`{colors.ink-muted}`) when network drops, with form state restored seamlessly from TanStack Query local cache.
5. **Loading / Validating State:** Submit button displays an inline spinner with label "Saving Profile..." disabled for interaction.
6. **Validation Error State (Verified Error Token):** Invalid input fields transition to `1.5px solid {colors.error}` (#d32f2f) with background tint in `{colors.error-soft}` (#fdf2f2). An inline error message renders directly beneath the field in `{typography.caption}` using `{colors.error}` and linked via `aria-invalid="true"`.

##### Responsive Behavior
- **Desktop (1080px+):** Centered 720px single-column layout with 2-column grid for multi-select interest chips.
- **Tablet (768–1080px):** 600px width container, full-width button bar at the bottom.
- **Mobile (≤600px):** Full-width edge-to-edge layout with `{spacing.md}` side gutters. Option chips stack in flexible wrapping rows with minimum 44px touch targets. Sticky bottom action bar with full-width primary CTA.

##### Accessibility Notes
- Step progress updates announced via `aria-live="polite"`.
- Multi-step forms support full keyboard navigation (`Tab` / `Shift+Tab` across chips, `Space` to toggle, `Enter` to submit).
- Minor consent modal traps focus (`role="dialog"`, `aria-modal="true"`) with clearly labeled guardian contact fields.

---

### Epic 2: Multi-Option Recommendation & Career Comparison

#### Screen 2.1: `ResultsDashboard`
- **Component File:** `src/views/ResultsDashboard.tsx`
- **Route:** `/results`
- **Purpose:** Present 3 to 5 ranked, evidence-backed career pathways with decomposed fit/feasibility/evidence quality indicators, itemized reasons/concerns, and selection CTAs without predicting destiny or forcing a single answer (FR-05, FR-06, FR-07).

##### Layout & Styling
- **Page Container:** `{colors.canvas-soft}` background, max-width `1200px` container with `{spacing.xl}` padding.
- **Dashboard Header:** Section title in `{typography.heading-1}` ("Your Career Pathway Matches"), subtitle in `{typography.body-md}` (`{colors.ink-secondary}`). Batch timestamp in `{typography.caption}` (`{colors.ink-faint}`).
- **Recommendation Grid:** Multi-card layout rendering 3 to 5 `CareerCard` components (`{rounded.lg}`, `{spacing.lg}` interior padding, `{colors.surface}`, Level-0 flat elevation with 1px `{colors.hairline}` border).
- **MatchScoreBadge Integration (Option A Neutral Semantic Text):** Positioned top-right of each `CareerCard`. Renders composite score numeral in `{typography.heading-3}`, paired with 3 distinct stacked neutral pill badges (`{rounded.full}`, `{typography.eyebrow}`, `{colors.surface}`, `1px solid {colors.hairline}`):
  - Fit Evidence tag: `Strong Fit`, `Moderate Fit`, or `Emerging Fit` (text in `{colors.ink}`).
  - Feasibility tag: `High Feasibility`, `Moderate Feasibility`, or `Challenging Feasibility` (text in `{colors.ink-secondary}`).
  - Evidence Quality tag: `High Evidence`, `Moderate Evidence`, or `Sparse Data` (text in `{colors.ink-muted}`).
  - *Zero colored status dots* — meaning is carried 100% via explicit typography to avoid pass/fail ambiguity.
- **Decomposed Rationale Section:** Inside each card, two distinct bulleted blocks:
  - "Why This Fits You": Text in `{typography.body-sm}` (`{colors.ink-secondary}`) with neutral bulleted points.
  - "Key Hurdles & Costs": Text in `{typography.body-sm}` (`{colors.ink-muted}`) detailing entrance exam intensity and fee ranges.

##### UI States
1. **Default State (Strong/Moderate Evidence):** 3–5 cards ranked by composite score with clear selection buttons ("Select as Primary", "Select as Backup") and a global "Compare Selected" CTA.
2. **Low Evidence Quality State (Product-Specific / FR-07):** When student profile completeness is under 60% or academic signals are sparse, the card replaces high-confidence framing with an alert banner on `{colors.surface}` in `{typography.caption}` (`{colors.ink-muted}`): *"Preliminary Guidance — Missing evidence in mathematics/aptitude signals. Add more profile context for stronger certainty."*
3. **Single Pathway Conflict State:** If student interest strongly matches a career but family budget is low, feasibility tag displays `Challenging Feasibility` with a highlighted callout to available government scholarships.
4. **Loading State:** 3 skeleton cards in `{colors.canvas-soft}` with animated pulse shimmer.
5. **Fatal Error State (API Failure):** Banner styled with `1px solid {colors.error}` (#d32f2f), background `{colors.error-soft}` (#fdf2f2), text `{colors.error}`, offering a "Retry Evaluation" `button-utility`.
6. **Empty State:** Clean empty state illustration with title in `{typography.heading-3}` and primary button "Complete Onboarding Questionnaire."

##### Responsive Behavior
- **Desktop (1080px+):** 3-column card grid with side-by-side metric comparison.
- **Tablet (768–1080px):** 2-column card grid with sticky bottom bar for "Compare Selected (N)".
- **Mobile (≤600px):** Single-column stacked cards. Match score badge condenses to horizontal pill row. Primary and Backup selection buttons span full width.

##### Accessibility Notes
- Color is never used as the indicator for match strength; all badges carry explicit text labels.
- Card titles link to `/careers/:career_id` with descriptive `aria-label="View full pathway details for Data Scientist"`.

---

#### Screen 2.2: `CareerDetailView`
- **Component File:** `src/views/CareerDetailView.tsx` (maps directly to `CareerDetailView.tsx` in `source-tree.md` and route `/careers/:career_id` in `components.md`)
- **Route:** `/careers/:career_id`
- **Purpose:** Deep-dive pathway explorer providing work realities, localized Indian entry routes, exam prerequisites, fee ranges in INR, dated labor market snapshots, and governance audit metadata (FR-04, FR-11, FR-14).

##### Layout & Styling
- **Header Banner:** White `{colors.surface}` card with title in `{typography.heading-2}`, occupational cluster pill in `{typography.eyebrow}`, and RIASEC code badge.
- **Work Reality Tab:** Body text in `{typography.body-md}`, itemizing day-to-day tasks and trade-offs.
- **Indian Entry Routes Matrix:** Container in `{colors.surface}`, `{rounded.lg}`, border `1px solid {colors.hairline}`. Lists formal degree routes (e.g. B.Tech via JEE/CET) beside low-cost alternative public routes (e.g. B.Sc + NPTEL) with fee ranges in INR.
- **Market Snapshot Card (FR-14):** White card with demand indicator pill, entry-to-mid salary bands (e.g. ₹4.0L - ₹7.5L / yr), top hiring hubs, and mandatory governance caveat in `{typography.caption}` (`{colors.ink-muted}`): *"Job market trends reflect recent posting volume and do not guarantee future hiring."*
- **Governance Stamp:** Footer text in `{typography.caption}` (`{colors.ink-faint}`) stating content owner, last verified date (`2026-08-20`), and official source links.

##### UI States
- **Default State:** Fully populated tabs with verified entry routes and market trends.
- **Loading State:** Pulsing skeleton blocks for salary ranges and entry route tables.
- **Error / Unmapped Career State:** Friendly message on `{colors.surface}` with button "Return to Recommendations".

---

#### Screen 2.3: `CareerComparisonView`
- **Component File:** `src/views/CareerComparisonView.tsx`
- **Route:** `/compare`
- **Purpose:** Side-by-side comparison matrix for 2 to 3 pathways across entrance exams, duration, estimated total cost in INR, and market competition caveats (FR-08).

##### Layout & Styling
- **Container:** White `{colors.surface}` card, `{rounded.xl}`, Level-2 elevated modal or full-page view, `{spacing.lg}` interior padding.
- **Comparison Matrix Grid:** Multi-column table with column headers in `{typography.heading-3}`.
- **Comparison Rows:**
  - Row 1: Primary Indian Entry Routes (Degree vs Diploma vs Certificate).
  - Row 2: Mandatory Entrance Exams (e.g. JEE Main vs NEET vs CUET).
  - Row 3: Total Estimated Education Cost (INR range).
  - Row 4: Preparation Time & Minimum Duration.
  - Row 5: Market Demand & Competition Caveats.
  - Row 6: Action Row with `button-primary` ("Select This Path") for each column.

##### UI States
- **Default (2 or 3 careers):** Clean side-by-side columns with hairline row dividers.
- **Single Career Selected State:** Prompts user to select at least one more career to compare.

##### Responsive Behavior
- **Desktop (1080px+):** 3-column side-by-side grid.
- **Tablet & Mobile (≤768px):** Horizontal swipeable carousel with sticky first column (row labels) and paginated dot indicator.

---

### Epic 3: Pathway Selection, Adaptive Roadmap & Free-First Actions

#### Screen 3.1: `RoadmapView`
- **Component File:** `src/views/RoadmapView.tsx` (includes `RoadmapTimeline`, `MilestoneCard`, `FallbackDropdown`)
- **Route:** `/roadmap`
- **Purpose:** Interactive execution plan partitioned into 7-day, 30-day, 90-day, and 180-day buckets with verified free learning links, fallback alternatives, proof submission, and scholarship signposting (FR-09, FR-10, FR-11, FR-12, FR-13).

##### Layout & Styling
- **Roadmap Header:** Active trajectory card showing Primary Career title (`{typography.heading-2}`) and Backup Career title (`{typography.body-md}`) with a "Reassess Pathway" utility button.
- **Timeline Container (`RoadmapTimeline`):** Vertical milestone tree connected with 1px `{colors.hairline}` vertical guides.
- **Milestone Cards (`MilestoneCard`):** White `{colors.surface}` tiles, `{rounded.lg}`, `{spacing.md}` padding, Level-0 elevation.
  - Status Indicators: Completed node dot in `{colors.success}`, active current node in `{colors.primary}`, upcoming node in `{colors.ink-faint}`.
  - Timeframe Buckets: Grouped under `{typography.eyebrow}` headers (`NEXT 7 DAYS`, `DAY 30: FOUNDATIONS`, `DAY 90: MILESTONE OUTPUT`, `DAY 180: EXECUTION & APPLICATION`).
  - Resource Links: Highlighted pill with external link icon, explicitly tagged "Free Public Resource (NPTEL/Swayam)".
  - Fallback Dropdown (`FallbackDropdown`): Clean accordion styled with `{rounded.md}` showing "If blocked or circumstances change $ightarrow$ [Branching Action]".
- **Proof Submission Modal:** Level-2 elevated modal allowing selection of proof type (`Self-report`, `Project Artifact URL`, `Quiz Score`) with verification note.
- **Scholarship Side-Drawer (FR-13):** Slide-over drawer listing matched state/central scholarships with eligibility checklist and direct link to official portals.

##### UI States
1. **Default Active State:** Milestones chronologically unlocked based on prerequisites.
2. **Milestone Completed State:** Milestone card shows green status checkmark, completion timestamp, and unlocks dependent Day 90/180 milestones.
3. **Blocked / Fallback Active State:** When a student selects "Switch to Fallback Action", the milestone card dynamically reconfigures to display the alternative low-cost branch.
4. **Empty Roadmap State (No Selection Yet):** Renders prompt to visit `/results` and choose primary/backup pathways.

##### Responsive Behavior
- **Desktop (1080px+):** Left 70% column for timeline; right 30% sticky panel for active scholarships and skill gap checklist.
- **Tablet & Mobile (≤768px):** Single vertical stream with floating action button or bottom drawer trigger for "View Matched Scholarships".

---

### Epic 4: Grounded AI Chatbot & Persisted Parent Summary

#### Screen 4.1: `ChatbotDrawer` & `ChatbotFAB`
- **Component File:** `src/components/chat/ChatbotDrawer.tsx` & `ChatbotFAB.tsx`
- **Global Placement:** Persistent floating button across all authenticated routes.
- **Purpose:** Single-turn, strictly grounded career Q&A assistant restricted to verified database facts, featuring emergency crisis safety interception (FR-16, PRD Section 14).

##### Layout & Styling
- **Floating Button (`ChatbotFAB`):** Bottom-right fixed position (24px offset), `{rounded.full}`, 56×56px circle, background `{colors.surface}`, border `1px solid {colors.hairline}`, Level-1 soft shadow. Tagged with decorative AI accent ring `{colors.ai-accent-soft}` (10% opacity) and spark icon in `{colors.ai-accent}` (#391c57).
- **Slide-Over Drawer (`ChatbotDrawer`):** 400px width on desktop (100% on mobile), white `{colors.surface}`, Level-2 shadow.
- **Drawer Header:** Header strip tinted with `{colors.ai-accent-soft}` at 15% opacity, title "Ask Career Assistant" in `{typography.title}`, eyebrow tag "Grounded Database AI" in `{typography.eyebrow}` (`{colors.ai-accent}`).
- **Message Stream:**
  - Student Bubble: Align right, background `{colors.canvas-soft}`, text `{colors.ink}` in `{typography.body-md}`, `{rounded.lg}`.
  - Assistant Bubble: Align left, background `{colors.surface}`, border `1px solid {colors.hairline}`, text `{colors.ink}`.
  - Citation Footnote: Bottom of response bubble in `{typography.caption}` (`{colors.ink-muted}`) listing verified sources (e.g. `[Source: O*NET v30.3 / AICTE Maharashtra]`).
  - Guidance Boundary Disclaimer: Sticky bottom caption in `{typography.caption}` (`{colors.ink-faint}`): *"Answers are restricted to verified career records. Never guarantees admission or salary."*
- **Input Bar:** White `{colors.surface}` input with `{rounded.full}` border and Send CTA in `{colors.primary}`.

##### UI States
1. **Default Conversational State:** Displays conversation history with clear citation tags.
2. **Data Unavailable State (Negative Grounding / FR-16):** When queried on unverified data, assistant outputs: *"I do not have verified information on that in our current database. Please consult a school counselor or official portal."*
3. **Emergency Crisis State (Safety Interceptor / PRD Section 14):**
   - **Trigger:** Student inputs indicators of acute emotional distress, depression, or self-harm.
   - **Visual Treatment (Token-Pure):** Standard career advice and input suggestions are immediately suspended. The chat window renders an elevated support card on white `{colors.surface}`, `{rounded.lg}`, with a gentle 1px `{colors.hairline}` border and subtle Level-1 shadow (never painted in warning-orange, error red, or alarm styling).
   - **Support Copy:** Emphatic supportive headline in `{typography.title}` (`{colors.ink}`) — *"We're here with you. Please reach out to someone who can help right now."*
   - **Helpline Directory:** Direct call action buttons (`button-primary` in `{colors.primary}`, `{rounded.full}`):
     - **Tele-MANAS:** `14416` (National Mental Health Helpline — Free, 24/7, Multilingual)
     - **KIRAN Helpline:** `1800-599-0019`
   - **Escalation Notification:** Subtle note in `{typography.caption}` (`{colors.ink-muted}`): *"A confidential referral has been flagged for human counselor follow-up."*
4. **Loading / Generating State:** Three animated bouncing dots with label "Consulting verified career library..." (completes in < 3.0s).

##### Responsive Behavior
- **Desktop (1080px+):** Slide-over panel (400px width) anchored to right margin without obscuring main content.
- **Mobile (≤600px):** Fullscreen modal takeover with sticky top header and fixed bottom input bar.

---

#### Screen 4.2: `GuardianSummaryView`
- **Component File:** `src/views/GuardianSummaryView.tsx`
- **Route:** `/guardian`
- **Purpose:** Persisted, plain-language family summary translating recommendation batches into non-technical overviews, total degree costs in INR, and shared discussion points without AI text drift (FR-17).

##### Layout & Styling
- **Page Container:** Warm `{colors.canvas-soft}` background, centered max-width `800px` document layout with `{spacing.xl}` padding.
- **Summary Document Card:** White `{colors.surface}`, `{rounded.xl}`, interior padding `{spacing.xxl}`, border `1px solid {colors.hairline}`.
- **Header:** Title "Career Decision Overview for Families" in `{typography.heading-2}`, student name and generation date in `{typography.caption}`.
- **Narrative Section:** 2–3 paragraphs of plain-language summary in `{typography.body-md}` (`{colors.ink-secondary}`) explaining recommended trajectories and why they fit the student.
- **Financial Transparency Card:** Table in `{colors.canvas-soft}`, `{rounded.lg}`, listing estimated annual and total tuition in INR across government vs private colleges, paired with eligible scholarship offsets.
- **Family Discussion Guide:** Checklist of 3–4 open conversation questions (e.g. "Discuss hostel relocation comfort vs local commute").

---

### Epic 5: Counselor Escalation, Reassessment & Governance

#### Screen 5.1: `CounselorQueueView`
- **Component File:** `src/views/CounselorQueueView.tsx`
- **Route:** `/counselor`
- **Purpose:** Triage queue and review portal for human counselors to inspect frozen student snapshots, review deadlocks or crisis flags, record notes, and submit overrides with mandatory rationale (FR-15, PRD Section 14).

##### Layout & Styling
- **Triage Table Container:** White `{colors.surface}` card, `{rounded.lg}`, 1px `{colors.hairline}` border.
- **Triage Row List:**
  - Urgency Badge: `High / Crisis` in `{colors.ink}` text with a high-contrast neutral pill badge (`{rounded.full}`, `{typography.eyebrow}`); `Standard / Deadlock` in `{colors.ink-muted}`.
  - Student Identifier: Full name, or `[Anonymized Profile / Closed Account]` if student erased their profile.
  - Trigger Reason: e.g. `student_parent_deadlock`, `low_evidence_profile`, `crisis_safety_flag`.
  - Date Stamp & Action CTA: "Review Case" `button-utility`.
- **Snapshot Inspector Flyout:** Level-2 elevated side panel displaying frozen profile inputs, guardian conflict points, and recommendation scores at escalation time.
- **Override & Resolution Modal:** Textarea for clinical notes and mandatory textarea for `counselor_override_rationale` before submitting modified pathways.

---

#### Screen 5.2: `ProfileSettingsView` (Privacy, Guardian View & Erasure)
- **Component File:** `src/views/ProfileSettingsView.tsx` (maps to route `/settings` in `components.md` and fulfills Design System v6 Key Screen #10)
- **Route:** `/settings`
- **Purpose:** Central student profile overview, guardian context inspector, language selection, minor consent audit trail display, and DPDP-compliant account deletion with safety audit retention notice (FR-02, FR-03, FR-20, Security Invariant #5).

##### Layout & Styling
- **Page Container:** Warm `{colors.canvas-soft}` background, centered max-width `760px` container with `{spacing.xxl}` padding.
- **Profile Header Card:** White `{colors.surface}`, `{rounded.lg}`, `{spacing.lg}` interior padding, border `1px solid {colors.hairline}`. Displays student name (`{typography.heading-3}`), email, current education stage (`class_8_10` / `class_11_12` / `early_college`), and linked stream.
- **Guardian Context Card (RBAC-Aware):**
  - For Student Login: Read-only summary of guardian priorities, budget ceiling, and relocation notes in `{typography.body-sm}` (`{colors.ink-secondary}`).
  - For Guardian Login: Editable form fields with `button-primary` ("Save Preferences").
- **Preferences & Localization Section:**
  - **Language Selector:** `button-utility` with flag/label pair (English / Hindi / Marathi), dropdown panel in `{colors.surface}` (`{rounded.md}`).
  - Preferred language pills and notification toggles.
- **Consent & Governance Record:**
  - Card section showing `consent_type` (`guardian_consent_minor` or `self_consent_adult`), verified guardian ID, and `consent_recorded_at` timestamp in `{typography.caption}` (`{colors.ink-muted}`).
- **Data Privacy & Erasure Zone:**
  - Section title in `{typography.title}` ("Account & Personal Data Rights").
  - "Export Profile Data" `button-utility` (downloads complete JSON snapshot).
  - "Delete Account & Personal Data" button (`button-secondary` with neutral hairline border, `{rounded.full}`, `{typography.button}`).

##### UI States
1. **Default State:** Fully populated profile sections, verified consent badge, and active settings.
2. **Account Deletion Confirmation State (Safety Retention / FR-20):**
   - When "Delete Account" is clicked, opens a Level-2 modal (`{rounded.xl}`, white `{colors.surface}`, Level-2 shadow).
   - **Mandatory Legal Notice:** Explicitly explains data rights and safety retention exception:
     > *"Deleting your account permanently purges your student profile, guardian inputs, custom roadmaps, and non-escalated chat messages.*  
     > *In accordance with child safety compliance and legal duty-of-care, any emergency crisis logs or counselor safety tickets will be preserved in an anonymized format with your personal identifiers removed (`student_id = NULL`)."*
   - **Confirmation Action:** Requires typing "DELETE" into a text input, followed by clicking the final confirmation button styled with `{colors.error}` (#d32f2f) text on `{colors.error-soft}` (#fdf2f2) background ("Permanently Delete Account").

##### Responsive Behavior
- **Desktop (1080px+):** Clean single-column layout with 2-column key-value grid for profile metadata.
- **Mobile (≤600px):** Single-column stacked cards with full-width action buttons.

##### Accessibility Notes
- Deletion modal traps focus (`aria-modal="true"`) and requires deliberate multi-step confirmation to prevent accidental account loss.

---

### Epic 6: Progress Dashboard & Scholarship Reminders [P1 Backlog]

#### Screen 6.1: `ProgressDashboard`
- **Component File:** `src/views/ProgressDashboard.tsx` (P1 Deferred Scope)
- **Route:** `/dashboard`
- **Purpose:** Long-term visual progress tracking of milestone completion velocity, skill acquisition evidence, and scheduled reassessment trigger points (FR-27, FR-28).

##### Layout & Styling
- **Container:** `{colors.canvas-soft}` background, max-width `1200px`.
- **Velocity Chart (Recharts):** Primary progress series in `{colors.primary}`, comparative series in `{colors.accent-sky}` and `{colors.accent-teal}`.
- **Upcoming Deadline Cards:** List of matched scholarships with countdown days in `{typography.eyebrow}` (`{colors.warning}`).

---

## 3. Explicit Design System Compatibility Flags

| Screen / Requirement | Design System Status | Architectural & UX Alignment |
|---|---|---|
| **`CounselorQueueView` Data Table** | **Flagged Pattern:** Design System v6 defines card lists and modal grids, but not a full multi-column administrative data table. | **Resolution:** Spec uses a list of stacked `feature-card` rows (`{rounded.lg}`, hairline dividers) on mobile/tablet, expanding to a structured CSS grid on desktop. No new custom table tokens introduced. |
| **`ProfileSettingsView`** | **Compatible:** Fulfills Key Screen #10 from Design System v6 and provides UI for Story 5.4. | Built strictly from standard `feature-card` containers, `button-secondary`, `button-utility`, and the verified `{colors.error}` token for deletion. |
| **`MinorConsentModal`** | **Compatible:** Built strictly with standard Modal chrome (`{rounded.xl}`, Level-2 elevation, white surface). | Implements explicit guardian signature checkbox and contact fields per FR-20. |
| **`MatchScoreBadge` (Option A)** | **Compatible:** Text-only neutral semantic badges (`Strong Fit`, `Challenging Feasibility`, `High Evidence`) without colored dots. | Zero pass/fail ambiguity; 100% accessible text labels. |
| **Emergency Crisis Support State** | **Compatible:** Strictly adheres to token discipline: does **not** use warning-orange or alarm red. | Uses high-contrast neutral cards on `{colors.surface}` with `{colors.primary}` call buttons. |

---

## 4. Accessibility & Mobile-First Quality Checklist

Every screen in this specification must satisfy the following quality gates during development:
- [x] **WCAG AA Contrast (4.5:1):** Verified for `{colors.ink}` on canvas/surface (> 15:1), `{colors.on-primary}` on `{colors.primary}` (4.6:1), and `{colors.error}` (#d32f2f) on surface (4.98:1) and canvas-soft (4.57:1).
- [x] **Touch Target Floor:** Minimum 44×44px hit areas on all interactive buttons, chips, and links on mobile viewports.
- [x] **No Pure-Color Coding:** Every match score, milestone node, and status badge pairs color dots with explicit semantic text labels.
- [x] **Keyboard Navigability:** Full `Tab`, `Shift+Tab`, and `Enter`/`Space` accessibility with visible focus rings (`1px solid {colors.primary}`).
- [x] **Multilingual RTL/LTR Preparedness:** UI layout accommodates expanded Indian language text strings without truncation.
