import * as vscode from 'vscode';
import * as path from 'path';
import { ArcLint, AnalysisResult, Violation, ViolationSeverity } from '@arclint/core';

let diagnosticCollection: vscode.DiagnosticCollection;
let arcLint: ArcLint;

/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('ArcLint extension is now active');

  arcLint = new ArcLint();
  diagnosticCollection = vscode.languages.createDiagnosticCollection('arclint');
  context.subscriptions.push(diagnosticCollection);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('arclint.onboard', onboardCommand)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arclint.lint', lintCommand)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arclint.showConfig', showConfigCommand)
  );

  // Lint on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      const config = vscode.workspace.getConfiguration('arclint');
      if (config.get('enable') && config.get('lintOnSave')) {
        lintWorkspace();
      }
    })
  );

  // Initial lint if enabled
  const config = vscode.workspace.getConfiguration('arclint');
  if (config.get('enable')) {
    setTimeout(() => lintWorkspace(), 1000);
  }
}

/**
 * Deactivates the extension
 */
export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}

/**
 * Runs onboarding to create .arclint.yml
 */
async function onboardCommand() {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Please open a workspace folder first');
    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'ArcLint Onboarding',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Analyzing project structure...' });

        const rootDir = workspaceFolder.uri.fsPath;
        const configPath = path.join(rootDir, '.arclint.yml');

        await arcLint.onboard(rootDir, configPath);

        progress.report({ message: 'Complete!' });
      }
    );

    vscode.window.showInformationMessage(
      'ArcLint onboarding complete! Created .arclint.yml configuration.'
    );

    // Open the config file
    const configPath = path.join(workspaceFolder.uri.fsPath, '.arclint.yml');
    const doc = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(`Onboarding failed: ${error}`);
  }
}

/**
 * Runs linting on the workspace
 */
async function lintCommand() {
  await lintWorkspace();
}

/**
 * Shows the current configuration
 */
async function showConfigCommand() {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Please open a workspace folder first');
    return;
  }

  const configPath = path.join(workspaceFolder.uri.fsPath, '.arclint.yml');
  
  try {
    const doc = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showWarningMessage(
      'No .arclint.yml found. Run "ArcLint: Run Onboarding" first.'
    );
  }
}

/**
 * Performs linting on the entire workspace
 */
async function lintWorkspace() {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  try {
    const rootDir = workspaceFolder.uri.fsPath;
    const result = await arcLint.lintAuto(rootDir);

    if (!result) {
      return;
    }

    // Clear previous diagnostics
    diagnosticCollection.clear();

    // Group violations by file
    const violationsByFile = new Map<string, Violation[]>();
    for (const violation of result.violations) {
      const filePath = path.isAbsolute(violation.filePath)
        ? violation.filePath
        : path.join(rootDir, violation.filePath);
      
      if (!violationsByFile.has(filePath)) {
        violationsByFile.set(filePath, []);
      }
      violationsByFile.get(filePath)!.push(violation);
    }

    // Create diagnostics for each file
    for (const [filePath, violations] of violationsByFile) {
      const uri = vscode.Uri.file(filePath);
      const diagnostics: vscode.Diagnostic[] = violations.map(v => 
        createDiagnostic(v)
      );
      diagnosticCollection.set(uri, diagnostics);
    }

    // Show summary
    const errorCount = result.violations.filter(
      v => v.severity === ViolationSeverity.ERROR
    ).length;
    const warningCount = result.violations.filter(
      v => v.severity === ViolationSeverity.WARNING
    ).length;

    if (result.violations.length > 0) {
      vscode.window.showWarningMessage(
        `ArcLint found ${errorCount} error(s) and ${warningCount} warning(s)`
      );
    } else {
      vscode.window.showInformationMessage('ArcLint: No violations found! ✓');
    }
  } catch (error) {
    console.error('Linting error:', error);
    vscode.window.showErrorMessage(`Linting failed: ${error}`);
  }
}

/**
 * Creates a VS Code diagnostic from a violation
 */
function createDiagnostic(violation: Violation): vscode.Diagnostic {
  const line = Math.max(0, violation.line - 1);
  const range = new vscode.Range(line, 0, line, 1000);

  const severity =
    violation.severity === ViolationSeverity.ERROR
      ? vscode.DiagnosticSeverity.Error
      : violation.severity === ViolationSeverity.WARNING
      ? vscode.DiagnosticSeverity.Warning
      : vscode.DiagnosticSeverity.Information;

  const diagnostic = new vscode.Diagnostic(range, violation.message, severity);
  diagnostic.source = 'arclint';
  diagnostic.code = violation.type;

  return diagnostic;
}

/**
 * Gets the active workspace folder
 */
function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  return folders[0];
}
