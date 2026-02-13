# Contributing to ArcLint

Thank you for your interest in contributing to ArcLint! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- VS Code (recommended for extension development)

### Getting Started

1. Fork and clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/arclint.git
cd arclint
```

2. Install dependencies:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

4. Run in watch mode during development:
```bash
# Terminal 1: Watch core package
cd packages/core
npm run watch

# Terminal 2: Watch extension
cd packages/vscode-extension
npm run watch
```

## Project Structure

```
arclint/
├── packages/
│   ├── core/              # Core linting engine
│   │   ├── src/
│   │   │   ├── types.ts   # Type definitions
│   │   │   ├── analyzer.ts # Import graph analysis
│   │   │   ├── config.ts  # Configuration parsing
│   │   │   ├── rules.ts   # Rule engine
│   │   │   ├── onboarding.ts # Architecture inference
│   │   │   └── cli/       # CLI tool
│   │   └── package.json
│   │
│   └── vscode-extension/  # VS Code extension
│       ├── src/
│       │   └── extension.ts
│       └── package.json
│
├── examples/              # Example projects
├── README.md
└── CONTRIBUTING.md
```

## Making Changes

### Core Engine

The core engine (`packages/core`) contains:

- **types.ts**: TypeScript interfaces and enums
- **analyzer.ts**: Import graph analysis and dependency detection
- **config.ts**: Configuration file parsing and generation
- **rules.ts**: Rule engine that validates architecture
- **onboarding.ts**: Architecture pattern inference
- **cli/**: Command-line interface

### VS Code Extension

The extension (`packages/vscode-extension`) provides:

- Integration with VS Code
- Real-time diagnostics
- Commands for onboarding and linting
- Configuration UI

### Testing Your Changes

1. Test the CLI:
```bash
cd /tmp/test-project
node /path/to/arclint/packages/core/dist/cli/index.js onboard
node /path/to/arclint/packages/core/dist/cli/index.js lint
```

2. Test the extension:
- Open `packages/vscode-extension` in VS Code
- Press F5 to launch Extension Development Host
- Test commands and functionality

## Contribution Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing code conventions
- Add comments for complex logic
- Keep functions focused and small

### Commit Messages

Use clear, descriptive commit messages:
```
Add support for custom rule definitions
Fix pattern matching for nested directories
Update README with installation instructions
```

### Pull Request Process

1. Create a feature branch:
```bash
git checkout -b feature/my-new-feature
```

2. Make your changes and commit them

3. Push to your fork:
```bash
git push origin feature/my-new-feature
```

4. Open a Pull Request with:
   - Clear description of changes
   - Screenshots for UI changes
   - Test results

### What to Contribute

We welcome contributions in these areas:

#### High Priority
- Unit tests for core components
- Integration tests for VS Code extension
- Swift language support
- Additional architectural patterns
- Bug fixes

#### Medium Priority
- Performance improvements
- Better error messages
- Documentation improvements
- Example projects

#### Future Features
- LLM API integration for onboarding
- Auto-fix capabilities
- Custom rule definitions
- CI/CD integration
- Additional language support

## Adding New Features

### Adding a New Architectural Pattern

1. Update `types.ts` to add the pattern enum
2. Add pattern detection in `onboarding.ts`
3. Create default config in `config.ts`
4. Add documentation and examples
5. Test with real projects

### Adding New Rule Types

1. Update `ViolationType` in `types.ts`
2. Implement detection in `rules.ts`
3. Add tests
4. Update documentation

### Adding Language Support

1. Create a parser for the language in `analyzer.ts`
2. Update `Language` enum in `types.ts`
3. Add language detection in `onboarding.ts`
4. Test with sample projects
5. Update README

## Code Review

All contributions will be reviewed for:

- Code quality and style
- Test coverage
- Documentation completeness
- Performance impact
- Security implications

## Getting Help

- 🐛 Report bugs via [GitHub Issues](https://github.com/efremidze/arclint/issues)
- 💬 Ask questions in [Discussions](https://github.com/efremidze/arclint/discussions)
- 📧 Email maintainers for private inquiries

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes
- Project documentation

Thank you for contributing to ArcLint! 🎉
