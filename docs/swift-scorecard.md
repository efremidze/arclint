# Swift Language Scorecard

Date: 2026-02-17
Scope: ArcLint Swift support in `packages/core` (onboarding, analyzer, rules, tests)

## Summary

Swift support is in an early deterministic MVP state with correct language detection and baseline module import graphing, but limited Swift-specific rule intelligence.

- Current overall score: **2.6 / 5.0**
- Target for "production-ready Swift": **4.4 / 5.0**
- Recommendation: keep enforcement deterministic, then add Swift-specific architecture rules before any AI-driven validation.
- Scoring rubric: `docs/scorecard-rubric.md`

## Current vs Target Scorecard

| Area | Current | Target | Notes |
|---|---:|---:|---|
| Language detection | 4.0 | 4.5 | Detects `Package.swift` and falls back to `.swift` file presence; default root dir prefers `./Sources` when present. |
| Import graph fidelity | 2.5 | 4.5 | Supports `import Module` mapping to local module folders; does not yet parse symbols, `@testable import`, or conditional imports. |
| Rule coverage | 2.0 | 4.5 | Only generic core rules apply; no SwiftUI/MVVM-specific anti-pattern checks yet. |
| Config defaults | 3.5 | 4.0 | Swift-specific defaults and ignore patterns exist (`Tests`, `.build`), with architecture patterns mapped to Swift-style folder casing. |
| Test coverage | 2.0 | 4.5 | Current coverage is minimal (config defaults + one analyzer mapping case). |
| IDE feedback quality | 3.0 | 4.5 | Core diagnostics are usable, but messages are not Swift-contextualized for common architecture mistakes. |
| Performance confidence | 2.5 | 4.0 | No Swift-specific performance fixture or CI budget yet. |
| Documentation clarity | 2.5 | 4.0 | Swift support exists but lacks deep guidance and architecture examples in docs. |

## Weighted Score Calculation

| Area | Score | Weight | Weighted contribution |
|---|---:|---:|---:|
| Language detection | 4.0 | 10% | 0.40 |
| Import graph fidelity | 2.5 | 20% | 0.50 |
| Rule coverage | 2.0 | 20% | 0.40 |
| Config defaults | 3.5 | 10% | 0.35 |
| Test coverage | 2.0 | 15% | 0.30 |
| IDE feedback quality | 3.0 | 10% | 0.30 |
| Performance confidence | 2.5 | 10% | 0.25 |
| Documentation clarity | 2.5 | 5% | 0.13 |
| **Total** |  |  | **2.63 / 5.0** |

## What We Have (Evidence)

Implemented today:
- Swift analyzer in `packages/core/src/languages/swift/analyzer.ts`
- Swift language detection and onboarding root-dir defaults in `packages/core/src/onboarding.ts`
- Swift default config/layer patterns in `packages/core/src/config.ts`
- Generic deterministic rules from core `RuleEngine` applied to Swift modules

Tests currently cover:
- Swift default config generation in `packages/core/tests/swift-support.test.js`
- Local vs external Swift import mapping in `packages/core/tests/swift-support.test.js`

## Key Gaps to Reach Target State

1. Swift import and symbol fidelity
- Add parser support for `@testable import`, conditional compilation blocks, and module aliasing conventions.
- Improve local resolution beyond "module -> first file" so dependencies map to more accurate internal targets.

2. Swift architecture anti-pattern coverage
- Add deterministic SwiftUI/MVVM rules for business logic in Views (networking, heavy computation, persistence directly in `View`).
- Add ViewModel contract checks (state ownership, side-effect boundaries, dependency direction).

3. Test depth and confidence
- Add anti-pattern fixture tests for SwiftUI views, partial MVVM misuse, and false-positive controls.
- Add resolver edge-case fixtures for multi-module Swift Package layouts.

4. Documentation and onboarding quality
- Add Swift-specific `.arclint.yml` presets for MVVM and modular package layouts.
- Add troubleshooting docs for module resolution and expected folder conventions.

## Recommended Plan (Next 3 Milestones)

### Milestone S1: Swift Anti-Pattern Rules
- Implement deterministic SwiftUI/MVVM anti-pattern detectors in core rule pass.
- Add fixture-based tests that prove violations are caught and false positives are controlled.
- Target: detect common architecture violations from sample app code with stable results.

### Milestone S2: Import Resolver Hardening
- Expand Swift parser to handle `@testable import` and conditional import contexts.
- Improve module-to-file resolution strategy for multi-file module directories.
- Target: improved dependency graph accuracy on representative Swift package fixtures.

### Milestone S3: Swift DX and Docs
- Add Swift-specific config examples and a quickstart guide in docs.
- Improve violation messaging to include Swift-focused remediation suggestions.
- Target: onboarding-to-first-use flow understandable without source diving.

## AI vs Deterministic Enforcement (Swift)

Current recommendation:
- Keep enforcement deterministic for all blocking CI rules.
- Use AI only as optional explanation/refactor guidance after deterministic violations are produced.

Rationale:
- Swift architecture violations can be caught with deterministic structural checks first.
- Deterministic output is auditable and stable in CI; AI can improve developer guidance without owning pass/fail decisions.

## Definition of Done for "Production-Ready Swift"

- Score >= 4.5 in all of:
  - import graph fidelity
  - rule coverage
  - test coverage
  - IDE feedback quality
- Swift fixture benchmarks for medium/large repos documented and passing in CI
- Swift docs/examples cover at least:
  - SwiftUI MVVM layout
  - multi-module Swift Package layout
  - troubleshooting for module resolution and rule noise
