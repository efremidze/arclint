const fs = require('fs');
const os = require('os');
const path = require('path');

const { PythonImportGraphAnalyzer } = require('../dist/languages/python/analyzer');
const { RuleEngine } = require('../dist/rules');
const { ArchitecturePattern, Language, LayerType, ViolationType } = require('../dist/types');

describe('Python import edge cases', () => {
  async function analyzeProject(files) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-edge-'));
    const srcDir = path.join(tempDir, 'src');

    for (const [relativePath, content] of Object.entries(files)) {
      const fullPath = path.join(srcDir, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf8');
    }

    const analyzer = new PythonImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);
    return { srcDir, modules };
  }

  test('resolves relative imports across parent levels and classifies over-traversal consistently', async () => {
    const { modules } = await analyzeProject({
      'shop/__init__.py': '',
      'shop/views/__init__.py': '',
      'shop/services/__init__.py': '',
      'shop/services/orders.py': 'def total(items):\n    return sum(items)\n',
      'shop/views/cart.py': [
        'from ..services import orders',
        'from ...missing import nope',
        'from ....bad import nope2',
        '',
        'def render(items):',
        '    return orders.total(items)'
      ].join('\n')
    });

    const cart = modules.find((m) => m.path === 'shop/views/cart.py');
    expect(cart).toBeDefined();

    expect(cart.dependencies.some((d) => d.to === 'shop/services/orders.py' && !d.isExternal)).toBe(true);

    const topLevelImport = cart.dependencies.find((d) => d.to === 'missing' && d.isExternal);
    expect(topLevelImport).toBeDefined();

    const overTraversal = cart.dependencies.find((d) => d.to === '....bad' && d.isExternal);
    expect(overTraversal).toBeDefined();
  });

  test('handles module import vs symbol import from same package', async () => {
    const { modules } = await analyzeProject({
      'shop/__init__.py': '',
      'shop/controllers/__init__.py': '',
      'shop/controllers/http.py': 'class HttpController:\n    pass\n',
      'shop/controllers/main.py': [
        'from shop.controllers import http',
        'from shop.controllers.http import HttpController',
        '',
        'def build():',
        '    return HttpController()'
      ].join('\n')
    });

    const main = modules.find((m) => m.path === 'shop/controllers/main.py');
    expect(main).toBeDefined();

    // Both forms should resolve to the same target file.
    const hits = main.dependencies.filter((d) => d.to === 'shop/controllers/http.py' && !d.isExternal);
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  test('supports import aliases without breaking resolution', async () => {
    const { modules } = await analyzeProject({
      'shop/__init__.py': '',
      'shop/services/__init__.py': '',
      'shop/services/orders.py': 'def total(items):\n    return sum(items)\n',
      'shop/entry.py': [
        'import shop.services.orders as order_mod',
        'from shop.services.orders import total as calc_total',
        '',
        'def run(items):',
        '    return calc_total(items)'
      ].join('\n')
    });

    const entry = modules.find((m) => m.path === 'shop/entry.py');
    expect(entry).toBeDefined();

    const hits = entry.dependencies.filter((d) => d.to === 'shop/services/orders.py' && !d.isExternal);
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  test('supports multiline parenthesized imports with comments, blank lines, and trailing commas', async () => {
    const { modules } = await analyzeProject({
      'shop/__init__.py': '',
      'shop/views/__init__.py': '',
      'shop/services/__init__.py': '',
      'shop/services/orders.py': 'def total(items):\n    return sum(items)\n',
      'shop/views/helpers.py': 'def fmt(v):\n    return str(v)\n',
      'shop/views/cart.py': [
        'from shop.services.orders import (',
        '    total,  # local alias target',
        '',
        ')',
        'from .helpers import (',
        '    fmt,',
        ')',
        '',
        'def render(items):',
        '    return fmt(total(items))'
      ].join('\n')
    });

    const cart = modules.find((m) => m.path === 'shop/views/cart.py');
    expect(cart).toBeDefined();
    expect(cart.dependencies.some((d) => d.to === 'shop/services/orders.py' && !d.isExternal)).toBe(true);
    expect(cart.dependencies.some((d) => d.to === 'shop/views/helpers.py' && !d.isExternal)).toBe(true);
  });

  test('star re-exports from __init__.py map to module dependency and stay deterministic in rules', async () => {
    const { modules } = await analyzeProject({
      'shop/__init__.py': '',
      'shop/views/__init__.py': 'from .helpers import *\n',
      'shop/views/helpers.py': 'def fmt(v):\n    return str(v)\n'
    });

    const initModule = modules.find((m) => m.path === 'shop/views/__init__.py');
    expect(initModule).toBeDefined();
    expect(initModule.dependencies.some((d) => d.to === 'shop/views/helpers.py' && !d.isExternal)).toBe(true);

    const config = {
      version: '0.1.0',
      pattern: ArchitecturePattern.MVC,
      language: Language.PYTHON,
      rootDir: './src',
      layers: [
        { name: LayerType.VIEW, pattern: '**/views/**', canDependOn: [LayerType.MODEL] },
        { name: LayerType.MODEL, pattern: '**/models/**', canDependOn: [] }
      ],
      rules: {
        enforceLayerBoundaries: true,
        preventCircularDependencies: false,
        businessLogicInDomain: false
      },
      ignore: []
    };

    const result = new RuleEngine(config).analyze(modules);

    // No unresolved import should be produced for the star re-export in this fixture.
    const unresolved = result.violations.find((v) => v.type === ViolationType.UNRESOLVED_IMPORT);
    expect(unresolved).toBeUndefined();
  });
});
