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
  SWIFT = 'swift',
  PYTHON = 'python'
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
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  UNRESOLVED_IMPORT = 'unresolved_import'
}

/**
 * Dependency relationship between modules
 */
export interface Dependency {
  from: string;
  to: string;
  importLine: number;
  importStatement: string;
  isExternal?: boolean;
  isUnresolved?: boolean;
}

export interface ModuleSignal {
  id: string;
  line: number;
  message: string;
}

/**
 * Module information in the codebase
 */
export interface Module {
  path: string;
  layer?: LayerType;
  dependencies: Dependency[];
  exports: string[];
  signals?: ModuleSignal[];
}

/**
 * Architectural violation found during analysis
 */
export interface Violation {
  ruleId: string;
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
  /**
   * Optional explicit precedence when multiple layer patterns match a file.
   * Higher value wins. If omitted, declaration order is used.
   */
  precedence?: number;
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
