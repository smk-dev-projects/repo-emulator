import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as prompts from '@clack/prompts';
import { logger } from '../utils/logger';
import { projectDetector } from '../detectors';
import { getEnvCreator } from '../env-creators';
import { cloneRepo, parseRepoUrl, generateDirName, getCommitHash } from '../utils/git-utils';
import { saveToCache, loadFromCache } from '../utils/cache-manager';
import { runHealthCheck } from '../utils/health-check';
import { generateMCPConfig, saveMCPConfig, updateClaudeDesktopConfig } from '../mcp-generator';
import { CloneOptions } from '../types';

/**
 * Clone command - clones a repo and sets up its environment
 */
export function createCloneCommand(program: Command): void {
  program
    .command('clone <url>')
    .description('Clone a repository and automatically set up its development environment')
    .option('-o, --output <path>', 'Target directory for the clone')
    .option('-d, --docker', 'Use Docker for environment isolation')
    .option('--skip-install', 'Skip dependency installation')
    .option('--no-cache', 'Disable config caching')
    .option('--no-mcp', 'Skip MCP generation')
    .option('-v, --verbose', 'Enable verbose output')
    .action(async (url: string, options: CloneOptions) => {
      try {
        await handleClone(url, options);
      } catch (error) {
        logger.error(`Clone failed: ${error}`);
        process.exit(1);
      }
    });
}

async function handleClone(url: string, options: CloneOptions): Promise<void> {
  logger.step(`Cloning repository: ${url}`);

  // Parse the URL
  const parsed = parseRepoUrl(url);
  if (!parsed) {
    logger.error('Invalid repository URL');
    return;
  }

  // Determine target path
  const targetPath = options.output || path.join(process.cwd(), generateDirName(url));

  // Check if directory already exists
  if (await fs.pathExists(targetPath)) {
    const shouldContinue = await prompts.confirm({
      message: `Directory ${targetPath} already exists. Continue anyway?`,
    });

    if (!shouldContinue) {
      logger.info('Aborted');
      return;
    }
  }

  // Clone the repository
  const cloneSuccess = await cloneRepo(url, targetPath, { depth: 1 });
  if (!cloneSuccess) {
    logger.error('Failed to clone repository');
    return;
  }

  logger.success(`Repository cloned to ${targetPath}`);

  // Get commit hash for caching
  const commitHash = (await getCommitHash(targetPath)) || 'unknown';

  // Try to load from cache
  let config = options.cacheEnabled !== false
    ? await loadFromCache(url, commitHash)
    : null;

  if (config) {
    logger.success('Loaded configuration from cache');
  } else {
    // Detect project configuration
    logger.step('Detecting project configuration');
    config = await projectDetector.detect(targetPath);

    // Save to cache
    if (options.cacheEnabled !== false) {
      await saveToCache(url, commitHash, config);
    }
  }

  // Display detected configuration
  displayDetectedConfig(config);

  // Ask for confirmation before proceeding
  const shouldProceed = await prompts.confirm({
    message: 'Proceed with environment setup?',
    initialValue: true,
  });

  if (!shouldProceed) {
    logger.info('Aborted');
    return;
  }

  // Create environment
  const useDocker = options.docker || false;
  const envCreator = getEnvCreator(useDocker, config);

  const setupSuccess = await envCreator.create(targetPath, config);

  if (!setupSuccess) {
    logger.error('Environment setup failed');
    return;
  }

  // Run health check
  logger.step('Running health checks');
  const healthResult = await runHealthCheck(targetPath, config);

  if (healthResult.success) {
    logger.success('All health checks passed');
  } else {
    logger.warn('Some health checks failed:');
    for (const error of healthResult.errors) {
      logger.item(error);
    }
  }

  // Generate MCP config if requested
  if (options.mcp !== false) {
    logger.step('Generating MCP configuration');
    const mcpConfig = await generateMCPConfig(targetPath);

    if (mcpConfig) {
      const configPath = await saveMCPConfig(mcpConfig, path.join(targetPath, 'mcp-config.json'));

      // Ask about adding to Claude Desktop
      const addToClaude = await prompts.confirm({
        message: 'Add this MCP server to Claude Desktop config?',
        initialValue: true,
      });

      if (addToClaude) {
        await updateClaudeDesktopConfig(mcpConfig, true);
      }
    }
  }

  logger.divider();
  logger.success('Environment setup complete!');
  logger.info(`Project location: ${targetPath}`);

  // Show next steps
  logger.step('Next steps:');
  if (config.scripts.start) {
    logger.item(`Run: cd ${targetPath} && ${config.scripts.start}`);
  }
  if (config.envVars && config.envVars.required.length > 0) {
    logger.item(`Configure environment variables in .env file`);
  }
  logger.item(`Open in your editor: code ${targetPath}`);
}

function displayDetectedConfig(config: ReturnType<typeof projectDetector.detect>): void {
  logger.step('Detected Configuration');

  if (config.languages.length > 0) {
    logger.info('Languages:');
    for (const lang of config.languages) {
      logger.item(`${lang.language} ${lang.version || '(any)'} (${lang.packageManager || 'default'})`);
    }
  }

  if (config.databases.length > 0) {
    logger.info('Databases:');
    for (const db of config.databases) {
      logger.item(`${db.type}${db.port ? ` (port ${db.port})` : ''}`);
    }
  }

  if (config.docker) {
    logger.info('Docker:');
    if (config.docker.hasDockerfile) {
      logger.item('Dockerfile detected');
    }
    if (config.docker.hasDockerCompose) {
      logger.item('docker-compose.yml detected');
      if (config.docker.composeServices) {
        for (const service of config.docker.composeServices) {
          logger.item(`  - ${service}`);
        }
      }
    }
  }

  if (config.warnings.length > 0) {
    logger.warn('Warnings:');
    for (const warning of config.warnings) {
      logger.item(warning);
    }
  }
}
