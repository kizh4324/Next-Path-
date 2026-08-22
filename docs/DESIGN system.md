---
version: "6"
name: AI Career Guidance — Design System
description: Career decision companion for Indian school/early-college students, built on a warm paper-calm canvas, near-black Inter type, and a single structural blue — merged from the original v5 draft and a Notion design-language analysis. Personality (AI, achievement, gaps) is carried by a decorative-only accent palette, never by structural fills.

colors:
  primary: "#0075de"
  primary-active: "#005bab"
  ai-accent: "#391c57"
  ai-accent-soft: "#d6b6f6"
  on-primary: "#ffffff"
  canvas: "#ffffff"
  canvas-soft: "#f6f5f4"
  surface: "#ffffff"
  ink: "#000000"
  ink-secondary: "#31302e"
  ink-muted: "#615d59"
  ink-faint: "#a39e98"
  hairline: "#e6e6e6"
  success: "#1aae39"
  warning: "#dd5b00"
  warning-deep: "#793400"
  accent-sky: "#62aef0"
  accent-teal: "#2a9d99"

typography:
  display-1: { fontFamily: Inter, fontSize: 64px, fontWeight: 700, lineHeight: 1.0, letterSpacing: -2.125px }
  heading-1: { fontFamily: Inter, fontSize: 40px, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1px }
  heading-2: { fontFamily: Inter, fontSize: 26px, fontWeight: 700, lineHeight: 1.23, letterSpacing: -0.625px }
  heading-3: { fontFamily: Inter, fontSize: 22px, fontWeight: 700, lineHeight: 1.27, letterSpacing: -0.25px }
  title: { fontFamily: Inter, fontSize: 20px, fontWeight: 600, lineHeight: 1.4, letterSpacing: -0.125px }
  body-md: { fontFamily: Inter, fontSize: 16px, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0 }
  body-sm: { fontFamily: Inter, fontSize: 15px, fontWeight: 400, lineHeight: 1.33, letterSpacing: 0 }
  button: { fontFamily: Inter, fontSize: 16px, fontWeight: 500, lineHeight: 1.5, letterSpacing: 0 }
  caption: { fontFamily: Inter, fontSize: 14px, fontWeight: 400, lineHeight: 1.43, letterSpacing: 0 }
  eyebrow: { fontFamily: Inter, fontSize: 12px, fontWeight: 600, lineHeight: 1.33, letterSpacing: 0.125px }

rounded:
  xs: 4px
  sm: 5px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 28px
  xxl: 32px
---

## What Changed From v5, and Why

Your v5 draft had good product instincts (career cards, match score, roadmap timeline) but the visual system underneath it was undefined — "Blue for trust," "Poppins or Inter," "White / Light Grey." Nothing was pinned to a value, so two screens built from it would drift apart. This version keeps every v5 screen and component *idea* but replaces the underspecified parts with Notion's actual tokens, so the whole system is buildable from one source of truth.

| v5 said | v6 now says | Why |
|---|---|---|
| "Primary: Blue" | `{colors.primary}` #0075de, one specific blue, reserved for CTAs/links/focus only | Notion's core discipline: exactly one structural accent, everything else decorative. |
| "Secondary: Purple – AI and innovation" | Purple becomes `{colors.ai-accent}` / `{colors.ai-accent-soft}` — **decorative only**, used to *tag* AI moments (chatbot FAB, "AI-suggested" labels), never as a card fill or CTA | Matches Notion's rule that only blue paints structure; purple stays a sticker-palette accent, which actually fits your "AI and innovation" intent better than making it a second structural color. |
| "Background: White / Light Grey" | `{colors.canvas-soft}` #f6f5f4 warm paper page background, `{colors.surface}` #ffffff pure white for cards/fields | Warm canvas reads calmer and more document-like than clinical white or grey — appropriate for a product explicitly trying to feel trustworthy, not like a test-results portal. |
| "Text: Dark Navy / Black" | `{colors.ink}` #000000 (primary), `{colors.ink-secondary}` / `{colors.ink-muted}` / `{colors.ink-faint}` (supporting tiers) | Gives you an actual contrast ladder instead of one flat color for all text weights. |
| "Primary font: Poppins or Inter" | **Inter**, single family, full scale below | An either/or in a spec isn't a spec. Inter is chosen because Notion's entire scale (display through eyebrow) is tuned around it, and one family across 11 sizes keeps the app visually coherent. Poppins' rounded geometry is friendlier but was never differentiated for a specific use in v5 — cut rather than kept as an undefined second option. |
| No spacing/radius/elevation tokens | Full `spacing`, `rounded`, and elevation scale (below) | v5 described components ("Career Cards," "Progress Bars") with no actual size/shape values — impossible to build consistently without them. |

One correction worth flagging against the finalized PRD, not just Notion: v5's dashboard example shows *"Career Match: Data Scientist – 87%"* as a bare percentage. The PRD explicitly prohibits presenting a single confident number without evidence quality attached (Section 15/16 — no "vague confidence score," no implied certainty). The Career Match Score component below keeps the visual (a strong number is genuinely useful) but pairs it with a mandatory evidence-quality label, per the corrected FR-06/FR-07 requirements.

---

## Design Goals (carried from v5)

- Simple and student-friendly
- Modern and AI-focused, without letting "AI" become the dominant visual note
- Trustworthy and easy to understand
- Mobile-first and accessible
- Personalized and progress-oriented, never verdict-oriented

## Core User Flow

Corrected to match the finalized PRD's decision-companion framing (v5's flow read as a single linear pipeline ending in "Job," which implies a guaranteed outcome the PRD deliberately avoids):

**Student Profile → Self-Discovery → 3–5 Pathway Options (with fit / feasibility / evidence labels) → Comparison → Primary + Backup Selection → Adaptive Roadmap → Skill Gaps & Low-Cost Actions → Reassessment**

---

## Colors

### Structural (the only fills allowed on interactive/structural elements)
- **Primary Blue** `{colors.primary}` #0075de — primary CTA fill, inline links, active/focus states, the single "you can act here" signal across the whole app.
- **Pressed Blue** `{colors.primary-active}` #005bab — pressed state of the primary CTA.

### Decorative (illustration, tags, and category dots — never a CTA, card fill, or structural element)
- **AI Accent** `{colors.ai-accent}` #391c57 / soft `{colors.ai-accent-soft}` #d6b6f6 — tags the AI Chatbot FAB, "AI-suggested" labels, and the chatbot panel's header strip only.
- **Success** `{colors.success}` #1aae39 — completed-skill tags, achievement checks, "on track" milestone dots.
- **Warning** `{colors.warning}` #dd5b00 / deep `{colors.warning-deep}` #793400 — skill-gap tags, "needs attention" milestone dots. Never used for destructive/error actions — see note under Do's and Don'ts.
- **Sky** `{colors.accent-sky}` #62aef0 / **Teal** `{colors.accent-teal}` #2a9d99 — chart series differentiation and category dots only.

### Surface & Text
- **Canvas** `{colors.canvas-soft}` #f6f5f4 — page background throughout the app.
- **Surface** `{colors.surface}` #ffffff — cards, nav bar, form fields, modals.
- **Hairline** `{colors.hairline}` #e6e6e6 — 1px borders and dividers.
- **Ink** `{colors.ink}` #000000 — headings and primary body text.
- **Ink Secondary** `{colors.ink-secondary}` #31302e — secondary copy, footer text.
- **Ink Muted** `{colors.ink-muted}` #615d59 — supporting copy, evidence-quality captions.
- **Ink Faint** `{colors.ink-faint}` #a39e98 — placeholders, timestamps, source-date metadata.

---

## Typography

Single family: **Inter** (fallback `-apple-system, system-ui, "Segoe UI", Helvetica, Arial`).

| Token | Size | Weight | Use in this product |
|---|---|---|---|
| `{typography.display-1}` | 64px / 700 | Onboarding welcome screen headline only |
| `{typography.heading-1}` | 40px / 700 | Dashboard section headers ("Your Career Matches") |
| `{typography.heading-2}` | 26px / 700 | Career-detail page title |
| `{typography.heading-3}` | 22px / 700 | Card titles (Career Card, Recommendation Card) |
| `{typography.title}` | 20px / 600 | Skill Card headers, roadmap milestone titles |
| `{typography.body-md}` | 16px / 400 | Default body copy, explanations, chat messages |
| `{typography.body-sm}` | 15px / 400 | Table rows, nav links, dense list content |
| `{typography.button}` | 16px / 500 | All button labels |
| `{typography.caption}` | 14px / 400 | Source dates, "last verified" stamps, footnotes |
| `{typography.eyebrow}` | 12px / 600 | Match-score badges, evidence-quality tags, category pills |

**Principle carried from Notion:** heavy 700 headlines against calm 400 body is the only expressive lever — no decorative type. For a student-facing product this also reads as *calmer and more trustworthy* than mixed-weight, mixed-family type would.

---

## Spacing, Radius, Elevation

**Spacing** (base unit 8px): `xxs` 4px · `xs` 8px · `sm` 12px · `md` 16px · `lg` 24px · `xl` 28px · `xxl` 32px. Card interior padding defaults to `{spacing.lg}`; form field padding to `{spacing.xxs}`-scale (6px).

**Radius:**

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Onboarding form fields, tags |
| `{rounded.sm}` | 5px | List rows, status pills |
| `{rounded.md}` | 8px | Nav/utility buttons, language selector |
| `{rounded.lg}` | 12px | Career Cards, Skill Cards, Recommendation Cards, Roadmap nodes |
| `{rounded.xl}` | 16px | Large modal/panel containers |
| `{rounded.full}` | 9999px | Primary CTAs ("View My Recommendations"), Match Score badge, chatbot FAB |

**Elevation** — barely-there, hairline-first:

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | Hairline border only, no shadow | Default Career/Skill/Recommendation cards on the warm canvas |
| 1 — Soft | Layered near-transparent shadow | Chatbot panel, floating FAB, focused form field |
| 2 — Elevated | Deeper 5-stop shadow | Modals (comparison view, escalation confirmation) |

No heavy drop-shadows anywhere — depth comes from illustration/accent color, not shadow weight.

---

## Components

### Navigation
**`nav-bar`** — White surface, `{colors.ink}` links at `{typography.body-sm}`, `{spacing.md}` padding. Home · Career · Roadmap · Courses · Profile. Condenses to a bottom tab bar on mobile (see Responsive).

### Buttons
- **`button-primary`** — `{colors.primary}` fill, pill `{rounded.full}`, `{typography.button}`. Reserved for the one primary action per screen ("View My Recommendations," "Start Skill Roadmap," "Select This Pathway"). Pressed state uses `{colors.primary-active}`.
- **`button-secondary`** — White surface, `{colors.ink}` text, pill `{rounded.full}`, Level-1 shadow. Pairs beside primary for a non-committal action ("Compare Instead").
- **`button-utility`** — White surface, `{rounded.md}`, hairline border, tight padding. Nav actions, language selector, plan-select rows.
- **`button-icon-circular`** — `{rounded.full}`, translucent fill. The AI Chatbot floating action button — tagged with `{colors.ai-accent-soft}` at 10% opacity as its only decorative marker, everything else stays neutral.

### Cards
- **Career Card** — `feature-card` chrome: white surface, `{rounded.lg}`, `{spacing.lg}` padding, flat elevation. Contains: career title (`{typography.heading-3}`), **Career Match Score** badge, one-line fit reason, one-line caution (`{colors.ink-muted}`), primary CTA "See Full Pathway."
- **Skill Card** — Same `feature-card` chrome, split into two tag groups: current skills as pill tags with a small `{colors.success}` dot, missing skills as pill tags with a small `{colors.warning}` dot. Tags never fill green/orange — only the small status dot carries color, keeping the sticker-palette-is-decorative-only rule intact.
- **Recommendation Card** (courses/certifications) — `pricing-plan-card` chrome: `{rounded.md}`, hairline border, `{spacing.lg}` padding. Shows cost (or "Free"), effort estimate, and a required "free/public alternative available" line per the PRD's course-governance rule — this is not optional styling, it's a required content slot.
- **Roadmap Timeline node** — `{rounded.lg}` tile connected by hairline connectors (not a solid progress line — matches the "whitespace/hairline over heavy dividers" principle). Each node's status dot uses `{colors.success}` (done), `{colors.primary}` (current), or `{colors.ink-faint}` (upcoming) — never the warning color, which is reserved for skill gaps, not roadmap status.

### Career Match Score (corrected component)
Large numeral in `{typography.heading-1}`, `{colors.primary}`, inside a pill badge (`{rounded.full}`). **Directly beneath it, mandatory, not optional:** an evidence-quality tag at `{typography.eyebrow}` — e.g. "Strong evidence" / "Some evidence — explore further" / "Limited evidence" — in `{colors.ink-muted}`, never omitted. This satisfies the PRD's ban on presenting a bare confidence number.

### Progress Bar
Track: `{colors.canvas-soft}`, `{rounded.full}`. Fill: `{colors.primary}` — this is a structural/functional element (it communicates real state), so it does not use the decorative accent palette even though "progress" might tempt a green fill.

### AI Chatbot
FAB: `button-icon-circular` with the small purple accent marker described above. Panel: `feature-card-elevated` chrome (Level-1 shadow), header strip tinted `{colors.ai-accent-soft}` at low opacity with `{typography.eyebrow}` label "Ask Career AI" — this is the one place the AI accent is allowed to touch a real surface, since it's labeling the AI itself, not decorating unrelated content. Message bubbles stay neutral surface/ink; only the send button uses `{colors.primary}`.

### Charts
Primary data series (the student's own profile/progress): `{colors.primary}`. Comparative/category series: `{colors.accent-sky}`, `{colors.accent-teal}`, decorative sticker colors — never more than one structural blue series per chart.

### Badges & Tags
**`badge-pill`** — white surface, `{colors.primary}` text, `{typography.eyebrow}`, `{rounded.full}`. Used for the Match Score wrapper and for evidence-source date tags ("Updated Jan 2026").

### Forms
**`text-input`** — white surface, `{colors.ink}` text, `{typography.body-sm}`, `{rounded.xs}` (4px — deliberately tighter than card radius), hairline border, Level-1 shadow on focus. Applies to every onboarding field, including guardian-context forms.

### Language Selector
`button-utility` chrome, flag/label pair, dropdown panel uses `feature-card` chrome at `{rounded.md}`.

---

## Key Screens (carried from v5, content corrected where it conflicted with the finalized PRD)

- **Onboarding** — stage-aware (Class 8–10 / 11–12 / early-college), collects interests, constraints, budget, study time; marks are optional context, never a required field, per PRD FR-02.
- **Dashboard** — shows 3–5 pathway cards (not one "top match"), overall roadmap progress, skill gaps, next actions.
- **Career Recommendation** — full pathway detail: fit reasons, caution/uncertainty, required skills, cost/duration, dated market snapshot with source.
- **Career Comparison** — side-by-side view of at least 3 selected pathways (`ex-data-table-cell` chrome for the comparison grid).
- **Skill Gap** — current vs. required skills, split essential/optional per FR-11.
- **Career Roadmap** — 30/90/180-day timeline with dependencies and a visible fallback branch.
- **Courses & Certifications** — Recommendation Cards, free-option-first ordering per PRD course-governance rules.
- **AI Career Counselor** — chatbot panel, answers scoped to approved content, visible escalation-to-counselor action when confidence is low.
- **Parent Summary** — plain-language, non-technical view of the same recommendation data — reuses Career Card and Roadmap Timeline chrome at a simplified reading level, not a separate visual system.
- **Profile & Settings** — student info, guardian context (separate from student inputs), language, data export/delete controls per PRD privacy requirements.

---

## Accessibility

- Inter at `{typography.body-md}` (16px/400) minimum for body copy; never smaller than `{typography.caption}` (14px) for any readable content.
- `{colors.ink}` on `{colors.canvas-soft}`/`{colors.surface}` meets strong contrast by construction — don't substitute lighter grays for body text.
- Icons always paired with a text label — no icon-only navigation or actions.
- 44×44px minimum touch target on mobile, preserved via padding even when button labels shrink.
- Full multilingual support via the Language Selector component; translated copy must be reviewed for meaning, not just swapped word-for-word (per PRD localization requirement).
- Mobile-first layout; low-bandwidth mode avoids large hero imagery and decorative illustration on the core assessment/roadmap flow — save the sticker/illustration palette for marketing and empty-state screens only.

---

## Responsive Strategy

| Name | Width | Key Changes |
|---|---|---|
| Desktop | 1080px+ | Nav bar, 3-up Career Card grid, side-by-side comparison |
| Tablet | 768–1080px | 2-up card grid, nav begins condensing |
| Mobile | ≤600px | Single-column stacks, bottom tab bar replaces nav-bar, full-width CTAs |

---

## Do's and Don'ts

### Do
- Reserve `{colors.primary}` for the one primary action, links, focus, and progress fill on any given screen.
- Keep the app on the warm `{colors.canvas-soft}` canvas; use pure white `{colors.surface}` only for cards/fields.
- Let the AI-accent purple mark the chatbot and AI-labeled content only — nothing else.
- Pair every Match Score with its evidence-quality tag — never show the number alone.
- Use pill `{rounded.full}` for primary CTAs and Match Score, tighter `{rounded.md}`/`{rounded.xs}` for utility buttons and inputs.
- Show at least 3 pathway options together — never a single-card "your result" screen.

### Don't
- Don't fill a Career Card, Recommendation Card, or CTA in success/warning/AI-accent color — those stay decorative dots and tags only.
- Don't introduce a second structural accent alongside `{colors.primary}`.
- Don't use the warning color for destructive/error UI — it's reserved for skill-gap signaling specifically; define a separate error state if one is needed later (not yet specified in this system).
- Don't present a career match, market-demand figure, or scholarship as certain — every such number carries a source/date or evidence-quality tag per PRD Section 13.
- Don't put pill `{rounded.full}` radii on form fields — inputs stay tight at `{rounded.xs}`.
- Don't drop heavy shadows — elevation stays hairline-first and barely-there throughout.
