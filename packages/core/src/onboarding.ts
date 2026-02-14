import * as fs from 'fs';
import * as path from 'path';
import { ArchitecturePattern, Language, ArchitectureConfig } from './types';
import { ConfigParser } from './config';

/**
 * Structure information about the codebase
 */
interface CodebaseStructure {
  directories: string[];
  fileCount: number;
  hasTests: boolean;
  frameworkIndicators: string[];
}

/**
 * Handles onboarding and architecture inference
 */
export class OnboardingService {
  /**
   * Analyzes codebase structure and infers architecture pattern
   */
  async inferArchitecture(rootDir: string): Promise<ArchitecturePattern> {
    const structure = await this.analyzeCodebaseStructure(rootDir);
    
    // Simple heuristic-based inference (in production, this would call an LLM)
    return this.inferPatternFromStructure(structure);
  }

  /**
   * Analyzes the structure of the codebase
   */
  private async analyzeCodebaseStructure(rootDir: string): Promise<CodebaseStructure> {
    const directories: string[] = [];
    let fileCount = 0;
    let hasTests = false;
    const frameworkIndicators: string[] = [];

    async function walk(dir: string, depth: number = 0) {
      if (depth > 3) return; // Limit depth

      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(rootDir, fullPath);

          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
              continue;
            }
            directories.push(relativePath);
            await walk(fullPath, depth + 1);
          } else if (entry.isFile()) {
            fileCount++;
            
            if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
              hasTests = true;
            }

            // Detect framework indicators
            if (entry.name === 'package.json') {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              const pkg = JSON.parse(content);
              if (pkg.dependencies) {
                if (pkg.dependencies['react']) frameworkIndicators.push('React');
                if (pkg.dependencies['vue']) frameworkIndicators.push('Vue');
                if (pkg.dependencies['angular']) frameworkIndicators.push('Angular');
                if (pkg.dependencies['express']) frameworkIndicators.push('Express');
                if (pkg.dependencies['@nestjs/core']) frameworkIndicators.push('NestJS');
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error walking directory ${dir}:`, error);
      }
    }

    await walk(rootDir);

    return {
      directories,
      fileCount,
      hasTests,
      frameworkIndicators
    };
  }

  /**
   * Infers architectural pattern from codebase structure
   * In production, this would use an LLM API for sophisticated analysis
   */
  private inferPatternFromStructure(structure: CodebaseStructure): ArchitecturePattern {
    const dirs = structure.directories.map(d => d.toLowerCase());

    // Check for Clean Architecture indicators
    const hasCleanArchLayers = 
      dirs.some(d => d.includes('domain')) &&
      dirs.some(d => d.includes('presentation')) &&
      dirs.some(d => d.includes('data'));
    
    if (hasCleanArchLayers) {
      return ArchitecturePattern.CLEAN;
    }

    // Check for MVVM indicators
    const hasMVVMPattern = 
      dirs.some(d => d.includes('viewmodel')) &&
      dirs.some(d => d.includes('view')) &&
      dirs.some(d => d.includes('model'));
    
    if (hasMVVMPattern) {
      return ArchitecturePattern.MVVM;
    }

    // Check for MVP indicators
    const hasMVPPattern = 
      dirs.some(d => d.includes('presenter')) &&
      dirs.some(d => d.includes('view')) &&
      dirs.some(d => d.includes('model'));
    
    if (hasMVPPattern) {
      return ArchitecturePattern.MVP;
    }

    // Check for MVC indicators
    const hasMVCPattern = 
      dirs.some(d => d.includes('controller')) &&
      dirs.some(d => d.includes('view')) &&
      dirs.some(d => d.includes('model'));
    
    if (hasMVCPattern) {
      return ArchitecturePattern.MVC;
    }

    // Check for modular architecture
    const hasModularPattern = 
      dirs.some(d => d.includes('module')) ||
      dirs.filter(d => d.split('/').length === 1).length > 5;
    
    if (hasModularPattern) {
      return ArchitecturePattern.MODULAR;
    }

    return ArchitecturePattern.UNKNOWN;
  }

  /**
   * Detects the primary language used in the project
   */
  async detectLanguage(rootDir: string): Promise<Language> {
    const tsConfigPath = path.join(rootDir, 'tsconfig.json');
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageSwiftPath = path.join(rootDir, 'Package.swift');
    const pyprojectPath = path.join(rootDir, 'pyproject.toml');
    const requirementsPath = path.join(rootDir, 'requirements.txt');

    // Check for TypeScript
    if (fs.existsSync(tsConfigPath)) {
      return Language.TYPESCRIPT;
    }

    // Check for Swift package
    if (fs.existsSync(packageSwiftPath)) {
      return Language.SWIFT;
    }

    if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) {
      return Language.PYTHON;
    }

    // Check package.json for TypeScript dependency
    if (fs.existsSync(packageJsonPath)) {
      const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
        return Language.TYPESCRIPT;
      }
    }

    // Check for Swift files (recursive, bounded depth)
    if (await this.hasSwiftFiles(rootDir, 3)) {
      return Language.SWIFT;
    }

    if (await this.hasPythonFiles(rootDir, 3)) {
      return Language.PYTHON;
    }

    // Default to JavaScript
    return Language.JAVASCRIPT;
  }

  /**
   * Performs full onboarding: analyzes project and generates config
   */
  async performOnboarding(rootDir: string, outputPath?: string): Promise<ArchitectureConfig> {
    console.log('🔍 Analyzing codebase structure...');
    
    const pattern = await this.inferArchitecture(rootDir);
    console.log(`✓ Detected architecture pattern: ${pattern}`);

    const language = await this.detectLanguage(rootDir);
    console.log(`✓ Detected language: ${language}`);

    // Generate config
    const defaultRootDir = this.defaultRootDirForLanguage(rootDir, language);
    const config = ConfigParser.createDefaultConfig(pattern, language, defaultRootDir);
    console.log('✓ Generated configuration');

    // Save config if output path provided
    if (outputPath) {
      await ConfigParser.saveConfig(config, outputPath);
      console.log(`✓ Saved configuration to ${outputPath}`);
    }

    return config;
  }

  private defaultRootDirForLanguage(rootDir: string, language: Language): string {
    if (language === Language.SWIFT) {
      if (fs.existsSync(path.join(rootDir, 'Sources'))) {
        return './Sources';
      }
      return './';
    }

    if (language === Language.PYTHON) {
      if (fs.existsSync(path.join(rootDir, 'src'))) {
        return './src';
      }
      return './';
    }

    if (fs.existsSync(path.join(rootDir, 'src'))) {
      return './src';
    }
    return './';
  }

  private async hasSwiftFiles(dir: string, maxDepth: number): Promise<boolean> {
    async function walk(current: string, depth: number): Promise<boolean> {
      if (depth > maxDepth) return false;

      const entries = await fs.promises.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.build' || entry.name === '.git' || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = path.join(current, entry.name);
        if (entry.isFile() && entry.name.endsWith('.swift')) {
          return true;
        }
        if (entry.isDirectory()) {
          const found = await walk(fullPath, depth + 1);
          if (found) return true;
        }
      }

      return false;
    }

    try {
      return await walk(dir, 0);
    } catch {
      return false;
    }
  }

  private async hasPythonFiles(dir: string, maxDepth: number): Promise<boolean> {
    async function walk(current: string, depth: number): Promise<boolean> {
      if (depth > maxDepth) return false;

      const entries = await fs.promises.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === '.git' ||
          entry.name === '.venv' ||
          entry.name === 'venv' ||
          entry.name === '__pycache__' ||
          entry.name === 'node_modules'
        ) {
          continue;
        }

        const fullPath = path.join(current, entry.name);
        if (entry.isFile() && entry.name.endsWith('.py')) {
          return true;
        }
        if (entry.isDirectory()) {
          const found = await walk(fullPath, depth + 1);
          if (found) return true;
        }
      }

      return false;
    }

    try {
      return await walk(dir, 0);
    } catch {
      return false;
    }
  }

  /**
   * Mock LLM API call for architecture inference (placeholder for v0.2)
   * In production, this would call OpenAI, Anthropic, or similar API
   */
  async inferWithLLM(
    codebaseStructure: CodebaseStructure,
    sampleFiles?: string[]
  ): Promise<{
    pattern: ArchitecturePattern;
    confidence: number;
    reasoning: string;
  }> {
    // This is a placeholder - in production would make actual LLM API call
    return {
      pattern: ArchitecturePattern.CLEAN,
      confidence: 0.85,
      reasoning: 'Based on directory structure showing domain, presentation, and data layers'
    };
  }
}
