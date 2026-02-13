# Example: Clean Architecture

This example demonstrates Clean Architecture pattern with ArcLint.

## Structure

```
src/
├── domain/           # Business logic (no dependencies)
│   ├── entities/
│   └── usecases/
├── data/             # Data access (depends on domain)
│   └── repositories/
├── presentation/     # UI layer (depends on domain)
│   └── components/
└── infrastructure/   # External services (depends on domain & data)
    └── api/
```

## Configuration

See `.arclint.yml` in this directory for the full configuration.

## Key Rules

1. **Domain layer** is independent - no dependencies
2. **Presentation** can only depend on domain
3. **Data** can only depend on domain
4. **Infrastructure** can depend on domain and data

## Violations to Avoid

❌ Presentation importing from Data layer
❌ Domain importing from any other layer
❌ Circular dependencies between layers
❌ Business logic in Presentation layer
