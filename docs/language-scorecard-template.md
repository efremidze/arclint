# <Language> Language Scorecard

Date: YYYY-MM-DD  
Scope: ArcLint <language> support in `packages/core` (onboarding, analyzer, rules, tests)

## Summary

<One paragraph summary of current maturity and recommendation.>

- Current overall score: **X.X / 5.0**
- Target for "production-ready <language>": **4.5 / 5.0**
- Recommendation: <deterministic-first / hybrid / etc.>

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
