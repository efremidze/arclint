import * as fs from 'fs';
import * as path from 'path';
import { Dependency, Module } from '../../types';

export class PythonImportGraphAnalyzer {
  private modules: Map<string, Module> = new Map();

  async analyzeDirectory(dirPath: string, rootDir: string): Promise<Module[]> {
    this.modules.clear();

    const files = await this.findSourceFiles(dirPath);
    const moduleIndex = this.buildModuleIndex(files, rootDir);
    const topLevelPackages = this.buildTopLevelPackages(moduleIndex);
    const modules: Module[] = [];

    for (const file of files) {
      const module = await this.analyzeFile(file, rootDir, moduleIndex, topLevelPackages);
      this.modules.set(module.path, module);
      modules.push(module);
    }

    return modules;
  }

  async analyzeFile(
    filePath: string,
    rootDir: string,
    moduleIndex: Map<string, string>,
    topLevelPackages: Set<string>
  ): Promise<Module> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const moduleName = this.filePathToModuleName(relativePath);

    const dependencies = this.parseImports(content, relativePath, moduleName, moduleIndex, topLevelPackages);
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
    fromModule: string,
    moduleIndex: Map<string, string>,
    topLevelPackages: Set<string>
  ): Dependency[] {
    const dependencies: Dependency[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const importMatch = line.match(/^import\s+(.+)$/);
      if (importMatch) {
        const modules = importMatch[1]
          .split(',')
          .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);

        for (const importedModule of modules) {
          dependencies.push(
            this.resolveDependency(fromPath, i + 1, line, importedModule, moduleIndex, topLevelPackages)
          );
        }

        continue;
      }

      const fromImportMatch = line.match(/^from\s+([.\w]+)\s+import\s+(.+)$/);
      if (!fromImportMatch) {
        continue;
      }

      const moduleSpec = fromImportMatch[1];
      const importedNames = fromImportMatch[2]
        .split(',')
        .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);

      const resolvedBase = this.resolveModuleSpec(moduleSpec, fromModule);
      if (!resolvedBase) {
        dependencies.push({
          from: fromPath,
          to: moduleSpec,
          importLine: i + 1,
          importStatement: line,
          isExternal: true,
          isUnresolved: false
        });
        continue;
      }

      if (importedNames.length === 1 && importedNames[0] === '*') {
        dependencies.push(
          this.resolveDependency(fromPath, i + 1, line, resolvedBase, moduleIndex, topLevelPackages)
        );
        continue;
      }

      let addedChildModuleDependency = false;
      for (const importedName of importedNames) {
        const childModule = `${resolvedBase}.${importedName}`;
        if (moduleIndex.has(childModule)) {
          dependencies.push(
            this.resolveDependency(fromPath, i + 1, line, childModule, moduleIndex, topLevelPackages)
          );
          addedChildModuleDependency = true;
        }
      }

      if (!addedChildModuleDependency) {
        dependencies.push(
          this.resolveDependency(fromPath, i + 1, line, resolvedBase, moduleIndex, topLevelPackages)
        );
      }
    }

    return dependencies;
  }

  private resolveDependency(
    fromPath: string,
    line: number,
    importStatement: string,
    moduleName: string,
    moduleIndex: Map<string, string>,
    topLevelPackages: Set<string>
  ): Dependency {
    const resolvedPath = moduleIndex.get(moduleName);
    if (resolvedPath) {
      return {
        from: fromPath,
        to: resolvedPath,
        importLine: line,
        importStatement,
        isExternal: false,
        isUnresolved: false
      };
    }

    const rootPackage = moduleName.split('.')[0];
    const looksInternal = topLevelPackages.has(rootPackage);

    return {
      from: fromPath,
      to: moduleName,
      importLine: line,
      importStatement,
      isExternal: !looksInternal,
      isUnresolved: looksInternal
    };
  }

  private resolveModuleSpec(moduleSpec: string, fromModule: string): string | null {
    if (!moduleSpec.startsWith('.')) {
      return moduleSpec;
    }

    const dots = moduleSpec.match(/^\.+/)?.[0].length ?? 0;
    const suffix = moduleSpec.slice(dots);

    const moduleParts = fromModule.split('.').filter(Boolean);
    const packageParts = fromModule.endsWith('.__init__')
      ? moduleParts.slice(0, -1)
      : moduleParts.slice(0, -1);

    const parentLevels = Math.max(0, dots - 1);
    if (parentLevels > packageParts.length) {
      return null;
    }

    const baseParts = packageParts.slice(0, packageParts.length - parentLevels);
    const suffixParts = suffix ? suffix.split('.').filter(Boolean) : [];
    const resolved = [...baseParts, ...suffixParts].join('.');

    return resolved || null;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const patterns = [
      /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm,
      /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\(|:)/gm
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    return exports;
  }

  private buildModuleIndex(files: string[], rootDir: string): Map<string, string> {
    const index = new Map<string, string>();

    for (const file of files) {
      const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
      const moduleName = this.filePathToModuleName(relativePath);
      index.set(moduleName, relativePath);
    }

    return index;
  }

  private buildTopLevelPackages(moduleIndex: Map<string, string>): Set<string> {
    const topLevel = new Set<string>();
    for (const moduleName of moduleIndex.keys()) {
      const root = moduleName.split('.')[0];
      if (root) {
        topLevel.add(root);
      }
    }
    return topLevel;
  }

  private filePathToModuleName(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/');

    if (normalized.endsWith('/__init__.py')) {
      return normalized
        .replace(/\/__init__\.py$/, '')
        .split('/')
        .filter(Boolean)
        .join('.');
    }

    return normalized
      .replace(/\.py$/, '')
      .split('/')
      .filter(Boolean)
      .join('.');
  }

  private async findSourceFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name === '.git' ||
            entry.name === '.venv' ||
            entry.name === 'venv' ||
            entry.name === '__pycache__' ||
            entry.name === 'build' ||
            entry.name === 'dist' ||
            entry.name === 'node_modules'
          ) {
            continue;
          }
          await walk(fullPath);
          continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.py')) {
          continue;
        }

        if (entry.name.startsWith('test_') || entry.name.endsWith('_test.py')) {
          continue;
        }

        files.push(fullPath);
      }
    }

    await walk(dirPath);
    return files;
  }
}
