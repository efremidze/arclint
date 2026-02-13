export * from './types';
export * from './analyzer';
export * from './config';
export * from './rules';
export * from './onboarding';

import { ImportGraphAnalyzer } from './analyzer';
import { ConfigParser } from './config';
import { RuleEngine } from './rules';
import { OnboardingService } from './onboarding';
import { AnalysisResult } from './types';

/**
 * Main ArcLint class - orchestrates the linting process
 */
export class ArcLint {
  private analyzer: ImportGraphAnalyzer;
  private onboarding: OnboardingService;

  constructor() {
    this.analyzer = new ImportGraphAnalyzer();
    this.onboarding = new OnboardingService();
  }

  /**
   * Performs onboarding and creates configuration
   */
  async onboard(rootDir: string, outputPath: string): Promise<void> {
    await this.onboarding.performOnboarding(rootDir, outputPath);
  }

  /**
   * Lints the codebase according to configuration
   */
  async lint(configPath: string, rootDir: string): Promise<AnalysisResult> {
    // Load configuration
    const config = await ConfigParser.loadConfig(configPath);

    // Analyze the codebase
    console.log('📊 Analyzing import graph...');
    const modules = await this.analyzer.analyzeDirectory(rootDir, rootDir);
    console.log(`✓ Analyzed ${modules.length} modules`);

    // Apply rules
    console.log('🔍 Checking architectural rules...');
    const ruleEngine = new RuleEngine(config);
    const result = ruleEngine.analyze(modules);

    return result;
  }

  /**
   * Finds and lints using nearest .arclint.yml
   */
  async lintAuto(startDir: string): Promise<AnalysisResult | null> {
    const configPath = await ConfigParser.findConfig(startDir);
    
    if (!configPath) {
      console.error('No .arclint.yml found. Run onboarding first.');
      return null;
    }

    const config = await ConfigParser.loadConfig(configPath);
    const configDir = require('path').dirname(configPath);
    const rootDir = require('path').resolve(configDir, config.rootDir);

    return this.lint(configPath, rootDir);
  }
}
