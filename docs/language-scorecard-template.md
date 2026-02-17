# <Language> Language Scorecard

Date: YYYY-MM-DD  
Scope: ArcLint <language> support in `packages/core` (onboarding, analyzer, rules, tests)

## Summary

<One paragraph summary of current maturity and recommendation.>

- Current overall score: **X.X / 5.0**
- Target for "production-ready <language>": **4.4 / 5.0**
- Recommendation: <deterministic-first / hybrid / etc.>
- Scoring rubric: `docs/scorecard-rubric.md`

## Current vs Target Scorecard

| Area | Current | Target | Notes |
|---|---:|---:|---|
| Language detection | X.X | 4.5 | <signals, fallback behavior> |
| Import graph fidelity | X.X | 4.5 | <import forms supported / known gaps> |
| Rule coverage | X.X | 4.5 | <which rules are language-aware> |
| Config defaults | X.X | 4.0 | <layer presets, ignores, conventions> |
| Test coverage | X.X | 4.5 | <unit, fixture, edge-case, regression> |
| IDE feedback quality | X.X | 4.5 | <diagnostic clarity and fix guidance> |
| Performance confidence | X.X | 4.0 | <benchmarks and CI budgets> |
| Documentation clarity | X.X | 4.0 | <guides, examples, troubleshooting> |

## Weighted Score Calculation

| Area | Score | Weight | Weighted contribution |
|---|---:|---:|---:|
| Language detection | X.X | 10% | X.XX |
| Import graph fidelity | X.X | 20% | X.XX |
| Rule coverage | X.X | 20% | X.XX |
| Config defaults | X.X | 10% | X.XX |
| Test coverage | X.X | 15% | X.XX |
| IDE feedback quality | X.X | 10% | X.XX |
| Performance confidence | X.X | 10% | X.XX |
| Documentation clarity | X.X | 5% | X.XX |
| **Total** |  |  | **X.XX / 5.0** |

## What We Have (Evidence)

Implemented today:
- <feature 1>
- <feature 2>
- <feature 3>

Tests currently cover:
- <test area 1>
- <test area 2>
- <test area 3>

## Key Gaps to Reach Target State

1. <Gap category 1>
- <action>
- <action>

2. <Gap category 2>
- <action>
- <action>

3. <Gap category 3>
- <action>
- <action>

## Recommended Plan (Next 3 Milestones)

### Milestone <L1>: <name>
- <deliverable>
- <deliverable>
- Target: <success metric>

### Milestone <L2>: <name>
- <deliverable>
- <deliverable>
- Target: <success metric>

### Milestone <L3>: <name>
- <deliverable>
- <deliverable>
- Target: <success metric>

## AI vs Deterministic Enforcement (<Language>)

Current recommendation:
- <deterministic for enforcement / AI for onboarding-explain only>

Rationale:
- <why this split is appropriate now>

## Definition of Done for "Production-Ready <Language>"

- Score >= 4.5 in all of:
  - import graph fidelity
  - rule coverage
  - test coverage
  - IDE feedback quality
- Benchmarks for medium/large repos documented and passing in CI
- Language docs/examples cover at least:
  - one framework-specific layout
  - one generic clean/modular layout
  - one troubleshooting section
