const { RuleEngine } = require('../dist/rules');
const {
  ArchitecturePattern,
  Language,
  LayerType,
  ViolationType,
  ViolationSeverity
} = require('../dist/types');

describe('RuleEngine', () => {
  function baseConfig(layers) {
    return {
      version: '0.1.0',
      pattern: ArchitecturePattern.CLEAN,
      language: Language.TYPESCRIPT,
      rootDir: './src',
      layers,
      rules: {
        enforceLayerBoundaries: true,
        preventCircularDependencies: false,
        businessLogicInDomain: false
      },
      ignore: []
    };
  }

  test('applies higher precedence layer when multiple patterns match', () => {
    const config = baseConfig([
      {
        name: LayerType.INFRASTRUCTURE,
        pattern: 'src/**',
        canDependOn: [LayerType.DOMAIN],
        precedence: 1
      },
      {
        name: LayerType.DOMAIN,
        pattern: '**/domain/**',
        canDependOn: [],
        precedence: 10
      }
    ]);

    const modules = [
      {
        path: 'src/domain/user.ts',
        dependencies: [
          {
            from: 'src/domain/user.ts',
            to: 'src/infra/db.ts',
            importLine: 3,
            importStatement: "import { db } from '../infra/db';",
            isExternal: false,
            isUnresolved: false
          }
        ],
        exports: []
      },
      {
        path: 'src/infra/db.ts',
        dependencies: [],
        exports: []
      }
    ];

    const result = new RuleEngine(config).analyze(modules);

    const boundaryViolation = result.violations.find(
      (v) => v.type === ViolationType.WRONG_DEPENDENCY_DIRECTION
    );

    expect(boundaryViolation).toBeDefined();
    expect(boundaryViolation.ruleId).toBe('dependency-direction');
    expect(boundaryViolation.severity).toBe(ViolationSeverity.ERROR);
  });

  test('reports unresolved internal imports as info violations', () => {
    const config = baseConfig([
      {
        name: LayerType.DOMAIN,
        pattern: '**/src/domain/**',
        canDependOn: []
      }
    ]);

    const modules = [
      {
        path: 'src/domain/user.ts',
        dependencies: [
          {
            from: 'src/domain/user.ts',
            to: 'src/domain/missing',
            importLine: 2,
            importStatement: "import { x } from './missing';",
            isExternal: false,
            isUnresolved: true
          }
        ],
        exports: []
      }
    ];

    const result = new RuleEngine(config).analyze(modules);

    const unresolved = result.violations.find(
      (v) => v.type === ViolationType.UNRESOLVED_IMPORT
    );

    expect(unresolved).toBeDefined();
    expect(unresolved.ruleId).toBe('unresolved-import');
    expect(unresolved.severity).toBe(ViolationSeverity.INFO);
  });
});
