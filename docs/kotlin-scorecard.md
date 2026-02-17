# Kotlin Language Scorecard

Date: 2026-02-17
Scope: ArcLint Kotlin support in `packages/core` (onboarding, analyzer, rules, tests)

## Summary

Kotlin support is now in a solid MVP state: language detection, import graphing, and initial Kotlin-specific architecture anti-pattern checks are in place, but resolver depth and ecosystem-specific nuance still need hardening.

- Current overall score: **3.4 / 5.0**
- Target for "production-ready Kotlin": **4.4 / 5.0**
- Recommendation: continue deterministic Kotlin rule/resolver expansion before introducing AI-driven Kotlin enforcement behavior.
- Scoring rubric: `docs/scorecard-rubric.md`

## Current vs Target Scorecard

| Area | Current | Target | Notes |
|---|---:|---:|---|
| Language detection | 4.0 | 4.5 | Detects Kotlin via Gradle markers plus `.kt` files and `.kt` fallback scan. |
| Import graph fidelity | 3.2 | 4.5 | Supports package/import parsing, local symbol resolution, wildcard imports, inline comment stripping, and unresolved/internal classification. |
| Rule coverage | 3.6 | 4.5 | Core deterministic rules plus Kotlin-specific anti-pattern checks for UI/data coupling, ViewModel->UI dependencies, and domain framework leakage. |
| Config defaults | 3.8 | 4.0 | Kotlin default root dir and ignores are present (`src/main/kotlin`, Gradle/test folders). |
| Test coverage | 3.6 | 4.5 | Covers config defaults, analyzer resolution, unresolved imports, onboarding detection, and Kotlin anti-pattern rule behavior. |
| IDE feedback quality | 3.4 | 4.5 | Violations include actionable suggestions; Kotlin-specific messaging can still be expanded and tuned for framework conventions. |
| Performance confidence | 2.6 | 4.0 | No Kotlin-specific performance fixtures or CI budget thresholds yet. |
| Documentation clarity | 2.8 | 4.0 | Kotlin is listed in README, but dedicated Kotlin usage/troubleshooting docs are still minimal. |

## Weighted Score Calculation

| Area | Score | Weight | Weighted contribution |
|---|---:|---:|---:|
| Language detection | 4.0 | 10% | 0.40 |
| Import graph fidelity | 3.2 | 20% | 0.64 |
| Rule coverage | 3.6 | 20% | 0.72 |
| Config defaults | 3.8 | 10% | 0.38 |
| Test coverage | 3.6 | 15% | 0.54 |
| IDE feedback quality | 3.4 | 10% | 0.34 |
| Performance confidence | 2.6 | 10% | 0.26 |
| Documentation clarity | 2.8 | 5% | 0.14 |
| **Total** |  |  | **3.42 / 5.0** |

## What We Have (Evidence)

Implemented today:
- Kotlin analyzer in `packages/core/src/languages/kotlin/analyzer.ts`
- Kotlin language routing in core (`Language.KOTLIN`) and analyzer selection in `packages/core/src/index.ts`
- Kotlin onboarding detection/root-dir logic in `packages/core/src/onboarding.ts`
- Kotlin defaults in `packages/core/src/config.ts`
- Kotlin-specific anti-pattern rules in `packages/core/src/rules.ts` (`kotlin-architecture-anti-pattern`)

Tests currently cover:
- Kotlin default config generation
- Local vs external import resolution
- Unresolved internal imports
- Onboarding detection and root-dir selection
- Gradle-only false-positive guard
- Kotlin anti-pattern detections (UI->data/infra and ViewModel->UI)

## Key Gaps to Reach Target State

1. Resolver and parser depth
- Improve handling for Kotlin-specific import contexts (more edge cases around wildcard and symbol ambiguity).
- Add stronger mapping for multi-module Gradle/KMP layouts and shared source sets.

2. Kotlin rule precision
- Expand anti-pattern checks for coroutine scope misuse, direct repository calls from UI state handlers, and domain purity boundaries.
- Add noise-control rules for common Android/Compose conventions.

3. Scale confidence
- Add Kotlin fixture repos and benchmark budgets in CI for larger codebases.
- Add regression fixtures for multi-module and mixed Java/Kotlin projects.

4. Documentation and developer workflow
- Add Kotlin `.arclint.yml` examples (Android MVVM, clean modular package layout).
- Add Kotlin troubleshooting docs for unresolved imports and expected folder conventions.

## Recommended Plan (Next 3 Milestones)

### Milestone K1: Kotlin Rule Expansion
- Add more Kotlin architecture anti-pattern detectors (UI side effects, domain purity, ViewModel state boundaries).
- Add false-positive control tests for common Android/Compose structures.
- Target: better signal/noise on representative Kotlin app codebases.

### Milestone K2: Resolver Hardening
- Improve import resolution fidelity for multi-module Gradle/KMP repository layouts.
- Add fixture-based tests for shared modules and wildcard import ambiguity.
- Target: lower unresolved-import and misrouting noise in real projects.

### Milestone K3: DX + Performance
- Add Kotlin performance benchmarks with CI guardrails.
- Expand Kotlin docs/examples and improve Kotlin-specific remediation messages.
- Target: predictable performance and faster Kotlin onboarding/adoption.

## AI vs Deterministic Enforcement (Kotlin)

Current recommendation:
- Keep Kotlin architecture enforcement deterministic for all CI/editor pass-fail behavior.
- Use AI only as optional explanation/refactor guidance after deterministic violations are produced.

Rationale:
- Deterministic checks are stable, auditable, and fast for Kotlin codebases.
- AI is best used for intent interpretation and suggested refactors, not baseline rule enforcement.

## Definition of Done for "Production-Ready Kotlin"

- Score >= 4.5 in all of:
  - import graph fidelity
  - rule coverage
  - test coverage
  - IDE feedback quality
- Kotlin benchmarks for medium/large repos documented and passing in CI
- Kotlin docs/examples cover at least:
  - Android MVVM/Compose-oriented layout
  - clean modular Gradle layout
  - troubleshooting for import/rule interpretation
