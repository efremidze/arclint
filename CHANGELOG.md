# Changelog

All notable changes to ArcLint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Swift language support (v0.2)
- LLM API integration for enhanced onboarding
- Auto-fix capabilities
- Custom rule definitions
- CI/CD integration tools

## [0.1.0] - 2026-02-13

### Added
- Initial release of ArcLint
- Core linting engine for TypeScript/JavaScript
- Import graph analyzer with dependency detection
- Support for 5 architectural patterns:
  - Clean Architecture
  - MVC (Model-View-Controller)
  - MVVM (Model-View-ViewModel)
  - MVP (Model-View-Presenter)
  - Modular Architecture
- Automatic architecture pattern inference during onboarding
- .arclint.yml configuration file generation
- Rule engine with violation detection:
  - Wrong dependency direction
  - Circular dependencies
  - Misplaced business logic
  - Layer boundary violations
- VS Code extension with:
  - Real-time linting and diagnostics
  - Onboarding command
  - Lint on save functionality
  - Configuration commands
- CLI tool for command-line usage:
  - `arclint onboard` - Run onboarding
  - `arclint lint` - Lint project
  - `arclint help` - Show help
  - `arclint version` - Show version
- Comprehensive documentation:
  - README with usage guide
  - Examples for each pattern
  - Contributing guidelines
- Monorepo structure with npm workspaces
- TypeScript with strict mode
- Glob pattern matching for layer assignment

### Fixed
- Pattern matching for nested directory structures
- Module resolution for relative imports

## [0.0.1] - 2026-02-13

### Added
- Project initialization
- Repository structure
- MIT License

[Unreleased]: https://github.com/efremidze/arclint/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/efremidze/arclint/releases/tag/v0.1.0
[0.0.1]: https://github.com/efremidze/arclint/releases/tag/v0.0.1
