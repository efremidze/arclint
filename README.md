# ArcLint

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/efremidze/arclint)

AI-assisted architecture linting for modern codebases.

## Overview

ArcLint is an intelligent linting tool that helps maintain architectural consistency. It infers your project's architecture during onboarding and then enforces architectural rules deterministically using local import graph analysis.

### Key Features

- 🤖 **AI-Powered Onboarding**: Automatically infers your project's architectural pattern (Clean, MVC, MVVM, MVP, Modular)
- 📋 **Versioned Configuration**: Generates `.arclint.yml` with explicit architecture rules
- ⚡ **Fast & Deterministic**: Local import graph analysis with no API calls during linting
- 🚫 **Violation Detection**: Flags dependency direction violations, pattern inconsistencies, and misplaced business logic
- 🔄 **Real-time Feedback**: Integrates seamlessly with VS Code for instant feedback
- 🎯 **Quick Setup**: Works after a short onboarding flow that generates `.arclint.yml`

### Supported Architectures

- **Clean Architecture**: Domain-centric with presentation, domain, data, and infrastructure layers
- **MVC** (Model-View-Controller): Classic separation of concerns
- **MVVM** (Model-View-ViewModel): View models for presentation logic
- **MVP** (Model-View-Presenter): Presenters handle view logic
- **Modular**: Flexible module-based architecture

## Installation

### Option 1: VS Code Extension (Recommended)

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "ArcLint"
4. Click Install

### Option 2: CLI Tool

```bash
npm install -g @arclint/core
```

### Option 3: Manual Installation (Development)

```bash
# Clone the repository
git clone https://github.com/efremidze/arclint.git
cd arclint

# Install dependencies
npm install

# Build packages
npm run build

# Install extension
cd packages/vscode-extension
npm run package
code --install-extension arclint-*.vsix
```

## Quick Start

### 1. Run Onboarding

#### In VS Code:

```
Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
> ArcLint: Run Onboarding
```

#### Using CLI:

```bash
cd your-project
arclint onboard
```

This will:
- Analyze your project structure
- Infer the architectural pattern
- Generate `.arclint.yml` configuration file

### 2. Review Configuration

The generated `.arclint.yml` will look like this (for Clean Architecture):

```yaml
version: 0.1.0
pattern: clean
language: typescript
rootDir: ./src
layers:
  - name: presentation
    pattern: '**/presentation/**'
    canDependOn:
      - domain
    description: UI components and presentation logic
  - name: domain
    pattern: '**/domain/**'
    canDependOn: []
    description: Business logic and entities
  - name: data
    pattern: '**/data/**'
    canDependOn:
      - domain
    description: Data access and repositories
  - name: infrastructure
    pattern: '**/infrastructure/**'
    canDependOn:
      - domain
      - data
    description: External services and frameworks
rules:
  enforceLayerBoundaries: true
  preventCircularDependencies: true
  businessLogicInDomain: true
ignore:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/node_modules/**'
```

### 3. Start Linting

#### In VS Code:
ArcLint will automatically lint your code:
- On file save (configurable)
- Via command: `ArcLint: Lint Project`
- Violations appear inline with helpful suggestions

#### Using CLI:
```bash
arclint lint
```

See [Quick Start Guide](QUICKSTART.md) for detailed instructions.

## Configuration

### VS Code Settings

Configure ArcLint in VS Code settings:

```json
{
  "arclint.enable": true,
  "arclint.lintOnSave": true,
  "arclint.configPath": ".arclint.yml"
}
```

### .arclint.yml Schema

```yaml
version: string          # Config version (e.g., "0.1.0")
pattern: string          # Architecture pattern: clean, mvc, mvvm, mvp, modular
language: string         # Language: typescript, javascript, swift, kotlin, python
rootDir: string          # Project root directory (e.g., "./src")

layers:                  # Layer definitions
  - name: string         # Layer name (e.g., "domain", "presentation")
    pattern: string      # File path pattern (glob)
    canDependOn: array   # Allowed dependencies (layer names)
    description: string  # Optional description

rules:                   # Linting rules
  enforceLayerBoundaries: boolean
  preventCircularDependencies: boolean
  businessLogicInDomain: boolean

ignore: array            # Patterns to ignore
```

## Violation Types

### 1. Wrong Dependency Direction

```typescript
// ❌ ERROR: Presentation layer cannot depend on data layer
// File: src/presentation/UserView.tsx
import { UserRepository } from '../data/UserRepository';

// ✅ CORRECT: Presentation depends on domain
import { UserService } from '../domain/UserService';
```

### 2. Circular Dependencies

```typescript
// ❌ WARNING: Circular dependency detected
// src/services/A.ts -> src/services/B.ts -> src/services/A.ts

// ✅ CORRECT: Break cycle with abstraction or refactoring
```

### 3. Misplaced Business Logic

```typescript
// ❌ WARNING: Business logic detected in presentation layer
// File: src/views/UserView.tsx
export function calculateUserAge(birthDate: Date): number {
  return new Date().getFullYear() - birthDate.getFullYear();
}

// ✅ CORRECT: Move to domain layer
// File: src/domain/userLogic.ts
export function calculateUserAge(birthDate: Date): number { ... }
```

## CLI Usage

### Commands

```bash
# Run onboarding to generate .arclint.yml
arclint onboard

# Lint your project
arclint lint

# Show version
arclint version

# Show help
arclint help
```

### Options

```bash
# Specify custom config path
arclint lint --config ./custom/.arclint.yml

# Lint specific directory
arclint lint --rootDir ./src
```

## Examples

Check out the [examples directory](examples/) for:
- Detailed architecture pattern explanations
- Example project structures
- Common violations and how to fix them
- Language-specific scorecards and best practices

See also: [Clean Architecture Example](examples/clean-architecture.md)

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development instructions.

### Building from Source

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Watch mode for development
cd packages/core
npm run watch

# In another terminal
cd packages/vscode-extension
npm run watch
```

### Testing

```bash
# Run tests
npm run test

# Test specific package
npm run test --workspace @arclint/core
```

## Language Support

| Language | Status | Version | Notes |
|----------|--------|---------|-------|
| TypeScript | ✅ Stable | v0.1.0+ | Full support with import graph analysis |
| JavaScript | ✅ Stable | v0.1.0+ | Via TypeScript parser |
| Swift | ✅ Stable | v0.2.0+ | Import and framework detection |
| Kotlin | ✅ Stable | v0.2.0+ | Package and import analysis |
| Python | ✅ Stable | v0.2.0+ | Module and import detection |
| Go | 🔜 Planned | - | Roadmap for future release |
| Rust | 🔜 Planned | - | Roadmap for future release |

## Roadmap

### v0.1 ✅ Shipped
- ✅ Core import graph analyzer
- ✅ Architecture pattern inference
- ✅ Rule engine with violation detection
- ✅ VS Code extension with real-time linting
- ✅ Support for Clean, MVC, MVVM, MVP, Modular patterns
- ✅ TypeScript and JavaScript support

### v0.2 ✅ Shipped
- ✅ Swift support
- ✅ Kotlin support
- ✅ Python support
- ✅ Language-specific folder structure in `packages/core/src/languages/*`
- ✅ CLI tool enhancements

### v0.3 🔜 In Progress (Enhanced LLM Integration)
- [ ] OpenAI/Anthropic API integration for onboarding
- [ ] Context-aware suggestions
- [ ] Auto-fix capabilities
- [ ] Learning from codebase-specific patterns
- [ ] Go language support
- [ ] Rust language support

## Troubleshooting

### Common Issues

**"No .arclint.yml found"**
- Run onboarding first: `arclint onboard` or use VS Code command `ArcLint: Run Onboarding`

**Pattern not detected correctly**
- Manually edit `.arclint.yml` and set the correct pattern: `pattern: mvc` (or mvvm, mvp, modular, clean)

**False positives**
- Add exceptions to the ignore list in `.arclint.yml`:
  ```yaml
  ignore:
    - '**/legacy/**'
    - '**/generated/**'
  ```

**Extension not working in VS Code**
- Ensure `.arclint.yml` exists in your project root
- Check VS Code settings: `arclint.enable` should be `true`
- Reload VS Code window after configuration changes

## Resources

- 📖 [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- 🤝 [Contributing Guide](CONTRIBUTING.md) - Help improve ArcLint
- 📝 [Examples](examples/) - Real-world architecture patterns
- 🔒 [Security Policy](SECURITY.md) - Report security issues
- 📋 [Changelog](CHANGELOG.md) - Version history

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:
- Setting up the development environment
- Code style and conventions
- Submitting pull requests
- Adding new features or language support

## Support

- 🐛 [Report a bug](https://github.com/efremidze/arclint/issues)
- 💬 [Ask a question](https://github.com/efremidze/arclint/discussions)
- ⭐ Star this repo if you find it useful!

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Lasha Efremidze](https://github.com/efremidze)
