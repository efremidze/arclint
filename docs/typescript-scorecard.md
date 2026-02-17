# TypeScript Language Scorecard

Date: 2026-02-17
Scope: ArcLint TypeScript/JavaScript support in `packages/core` (onboarding, analyzer, rules, tests)

## Summary

TypeScript/JavaScript support is the most mature deterministic path in core, with AST-based import parsing and stable generic architecture rules, but it still needs broader fixtures and DX polish for production confidence.

- Current overall score: **3.8 / 5.0**
- Target for "production-ready TypeScript": **4.5 / 5.0**
- Recommendation: continue deterministic-first hardening (resolver fidelity, broader fixtures, perf budgets) before adding AI as anything beyond optional guidance.

## Current vs Target Scorecard

| Area | Current | Target | Notes |
|---|---:|---:|---|
| Language detection | 4.5 | 4.5 | Detects via `tsconfig.json` and TypeScript dependency hints in `package.json`. |
| Import graph fidelity | 4.0 | 4.5 | AST-based parsing via `@typescript-eslint/typescript-estree`; resolves relative imports, extension variants, and `index` files. |
| Rule coverage | 3.5 | 4.5 | Core deterministic rules are active (`dependency-direction`, `circular-dependency`, `business-logic-placement`, `unresolved-import`). |
| Config defaults | 4.0 | 4.0 | Strong default patterns and ignore sets for TS/JS projects. |
| Test coverage | 3.0 | 4.5 | Rule engine tests exist; analyzer-level TS fixture coverage is still thin. |
| IDE feedback quality | 3.5 | 4.5 | Core diagnostics work, but remediation text can be more context-aware by framework/project style. |
| Performance confidence | 3.0 | 4.0 | No explicit benchmark suite or CI budgets for large TS monorepos. |
| Documentation clarity | 3.5 | 4.0 | Usable docs exist, but fewer deep examples for real-world TS layouts and edge cases. |

## What We Have (Evidence)

Implemented today:
- TS/JS analyzer in `packages/core/src/languages/typescript/analyzer.ts`
- Onboarding language detection for TypeScript in `packages/core/src/onboarding.ts`
- Core deterministic rules in `packages/core/src/rules.ts`
- Pattern-based config defaults in `packages/core/src/config.ts`

Tests currently cover:
- Rule engine precedence and unresolved-import behavior in `packages/core/tests/rules.test.js`

## Key Gaps to Reach Target State

1. Resolver completeness and ecosystem fidelity
- Add support for `tsconfig` path aliases, package export maps, and workspace/monorepo resolution nuances.
- Add fixture validation for mixed `.ts/.tsx/.js/.jsx` import behavior in realistic repos.

2. Language-aware rule precision
- Improve business-logic placement signals beyond export-name heuristics.
- Add framework-aware noise controls for common React/Nest/Node architecture conventions.

3. Confidence at scale
- Add performance fixtures (large TS repos) and CI budgets for scan/runtime stability.
- Add regression fixtures for circular/unresolved-edge scenarios.

4. Documentation and onboarding
- Add TS-focused architecture preset examples (modular, clean, MVVM-like frontend patterns).
- Add troubleshooting docs for alias resolution and unresolved import interpretation.

## Recommended Plan (Next 3 Milestones)

### Milestone T1: Resolver Hardening
- Add `tsconfig` path alias and project-reference-aware resolution.
- Add fixture-based tests covering alias + index + extension resolution combinations.
- Target: lower false unresolved-import diagnostics in real TS repos.

### Milestone T2: Rule Precision
- Strengthen deterministic business-logic placement signals.
- Add rule fixtures for common framework layouts to reduce false positives.
- Target: improved signal/noise ratio on sample projects.

### Milestone T3: Scale + DX
- Add benchmark suite for medium/large repositories with CI thresholds.
- Improve diagnostic wording and quick-fix hints for TS/JS context.
- Target: predictable performance and clearer remediation guidance.

## AI vs Deterministic Enforcement (TypeScript)

Current recommendation:
- Keep deterministic enforcement as source of truth for CI/editor pass/fail.
- Use AI as optional explanation and refactor suggestion layer only.

Rationale:
- Deterministic rules remain faster, reproducible, and easier to trust in pipelines.
- AI adds value in intent interpretation and remediation suggestions, not core violation detection.

## Definition of Done for "Production-Ready TypeScript"

- Score >= 4.5 in all of:
  - import graph fidelity
  - rule coverage
  - test coverage
  - IDE feedback quality
- Benchmarks for medium/large TS repos documented and passing in CI
- TS docs/examples cover at least:
  - frontend-oriented structure
  - backend/service-oriented structure
  - troubleshooting for alias/import resolution
