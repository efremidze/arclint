# Python Language Scorecard

Date: 2026-02-17
Scope: ArcLint Python support in `packages/core` (onboarding, analyzer, rules, tests)

## Summary

Python support is in a strong MVP state for deterministic architecture enforcement.

- Current overall score: **3.4 / 5.0**
- Target for "production-ready Python": **4.4 / 5.0**
- Recommendation: continue deterministic parser/rule hardening before adding AI-specific Python behavior.
- Scoring rubric: `docs/scorecard-rubric.md`

## Current vs Target Scorecard

| Area | Current | Target | Notes |
|---|---:|---:|---|
| Language detection | 4.0 | 4.5 | Detects `pyproject.toml`, and `requirements.txt` only when `.py` files exist. |
| Import graph fidelity | 3.5 | 4.5 | Supports `import`, `from ... import ...`, relative imports, multiline parenthesized imports, aliases, inline comments, and `__init__.py` behavior. |
| Rule coverage | 3.0 | 4.5 | Uses core deterministic rules (`dependency-direction`, unresolved imports, circular checks). Python-specific placement heuristics are still minimal. |
| Config defaults | 3.5 | 4.0 | Python-specific ignore defaults exist; layer defaults rely on generic architecture patterns. |
| Test coverage | 4.0 | 4.5 | Strong parser edge-case coverage and onboarding checks; still missing larger fixture repos. |
| IDE feedback quality | 3.5 | 4.5 | Diagnostics flow works, but Python-specific messages/suggestions can be richer. |
| Performance confidence | 2.5 | 4.0 | No Python-specific performance budgets/benchmarks yet. |
| Documentation clarity | 3.0 | 4.0 | README mentions Python, but dedicated Python behavior docs are still light. |

## Weighted Score Calculation

| Area | Score | Weight | Weighted contribution |
|---|---:|---:|---:|
| Language detection | 4.0 | 10% | 0.40 |
| Import graph fidelity | 3.5 | 20% | 0.70 |
| Rule coverage | 3.0 | 20% | 0.60 |
| Config defaults | 3.5 | 10% | 0.35 |
| Test coverage | 4.0 | 15% | 0.60 |
| IDE feedback quality | 3.5 | 10% | 0.35 |
| Performance confidence | 2.5 | 10% | 0.25 |
| Documentation clarity | 3.0 | 5% | 0.15 |
| **Total** |  |  | **3.40 / 5.0** |

## What We Have (Evidence)

Implemented today:
- Python language analyzer in `packages/core/src/languages/python/analyzer.ts`
- Language routing in core (`Language.PYTHON`)
- Onboarding detection for Python projects
- Python default config + ignore patterns
- Deterministic unresolved-import reporting

Tests currently cover:
- Basic Python config defaults and onboarding detection
- Relative imports (`..`, `...`) and package init cases
- `__init__.py` import semantics
- Multiline parenthesized imports
- Inline comments in import lines
- Alias imports
- Top-level export extraction (excluding nested defs/methods)

## Key Gaps to Reach Target State

1. Python-specific architecture semantics
- Add Python-aware business-logic-placement heuristics (e.g., view/controller files performing DB/network/validation logic directly).
- Add rule exceptions for common framework conventions (Django/FastAPI/Flask) to reduce noise.

2. Resolver depth and packaging fidelity
- Improve handling for namespace packages (PEP 420), optional `src/` layouts, and monorepo multi-package trees.
- Handle conditional imports more explicitly (`if TYPE_CHECKING`, try/except import fallbacks).

3. Performance and scale confidence
- Add benchmark fixtures (1k+ file Python repo) and enforce budgets for full scan and incremental analysis.

4. Adoption docs and examples
- Add Python-focused `.arclint.yml` examples (Django/FastAPI/Clean-style modules).
- Add troubleshooting docs for import edge cases.

## Recommended Plan (Next 3 Milestones)

### Milestone P1: Python Rule Quality
- Add Python-specific business logic placement heuristics.
- Add test fixtures for Django/FastAPI style structure.
- Target: reduce false-positive rate on pilot repos.

### Milestone P2: Resolver and Scale Hardening
- Expand import resolver for namespace package and multi-package scenarios.
- Add Python performance benchmarks + CI guardrails.

### Milestone P3: DX and Documentation
- Add Python quickstart config presets in docs/examples.
- Add clearer diagnostic messages for Python unresolved imports.

## AI vs Deterministic Enforcement (Python)

Current recommendation:
- Keep Python enforcement deterministic and local.
- Use AI only for onboarding suggestions and optional explanation flows.

Rationale:
- Deterministic rules are reproducible in CI, faster on save, and easier to debug.
- AI is most useful for ambiguous architecture intent, not baseline rule enforcement.

## Definition of Done for "Production-Ready Python"

- Score >= 4.5 in all of:
  - import graph fidelity
  - rule coverage
  - test coverage
  - IDE feedback quality
- Benchmarks for medium/large Python repos documented and passing in CI
- Python docs/examples cover at least two common frameworks and one generic clean architecture layout
