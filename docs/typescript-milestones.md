# ArcLint TypeScript-First Milestones

## Scope Decision
- This plan is for `TypeScript` only.
- Swift stays out of scope until TypeScript quality, performance, and UX targets are met.

## Product Outcome for v0.1
- Deterministic architectural linting for TypeScript projects in VS Code.
- AI is used only for onboarding/config generation and optional explanations.
- On-save linting performs locally with no API calls.

## Milestone 1: Core Graph and Config Foundation
Goal: Make dependency analysis reliable enough to enforce layer boundaries.

Deliverables:
- Stable `.arclint.yml` schema for TypeScript projects.
- Import graph builder for `.ts/.tsx/.js/.jsx` with:
  - relative imports
  - `tsconfig` path aliases
  - barrel re-exports (`index.ts`)
- Layer assignment from glob patterns with explicit precedence.
- Deterministic violation object format (rule id, severity, file, line, message, suggestion).

Acceptance criteria:
- Same repo + same config always produces identical violations.
- Graph build succeeds on at least 3 fixture projects (clean, mvc, modular).
- Full scan of 1,000-file fixture completes in less than 5 seconds on a dev machine.

## Milestone 2: Rule Engine (TypeScript MVP Rules)
Goal: Ship useful rules with low false-positive risk.

Deliverables:
- `dependency-direction` as the primary rule (`error` default).
- `pattern-inconsistency` as optional (`warning` default, configurable threshold).
- `business-logic-placement` behind `experimental` flag and off by default on save.
- Rule suppression support:
  - `// arclint-disable-next-line <rule-id>`
  - `// arclint-disable <rule-id>`

Acceptance criteria:
- Dependency-direction precision >= 95% on fixtures.
- No crash on unresolved imports; unresolved edges are reported as diagnostics info.
- Suppression comments reliably mute only intended findings.

## Milestone 3: VS Code Integration and UX
Goal: Make the linter feel native in editor workflows.

Deliverables:
- On-save incremental analysis.
- Problems panel diagnostics + inline squiggles.
- Command palette actions:
  - `ArcLint: Initialize Project`
  - `ArcLint: Lint Project`
  - `ArcLint: Explain Violation`
- Status bar summary with violation counts.

Acceptance criteria:
- Save-to-diagnostic latency under 200ms for small file edits.
- Extension recovers gracefully from invalid config and shows clear error messages.
- No network activity during normal on-save linting.

## Milestone 4: Onboarding AI (TypeScript Only)
Goal: Generate a usable config that users trust and can edit.

Deliverables:
- Structured project summarizer (tree, import sample, config files, naming patterns).
- Provider abstraction for OpenAI/Anthropic.
- Authentication via API keys only (stored in VS Code SecretStorage).
- Onboarding panel with confidence score and editable proposed layers/rules.
- "Confirm before write" flow for `.arclint.yml`.

Acceptance criteria:
- Generated config is accepted with minimal edits in at least 70% of pilot repos.
- Onboarding flow completes in under 15 seconds median.
- API keys stored via VS Code SecretStorage only.
- No provider SSO/OAuth flow in v0.1 (deferred until official provider documentation is sufficient).

## Milestone 5: Hardening, CI, and Release
Goal: Make v0.1 safe to publish.

Deliverables:
- Fixtures + regression tests for parser, resolver, rules, suppressions.
- Performance tests for incremental updates and full scan.
- Packaging and release pipeline for extension.
- User docs: quickstart, schema reference, troubleshooting.

Acceptance criteria:
- Zero P0/P1 bugs in pre-release test pass.
- Test suite deterministic and green in CI.
- Published extension validates on at least 5 real TypeScript repositories.

## Prompt Milestones (Onboarding Inference)

### Prompt v1 (Milestone 4 start)
Purpose:
- Infer architecture pattern and propose layers from project structure summary.

Output contract:
- Strict JSON with: `pattern`, `confidence`, `layers[]`, `rules`, `unknowns[]`.
- Must include reasoning per layer in one short sentence.

Quality gate:
- Reject output if JSON schema validation fails.

### Prompt v2 (after pilot feedback)
Purpose:
- Improve layer boundary quality and reduce overconfident guesses.

Changes:
- Require the model to list ambiguities and propose 1-2 alternatives when confidence < 0.75.
- Require evidence mapping: each proposed layer references example paths.

Quality gate:
- Confidence calibration check: high confidence requires >= 2 supporting signals.

### Prompt v3 (release candidate)
Purpose:
- Stabilize config generation across diverse repo shapes.

Changes:
- Add explicit monolith/modular heuristics.
- Enforce conservative fallback to `custom` when signals conflict.

Quality gate:
- Golden prompt tests against fixture summaries with snapshot assertions.

## Execution Order
1. Milestone 1
2. Milestone 2
3. Milestone 3
4. Milestone 4
5. Milestone 5

## Non-Goals for v0.1
- Swift parsing and Swift architecture inference.
- Monorepo-wide cross-package graphing.
- Automatic code moves/refactors.
- Always-on AI analysis during typing or save.
