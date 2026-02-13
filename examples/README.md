# ArcLint Examples

This directory contains example configurations and projects demonstrating ArcLint with different architectural patterns.

## Examples

### 1. Clean Architecture
See `clean-architecture.md` for Clean Architecture pattern details.

**Key Principles:**
- Domain layer is independent (no dependencies)
- Presentation depends only on Domain
- Data depends only on Domain
- Infrastructure can depend on Domain and Data

**Directory Structure:**
```
src/
├── domain/          # Core business logic
├── presentation/    # UI components  
├── data/            # Data access
└── infrastructure/  # External services
```

### 2. MVC (Model-View-Controller)

**Key Principles:**
- Models contain data and business logic
- Views render the UI
- Controllers coordinate between models and views

**Directory Structure:**
```
src/
├── models/       # Data models
├── views/        # UI views
└── controllers/  # Request handlers
```

### 3. MVVM (Model-View-ViewModel)

**Key Principles:**
- Models contain data
- Views are passive UI
- ViewModels contain presentation logic and bind to views

**Directory Structure:**
```
src/
├── models/      # Data models
├── views/       # UI components
└── viewmodels/  # Presentation logic
```

### 4. MVP (Model-View-Presenter)

**Key Principles:**
- Models contain data
- Views are passive interfaces
- Presenters handle all UI logic

**Directory Structure:**
```
src/
├── models/     # Data models
├── views/      # UI interfaces
└── presenters/ # UI logic
```

### 5. Modular Architecture

**Key Principles:**
- Feature-based modules
- Clear module boundaries
- Shared modules for common code

**Directory Structure:**
```
src/
├── ui/       # UI module
├── business/ # Business logic module
└── data/     # Data module
```

## Creating Your Own Example

1. Create project structure:
```bash
mkdir my-project
cd my-project
npm init -y
```

2. Run ArcLint onboarding:
```bash
npx arclint onboard
```

3. Review and customize `.arclint.yml`

4. Start coding with architectural guardrails!

## Common Violations

### Wrong Dependency Direction
```typescript
// ❌ Presentation importing from Data
import { UserRepo } from '../data/UserRepo';

// ✅ Presentation importing from Domain
import { UserService } from '../domain/UserService';
```

### Circular Dependencies
```typescript
// ❌ A.ts imports B.ts, B.ts imports A.ts
// Break the cycle by extracting shared logic
```

### Misplaced Business Logic
```typescript
// ❌ Business logic in presentation
export function calculateTotal(items) { ... }

// ✅ Business logic in domain
// Move to domain/calculations.ts
```
