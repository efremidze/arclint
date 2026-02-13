import * as path from 'path';
import {
  ArchitectureConfig,
  Module,
  Violation,
  ViolationType,
  ViolationSeverity,
  LayerType,
  LayerDefinition,
  AnalysisResult
} from './types';

/**
 * Enforces architectural rules and detects violations
 */
export class RuleEngine {
  private config: ArchitectureConfig;
  private layerMap: Map<string, LayerDefinition> = new Map();

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
      for (const layerDef of this.config.layers) {
        // Simple pattern matching - convert glob pattern to regex
        const pattern = layerDef.pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '.');
        const regex = new RegExp(pattern);
        
        if (regex.test(module.path)) {
          return { ...module, layer: layerDef.name };
        }
      }
      return module;
    });
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
        const targetModule = moduleMap.get(dep.to);
        if (!targetModule || !targetModule.layer) continue;

        // Skip external dependencies
        if (targetModule.layer === module.layer) continue;

        // Check if this dependency is allowed
        if (!layerDef.canDependOn.includes(targetModule.layer)) {
          violations.push({
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
