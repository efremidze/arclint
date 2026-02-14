# ArcLint

AI-assisted architecture linting for modern codebases.

## Overview

ArcLint is an intelligent linting tool that helps maintain architectural consistency. It infers your project's architecture during onboarding and then enforces architectural rules deterministically using local import graph analysis.

### Key Features

- 🤖 **AI-Powered Onboarding**: Automatically infers your project's architectural pattern (Clean, MVC, MVVM, MVP, Modular)
- 📋 **Versioned Configuration**: Generates `.arclint.yml` with explicit architecture rules
- ⚡ **Fast & Deterministic**: Local import graph analysis with no API calls during linting
- 🚫 **Violation Detection**: Flags dependency direction violations, pattern inconsistencies, and misplaced business logic
- 🔄 **Real-time Feedback**: Integrates seamlessly with VS Code for instant feedback
- 🎯 **Zero Config**: Works out of the box after one-time onboarding

### Supported Architectures

- **Clean Architecture**: Domain-centric with presentation, domain, data, and infrastructure layers
- **MVC** (Model-View-Controller): Classic separation of concerns
- **MVVM** (Model-View-ViewModel): View models for presentation logic
- **MVP** (Model-View-Presenter): Presenters handle view logic
- **Modular**: Flexible module-based architecture

## Installation

### VS Code Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "ArcLint"
4. Click Install

### Manual Installation

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

Open your project and run:

```
Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
> ArcLint: Run Onboarding
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

### 3. Start Coding

ArcLint will automatically lint your code:
- On file save (configurable)
- Via command: `ArcLint: Lint Project`

Violations appear inline with helpful suggestions.

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
language: string         # Language: typescript, javascript, swift, python
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

## Development

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
# Run tests (when implemented)
npm test
```

## Roadmap

TypeScript-first execution plan: see [`docs/typescript-milestones.md`](docs/typescript-milestones.md).

### v0.1 (Current)
- ✅ Core import graph analyzer
- ✅ Architecture pattern inference
- ✅ Rule engine with violation detection
- ✅ VS Code extension with real-time linting (first IDE target)
- ✅ Support for Clean, MVC, MVVM, MVP, Modular patterns
- ✅ TypeScript support
- ✅ Python support (MVP)

### v0.2 (Swift Support)
- [ ] Swift parser and analyzer
- [ ] Swift project structure inference
- [ ] Swift-specific architectural patterns
- [ ] Xcode integration

### v0.3 (Enhanced LLM Integration)
- [ ] OpenAI/Anthropic API integration for onboarding
- [ ] Context-aware suggestions
- [ ] Auto-fix capabilities
- [ ] Learning from codebase-specific patterns

### Language Support Roadmap
- [x] TypeScript
- [ ] Swift
- [ ] Kotlin
- [x] Python
- [ ] GoLang
- [ ] Rust

### IDE Support Roadmap
- [x] VS Code
- [ ] JetBrains IDEs (IntelliJ, WebStorm, PyCharm)
- [ ] Neovim (LSP)
- [ ] Zed
- [ ] Sublime Text

### Future
- [ ] Custom rule definitions
- [ ] Team configuration sharing
- [ ] CI/CD integration
- [ ] Architectural debt metrics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.
