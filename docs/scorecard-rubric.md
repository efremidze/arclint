# Language Scorecard Rubric

Date: 2026-02-17  
Scope: Normalized scoring math used across all ArcLint language scorecards

## Weight Model

All language scorecards use the same weighted formula:

`overall = sum(area_score * area_weight)`

Weights:

| Area | Weight |
|---|---:|
| Language detection | 10% |
| Import graph fidelity | 20% |
| Rule coverage | 20% |
| Config defaults | 10% |
| Test coverage | 15% |
| IDE feedback quality | 10% |
| Performance confidence | 10% |
| Documentation clarity | 5% |

Total weight: **100%**

## Rounding Rule

- Keep full precision for internal calculations.
- Present the overall score rounded to one decimal place.

## Target Interpretation

- Weighted target baseline: **4.4 / 5.0**
- Production-ready gate still requires key areas (import graph fidelity, rule coverage, test coverage, IDE feedback quality) to each reach at least **4.5 / 5.0**.
