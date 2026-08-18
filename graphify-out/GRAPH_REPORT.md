# Graph Report - .  (2026-08-18)

## Corpus Check
- Corpus is ~5,244 words - fits in a single context window. You may not need a graph.

## Summary
- 84 nodes · 156 edges · 16 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_BMAD Skill Rendering System|BMAD Skill Rendering System]]
- [[_COMMUNITY_BMAD Configuration Engine|BMAD Configuration Engine]]
- [[_COMMUNITY_BMAD Skill Rendering System|BMAD Skill Rendering System]]
- [[_COMMUNITY_Module Group 3|Module Group 3]]
- [[_COMMUNITY_BMAD Configuration Engine|BMAD Configuration Engine]]
- [[_COMMUNITY_BMAD Skill Rendering System|BMAD Skill Rendering System]]
- [[_COMMUNITY_Module Group 6|Module Group 6]]
- [[_COMMUNITY_BMAD Configuration Engine|BMAD Configuration Engine]]
- [[_COMMUNITY_Module Group 8|Module Group 8]]
- [[_COMMUNITY_Module Group 9|Module Group 9]]
- [[_COMMUNITY_AI Career Guidance & UI Specs|AI Career Guidance & UI Specs]]
- [[_COMMUNITY_Module Group 11|Module Group 11]]
- [[_COMMUNITY_AI Career Guidance & UI Specs|AI Career Guidance & UI Specs]]
- [[_COMMUNITY_Module Group 13|Module Group 13]]
- [[_COMMUNITY_Module Group 14|Module Group 14]]
- [[_COMMUNITY_AI Career Guidance & UI Specs|AI Career Guidance & UI Specs]]

## God Nodes (most connected - your core abstractions)
1. `RenderError` - 15 edges
2. `render()` - 13 edges
3. `resolve()` - 10 edges
4. `split()` - 9 edges
5. `ConfigError` - 8 edges
6. `_resolve_customization_value()` - 8 edges
7. `cmd_init()` - 7 edges
8. `cmd_append()` - 7 edges
9. `cmd_set()` - 7 edges
10. `_resolve_replacements()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Resolve only tokens authored in installed sources in one opaque pass.` --uses--> `ConfigError`  [INFERRED]
  C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\render_skill.py → C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\config_utils.py
- `RenderError` --uses--> `ConfigError`  [INFERRED]
  C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\render_skill.py → C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\config_utils.py
- `Raised when rendering cannot safely publish a snapshot.` --uses--> `ConfigError`  [INFERRED]
  C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\render_skill.py → C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\config_utils.py
- `render()` --calls--> `load_toml()`  [INFERRED]
  C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\render_skill.py → C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\config_utils.py
- `render()` --calls--> `load_central_config()`  [INFERRED]
  C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\render_skill.py → C:\Users\User\OneDrive\Music\Next_Path\_bmad\scripts\config_utils.py

## Hyperedges (group relationships)
- **End-to-End AI Career Guidance Pipeline** — problem_statement_career_recommendation, problem_statement_skill_gap_detection, problem_statement_career_roadmap, problem_statement_course_recommendation, problem_statement_project_recommendation, problem_statement_resume_interview [EXTRACTED 1.00]

## Communities

### Community 0 - "BMAD Skill Rendering System"
Cohesion: 0.21
Nodes (19): ack(), add_target(), cmd_append(), cmd_init(), cmd_set(), entry_count(), main(), now() (+11 more)

### Community 1 - "BMAD Configuration Engine"
Cohesion: 0.22
Nodes (14): ConfigError, _detect_keyed_merge_field(), load_central_config(), load_customization(), load_toml(), _merge_arrays(), merge_layers(), Shared strict TOML loading and structural merge support. (+6 more)

### Community 2 - "BMAD Skill Rendering System"
Cohesion: 0.38
Nodes (9): _canonical_json(), _hash_bytes(), _load_sources(), main(), _publish(), Resolve only tokens authored in installed sources in one opaque pass., render(), _render_sources() (+1 more)

### Community 3 - "Module Group 3"
Cohesion: 0.47
Nodes (6): _format_markdown_list(), _format_review_layers(), _require_review_layers(), _require_string(), _require_string_list(), _resolve_customization_value()

### Community 4 - "BMAD Configuration Engine"
Cohesion: 0.6
Nodes (6): _find_config_values(), _lookup(), RenderError, _resolve_config_value(), _resolve_replacements(), _resolve_short_config()

### Community 5 - "BMAD Skill Rendering System"
Cohesion: 0.33
Nodes (6): Key Application Screens, Student Guidance UI Components, AI Career Counselor Chatbot, Personalized Career Recommendation, Career Switching Assistant, Skill Gap Detection Engine

### Community 6 - "Module Group 6"
Cohesion: 0.7
Nodes (4): extract_key(), find_project_root(), main(), write_json_stdout()

### Community 7 - "BMAD Configuration Engine"
Cohesion: 1.0
Nodes (2): extract_key(), main()

### Community 8 - "Module Group 8"
Cohesion: 0.67
Nodes (3): Student Journey Core Flow, Personalized Learning Roadmap, Progressive Project Recommendation

### Community 9 - "Module Group 9"
Cohesion: 1.0
Nodes (2): Course & Certification Matcher, Financial Constraint & Scholarship Engine

### Community 10 - "AI Career Guidance & UI Specs"
Cohesion: 1.0
Nodes (2): Early School Career Guidance, Academic Performance Career Predictor

### Community 11 - "Module Group 11"
Cohesion: 1.0
Nodes (2): Mobile-First Accessibility System, Multilingual Regional Support

### Community 12 - "AI Career Guidance & UI Specs"
Cohesion: 1.0
Nodes (1): AI Career Guidance System

### Community 13 - "Module Group 13"
Cohesion: 1.0
Nodes (1): Job Market Trends Intelligence

### Community 14 - "Module Group 14"
Cohesion: 1.0
Nodes (1): AI Resume & Interview Assistant

### Community 15 - "AI Career Guidance & UI Specs"
Cohesion: 1.0
Nodes (1): Career Guidance UI Design System

## Knowledge Gaps
- **24 isolated node(s):** `Shared strict TOML loading and structural merge support.`, `Raised when a present configuration layer cannot be used safely.`, `Load a TOML table, allowing absence only for optional layers.`, `Merge tables recursively, keyed table arrays by identity, and append other array`, `The memlog file, from either addressing mode: {workspace}/.memlog.md or an expli` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `BMAD Configuration Engine`** (3 nodes): `extract_key()`, `main()`, `resolve_config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 9`** (2 nodes): `Course & Certification Matcher`, `Financial Constraint & Scholarship Engine`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Career Guidance & UI Specs`** (2 nodes): `Early School Career Guidance`, `Academic Performance Career Predictor`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 11`** (2 nodes): `Mobile-First Accessibility System`, `Multilingual Regional Support`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Career Guidance & UI Specs`** (1 nodes): `AI Career Guidance System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 13`** (1 nodes): `Job Market Trends Intelligence`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 14`** (1 nodes): `AI Resume & Interview Assistant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Career Guidance & UI Specs`** (1 nodes): `Career Guidance UI Design System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resolve()` connect `BMAD Skill Rendering System` to `BMAD Skill Rendering System`, `Module Group 6`, `BMAD Configuration Engine`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `render()` connect `BMAD Skill Rendering System` to `BMAD Skill Rendering System`, `BMAD Configuration Engine`, `BMAD Configuration Engine`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `split()` connect `BMAD Skill Rendering System` to `BMAD Configuration Engine`, `BMAD Configuration Engine`, `Module Group 6`, `BMAD Configuration Engine`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `render()` (e.g. with `resolve()` and `load_central_config()`) actually correct?**
  _`render()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `resolve()` (e.g. with `_load_sources()` and `render()`) actually correct?**
  _`resolve()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `split()` (e.g. with `ValueError` and `_lookup()`) actually correct?**
  _`split()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ConfigError` (e.g. with `RenderError` and `Raised when rendering cannot safely publish a snapshot.`) actually correct?**
  _`ConfigError` has 3 INFERRED edges - model-reasoned connections that need verification._