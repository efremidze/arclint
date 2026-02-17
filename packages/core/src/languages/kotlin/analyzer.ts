import * as fs from 'fs';
import * as path from 'path';
import { Dependency, Module } from '../../types';

interface KotlinFileData {
  content: string;
  relativePath: string;
  packageName: string | null;
  exports: string[];
}

interface KotlinSanitizerState {
  blockCommentDepth: number;
  inRawString: boolean;
  inDoubleQuote: boolean;
  inSingleQuote: boolean;
  escaped: boolean;
}

export class KotlinImportGraphAnalyzer {
  private modules: Map<string, Module> = new Map();

  async analyzeDirectory(dirPath: string, rootDir: string): Promise<Module[]> {
    this.modules.clear();

    const files = await this.findSourceFiles(dirPath);
    const fileDataByPath = await this.buildFileData(files, rootDir);
    const symbolIndex = this.buildSymbolIndex(fileDataByPath);
    const packageIndex = this.buildPackageIndex(fileDataByPath);
    const packagePrefixes = this.buildPackagePrefixes(packageIndex);
    const modules: Module[] = [];

    for (const [filePath, fileData] of fileDataByPath.entries()) {
      const module = this.analyzeFile(filePath, fileData, symbolIndex, packageIndex, packagePrefixes);
      this.modules.set(module.path, module);
      modules.push(module);
    }

    return modules;
  }

  getModules(): Module[] {
    return Array.from(this.modules.values());
  }

  private analyzeFile(
    filePath: string,
    fileData: KotlinFileData,
    symbolIndex: Map<string, string>,
    packageIndex: Map<string, string[]>,
    packagePrefixes: Set<string>
  ): Module {
    return {
      path: fileData.relativePath,
      dependencies: this.parseImports(
        fileData.content,
        fileData.relativePath,
        symbolIndex,
        packageIndex,
        packagePrefixes
      ),
      exports: fileData.exports
    };
  }

  private parseImports(
    content: string,
    fromPath: string,
    symbolIndex: Map<string, string>,
    packageIndex: Map<string, string[]>,
    packagePrefixes: Set<string>
  ): Dependency[] {
    const dependencies: Dependency[] = [];
    const lines = content.split('\n');
    const sanitizedLines = this.sanitizeLinesForParsing(content);

    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];
      const cleanedLine = sanitizedLines[i].trim();
      if (!cleanedLine || cleanedLine.startsWith('package ')) {
        continue;
      }

      const importMatch = cleanedLine.match(
        /^import\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\.\*)*)(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?$/
      );
      if (!importMatch) {
        continue;
      }

      const importPath = importMatch[1];
      const resolved = this.resolveImportPath(importPath, symbolIndex, packageIndex, packagePrefixes);
      dependencies.push({
        from: fromPath,
        to: resolved.to,
        importLine: i + 1,
        importStatement: originalLine.trim(),
        isExternal: resolved.isExternal,
        isUnresolved: resolved.isUnresolved
      });
    }

    return dependencies;
  }

  private resolveImportPath(
    importPath: string,
    symbolIndex: Map<string, string>,
    packageIndex: Map<string, string[]>,
    packagePrefixes: Set<string>
  ): { to: string; isExternal: boolean; isUnresolved: boolean } {
    if (importPath.endsWith('.*')) {
      const importedPackage = importPath.slice(0, -2);
      const packageTargets = packageIndex.get(importedPackage) ?? [];
      if (packageTargets.length > 0) {
        return { to: packageTargets[0], isExternal: false, isUnresolved: false };
      }

      const looksInternal = this.looksInternalImport(importedPackage, packagePrefixes);
      return {
        to: importPath,
        isExternal: !looksInternal,
        isUnresolved: looksInternal
      };
    }

    let candidate = importPath;
    while (candidate) {
      const resolvedPath = symbolIndex.get(candidate);
      if (resolvedPath) {
        return { to: resolvedPath, isExternal: false, isUnresolved: false };
      }

      const lastDot = candidate.lastIndexOf('.');
      if (lastDot === -1) {
        break;
      }
      candidate = candidate.slice(0, lastDot);
    }

    const looksInternal = this.looksInternalImport(importPath, packagePrefixes);
    return {
      to: importPath,
      isExternal: !looksInternal,
      isUnresolved: looksInternal
    };
  }

  private looksInternalImport(importPath: string, packagePrefixes: Set<string>): boolean {
    for (const localPrefix of packagePrefixes.values()) {
      if (importPath === localPrefix || importPath.startsWith(`${localPrefix}.`)) {
        return true;
      }
    }
    return false;
  }

  private buildSymbolIndex(fileDataByPath: Map<string, KotlinFileData>): Map<string, string> {
    const symbolIndex = new Map<string, string>();

    for (const [filePath, fileData] of fileDataByPath.entries()) {
      const baseName = path.basename(filePath, '.kt');
      const packageName = fileData.packageName;

      if (packageName) {
        this.setIndexIfAbsent(symbolIndex, `${packageName}.${baseName}`, fileData.relativePath);
        for (const exportName of fileData.exports) {
          this.setIndexIfAbsent(symbolIndex, `${packageName}.${exportName}`, fileData.relativePath);
        }
      } else {
        this.setIndexIfAbsent(symbolIndex, baseName, fileData.relativePath);
        for (const exportName of fileData.exports) {
          this.setIndexIfAbsent(symbolIndex, exportName, fileData.relativePath);
        }
      }
    }

    return symbolIndex;
  }

  private buildPackageIndex(fileDataByPath: Map<string, KotlinFileData>): Map<string, string[]> {
    const packageIndex = new Map<string, string[]>();

    for (const fileData of fileDataByPath.values()) {
      if (!fileData.packageName) {
        continue;
      }

      const existing = packageIndex.get(fileData.packageName) ?? [];
      existing.push(fileData.relativePath);
      packageIndex.set(fileData.packageName, existing);
    }

    return packageIndex;
  }

  private buildPackagePrefixes(packageIndex: Map<string, string[]>): Set<string> {
    const packagePrefixes = new Set<string>();

    for (const packageName of packageIndex.keys()) {
      packagePrefixes.add(packageName);

      const parts = packageName.split('.').filter(Boolean);
      if (parts.length >= 2) {
        packagePrefixes.add(`${parts[0]}.${parts[1]}`);
      } else if (parts.length === 1) {
        packagePrefixes.add(parts[0]);
      }
    }

    return packagePrefixes;
  }

  private async buildFileData(
    files: string[],
    rootDir: string
  ): Promise<Map<string, KotlinFileData>> {
    const fileDataByPath = new Map<string, KotlinFileData>();

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
      const packageName = this.extractPackageName(content);
      const exports = this.extractExports(content);

      fileDataByPath.set(file, {
        content,
        relativePath,
        packageName,
        exports
      });
    }

    return fileDataByPath;
  }

  private extractPackageName(content: string): string | null {
    const lines = this.sanitizeLinesForParsing(content);
    for (const line of lines) {
      const packageMatch = line.trim().match(/^package\s+([A-Za-z_][A-Za-z0-9_.]*)$/);
      if (packageMatch) {
        return packageMatch[1];
      }
    }
    return null;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const lines = this.sanitizeLinesForParsing(content);
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      const isTopLevel = braceDepth === 0;

      if (isTopLevel) {
        const declarationMatch = trimmed.match(
          /^(?:(?:public|private|internal|protected|open|abstract|final|sealed|data|enum|annotation|value|inline|expect|actual|external|tailrec|suspend|operator|infix|const|lateinit|override)\s+)*(class|interface|object|typealias|fun)\s+([A-Za-z_][A-Za-z0-9_]*)\b/
        );
        const hasRestrictedVisibility = /\b(private|protected)\b/.test(trimmed);
        if (declarationMatch && !hasRestrictedVisibility) {
          exports.push(declarationMatch[2]);
        }
      }

      braceDepth += this.countChar(line, '{');
      braceDepth -= this.countChar(line, '}');
      braceDepth = Math.max(braceDepth, 0);
    }

    return exports;
  }

  private countChar(value: string, char: string): number {
    return value.split(char).length - 1;
  }

  private sanitizeLinesForParsing(content: string): string[] {
    const state: KotlinSanitizerState = {
      blockCommentDepth: 0,
      inRawString: false,
      inDoubleQuote: false,
      inSingleQuote: false,
      escaped: false
    };

    return content.split('\n').map((line) => this.sanitizeLineForParsing(line, state));
  }

  private sanitizeLineForParsing(line: string, state: KotlinSanitizerState): string {
    let sanitized = '';

    for (let i = 0; i < line.length; i++) {
      const current = line[i];
      const next = line[i + 1];
      const next2 = line[i + 2];

      if (state.blockCommentDepth > 0) {
        if (current === '/' && next === '*') {
          state.blockCommentDepth += 1;
          sanitized += '  ';
          i += 1;
          continue;
        }

        if (current === '*' && next === '/') {
          state.blockCommentDepth -= 1;
          sanitized += '  ';
          i += 1;
          continue;
        }

        sanitized += ' ';
        continue;
      }

      if (state.inRawString) {
        if (current === '"' && next === '"' && next2 === '"') {
          state.inRawString = false;
          sanitized += '   ';
          i += 2;
          continue;
        }

        sanitized += ' ';
        continue;
      }

      if (state.inDoubleQuote) {
        if (state.escaped) {
          state.escaped = false;
          sanitized += ' ';
          continue;
        }

        if (current === '\\') {
          state.escaped = true;
          sanitized += ' ';
          continue;
        }

        if (current === '"') {
          state.inDoubleQuote = false;
          sanitized += ' ';
          continue;
        }

        sanitized += ' ';
        continue;
      }

      if (state.inSingleQuote) {
        if (state.escaped) {
          state.escaped = false;
          sanitized += ' ';
          continue;
        }

        if (current === '\\') {
          state.escaped = true;
          sanitized += ' ';
          continue;
        }

        if (current === '\'') {
          state.inSingleQuote = false;
          sanitized += ' ';
          continue;
        }

        sanitized += ' ';
        continue;
      }

      if (current === '/' && next === '/') {
        break;
      }

      if (current === '/' && next === '*') {
        state.blockCommentDepth += 1;
        sanitized += '  ';
        i += 1;
        continue;
      }

      if (current === '"' && next === '"' && next2 === '"') {
        state.inRawString = true;
        sanitized += '   ';
        i += 2;
        continue;
      }

      if (current === '"') {
        state.inDoubleQuote = true;
        sanitized += ' ';
        continue;
      }

      if (current === '\'') {
        state.inSingleQuote = true;
        sanitized += ' ';
        continue;
      }

      sanitized += current;
    }

    return sanitized;
  }

  private setIndexIfAbsent(index: Map<string, string>, key: string, value: string): void {
    if (!index.has(key)) {
      index.set(key, value);
    }
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
            entry.name === '.gradle' ||
            entry.name === 'build' ||
            entry.name === 'node_modules' ||
            entry.name === 'out' ||
            entry.name === 'target'
          ) {
            continue;
          }

          await walk(fullPath);
          continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.kt')) {
          continue;
        }

        const normalizedPath = fullPath.replace(/\\/g, '/');
        if (
          normalizedPath.includes('/src/test/') ||
          normalizedPath.includes('/src/androidTest/') ||
          entry.name.endsWith('Test.kt')
        ) {
          continue;
        }

        files.push(fullPath);
      }
    }

    await walk(dirPath);
    return files;
  }
}
