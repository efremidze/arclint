const fs = require('fs');
const os = require('os');
const path = require('path');

const { ImportGraphAnalyzer } = require('../dist/analyzer');
const { RuleEngine } = require('../dist/rules');
const { ArchitecturePattern, Language, LayerType, ViolationType, ViolationSeverity } = require('../dist/types');

describe('JavaScript support', () => {
  function config() {
    return {
      version: '0.1.0',
      pattern: ArchitecturePattern.MODULAR,
      language: Language.JAVASCRIPT,
      rootDir: './src',
      layers: [
        { name: LayerType.UI, pattern: '**/ui/**', canDependOn: [LayerType.BUSINESS_LOGIC] },
        { name: LayerType.BUSINESS_LOGIC, pattern: '**/business/**', canDependOn: [] }
      ],
      rules: {
        enforceLayerBoundaries: true,
        preventCircularDependencies: false,
        businessLogicInDomain: false
      },
      ignore: []
    };
  }

  test('analyzes .js imports and flags dependency-direction violations', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-js-'));
    const srcDir = path.join(tempDir, 'src');
    const uiDir = path.join(srcDir, 'ui');
    const bizDir = path.join(srcDir, 'business');

    fs.mkdirSync(uiDir, { recursive: true });
    fs.mkdirSync(bizDir, { recursive: true });

    fs.writeFileSync(path.join(uiDir, 'view.js'), "import { useCase } from '../business/useCase.js';\nexport const view = () => useCase();\n", 'utf8');
    fs.writeFileSync(path.join(bizDir, 'useCase.js'), "import { view } from '../ui/view.js';\nexport const useCase = () => view();\n", 'utf8');

    const analyzer = new ImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);

    expect(modules.some((m) => m.path === 'ui/view.js')).toBe(true);
    expect(modules.some((m) => m.path === 'business/useCase.js')).toBe(true);

    const result = new RuleEngine(config()).analyze(modules);
    const violation = result.violations.find((v) => v.type === ViolationType.WRONG_DEPENDENCY_DIRECTION);

    expect(violation).toBeDefined();
    expect(violation.ruleId).toBe('dependency-direction');
    expect(violation.severity).toBe(ViolationSeverity.ERROR);
  });

  test('reports unresolved internal .js imports as info', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-js-unresolved-'));
    const srcDir = path.join(tempDir, 'src');
    const uiDir = path.join(srcDir, 'ui');

    fs.mkdirSync(uiDir, { recursive: true });

    fs.writeFileSync(path.join(uiDir, 'view.js'), "import { missing } from './missing.js';\nexport const view = () => missing();\n", 'utf8');

    const analyzer = new ImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);
    const result = new RuleEngine(config()).analyze(modules);

    const unresolved = result.violations.find((v) => v.type === ViolationType.UNRESOLVED_IMPORT);
    expect(unresolved).toBeDefined();
    expect(unresolved.ruleId).toBe('unresolved-import');
    expect(unresolved.severity).toBe(ViolationSeverity.INFO);
  });
});
