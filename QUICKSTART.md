# Quick Start Guide

Get started with ArcLint in 5 minutes!

## Developer Setup (VS Code, One-Click)

Use this flow when developing ArcLint itself.

1. Install dependencies:
```bash
npm install
```
2. Open the repository in VS Code:
```bash
code .
```
3. Start extension development host:
- Press `F5`
- Choose `ArcLint: Run Extension`

This uses:
- `/Users/home/Documents/GitHub/arclint/.vscode/tasks.json` for build/watch tasks
- `/Users/home/Documents/GitHub/arclint/.vscode/launch.json` for Extension Host launch

Useful commands:
```bash
npm run dev:build
npm run dev:test-core
npm run dev:test-extension
```

## Installation

### Option 1: VS Code Extension (Recommended)

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. Search for "ArcLint"
4. Click Install

### Option 2: CLI Tool

```bash
npm install -g @arclint/core
```

## First Time Setup

### Step 1: Open Your Project

Open your TypeScript/JavaScript project in VS Code or navigate to it in terminal.

### Step 2: Run Onboarding

#### In VS Code:
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "ArcLint: Run Onboarding"
3. Press Enter

#### In CLI:
```bash
cd your-project
arclint onboard
```

This will:
- Analyze your project structure
- Detect your architectural pattern
- Create `.arclint.yml` configuration

### Step 3: Review Configuration

The generated `.arclint.yml` file defines your architecture:

```yaml
version: 0.1.0
pattern: clean  # Detected pattern
language: typescript
rootDir: ./src
layers:
  - name: presentation
    pattern: '**/presentation/**'
    canDependOn: [domain]
  # ... more layers
rules:
  enforceLayerBoundaries: true
  preventCircularDependencies: true
  businessLogicInDomain: true
```

Customize as needed!

### Step 4: Start Coding

ArcLint now guards your architecture:

#### In VS Code:
- Violations appear as you type
- Squiggly lines under problem imports
- Hover for suggestions

#### In CLI:
```bash
arclint lint
```

## Example Violation

```typescript
// ❌ ERROR: Layer 'presentation' cannot depend on layer 'data'
import { UserRepository } from '../data/UserRepository';

// ✅ CORRECT: Presentation depends on domain
import { UserService } from '../domain/UserService';
```

## Configuration

### Enable/Disable Linting

In VS Code Settings:
```json
{
  "arclint.enable": true,
  "arclint.lintOnSave": true
}
```

### Ignore Files

In `.arclint.yml`:
```yaml
ignore:
  - '**/*.test.ts'
  - '**/generated/**'
```

### Customize Rules

```yaml
rules:
  enforceLayerBoundaries: true     # Check layer dependencies
  preventCircularDependencies: true # Detect cycles
  businessLogicInDomain: true      # Check logic placement
```

## Common Issues

### "No .arclint.yml found"
Run onboarding first: `arclint onboard`

### Pattern Not Detected Correctly
Manually edit `.arclint.yml` and set the correct pattern:
```yaml
pattern: mvc  # or mvvm, mvp, modular, clean
```

### False Positives
Add exceptions to ignore list in `.arclint.yml`:
```yaml
ignore:
  - '**/legacy/**'
```

## Next Steps

- Read the [full documentation](../README.md)
- Check out [examples](../examples/)
- Join the [discussion](https://github.com/efremidze/arclint/discussions)

## Getting Help

- 🐛 [Report a bug](https://github.com/efremidze/arclint/issues)
- 💬 [Ask a question](https://github.com/efremidze/arclint/discussions)
- 📖 [Read the docs](../README.md)

Happy coding with clean architecture! 🎉
