#!/usr/bin/env node

import * as path from 'path';
import { ArcLint } from '../index';
import { RuleEngine } from '../rules';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const arcLint = new ArcLint();

  switch (command) {
    case 'onboard':
      await handleOnboard(arcLint);
      break;
    case 'lint':
      await handleLint(arcLint);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log('ArcLint v0.1.0');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

async function handleOnboard(arcLint: ArcLint) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.arclint.yml');

  console.log('🚀 Starting ArcLint onboarding...\n');
  
  try {
    await arcLint.onboard(cwd, configPath);
    console.log('\n✅ Onboarding complete!');
    console.log(`📄 Configuration saved to: ${configPath}`);
    console.log('\n💡 Next steps:');
    console.log('  1. Review and customize .arclint.yml');
    console.log('  2. Run: arclint lint');
  } catch (error) {
    console.error('\n❌ Onboarding failed:', error);
    process.exit(1);
  }
}

async function handleLint(arcLint: ArcLint) {
  const cwd = process.cwd();

  console.log('🔍 Linting project...\n');

  try {
    const result = await arcLint.lintAuto(cwd);

    if (!result) {
      console.error('❌ No .arclint.yml found. Run "arclint onboard" first.');
      process.exit(1);
    }

    console.log(`📊 Analyzed ${result.moduleCount} modules with ${result.dependencyCount} dependencies\n`);

    if (result.violations.length === 0) {
      console.log('✅ No violations found! Your architecture is clean.');
      process.exit(0);
    }

    console.log(RuleEngine.formatViolations(result.violations));

    // Exit with error code if there are violations
    const errorCount = result.violations.filter(v => v.severity === 'error').length;
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Linting failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
ArcLint - AI-powered architectural linter

Usage:
  arclint <command> [options]

Commands:
  onboard    Run onboarding to detect architecture and create .arclint.yml
  lint       Lint the project according to .arclint.yml configuration
  help       Show this help message
  version    Show version information

Examples:
  arclint onboard        # Analyze project and create config
  arclint lint           # Lint current project

For more information, visit: https://github.com/efremidze/arclint
  `);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
