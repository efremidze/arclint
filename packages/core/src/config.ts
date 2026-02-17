import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ArchitectureConfig, ArchitecturePattern, Language, LayerType } from './types';

/**
 * Parses and validates .arclint.yml configuration files
 */
export class ConfigParser {
  /**
   * Loads configuration from a YAML file
   */
  static async loadConfig(configPath: string): Promise<ArchitectureConfig> {
    try {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = yaml.load(content) as ArchitectureConfig;
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }
  }

  /**
   * Saves configuration to a YAML file
   */
  static async saveConfig(config: ArchitectureConfig, configPath: string): Promise<void> {
    try {
      this.validateConfig(config);
      const content = yaml.dump(config, {
        indent: 2,
        lineWidth: 100,
        noRefs: true
      });
      
      await fs.promises.writeFile(configPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config to ${configPath}: ${error}`);
    }
  }

  /**
   * Validates configuration structure
   */
  private static validateConfig(config: ArchitectureConfig): void {
    if (!config.version) {
      throw new Error('Config must have a version field');
    }

    if (!Object.values(ArchitecturePattern).includes(config.pattern)) {
      throw new Error(`Invalid architecture pattern: ${config.pattern}`);
    }

    if (!Object.values(Language).includes(config.language)) {
      throw new Error(`Invalid language: ${config.language}`);
    }

    if (!config.rootDir) {
      throw new Error('Config must have a rootDir field');
    }

    if (!config.layers || !Array.isArray(config.layers)) {
      throw new Error('Config must have a layers array');
    }

    // Validate each layer
    for (const layer of config.layers) {
      if (!layer.name || !Object.values(LayerType).includes(layer.name)) {
        throw new Error(`Invalid layer name: ${layer.name}`);
      }
      if (!layer.pattern) {
        throw new Error(`Layer ${layer.name} must have a pattern`);
      }
      if (!layer.canDependOn || !Array.isArray(layer.canDependOn)) {
        throw new Error(`Layer ${layer.name} must have canDependOn array`);
      }
      if (layer.precedence !== undefined && !Number.isFinite(layer.precedence)) {
        throw new Error(`Layer ${layer.name} has invalid precedence: ${layer.precedence}`);
      }
    }
  }

  /**
   * Finds .arclint.yml in the current or parent directories
   */
  static async findConfig(startDir: string): Promise<string | null> {
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const configPath = path.join(currentDir, '.arclint.yml');
      if (fs.existsSync(configPath)) {
        return configPath;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Creates a default configuration for a given pattern
   */
  static createDefaultConfig(
    pattern: ArchitecturePattern,
    language: Language,
    rootDir: string
  ): ArchitectureConfig {
    const isSwift = language === Language.SWIFT;
    const isPython = language === Language.PYTHON;
    const isKotlin = language === Language.KOTLIN;
    const usesLowercaseFolders = isPython || isKotlin;

    const config: ArchitectureConfig = {
      version: '0.1.0',
      pattern,
      language,
      rootDir:
        rootDir ||
        (language === Language.SWIFT
          ? './Sources'
          : language === Language.KOTLIN
          ? './src/main/kotlin'
          : './src'),
      layers: [],
      rules: {
        enforceLayerBoundaries: true,
        preventCircularDependencies: true,
        businessLogicInDomain: true
      },
      ignore:
        language === Language.SWIFT
          ? ['**/*Tests.swift', '**/Tests/**', '**/.build/**']
          : language === Language.KOTLIN
          ? ['**/build/**', '**/.gradle/**', '**/src/test/**', '**/src/androidTest/**']
          : language === Language.PYTHON
          ? ['**/tests/**', '**/test_*.py', '**/*_test.py', '**/__pycache__/**', '**/.venv/**']
          : ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    };

    // Define layers based on pattern
    switch (pattern) {
      case ArchitecturePattern.CLEAN:
        config.layers = [
          {
            name: LayerType.PRESENTATION,
            pattern: isSwift ? '**/Presentation/**' : '**/presentation/**',
            canDependOn: [LayerType.DOMAIN],
            description: 'UI components and presentation logic'
          },
          {
            name: LayerType.DOMAIN,
            pattern: isSwift ? '**/Domain/**' : '**/domain/**',
            canDependOn: [],
            description: 'Business logic and entities'
          },
          {
            name: LayerType.DATA,
            pattern: isSwift ? '**/Data/**' : '**/data/**',
            canDependOn: [LayerType.DOMAIN],
            description: 'Data access and repositories'
          },
          {
            name: LayerType.INFRASTRUCTURE,
            pattern: isSwift ? '**/Infrastructure/**' : '**/infrastructure/**',
            canDependOn: [LayerType.DOMAIN, LayerType.DATA],
            description: 'External services and frameworks'
          }
        ];
        break;

      case ArchitecturePattern.MVC:
        config.layers = [
          {
            name: LayerType.MODEL,
            pattern: isSwift ? '**/Models/**' : usesLowercaseFolders ? '**/models/**' : '**/model?(s)/**',
            canDependOn: [],
            description: 'Data models'
          },
          {
            name: LayerType.VIEW,
            pattern: isSwift ? '**/Views/**' : usesLowercaseFolders ? '**/views/**' : '**/view?(s)/**',
            canDependOn: [],
            description: 'UI views'
          },
          {
            name: LayerType.CONTROLLER,
            pattern:
              isSwift
                ? '**/Controllers/**'
                : usesLowercaseFolders
                ? '**/controllers/**'
                : '**/controller?(s)/**',
            canDependOn: [LayerType.MODEL, LayerType.VIEW],
            description: 'Controllers handling user input'
          }
        ];
        break;

      case ArchitecturePattern.MVVM:
        config.layers = [
          {
            name: LayerType.MODEL,
            pattern: isSwift ? '**/Models/**' : usesLowercaseFolders ? '**/models/**' : '**/model?(s)/**',
            canDependOn: [],
            description: 'Data models'
          },
          {
            name: LayerType.VIEW,
            pattern: isSwift ? '**/Views/**' : usesLowercaseFolders ? '**/views/**' : '**/view?(s)/**',
            canDependOn: [LayerType.VIEWMODEL],
            description: 'UI views'
          },
          {
            name: LayerType.VIEWMODEL,
            pattern:
              isSwift
                ? '**/ViewModels/**'
                : usesLowercaseFolders
                ? '**/viewmodels/**'
                : '**/viewmodel?(s)/**',
            canDependOn: [LayerType.MODEL],
            description: 'View models with presentation logic'
          }
        ];
        break;

      case ArchitecturePattern.MVP:
        config.layers = [
          {
            name: LayerType.MODEL,
            pattern: isSwift ? '**/Models/**' : usesLowercaseFolders ? '**/models/**' : '**/model?(s)/**',
            canDependOn: [],
            description: 'Data models'
          },
          {
            name: LayerType.VIEW,
            pattern: isSwift ? '**/Views/**' : usesLowercaseFolders ? '**/views/**' : '**/view?(s)/**',
            canDependOn: [],
            description: 'UI views'
          },
          {
            name: LayerType.PRESENTER,
            pattern:
              isSwift
                ? '**/Presenters/**'
                : usesLowercaseFolders
                ? '**/presenters/**'
                : '**/presenter?(s)/**',
            canDependOn: [LayerType.MODEL, LayerType.VIEW],
            description: 'Presenters handling view logic'
          }
        ];
        break;

      case ArchitecturePattern.MODULAR:
        config.layers = [
          {
            name: LayerType.UI,
            pattern: isSwift ? '**/UI/**' : '**/ui/**',
            canDependOn: [LayerType.BUSINESS_LOGIC],
            description: 'User interface module'
          },
          {
            name: LayerType.BUSINESS_LOGIC,
            pattern: isSwift ? '**/Business/**' : '**/business/**',
            canDependOn: [],
            description: 'Business logic module'
          },
          {
            name: LayerType.DATA,
            pattern: isSwift ? '**/Data/**' : '**/data/**',
            canDependOn: [LayerType.BUSINESS_LOGIC],
            description: 'Data access module'
          }
        ];
        break;
    }

    return config;
  }
}
