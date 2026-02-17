const fs = require('fs');
const os = require('os');
const path = require('path');

const { ConfigParser } = require('../dist/config');
const { PythonImportGraphAnalyzer } = require('../dist/languages/python/analyzer');
const { RuleEngine } = require('../dist/rules');
const { OnboardingService } = require('../dist/onboarding');
const { ArchitecturePattern, Language, LayerType, ViolationType, ViolationSeverity } = require('../dist/types');

describe('Python support', () => {
  test('createDefaultConfig supports python defaults', () => {
    const config = ConfigParser.createDefaultConfig(
      ArchitecturePattern.MVVM,
      Language.PYTHON,
      './src'
    );

    expect(config.language).toBe(Language.PYTHON);
    expect(config.rootDir).toBe('./src');
    expect(config.layers.some((layer) => layer.pattern === '**/viewmodels/**')).toBe(true);
    expect(config.ignore).toContain('**/tests/**');
  });

  test('python analyzer resolves local imports and marks external imports', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-'));
    const srcDir = path.join(tempDir, 'src');
    const viewsDir = path.join(srcDir, 'shop', 'views');
    const servicesDir = path.join(srcDir, 'shop', 'services');

    fs.mkdirSync(viewsDir, { recursive: true });
    fs.mkdirSync(servicesDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'shop', '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(viewsDir, '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(servicesDir, '__init__.py'), '', 'utf8');

    fs.writeFileSync(path.join(servicesDir, 'orders.py'), 'def calculate_total(items):\n    return sum(items)\n', 'utf8');
    fs.writeFileSync(path.join(viewsDir, 'helpers.py'), 'def format_price(value):\n    return f"{value}"\n', 'utf8');
    fs.writeFileSync(
      path.join(viewsDir, 'cart.py'),
      [
        'from shop.services.orders import calculate_total',
        'from .helpers import format_price',
        'import django.http',
        '',
        'def render(items):',
        '    total = calculate_total(items)',
        '    return format_price(total)'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new PythonImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);
    const cartModule = modules.find((m) => m.path === 'shop/views/cart.py');

    expect(cartModule).toBeDefined();
    expect(cartModule.dependencies.some((d) => d.to === 'shop/services/orders.py' && !d.isExternal)).toBe(true);
    expect(cartModule.dependencies.some((d) => d.to === 'shop/views/helpers.py' && !d.isExternal)).toBe(true);
    expect(cartModule.dependencies.some((d) => d.to === 'django.http' && d.isExternal)).toBe(true);
  });

  test('python analyzer supports multiline parenthesized from-import statements', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-multiline-'));
    const srcDir = path.join(tempDir, 'src');
    const viewsDir = path.join(srcDir, 'shop', 'views');
    const servicesDir = path.join(srcDir, 'shop', 'services');

    fs.mkdirSync(viewsDir, { recursive: true });
    fs.mkdirSync(servicesDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'shop', '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(viewsDir, '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(servicesDir, '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(servicesDir, 'orders.py'), 'def calculate_total(items):\n    return sum(items)\n', 'utf8');
    fs.writeFileSync(path.join(viewsDir, 'helpers.py'), 'def format_price(value):\n    return f\"{value}\"\n', 'utf8');

    fs.writeFileSync(
      path.join(viewsDir, 'cart.py'),
      [
        'from shop.services.orders import (',
        '    calculate_total,',
        ')',
        '',
        'from .helpers import (',
        '    format_price,',
        ')',
        '',
        'def render(items):',
        '    total = calculate_total(items)',
        '    return format_price(total)'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new PythonImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);
    const cartModule = modules.find((m) => m.path === 'shop/views/cart.py');

    expect(cartModule).toBeDefined();
    expect(cartModule.dependencies.some((d) => d.to === 'shop/services/orders.py' && !d.isExternal)).toBe(true);
    expect(cartModule.dependencies.some((d) => d.to === 'shop/views/helpers.py' && !d.isExternal)).toBe(true);
  });

  test('python unresolved imports are reported as info violations', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-unresolved-'));
    const srcDir = path.join(tempDir, 'src');
    const viewsDir = path.join(srcDir, 'shop', 'views');

    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'shop', '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(viewsDir, '__init__.py'), '', 'utf8');
    fs.writeFileSync(
      path.join(viewsDir, 'cart.py'),
      [
        'import shop.missing.service',
        '',
        'def render(items):',
        '    return items'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new PythonImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);

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
    const unresolved = result.violations.find((v) => v.type === ViolationType.UNRESOLVED_IMPORT);

    expect(unresolved).toBeDefined();
    expect(unresolved.ruleId).toBe('unresolved-import');
    expect(unresolved.severity).toBe(ViolationSeverity.INFO);
  });

  test('relative imports inside __init__.py resolve against current package', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-init-'));
    const srcDir = path.join(tempDir, 'src');
    const viewsDir = path.join(srcDir, 'shop', 'views');

    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'shop', '__init__.py'), '', 'utf8');
    fs.writeFileSync(path.join(viewsDir, 'helpers.py'), 'def format_price(value):\n    return f\"{value}\"\n', 'utf8');
    fs.writeFileSync(
      path.join(viewsDir, '__init__.py'),
      [
        'from .helpers import format_price',
        '',
        '__all__ = [\"format_price\"]'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new PythonImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(srcDir, srcDir);
    const initModule = modules.find((m) => m.path === 'shop/views/__init__.py');

    expect(initModule).toBeDefined();
    expect(initModule.dependencies.some((d) => d.to === 'shop/views/helpers.py' && !d.isExternal)).toBe(
      true
    );
  });

  test('onboarding detects python projects from pyproject.toml', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-detect-'));
    fs.writeFileSync(path.join(tempDir, 'pyproject.toml'), '[project]\\nname = \"demo\"\\n', 'utf8');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'main.py'), 'print(\"hello\")\\n', 'utf8');

    const onboarding = new OnboardingService();
    const language = await onboarding.detectLanguage(tempDir);

    expect(language).toBe(Language.PYTHON);
  });

  test('onboarding does not classify requirements.txt-only repos as python', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-python-requirements-only-'));
    fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'requests==2.32.3\\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# demo\\n', 'utf8');

    const onboarding = new OnboardingService();
    const language = await onboarding.detectLanguage(tempDir);

    expect(language).toBe(Language.JAVASCRIPT);
  });
});
