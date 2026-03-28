#!/usr/bin/env node

/**
 * repo-emulator CLI
 * Automatic Dev Environment Cloner
 * 
 * Clone any Git repository and automatically recreate its development environment.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createCloneCommand } from './commands/clone';
import { createDetectCommand } from './commands/detect';
import { createRunCommand } from './commands/run';
import { createMCPCommand } from './commands/mcp';
import { createCacheCommand } from './commands/cache';
import { createConfigCommand } from './commands/config';
import { logger } from './utils/logger';

const packageJson = {
  name: 'repo-emulator',
  version: '1.0.0',
  description: 'Automatically clone any Git repository and recreate its development environment',
};

function main(): void {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version)
    .usage('[command] [options]')
    .showHelpAfterError()
    .showSuggestionAfterError();

  // Register all commands
  createCloneCommand(program);
  createDetectCommand(program);
  createRunCommand(program);
  createMCPCommand(program);
  createCacheCommand(program);
  createConfigCommand(program);

  // Handle unknown commands
  program.on('command:*', () => {
    logger.error(`Unknown command: ${program.args.join(' ')}`);
    logger.info('See --help for a list of available commands.');
    process.exit(1);
  });

  // Parse arguments
  program.parse(process.argv);

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
    showQuickStart();
  }
}

function showQuickStart(): void {
  console.log('\n' + chalk.cyan.bold('Quick Start:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  ${chalk.green('$')} ${chalk.white('repo-emulator clone <url>')}`);
  console.log(`    Clone a repo and set up its environment\n`);
  console.log(`  ${chalk.green('$')} ${chalk.white('repo-emulator detect <path>')}`);
  console.log(`    Analyze an existing project\n`);
  console.log(`  ${chalk.green('$')} ${chalk.white('repo-emulator mcp <path>')}`);
  console.log(`    Generate MCP server config for AI integration\n`);
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`\n${chalk.dim('Run with --help for more information')}\n`);
}

// Run the CLI
main();
