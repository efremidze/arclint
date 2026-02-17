const fs = require('fs');
const os = require('os');
const path = require('path');

const { ConfigParser } = require('../dist/config');
const { KotlinImportGraphAnalyzer } = require('../dist/languages/kotlin/analyzer');
const { OnboardingService } = require('../dist/onboarding');
const { Language, ArchitecturePattern } = require('../dist/types');

describe('Kotlin support', () => {
  test('createDefaultConfig supports kotlin defaults', () => {
    const config = ConfigParser.createDefaultConfig(
      ArchitecturePattern.MVVM,
      Language.KOTLIN,
      './src/main/kotlin'
    );

    expect(config.language).toBe(Language.KOTLIN);
    expect(config.rootDir).toBe('./src/main/kotlin');
    expect(config.layers.some((layer) => layer.pattern === '**/viewmodels/**')).toBe(true);
    expect(config.ignore).toContain('**/build/**');
    expect(config.ignore).toContain('**/src/androidTest/**');
  });

  test('kotlin analyzer resolves local imports and marks external imports', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-kotlin-'));
    const rootDir = path.join(tempDir, 'src', 'main', 'kotlin');
    const uiDir = path.join(rootDir, 'com', 'example', 'app', 'ui');
    const domainDir = path.join(rootDir, 'com', 'example', 'app', 'domain');

    fs.mkdirSync(uiDir, { recursive: true });
    fs.mkdirSync(domainDir, { recursive: true });

    fs.writeFileSync(
      path.join(domainDir, 'UserService.kt'),
      ['package com.example.app.domain', '', 'class UserService'].join('\n'),
      'utf8'
    );

    fs.writeFileSync(
      path.join(uiDir, 'ProfileScreen.kt'),
      [
        'package com.example.app.ui',
        '',
        'import com.example.app.domain.UserService',
        'import kotlinx.coroutines.Dispatchers',
        '',
        'class ProfileScreen'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new KotlinImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(rootDir, rootDir);
    const uiModule = modules.find((m) => m.path === 'com/example/app/ui/ProfileScreen.kt');

    expect(uiModule).toBeDefined();
    expect(
      uiModule.dependencies.some(
        (d) => d.to === 'com/example/app/domain/UserService.kt' && !d.isExternal && !d.isUnresolved
      )
    ).toBe(true);
    expect(
      uiModule.dependencies.some((d) => d.to === 'kotlinx.coroutines.Dispatchers' && d.isExternal)
    ).toBe(true);
  });

  test('kotlin analyzer marks unresolved internal imports', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-kotlin-unresolved-'));
    const rootDir = path.join(tempDir, 'src', 'main', 'kotlin');
    const uiDir = path.join(rootDir, 'com', 'example', 'app', 'ui');

    fs.mkdirSync(uiDir, { recursive: true });
    fs.writeFileSync(
      path.join(uiDir, 'ProfileScreen.kt'),
      [
        'package com.example.app.ui',
        '',
        'import com.example.app.domain.MissingService',
        '',
        'class ProfileScreen'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new KotlinImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(rootDir, rootDir);
    const uiModule = modules.find((m) => m.path === 'com/example/app/ui/ProfileScreen.kt');

    expect(uiModule).toBeDefined();
    expect(
      uiModule.dependencies.some(
        (d) =>
          d.to === 'com.example.app.domain.MissingService' && d.isUnresolved === true && d.isExternal === false
      )
    ).toBe(true);
  });

  test('onboarding detects kotlin and selects android app root dir', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-kotlin-detect-'));
    const appKotlinDir = path.join(tempDir, 'app', 'src', 'main', 'kotlin', 'com', 'example', 'app');

    fs.mkdirSync(appKotlinDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'plugins { kotlin(\"jvm\") }', 'utf8');
    fs.writeFileSync(
      path.join(appKotlinDir, 'MainActivity.kt'),
      ['package com.example.app', '', 'class MainActivity'].join('\n'),
      'utf8'
    );

    const onboarding = new OnboardingService();
    const language = await onboarding.detectLanguage(tempDir);
    const config = await onboarding.performOnboarding(tempDir);

    expect(language).toBe(Language.KOTLIN);
    expect(config.language).toBe(Language.KOTLIN);
    expect(config.rootDir).toBe('./app/src/main/kotlin');
  });

  test('onboarding does not classify gradle-only repos as kotlin', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-kotlin-gradle-only-'));
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'plugins { id(\"java\") }', 'utf8');
    fs.mkdirSync(path.join(tempDir, 'src', 'main', 'java'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'main', 'java', 'Main.java'), 'class Main {}', 'utf8');

    const onboarding = new OnboardingService();
    const language = await onboarding.detectLanguage(tempDir);

    expect(language).toBe(Language.JAVASCRIPT);
  });
});
