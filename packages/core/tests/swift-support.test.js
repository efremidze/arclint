const fs = require('fs');
const os = require('os');
const path = require('path');

const { ConfigParser } = require('../dist/config');
const { SwiftImportGraphAnalyzer } = require('../dist/languages/swift/analyzer');
const { Language, ArchitecturePattern } = require('../dist/types');

describe('Swift support', () => {
  test('createDefaultConfig supports swift defaults', () => {
    const config = ConfigParser.createDefaultConfig(
      ArchitecturePattern.MODULAR,
      Language.SWIFT,
      './Sources'
    );

    expect(config.language).toBe(Language.SWIFT);
    expect(config.rootDir).toBe('./Sources');
    expect(config.ignore).toContain('**/Tests/**');
  });

  test('swift analyzer maps local module imports to local files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-swift-'));
    const sourcesDir = path.join(tempDir, 'Sources');
    const appDir = path.join(sourcesDir, 'App');
    const coreDir = path.join(sourcesDir, 'Core');

    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(coreDir, { recursive: true });

    fs.writeFileSync(
      path.join(appDir, 'main.swift'),
      'import Foundation\nimport Core\nstruct AppMain {}\n',
      'utf8'
    );
    fs.writeFileSync(path.join(coreDir, 'Utilities.swift'), 'struct Utilities {}\n', 'utf8');

    const analyzer = new SwiftImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(sourcesDir, sourcesDir);
    const appModule = modules.find((m) => m.path === 'App/main.swift');

    expect(appModule).toBeDefined();
    expect(appModule.dependencies.some((d) => d.to === 'Core/Utilities.swift')).toBe(true);
    expect(appModule.dependencies.some((d) => d.to === 'Foundation' && d.isExternal)).toBe(true);
  });
});
