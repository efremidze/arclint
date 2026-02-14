# Future Integrations

## Swift Architecture Skill Integration

Decision:
- Use a hybrid model.
- Keep deterministic lint rules and enforcement inside ArcLint core.
- Use external architecture skills (for example, `swift-architecture-skill`) for guidance, onboarding suggestions, and refactor recommendations.

Why:
- Linting must stay deterministic, offline-capable, and CI-reproducible.
- External skills are useful for higher-level architecture guidance but should not be a runtime dependency for rule enforcement.

Planned direction:
1. Keep ArcLint core as source of truth for rule behavior.
2. Optionally consume skill outputs during onboarding flows.
3. If needed, add a pinned sync process that maps stable skill guidance into in-repo presets.
4. Ensure any generated presets are versioned and covered by tests.

Non-goal:
- Replacing ArcLint runtime rule checks with network-dependent skill calls.
