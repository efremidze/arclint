import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
import { Dependency, Module } from './types';

/**
 * Analyzes TypeScript/JavaScript files to extract import/export information
 */
export class ImportGraphAnalyzer {
  private modules: Map<string, Module> = new Map();

  /**
   * Analyzes a single file and extracts its imports and exports
   */
  async analyzeFile(filePath: string, rootDir: string): Promise<Module> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);
    
    const dependencies: Dependency[] = [];
    const exports: string[] = [];

    try {
      const ast = parse(content, {
        loc: true,
        range: true,
        comment: true,
        tokens: true,
        jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      });

      // Extract imports
      for (const node of ast.body) {
        if (node.type === 'ImportDeclaration' && node.source.value) {
          const importPath = node.source.value as string;
          const resolvedPath = this.resolveImportPath(importPath, filePath, rootDir);
          
          dependencies.push({
            from: relativePath,
            to: resolvedPath,
            importLine: node.loc?.start.line || 0,
            importStatement: content.split('\n')[node.loc?.start.line ? node.loc.start.line - 1 : 0] || ''
          });
        }

        // Extract exports
        if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
          if (node.type === 'ExportNamedDeclaration' && node.declaration) {
            if (node.declaration.type === 'VariableDeclaration') {
              for (const decl of node.declaration.declarations) {
                if (decl.id.type === 'Identifier') {
                  exports.push(decl.id.name);
                }
              }
            } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
              exports.push(node.declaration.id.name);
            } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
              exports.push(node.declaration.id.name);
            }
          } else if (node.type === 'ExportDefaultDeclaration') {
            exports.push('default');
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
    }

    const module: Module = {
      path: relativePath,
      dependencies,
      exports
    };

    this.modules.set(relativePath, module);
    return module;
  }

  /**
   * Resolves an import path to a relative module path
   */
  private resolveImportPath(importPath: string, fromFile: string, rootDir: string): string {
    // Skip external packages (node_modules)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return importPath;
    }

    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importPath);
    
    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        return path.relative(rootDir, withExt);
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(resolved, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        return path.relative(rootDir, indexFile);
      }
    }

    return path.relative(rootDir, resolved);
  }

  /**
   * Analyzes all files in a directory
   */
  async analyzeDirectory(dirPath: string, rootDir: string, patterns: string[] = []): Promise<Module[]> {
    const modules: Module[] = [];
    const files = await this.findSourceFiles(dirPath, patterns);

    for (const file of files) {
      const module = await this.analyzeFile(file, rootDir);
      modules.push(module);
    }

    return modules;
  }

  /**
   * Finds all source files in a directory
   */
  private async findSourceFiles(dirPath: string, patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    async function walk(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and common directories
          if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
            files.push(fullPath);
          }
        }
      }
    }

    await walk(dirPath);
    return files;
  }

  /**
   * Gets all analyzed modules
   */
  getModules(): Module[] {
    return Array.from(this.modules.values());
  }

  /**
   * Gets a module by path
   */
  getModule(path: string): Module | undefined {
    return this.modules.get(path);
  }

  /**
   * Builds dependency graph
   */
  buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const module of this.modules.values()) {
      const dependencies = module.dependencies
        .map(d => d.to)
        .filter(d => this.modules.has(d)); // Only include internal modules
      
      graph.set(module.path, dependencies);
    }

    return graph;
  }

  /**
   * Detects circular dependencies
   */
  detectCircularDependencies(): string[][] {
    const graph = this.buildDependencyGraph();
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
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

    return cycles;
  }
}
