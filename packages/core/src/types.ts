/**
 * Supported architectural patterns
 */
export enum ArchitecturePattern {
  CLEAN = 'clean',
  MVC = 'mvc',
  MVVM = 'mvvm',
  MVP = 'mvp',
  MODULAR = 'modular',
  UNKNOWN = 'unknown'
}

/**
 * Supported programming languages
 */
export enum Language {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  SWIFT = 'swift'
}

/**
 * Layer types in architectural patterns
 */
export enum LayerType {
  PRESENTATION = 'presentation',
  DOMAIN = 'domain',
  DATA = 'data',
  INFRASTRUCTURE = 'infrastructure',
  UI = 'ui',
  BUSINESS_LOGIC = 'business_logic',
  MODEL = 'model',
  VIEW = 'view',
  CONTROLLER = 'controller',
  VIEWMODEL = 'viewmodel',
  PRESENTER = 'presenter'
}

/**
 * Violation severity levels
 */
export enum ViolationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Types of architectural violations
 */
export enum ViolationType {
  WRONG_DEPENDENCY_DIRECTION = 'wrong_dependency_direction',
  PATTERN_INCONSISTENCY = 'pattern_inconsistency',
  MISPLACED_BUSINESS_LOGIC = 'misplaced_business_logic',
  LAYER_VIOLATION = 'layer_violation',
  CIRCULAR_DEPENDENCY = 'circular_dependency'
}

/**
 * Dependency relationship between modules
 */
export interface Dependency {
  from: string;
  to: string;
  importLine: number;
  importStatement: string;
}

/**
 * Module information in the codebase
 */
export interface Module {
  path: string;
  layer?: LayerType;
  dependencies: Dependency[];
  exports: string[];
}

/**
 * Architectural violation found during analysis
 */
export interface Violation {
  type: ViolationType;
  severity: ViolationSeverity;
  message: string;
  filePath: string;
  line: number;
  suggestion?: string;
}

/**
 * Layer definition in architecture configuration
 */
export interface LayerDefinition {
  name: LayerType;
  pattern: string;
  canDependOn: LayerType[];
  description?: string;
}

/**
 * Architecture configuration (.arclint.yml schema)
 */
export interface ArchitectureConfig {
  version: string;
  pattern: ArchitecturePattern;
  language: Language;
  rootDir: string;
  layers: LayerDefinition[];
  rules?: {
    enforceLayerBoundaries?: boolean;
    preventCircularDependencies?: boolean;
    businessLogicInDomain?: boolean;
  };
  ignore?: string[];
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  violations: Violation[];
  moduleCount: number;
  dependencyCount: number;
}
