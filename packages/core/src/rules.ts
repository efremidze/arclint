import * as path from 'path';
import {
  ArchitectureConfig,
  Module,
  Violation,
  ViolationType,
  ViolationSeverity,
  LayerType,
  LayerDefinition,
  AnalysisResult,
  Language
} from './types';

/**
 * Enforces architectural rules and detects violations
 */
export class RuleEngine {
  private config: ArchitectureConfig;
  private layerMap: Map<string, LayerDefinition> = new Map();
  static readonly RULE_IDS = {
    DEPENDENCY_DIRECTION: 'dependency-direction',
    CIRCULAR_DEPENDENCY: 'circular-dependency',
    BUSINESS_LOGIC_PLACEMENT: 'business-logic-placement',
    UNRESOLVED_IMPORT: 'unresolved-import',
    KOTLIN_ARCHITECTURE_ANTI_PATTERN: 'kotlin-architecture-anti-pattern'
  } as const;

  constructor(config: ArchitectureConfig) {
    this.config = config;
    
    // Build layer map for quick lookup
    for (const layer of config.layers) {
      this.layerMap.set(layer.name, layer);
    }
  }

  /**
   * Analyzes modules and detects violations
   */
  analyze(modules: Module[]): AnalysisResult {
    const violations: Violation[] = [];

    // Assign layers to modules based on patterns
    const modulesWithLayers = this.assignLayersToModules(modules);

    violations.push(...this.checkUnresolvedImports(modulesWithLayers));

    // Check dependency direction rules
    if (this.config.rules?.enforceLayerBoundaries !== false) {
      violations.push(...this.checkLayerBoundaries(modulesWithLayers));
    }

    // Check for circular dependencies
    if (this.config.rules?.preventCircularDependencies !== false) {
      violations.push(...this.checkCircularDependencies(modulesWithLayers));
    }

    // Check for misplaced business logic
    if (this.config.rules?.businessLogicInDomain !== false) {
      violations.push(...this.checkBusinessLogicPlacement(modulesWithLayers));
    }

    // Kotlin architecture checks should run independently from businessLogicInDomain.
    if (this.config.language === Language.KOTLIN) {
      violations.push(...this.checkKotlinArchitectureAntiPatterns(modulesWithLayers));
    }

    return {
      violations,
      moduleCount: modules.length,
      dependencyCount: modules.reduce((sum, m) => sum + m.dependencies.length, 0)
    };
  }

  /**
   * Assigns layer types to modules based on path patterns
   */
  private assignLayersToModules(modules: Module[]): Module[] {
    return modules.map(module => {
      let selectedLayer: LayerDefinition | null = null;
      let selectedPatternSpecificity = -1;
      let selectedOrder = Number.MAX_SAFE_INTEGER;

      for (const [order, layerDef] of this.config.layers.entries()) {
        // Normalize paths
        const modulePath = module.path.replace(/\\/g, '/');
        const pattern = layerDef.pattern.replace(/\\/g, '/');

        if (this.matchGlob(modulePath, pattern)) {
          if (!selectedLayer) {
            selectedLayer = layerDef;
            selectedPatternSpecificity = this.getPatternSpecificity(pattern);
            selectedOrder = order;
            continue;
          }

          const currentPrecedence = layerDef.precedence ?? -1;
          const selectedPrecedence = selectedLayer.precedence ?? -1;

          if (currentPrecedence > selectedPrecedence) {
            selectedLayer = layerDef;
            selectedPatternSpecificity = this.getPatternSpecificity(pattern);
            selectedOrder = order;
            continue;
          }

          if (currentPrecedence === selectedPrecedence) {
            const currentSpecificity = this.getPatternSpecificity(pattern);

            if (currentSpecificity > selectedPatternSpecificity) {
              selectedLayer = layerDef;
              selectedPatternSpecificity = currentSpecificity;
              selectedOrder = order;
              continue;
            }

            // Stable tie-breaker: first declared layer wins.
            if (currentSpecificity === selectedPatternSpecificity && order < selectedOrder) {
              selectedLayer = layerDef;
              selectedPatternSpecificity = currentSpecificity;
              selectedOrder = order;
            }
          }
        }
      }

      return selectedLayer ? { ...module, layer: selectedLayer.name } : module;
    });
  }

  private getPatternSpecificity(pattern: string): number {
    return pattern.replace(/\*/g, '').replace(/\?/g, '').length;
  }

  /**
   * Simple glob pattern matching
   */
  private matchGlob(path: string, pattern: string): boolean {
    // Simplified glob matching for common patterns
    
    // Pattern: **/folder/** means path contains /folder/ or starts with folder/
    const match1 = pattern.match(/^\*\*\/([^/]+)\/\*\*$/);
    if (match1) {
      const folder = match1[1];
      return path.includes(`/${folder}/`) || path.startsWith(`${folder}/`);
    }
    
    // Pattern: folder/** means path starts with folder/
    const match2 = pattern.match(/^([^*]+)\/\*\*$/);
    if (match2) {
      const prefix = match2[1];
      return path.startsWith(prefix + '/');
    }
    
    // Pattern: **/folder means path ends with /folder or is exactly folder
    const match3 = pattern.match(/^\*\*\/([^/]+)$/);
    if (match3) {
      const suffix = match3[1];
      return path.endsWith(`/${suffix}`) || path === suffix;
    }
    
    // Fallback: convert to regex for other patterns
    let regexPattern = pattern
      .replace(/\*\*/g, '§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(path);
  }

  private checkUnresolvedImports(modules: Module[]): Violation[] {
    const violations: Violation[] = [];

    for (const module of modules) {
      for (const dep of module.dependencies) {
        if (dep.isExternal || !dep.isUnresolved) {
          continue;
        }

        violations.push({
          ruleId: RuleEngine.RULE_IDS.UNRESOLVED_IMPORT,
          type: ViolationType.UNRESOLVED_IMPORT,
          severity: ViolationSeverity.INFO,
          message: `Unresolved internal import: '${dep.to}'`,
          filePath: module.path,
          line: dep.importLine,
          suggestion:
            'Verify file path, extension, tsconfig path aliases, or barrel exports for this import.'
        });
      }
    }

    return violations;
  }

  /**
   * Checks if dependencies respect layer boundaries
   */
  private checkLayerBoundaries(modules: Module[]): Violation[] {
    const violations: Violation[] = [];
    const moduleMap = new Map(modules.map(m => [m.path, m]));

    for (const module of modules) {
      if (!module.layer) continue;

      const layerDef = this.layerMap.get(module.layer);
      if (!layerDef) continue;

      for (const dep of module.dependencies) {
        if (dep.isExternal || dep.isUnresolved) {
          continue;
        }

        const targetModule = moduleMap.get(dep.to);
        if (!targetModule || !targetModule.layer) continue;

        // Skip external dependencies
        if (targetModule.layer === module.layer) continue;

        // Check if this dependency is allowed
        if (!layerDef.canDependOn.includes(targetModule.layer)) {
          violations.push({
            ruleId: RuleEngine.RULE_IDS.DEPENDENCY_DIRECTION,
            type: ViolationType.WRONG_DEPENDENCY_DIRECTION,
            severity: ViolationSeverity.ERROR,
            message: `Layer '${module.layer}' cannot depend on layer '${targetModule.layer}'`,
            filePath: module.path,
            line: dep.importLine,
            suggestion: `Remove or refactor this dependency. ${layerDef.name} can only depend on: ${layerDef.canDependOn.join(', ') || 'nothing'}`
          });
        }
      }
    }

    return violations;
  }

  /**
   * Checks for circular dependencies
   */
  private checkCircularDependencies(modules: Module[]): Violation[] {
    const violations: Violation[] = [];
    const graph = new Map<string, string[]>();

    // Build dependency graph
    for (const module of modules) {
      graph.set(module.path, module.dependencies.map(d => d.to));
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!graph.has(neighbor)) continue; // Skip external dependencies

        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    // Create violations for detected cycles
    for (const cycle of cycles) {
      if (cycle.length > 1) {
        const module = modules.find(m => m.path === cycle[0]);
        if (module) {
          violations.push({
            ruleId: RuleEngine.RULE_IDS.CIRCULAR_DEPENDENCY,
            type: ViolationType.CIRCULAR_DEPENDENCY,
            severity: ViolationSeverity.WARNING,
            message: `Circular dependency detected: ${cycle.join(' -> ')}`,
            filePath: module.path,
            line: 1,
            suggestion: 'Refactor to break the circular dependency by introducing an abstraction or reorganizing modules'
          });
        }
      }
    }

    return violations;
  }

  /**
   * Checks for business logic in presentation layer
   */
  private checkBusinessLogicPlacement(modules: Module[]): Violation[] {
    const violations: Violation[] = [];

    // Keywords that might indicate business logic
    const businessLogicKeywords = [
      'calculate',
      'compute',
      'validate',
      'process',
      'transform',
      'business',
      'rule',
      'logic'
    ];

    for (const module of modules) {
      // Only check presentation/view layers
      if (
        module.layer === LayerType.PRESENTATION ||
        module.layer === LayerType.VIEW ||
        module.layer === LayerType.UI
      ) {
        // Check if module exports contain business logic indicators
        for (const exportName of module.exports) {
          const lowerName = exportName.toLowerCase();
          const hasBusinessLogic = businessLogicKeywords.some(keyword =>
            lowerName.includes(keyword)
          );

          if (hasBusinessLogic && exportName !== 'default') {
            violations.push({
              ruleId: RuleEngine.RULE_IDS.BUSINESS_LOGIC_PLACEMENT,
              type: ViolationType.MISPLACED_BUSINESS_LOGIC,
              severity: ViolationSeverity.WARNING,
              message: `Possible business logic detected in ${module.layer} layer: '${exportName}'`,
              filePath: module.path,
              line: 1,
              suggestion: `Move business logic to the domain/business logic layer. Keep presentation layer focused on UI concerns.`
            });
          }
        }
      }
    }

    return violations;
  }

  private checkKotlinArchitectureAntiPatterns(modules: Module[]): Violation[] {
    const violations: Violation[] = [];

    for (const module of modules) {
      const modulePath = module.path.replace(/\\/g, '/');
      const lowerPath = modulePath.toLowerCase();

      const isPresentationModule =
        module.layer === LayerType.PRESENTATION ||
        module.layer === LayerType.VIEW ||
        module.layer === LayerType.UI ||
        lowerPath.includes('/ui/') ||
        lowerPath.includes('/view/') ||
        lowerPath.includes('/views/') ||
        lowerPath.endsWith('activity.kt') ||
        lowerPath.endsWith('fragment.kt') ||
        lowerPath.endsWith('screen.kt');

      const isViewModelModule =
        module.layer === LayerType.VIEWMODEL || lowerPath.includes('/viewmodel/') || lowerPath.includes('/viewmodels/');

      const isDomainModule = module.layer === LayerType.DOMAIN || lowerPath.includes('/domain/');

      for (const dep of module.dependencies) {
        const importStatement = dep.importStatement.toLowerCase();
        const dependencyPath = dep.to.replace(/\\/g, '/').toLowerCase();

        if (isPresentationModule) {
          const importsDataLayerDirectly =
            importStatement.includes('.data.') ||
            importStatement.includes('.repository.') ||
            importStatement.includes('.repositories.') ||
            importStatement.includes('.dao.') ||
            dependencyPath.includes('/data/') ||
            dependencyPath.includes('/repository/') ||
            dependencyPath.includes('/repositories/') ||
            dependencyPath.includes('/dao/');

          const importsNetworkOrDbFramework =
            importStatement.includes('retrofit2.') ||
            importStatement.includes('okhttp3.') ||
            importStatement.includes('io.ktor.') ||
            importStatement.includes('androidx.room.') ||
            importStatement.includes('java.sql.') ||
            importStatement.includes('javax.sql.');

          if (importsDataLayerDirectly || importsNetworkOrDbFramework) {
            violations.push({
              ruleId: RuleEngine.RULE_IDS.KOTLIN_ARCHITECTURE_ANTI_PATTERN,
              type: ViolationType.MISPLACED_BUSINESS_LOGIC,
              severity: ViolationSeverity.WARNING,
              message:
                'Kotlin UI/presentation module imports data-access or infrastructure concerns directly.',
              filePath: module.path,
              line: dep.importLine,
              suggestion:
                'Route this dependency through a ViewModel/use-case boundary to keep UI focused on presentation.'
            });
          }
        }

        if (isViewModelModule) {
          const dependsOnUiModule =
            dependencyPath.includes('/ui/') ||
            dependencyPath.includes('/view/') ||
            dependencyPath.includes('/views/') ||
            importStatement.includes('.ui.') ||
            importStatement.includes('.view.') ||
            importStatement.includes('.views.');

          if (dependsOnUiModule) {
            violations.push({
              ruleId: RuleEngine.RULE_IDS.KOTLIN_ARCHITECTURE_ANTI_PATTERN,
              type: ViolationType.MISPLACED_BUSINESS_LOGIC,
              severity: ViolationSeverity.WARNING,
              message: 'Kotlin ViewModel appears to depend on UI-layer types.',
              filePath: module.path,
              line: dep.importLine,
              suggestion:
                'Keep ViewModel independent from UI classes. Share state via domain models or UI-agnostic DTOs.'
            });
          }
        }

        if (isDomainModule) {
          const importsFrameworkLayer =
            importStatement.includes('android.') ||
            importStatement.includes('androidx.') ||
            importStatement.includes('retrofit2.') ||
            importStatement.includes('okhttp3.') ||
            importStatement.includes('io.ktor.') ||
            importStatement.includes('androidx.room.');

          if (importsFrameworkLayer) {
            violations.push({
              ruleId: RuleEngine.RULE_IDS.KOTLIN_ARCHITECTURE_ANTI_PATTERN,
              type: ViolationType.MISPLACED_BUSINESS_LOGIC,
              severity: ViolationSeverity.WARNING,
              message: 'Kotlin domain module imports framework/infrastructure APIs directly.',
              filePath: module.path,
              line: dep.importLine,
              suggestion:
                'Move framework dependencies to data/infrastructure layers and depend on interfaces in domain.'
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Formats violations for display
   */
  static formatViolations(violations: Violation[]): string {
    if (violations.length === 0) {
      return 'No violations found! ✓';
    }

    let output = `Found ${violations.length} violation(s):\n\n`;

    for (const violation of violations) {
      const icon = violation.severity === ViolationSeverity.ERROR ? '❌' : '⚠️';
      output += `${icon} ${violation.severity.toUpperCase()}: ${violation.message}\n`;
      output += `   File: ${violation.filePath}:${violation.line}\n`;
      if (violation.suggestion) {
        output += `   💡 ${violation.suggestion}\n`;
      }
      output += '\n';
    }

    return output;
  }
}
