import * as fs from 'fs';
import * as path from 'path';
import { Dependency, Module } from '../../types';

/**
 * Swift import graph analyzer (MVP).
 *
 * Strategy:
 * - Parse `import ModuleName` declarations from Swift files.
 * - Map module imports to local files when module names match local module folders.
 * - Treat unknown imports as external modules (Foundation, SwiftUI, etc.).
 */
export class SwiftImportGraphAnalyzer {
  private modules: Map<string, Module> = new Map();

  async analyzeDirectory(dirPath: string, rootDir: string): Promise<Module[]> {
    this.modules.clear();

    const files = await this.findSourceFiles(dirPath);
    const moduleIndex = this.buildLocalModuleIndex(files, rootDir);
    const modules: Module[] = [];

    for (const file of files) {
      const module = await this.analyzeFile(file, rootDir, moduleIndex);
      this.modules.set(module.path, module);
      modules.push(module);
    }

    return modules;
  }

  async analyzeFile(
    filePath: string,
    rootDir: string,
    localModuleIndex: Map<string, string>
  ): Promise<Module> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    const dependencies = this.parseImports(content, relativePath, localModuleIndex);
    const exports = this.extractExports(content);

    return {
      path: relativePath,
      dependencies,
      exports
    };
  }

  getModules(): Module[] {
    return Array.from(this.modules.values());
  }

  private parseImports(
    content: string,
    fromPath: string,
    localModuleIndex: Map<string, string>
  ): Dependency[] {
    const lines = content.split('\n');
    const dependencies: Dependency[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*import\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (!match) continue;

      const importedModule = match[1];
      const localTarget = localModuleIndex.get(importedModule);

      dependencies.push({
        from: fromPath,
        to: localTarget ?? importedModule,
        importLine: i + 1,
        importStatement: line.trim(),
        isExternal: !localTarget,
        isUnresolved: false
      });
    }

    return dependencies;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const typeRegex = /\b(class|struct|enum|protocol|actor)\s+([A-Za-z_][A-Za-z0-9_]*)/g;

    let match: RegExpExecArray | null;
    while ((match = typeRegex.exec(content)) !== null) {
      exports.push(match[2]);
    }

    return exports;
  }

  private buildLocalModuleIndex(files: string[], rootDir: string): Map<string, string> {
    const index = new Map<string, string>();

    for (const file of files) {
      const moduleName = this.inferLocalModuleName(file, rootDir);
      if (!moduleName || index.has(moduleName)) {
        continue;
      }

      const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
      index.set(moduleName, relativePath);
    }

    return index;
  }

  private inferLocalModuleName(filePath: string, rootDir: string): string | null {
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const parts = relativePath.split('/').filter(Boolean);

    if (parts.length === 0) {
      return null;
    }

    // Swift Package layout: Sources/<ModuleName>/...
    const sourcesIndex = parts.indexOf('Sources');
    if (sourcesIndex !== -1 && parts.length > sourcesIndex + 1) {
      return parts[sourcesIndex + 1];
    }

    // If rootDir is already `Sources`, first path segment is typically the module name.
    if (parts.length > 1) {
      return parts[0];
    }

    return null;
  }

  private async findSourceFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name === '.build' ||
            entry.name === '.git' ||
            entry.name === 'build' ||
            entry.name === 'DerivedData' ||
            entry.name === 'node_modules'
          ) {
            continue;
          }
          await walk(fullPath);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        if (!entry.name.endsWith('.swift')) {
          continue;
        }

        if (entry.name.endsWith('Tests.swift')) {
          continue;
        }

        files.push(fullPath);
      }
    }

    await walk(dirPath);
    return files;
  }
}
